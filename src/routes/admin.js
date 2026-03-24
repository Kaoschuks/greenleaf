const express = require('express');
const AdminUser = require('../models/AdminUser');
const AdminSettings = require('../models/AdminSettings');
const authMiddleware = require('../middleware/authware');

const router = express.Router();

// Middleware to check if admin
const requireAdmin = (req, res, next) => {
    if (req.userType !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin only)
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
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
    const User = require('../models/User');
    const userModel = new User(req.db);
    const page = parseInt(req.query.page) || 1;
    const size = parseInt(req.query.size) || 10;
    const offset = (page - 1) * size;
    
    try {
        const [rows] = await req.db.execute(
            `SELECT id, first_name, middle_name, last_name, email, phone, created_at 
             FROM users 
             ORDER BY created_at DESC 
             LIMIT ${parseInt(size)} OFFSET ${parseInt(offset)}`
        );
        res.json({ users: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete a user by ID (admin only)
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
 *         description: User deleted successfully
 */
router.delete('/users/:id', authMiddleware, requireAdmin, async (req, res) => {
    const User = require('../models/User');
    const userModel = new User(req.db);
    try {
        // Prevent admin from deleting themselves
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await userModel.delete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /admin/admins:
 *   get:
 *     summary: Get all admins (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admins
 */
router.get('/admins', authMiddleware, requireAdmin, async (req, res) => {
    const adminModel = new AdminUser(req.db);
    try {
        const admins = await adminModel.findAll();
        res.json({ admins });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /admin/admins:
 *   post:
 *     summary: Create a new admin (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *               - username
 *               - password
 *               - role
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin created successfully
 */
router.post('/admins', authMiddleware, requireAdmin, async (req, res) => {
    const adminModel = new AdminUser(req.db);
    try {
        const result = await adminModel.create(req.body);
        res.status(201).json({ message: 'Admin created successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /admin/admins/{id}:
 *   put:
 *     summary: Update an admin (admin only)
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
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               username:
 *                 type: string
 *               role:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin updated successfully
 */
router.put('/admins/:id', authMiddleware, requireAdmin, async (req, res) => {
    const adminModel = new AdminUser(req.db);
    try {
        await adminModel.update(req.params.id, req.body);
        res.json({ message: 'Admin updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /admin/admins/{id}:
 *   delete:
 *     summary: Delete an admin (admin only)
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
 *         description: Admin deleted successfully
 */
router.delete('/admins/:id', authMiddleware, requireAdmin, async (req, res) => {
    const adminModel = new AdminUser(req.db);
    try {
        // Prevent admin from deleting themselves
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await adminModel.delete(req.params.id);
        res.json({ message: 'Admin deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get admin settings
router.get('/settings', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const settings = new AdminSettings(req.db);
        const result = await settings.getAll();
        res.json(result || {});
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Update admin settings
router.put('/settings', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const settings = new AdminSettings(req.db);
        const result = await settings.upsert(req.body);
        res.json(result);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
