const express = require('express');
const axios = require('axios');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { createConnection } = require('../config/db');
const authMiddleware = require('../middleware/authware'); // assumes JWT auth

const router = express.Router();

router.get('/balance', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
    const balance = await wallet.getBalance(req.user.id);
    res.json({ balance });
});

router.post('/credit', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
  const { amount, description } = req.body;
  try {
    await wallet.credit(req.user.id, amount, description);
    res.json({ message: 'Wallet credited' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } 
});

router.post('/debit', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
  const { amount, description } = req.body;
  try {
    await wallet.debit(req.user.id, amount, description);
    res.json({ message: 'Wallet debited' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/transactions', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.size) || 10;
  const transactions = await wallet.getTransactions(req.user.id, page, limit);
  res.json({ transactions: transactions }); 
});

router.post('/fund', authMiddleware, async (req, res) => {
  const userModel = new User(req.db);
  const user = await userModel.findById(req.user.id);
  const { amount, description } = req.body;
  if (!user) return res.status(404).json({ error: 'User not found' });
  try{
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: amount * 100, // Paystack uses kobo
        callback_url: "https://www.greenleafib.com",
        metadata: { 
          userId: user.id,
          desc: description
        } // optional, useful for tracking
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );
    const { authorization_url } = response.data.data;
    return res.json({ paymentUrl: authorization_url });
  }catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: 'Unable to initialize transaction' });
  }
});

module.exports = router;