const express = require('express');
const Provider = require('../models/Provider');
const { getProviderAdapter } = require('../services/providers');
const { syncProvider, triggerManualSync } = require('../services/providersync');
const authMiddleware = require('../middleware/authware');

const router = express.Router();

/**
 * @swagger
 * /providers:
 *   get:
 *     summary: Get all providers
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of providers
 */
router.get('/', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const providers = await providerModel.findAll();
        res.json({ providers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers:
 *   post:
 *     summary: Create a new provider
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
 *               - display_name
 *             properties:
 *               name:
 *                 type: string
 *               display_name:
 *                 type: string
 *               api_base_url:
 *                 type: string
 *               agent_email:
 *                 type: string
 *               agent_password:
 *                 type: string
 *               wallet_uid:
 *                 type: string
 *     responses:
 *       201:
 *         description: Provider created successfully
 */
router.post('/', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const result = await providerModel.create(req.body);
        res.status(201).json({ message: 'Provider created successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/{id}:
 *   get:
 *     summary: Get provider by ID with full details
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
 *         description: Provider details with wallet, transactions, and policies
 */
// Get provider by name (needed by admin/mobile)
router.get('/name/:name', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const provider = await providerModel.findByName(req.params.name);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        let walletDetails = null;
        let walletHistory = null;
        try {
            const adapter = getProviderAdapter(provider);
            walletDetails = await adapter.getWalletDetails();
            walletHistory = await adapter.getWalletHistory();
        } catch (e) {
            console.log(`Could not fetch wallet details for provider ${provider.name}:`, e.message);
        }

        const [policies] = await req.db.execute(
            `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, p.cost as premium
             FROM insurance_policies p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.provider_name = ?
             ORDER BY p.created_at DESC`,
            [provider.name]
        );

        res.json({ provider, wallet: walletDetails, wallet_history: walletHistory, policies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/{id}:
 *   get:
 *     summary: Get provider by ID with full details
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
 *         description: Provider details with wallet, transactions, and policies
 */
router.get('/:id', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const provider = await providerModel.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        let walletDetails = null;
        let walletHistory = null;
        try {
            const adapter = getProviderAdapter(provider);
            walletDetails = await adapter.getWalletDetails();
            walletHistory = await adapter.getWalletHistory();
        } catch (e) {
            console.log(`Could not fetch wallet details for provider ${provider.name}:`, e.message);
        }

        const [policies] = await req.db.execute(
            `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, p.cost as premium
             FROM insurance_policies p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.provider_name = ?
             ORDER BY p.created_at DESC`,
            [provider.name]
        );

        res.json({ provider, wallet: walletDetails, wallet_history: walletHistory, policies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/{id}:
 *   put:
 *     summary: Update a provider
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
 *         description: Provider updated successfully
 */
router.put('/:id', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const provider = await providerModel.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        await providerModel.update(req.params.id, req.body);
        res.json({ message: 'Provider updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/{id}:
 *   delete:
 *     summary: Delete a provider
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
 *         description: Provider deleted successfully
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const provider = await providerModel.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        await providerModel.delete(req.params.id);
        res.json({ message: 'Provider deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/{id}/refresh-wallet:
 *   post:
 *     summary: Refresh provider wallet balance from Sovereign API
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
 *         description: Wallet balance refreshed
 */
router.post('/:id/refresh-wallet', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const provider = await providerModel.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        const adapter = getProviderAdapter(provider);
        const walletDetails = await adapter.getWalletDetails();
        const newBalance = walletDetails.wallet?.balance || 0;
        await providerModel.updateWalletBalance(req.params.id, newBalance);

        res.json({ message: 'Wallet balance refreshed', balance: newBalance, wallet: walletDetails });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/{id}/transactions:
 *   get:
 *     summary: Get provider wallet transactions
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
 *         description: Wallet transactions
 */
router.get('/:id/transactions', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const provider = await providerModel.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        const adapter = getProviderAdapter(provider);
        const walletHistory = await adapter.getWalletHistory();
        res.json({ transactions: walletHistory });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/name/{provider_name}/policies:
 *   get:
 *     summary: Get all policies from a specific provider
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider_name
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: List of policies from the provider
 */
router.get('/name/:provider_name/policies', authMiddleware, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;

    try {
        const [policies] = await req.db.execute(
            `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, p.cost as premium
             FROM insurance_policies p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.provider_name = ?
             ORDER BY p.created_at DESC LIMIT ${parseInt(size)} OFFSET ${parseInt((page - 1) * size)}`,
            [req.params.provider_name]
        );

        res.json({ policies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/sync:
 *   post:
 *     summary: Manually trigger provider sync
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync triggered
 */
router.post('/sync', authMiddleware, async (req, res) => {
    try {
        await triggerManualSync(req.db);
        res.json({ message: 'Provider sync triggered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /providers/:id/sync:
 *   post:
 *     summary: Sync a specific provider
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Provider synced
 */
router.post('/:id/sync', authMiddleware, async (req, res) => {
    const providerModel = new Provider(req.db);
    try {
        const provider = await providerModel.findById(req.params.id);
        if (!provider) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        
        await syncProvider(req.db, provider);
        res.json({ message: 'Provider synced successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/types', authMiddleware, (_req, res) => {
    const policyTypes = [
        {
            id: 'vehicle',
            name: 'Vehicle Insurance',
            description: 'Comprehensive and third-party motor insurance',
            requiredFields: {
                persona: ['first_name', 'last_name', 'email', 'phone', 'gender', 'house_address'],
                vehicle: ['make', 'model', 'year', 'registration_number', 'chassis_number', 'engine_number', 'vehicle_value', 'policy_type']
            }
        },
        {
            id: 'marine',
            name: 'Marine Insurance',
            description: 'Marine cargo and hull insurance',
            requiredFields: {
                persona: ['first_name', 'last_name', 'email', 'phone', 'gender', 'house_address'],
                cargoes: ['period', 'policy_type', 'description', 'value', 'loading_port', 'discharge_port']
            }
        },
        {
            id: 'allrisk',
            name: 'All Risk Insurance',
            description: 'Personal all risk insurance for electronics and valuables',
            requiredFields: {
                persona: ['first_name', 'last_name', 'email', 'phone', 'gender', 'house_address'],
                items: ['item', 'value', 'period', 'serial', 'imei']
            }
        },
        {
            id: 'travel',
            name: 'Travel Insurance',
            description: 'Domestic and international travel insurance',
            requiredFields: {
                persona: ['first_name', 'last_name', 'email', 'phone', 'gender', 'house_address'],
                trip: ['trip_duration', 'travel_mode', 'place_departure', 'place_arrival']
            }
        },
        {
            id: 'swiss',
            name: 'Swiss Life Insurance',
            description: 'Swiss life insurance policy',
            requiredFields: {
                persona: ['first_name', 'last_name', 'email', 'phone', 'gender', 'house_address']
            }
        }
    ];

    res.json({ types: policyTypes });
});

module.exports = router;
