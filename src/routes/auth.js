const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateToken = require('../middleware/authware');

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

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
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

module.exports = router;