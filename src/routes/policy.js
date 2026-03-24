const express = require('express');
const Policy = require('../models/Policy');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const authMiddleware = require('../middleware/authware');
const sovereignApi = require('../services/sovereigntrustapi');

const router = express.Router();

/**
 * @swagger
 * /policy:
 *   get:
 *     summary: Get policies
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of policies
 */
router.get('/', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const provider = req.query.provider;

    try {
        let policies;
        // If user is admin, return all policies (with optional provider filter)
        if (req.userType === 'admin') {
            policies = await policyModel.getAll(page, size, provider);
        } else {
            // Regular users only see their own policies
            policies = await policyModel.getByUserId(req.user.id, page, size);
        }
        res.json({ policies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/{id}:
 *   get:
 *     summary: Get a specific policy by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Policy details
 *       404:
 *         description: Policy not found
 */
router.get('/:id', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        // Regular users can only view their own policies
        if (req.userType !== 'admin' && policy.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        res.json(policy);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/{id}/transactions:
 *   get:
 *     summary: Get transactions for a specific policy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of transactions for the policy
 */
router.get('/:id/transactions', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        // Regular users can only view their own policy transactions
        if (req.userType !== 'admin' && policy.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const transactions = await policyModel.getTransactions(req.params.id);
        res.json({ policy, transactions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy:
 *   post:
 *     summary: Create a new policy
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - provider
 *               - cost
 *               - frequency
 *             properties:
 *               name:
 *                 type: string
 *               provider:
 *                 type: string
 *               cost:
 *                 type: number
 *               frequency:
 *                 type: string
 *               provider_reference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Policy created successfully
 */
router.post('/', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    const wallet = new Wallet(req.db);
    const userModel = new User(req.db);
    
    try {
        const userId = req.user.id;
        const { 
            cost, 
            name, 
            provider, 
            frequency, 
            provider_reference,
            policy_type,  // vehicle, marine, allrisk, travel, swiss
            persona,      // user personal info for sovereign API
            vehicle,       // for vehicle policy
            cargoes,      // for marine policy
            items,         // for all risk policy
            trip,          // for travel policy
            quote_price,
            pin,
            payment_source
        } = req.body;
        
        // Check if cost is provided
        if (!cost) {
            return res.status(400).json({ error: 'Policy cost is required' });
        }
        
        // Get user's wallet balance
        const balance = await wallet.getBalance(userId);
        const balanceNum = parseFloat(balance);
        const costNum = parseFloat(cost);
        
        // Check if user has sufficient balance
        if (balanceNum < costNum) {
            return res.status(400).json({ 
                error: 'Insufficient funds',
                required: costNum,
                available: balanceNum
            });
        }
        
        // Get user info for persona
        const user = await userModel.findById(userId);
        
        // Build persona from user data if not provided
        const personaData = persona || {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            house_address: user.user_address || '',
            account_number: '',
            marital_status: user.marital_status || '',
            next_of_kin: user.next_of_kin || '',
            next_of_kin_phone: user.next_of_kin_phone || '',
            next_of_kin_address: '',
            employer: user.employer || '',
            employer_address: user.employer_address || '',
            customer_type: '1',
            company_name: null,
            mailing_address: user.user_address || '',
            office_address: user.user_address || ''
        };
        
        // Call Sovereign Trust API based on policy type
        let sovereignResult = null;
        let providerRef = provider_reference;
        
        try {
            switch (policy_type) {
                case 'vehicle':
                    sovereignResult = await sovereignApi.buyVehiclePolicy({
                        persona: personaData,
                        vehicle: vehicle || [],
                        quote_price: quote_price || cost,
                        pin: pin || '7038',
                        payment_source: payment_source || 'wallet'
                    });
                    break;
                    
                case 'marine':
                    sovereignResult = await sovereignApi.buyMarinePolicy({
                        persona: personaData,
                        cargoes: cargoes || [],
                        quote_price: quote_price || cost,
                        pin: pin || '7038',
                        payment_source: payment_source || 'wallet'
                    });
                    break;
                    
                case 'allrisk':
                    sovereignResult = await sovereignApi.buyAllRiskPolicy({
                        persona: personaData,
                        items: items || [],
                        quote_price: quote_price || cost,
                        pin: pin || '7038',
                        payment_source: payment_source || 'wallet',
                        total_items: items ? items.length : 1
                    });
                    break;
                    
                case 'travel':
                    sovereignResult = await sovereignApi.buyTravelPolicy({
                        persona: personaData,
                        trip: trip || {},
                        quote_price: quote_price || cost,
                        pin: pin || '7038',
                        payment_source: payment_source || 'wallet'
                    });
                    break;
                    
                case 'swiss':
                    sovereignResult = await sovereignApi.buySwissPolicy({
                        persona: personaData,
                        quote_price: quote_price || cost,
                        pin: pin || '7038',
                        payment_source: payment_source || 'wallet'
                    });
                    break;
                    
                default:
                    // If no policy type, just create locally without calling Sovereign API
                    console.log('No policy type specified, creating local policy only');
            }
            
            // Get provider reference from response if available
            if (sovereignResult && sovereignResult.data) {
                providerRef = sovereignResult.data.provider_reference || provider_reference;
            }
        } catch (sovereignError) {
            console.error('Sovereign API error:', sovereignError.response?.data || sovereignError.message);
            // Continue with local policy creation even if Sovereign API fails
        }
        
        // Create policy in database
        const policyData = {
            name,
            provider,
            cost,
            frequency,
            provider_reference: providerRef
        };
        const result = await policyModel.create(policyData, userId);
        const policyId = result.insertId;
        
        // Deduct from wallet
        await wallet.debit(userId, cost, `Policy purchase: ${name}`, policyId);
        
        // Update policy status to active
        await policyModel.update(policyId, { status: 'active' });
        
        res.status(201).json({ 
            message: 'Policy created and paid successfully', 
            id: policyId,
            amount_paid: costNum,
            provider_reference: providerRef,
            sovereign_response: sovereignResult ? sovereignResult.data : null
        });
    } catch (err) {
        if (err.message === 'Insufficient funds') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/{id}:
 *   put:
 *     summary: Update a policy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               provider:
 *                 type: string
 *               cost:
 *                 type: number
 *               frequency:
 *                 type: string
 *               status:
 *                 type: string
 *               provider_reference:
 *                 type: string
 *               activation_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Policy updated successfully
 */
router.put('/:id', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        // Regular users can only update their own policies, admins can update any
        if (req.userType !== 'admin' && policy.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await policyModel.update(req.params.id, req.body);
        res.json({ message: 'Policy updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/{id}:
 *   delete:
 *     summary: Delete a policy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Policy deleted successfully
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        // Only admins can delete policies
        if (req.userType !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete policies' });
        }

        await policyModel.delete(req.params.id);
        res.json({ message: 'Policy deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Missing endpoints needed by admin/mobile

/**
 * @swagger
 * /policy/stats:
 *   get:
 *     summary: Get policy statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Policy statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    try {
        const stats = await policyModel.getStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/user/{userId}:
 *   get:
 *     summary: Get policies by user ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user policies
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    
    try {
        const policies = await policyModel.getByUserId(req.params.userId, page, size);
        res.json({ policies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/provider/{providerId}:
 *   get:
 *     summary: Get policies by provider ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of provider policies
 */
router.get('/provider/:providerId', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    const Provider = require('../models/Provider');
    const providerModel = new Provider(req.db);
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    
    try {
        const provider = await providerModel.findById(req.params.providerId);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        
        const [policies] = await req.db.execute(
            `SELECT p.*, 
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                p.cost as premium,
                p.the_name as policy_type
             FROM insurance_policies p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.provider_name = ? 
             ORDER BY p.created_at DESC LIMIT ${parseInt(size)} OFFSET ${parseInt((page - 1) * size)}`,
            [provider.name]
        );
        
        res.json({ policies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/{id}/status:
 *   put:
 *     summary: Update policy status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Policy status updated
 */
router.put('/:id/status', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        await policyModel.update(req.params.id, { status: req.body.status });
        res.json({ message: 'Policy status updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/{id}/cancel:
 *   post:
 *     summary: Cancel a policy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Policy cancelled
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        await policyModel.update(req.params.id, { status: 'cancelled' });
        res.json({ message: 'Policy cancelled successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /policy/{id}/renew:
 *   post:
 *     summary: Renew a policy
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start_date:
 *                 type: string
 *               end_date:
 *                 type: string
 *               premium:
 *                 type: number
 *     responses:
 *       200:
 *         description: Policy renewed
 */
router.post('/:id/renew', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        
        const { start_date, end_date, premium } = req.body;
        await policyModel.update(req.params.id, { 
            start_date, 
            end_date,
            cost: premium,
            status: 'active'
        });
        res.json({ message: 'Policy renewed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
