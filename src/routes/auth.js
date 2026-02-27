const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const authenticateToken = require('../middleware/authware');
const compareHash = require('../utils/utils')

const router = express.Router();


router.post('/signup', async (req, res) => {
  try {
    const userModel = new User(req.db);
    await userModel.create(req.body);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userModel = new User(req.db);
    const user = await userModel.findByEmail(email);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const match = await userModel.validatePassword(password, user.password);

    if (!match) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: 'USER', type: 'user' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
      const userModel = new User(req.db);
      const user = await userModel.findById(req.user.id);
  
      if (!user) return res.status(404).json({ error: 'User not found' });
  
      // Exclude sensitive info
      delete user.password;
      delete user.id;
  
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });  

  router.get('/me/referral', authenticateToken, async (req, res) => {
    try{
      const userModel = new User(req.db);
      const code = await userModel.findReferralCode(req.user.id);
      res.json({code});
    } catch (err){
      res.status(500).json({error: err.message});
    }
  });

  /**
 * @swagger
 * /auth/admin/create:
 *   post:
 *     summary: Create a new admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminUser'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  example: Successful
 */
  router.post('/admin/create', async (req, res) => {
    try{
      const user = new AdminUser(req.db);
      await user.create(req.body);
      res.status(201).json({ message: 'Admin User created successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * @swagger
   * /auth/admin/login:
   *  post:
   *    summary:  Login as admin
   *    requestBody: 
   *      required:  true
   *      content:
   *        application/json:
   *          schema:
   *            type: object
   *            required: [username,password]
   *            properties:
   *              username:
   *                type: string
   *              password:
   *                type: string
   *                format: password
   *    responses:
   *      200: 
   *        content:
   *          application/json:
   *            schema:
   *              type: object
   *              properties:
   *                message:
   *                  type: string
   *                  example: Successful
   *                response:
   *                  type: object
   *                  properties:
   *                    token:
   *                      type: string
   *                      example: abcdefghi
   *                    
   */
  router.post('/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const userModel = new AdminUser(req.db);
      const user = await userModel.findByUsername(username);
  
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
  
      const match = await compareHash(password, user.password);
  
      if (!match) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      delete user.password;
      delete user.id;
  
      const token = jwt.sign({ 
        id: user.id, role: user.role, type: 'admin'
      }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.json({ message: 'Login successful', response: {
        token,user
      } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

module.exports = router;