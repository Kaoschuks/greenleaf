const express = require('express');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const UserSettings = require('../models/UserSettings');
const ApiActivity = require('../models/ApiActivity');
const authMiddleware = require('../middleware/authware');
const { verifyNIN, validateNINFormat } = require('../services/paystack');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/**
 * @swagger
 * /user/me:
 *   get:
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/me', authMiddleware, async (req, res) => {
    const userModel = new User(req.db);
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        delete user.password;
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me:
 *   put:
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/me', authMiddleware, async (req, res) => {
    const userModel = new User(req.db);
    try {
        await userModel.update(req.user.id, req.body);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me:
 *   delete:
 *     summary: Delete current user account (and all related data)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
router.delete('/me', authMiddleware, async (req, res) => {
    const userModel = new User(req.db);
    try {
        await userModel.delete(req.user.id);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me/change-password:
 *   post:
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post('/me/change-password', authMiddleware, async (req, res) => {
    const userModel = new User(req.db);
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const isValid = await userModel.validatePassword(currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        await userModel.update(req.user.id, { password: newPassword });
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me/notifications:
 *   get:
 *     summary: Get user notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User notifications
 */
router.get('/me/notifications', authMiddleware, async (req, res) => {
    const notificationModel = new UserNotification(req.db);
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const notifications = await notificationModel.findByUserId(req.user.id, limit, offset);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me/notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 */
router.get('/me/notifications/unread-count', authMiddleware, async (req, res) => {
    const notificationModel = new UserNotification(req.db);
    try {
        const count = await notificationModel.countUnread(req.user.id);
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me/notifications/:id/read:
 *   put:
 *     summary: Mark notification as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/me/notifications/:id/read', authMiddleware, async (req, res) => {
    const notificationModel = new UserNotification(req.db);
    try {
        await notificationModel.markAsRead(req.params.id, req.user.id);
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/me/notifications/read-all', authMiddleware, async (req, res) => {
    const notificationModel = new UserNotification(req.db);
    try {
        await notificationModel.markAllAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me/settings:
 *   get:
 *     summary: Get user settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings
 */
router.get('/me/settings', authMiddleware, async (req, res) => {
    const settingsModel = new UserSettings(req.db);
    try {
        let settings = await settingsModel.findByUserId(req.user.id);
        
        // Create default settings if not exists
        if (!settings) {
            await settingsModel.create({ user_id: req.user.id });
            settings = await settingsModel.findByUserId(req.user.id);
        }
        
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me/settings:
 *   put:
 *     summary: Update user settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications:
 *                 type: boolean
 *               pushNotifications:
 *                 type: boolean
 *               smsNotifications:
 *                 type: boolean
 *               policyReminders:
 *                 type: boolean
 *               marketingEmails:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/me/settings', authMiddleware, async (req, res) => {
    const settingsModel = new UserSettings(req.db);
    try {
        await settingsModel.createOrUpdate(req.user.id, req.body);
        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/me/activities:
 *   get:
 *     summary: Get user API activities
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User API activities
 */
router.get('/me/activities', authMiddleware, async (req, res) => {
    const activityModel = new ApiActivity(req.db);
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const activities = await activityModel.findByUserId(req.user.id, limit, offset);
        const total = await activityModel.countByUserId(req.user.id);
        res.json({ activities, total, limit, offset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /user/verify-nin:
 *   post:
 *     summary: Verify NIN (National Identification Number)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nin:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: NIN verification result
 */
router.post('/verify-nin', async (req, res) => {
    try {
        const { nin, firstName, lastName } = req.body;
        
        if (!nin) {
            return res.status(400).json({ error: 'NIN is required' });
        }
        
        // Validate NIN format first (basic validation)
        if (!validateNINFormat(nin)) {
            return res.status(400).json({ 
                valid: false,
                error: 'Invalid NIN format. NIN must be 11 digits.' 
            });
        }
        
        // Try to verify with Paystack
        const result = await verifyNIN(nin);
        
        if (result.success) {
            res.json({
                valid: true,
                data: result.data,
                message: 'NIN verified successfully'
            });
        } else {
            res.json({
                valid: false,
                error: result.error || 'Unable to verify NIN'
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update profile image
router.post('/upload/profile-image', authMiddleware, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const image = req.files.image;
    const userId = req.user.id;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(image.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' });
    }

    // Validate file size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size too large. Maximum 5MB allowed' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads/profile-images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(image.name);
    const filename = `user_${userId}_${Date.now()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Move file to uploads directory
    await image.mv(filepath);

    // Update user profile image in database
    const imageUrl = `/uploads/profile-images/${filename}`;
    await User.update(userId, { profileImage: imageUrl });

    res.json({ 
      success: true, 
      profileImage: imageUrl,
      message: 'Profile image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;
