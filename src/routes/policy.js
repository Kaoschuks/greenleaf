const express = require('express');
const Policy = require('../models/Policy');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const Provider = require('../models/Provider');
const authMiddleware = require('../middleware/authware');
const { getProviderAdapter } = require('../services/providers');

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

// Static routes must come before /:id to avoid Express shadowing them

// ── Claims ────────────────────────────────────────────────────────────────────
router.get('/claims', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const providers = await providerModel.findAll();
        const provider = providers.find(p => p.is_active && p.name.toLowerCase().includes('sovereign'));
        if (!provider) return res.status(404).json({ error: 'No active provider found' });
        const adapter = getProviderAdapter(provider);
        const result = await adapter.getMyClaims();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/claims', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const providers = await providerModel.findAll();
        const provider = providers.find(p => p.is_active && p.name.toLowerCase().includes('sovereign'));
        if (!provider) return res.status(404).json({ error: 'No active provider found' });
        const adapter = getProviderAdapter(provider);
        const result = await adapter.makeClaim(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/claims/track', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const providers = await providerModel.findAll();
        const provider = providers.find(p => p.is_active && p.name.toLowerCase().includes('sovereign'));
        if (!provider) return res.status(404).json({ error: 'No active provider found' });
        const adapter = getProviderAdapter(provider);
        const result = await adapter.trackClaim(req.body.claim_number);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Quote ─────────────────────────────────────────────────────────────────────
router.post('/quote', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const { policy_type, ...quoteData } = req.body;
        if (!policy_type) return res.status(400).json({ error: 'policy_type is required' });

        const providers = await providerModel.findAll();
        const provider = providers.find(p => p.is_active && p.name.toLowerCase().includes('sovereign'));
        if (!provider) return res.status(404).json({ error: 'No active provider found' });

        const adapter = getProviderAdapter(provider);
        const result = await adapter.getQuote(policy_type, quoteData);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/vehicle-brands', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const providers = await providerModel.findAll();
        console.log('[vehicle-brands] providers:', providers.map(p => ({ id: p.id, name: p.name, is_active: p.is_active })));
        const provider = providers.find(p => p.is_active && p.name.toLowerCase().includes('sovereign'));
        if (!provider) return res.status(404).json({ error: 'No active provider found' });
        const adapter = getProviderAdapter(provider);
        const result = await adapter.getVehicleBrands();
        console.log('[vehicle-brands] ST response keys:', Object.keys(result || {}));
        console.log('[vehicle-brands] ST response:', JSON.stringify(result).slice(0, 500));
        res.json(result);
    } catch (err) {
        console.error('[vehicle-brands] error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/vehicle-brands/:brandId/models', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const providers = await providerModel.findAll();
        const provider = providers.find(p => p.is_active && p.name.toLowerCase().includes('sovereign'));
        if (!provider) return res.status(404).json({ error: 'No active provider found' });
        const adapter = getProviderAdapter(provider);
        const result = await adapter.getVehicleModels(req.params.brandId);
        console.log('[vehicle-models] ST response keys:', Object.keys(result || {}));
        console.log('[vehicle-models] ST response:', JSON.stringify(result).slice(0, 500));
        res.json(result);
    } catch (err) {
        console.error('[vehicle-models] error:', err.message);
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
            policy_type,
            persona,
            vehicle,
            cargoes,
            items,
            trip,
            quote_price,
            pin,
            payment_source
        } = req.body;

        if (!cost) {
            return res.status(400).json({ error: 'Policy cost is required' });
        }

        const validPolicyTypes = ['vehicle', 'marine', 'allrisk', 'travel', 'swiss'];
        if (!policy_type || !validPolicyTypes.includes(policy_type)) {
            return res.status(400).json({ error: `policy_type is required and must be one of: ${validPolicyTypes.join(', ')}` });
        }

        const balance = await wallet.getBalance(userId);
        const balanceNum = parseFloat(balance);
        const costNum = parseFloat(cost);

        if (balanceNum < costNum) {
            return res.status(400).json({
                error: 'Insufficient funds',
                required: costNum,
                available: balanceNum
            });
        }

        const user = await userModel.findById(userId);

        const personaData = persona || {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            gender: user.gender,
            phone: user.phone,
            house_address: user.user_address || null,
            account_number: null,
            marital_status: user.marital_status || null,
            picture: null,
            identification_means: null,
            next_of_kin: user.next_of_kin || null,
            next_of_kin_phone: user.next_of_kin_phone || null,
            next_of_kin_address: null,
            employer: user.employer || null,
            employer_address: user.employer_address || null,
            customer_type: null,
            company_name: null,
            mailing_address: user.user_address || null,
            tin_number: null,
            office_address: user.user_address || null,
            contact_person: null
        };

        const providerModel = new Provider(req.db);
        const providerRecord = await providerModel.findByName(provider);
        if (!providerRecord) {
            return res.status(400).json({ error: `Provider '${provider}' not found` });
        }
        if (!providerRecord.is_active) {
            return res.status(400).json({ error: `Provider '${provider}' is not currently active` });
        }

        const adapter = getProviderAdapter(providerRecord);
        const providerResult = await adapter.buyPolicy(policy_type, {
            persona: personaData,
            vehicle: vehicle || [],
            cargoes: cargoes || [],
            items: items || [],
            trip: trip || {},
            quote_price: quote_price || cost,
            pin: pin || '7038',
            payment_source: payment_source || 'wallet'
        });

        const providerRef = providerResult?.data?.policy?.[0]?.policy_number;
        if (!providerRef) {
            throw new Error(`Policy creation failed: ${providerRecord.display_name} did not return a provider reference`);
        }

        const result = await policyModel.create({
            name,
            provider,
            cost,
            frequency,
            policy_type,
            provider_reference: providerRef,
            provider_payload: providerResult.data
        }, userId);
        const policyId = result.insertId;

        const policyDates = providerResult?.data?.policy?.[0];
        await wallet.debit(userId, cost, `Policy purchase: ${name}`, policyId);
        await policyModel.update(policyId, {
            status: 'active',
            activation_date: policyDates?.start || null,
            start_date: policyDates?.start || null,
            end_date: policyDates?.end || null,
        });

        res.status(201).json({
            message: 'Policy created and paid successfully',
            id: policyId,
            amount_paid: costNum,
            provider_reference: providerRef,
            provider_response: providerResult.data
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
    if (req.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
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

        if (req.userType !== 'admin' && policy.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
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

        if (req.userType !== 'admin' && policy.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await policyModel.update(req.params.id, { status: 'cancelled' });
        res.json({ message: 'Policy cancelled successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/claim', authMiddleware, async (req, res) => {
    const policyModel = new Policy(req.db);
    const providerModel = new Provider(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) return res.status(404).json({ error: 'Policy not found' });
        if (req.userType !== 'admin' && policy.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!policy.provider_reference) {
            return res.status(400).json({ error: 'Policy has no provider reference to claim against' });
        }
        const providerRecord = await providerModel.findByName(policy.provider_name);
        if (!providerRecord) return res.status(404).json({ error: 'Provider not found' });
        const adapter = getProviderAdapter(providerRecord);
        const result = await adapter.claimPolicy(policy.provider_reference, req.body);
        res.json({ message: 'Claim submitted successfully', result });
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
    const wallet = new Wallet(req.db);
    try {
        const policy = await policyModel.getById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        if (req.userType !== 'admin' && policy.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { start_date, end_date, premium } = req.body;
        const renewalCost = parseFloat(premium || policy.cost);

        const balance = await wallet.getBalance(policy.user_id);
        if (parseFloat(balance) < renewalCost) {
            return res.status(400).json({
                error: 'Insufficient funds',
                required: renewalCost,
                available: parseFloat(balance)
            });
        }

        if (!policy.provider_reference) {
            throw new Error('Cannot renew policy: missing provider reference');
        }

        const providerModel = new Provider(req.db);
        const providerRecord = await providerModel.findByName(policy.provider_name);
        if (!providerRecord) {
            throw new Error(`Cannot renew policy: provider '${policy.provider_name}' not found`);
        }

        const adapter = getProviderAdapter(providerRecord);
        await adapter.renewPolicy(policy.policy_type, policy.provider_reference, renewalCost);

        await policyModel.update(req.params.id, {
            start_date,
            end_date,
            cost: renewalCost,
            status: 'active'
        });

        await wallet.debit(policy.user_id, renewalCost, `Policy renewal: ${policy.the_name}`, policy.id);

        res.json({ message: 'Policy renewed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
