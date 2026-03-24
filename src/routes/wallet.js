const express = require('express');
const axios = require('axios');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const { createConnection } = require('../config/db');
const authMiddleware = require('../middleware/authware'); // assumes JWT auth

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
 * /wallet/balance:
 *   get:
 *     summary: Get user's wallet balance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 */
router.get('/balance', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
    const balance = await wallet.getBalance(req.user.id);
    res.json({ balance });
});

/**
 * @swagger
 * /wallet/credit:
 *   post:
 *     summary: Credit user's wallet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet credited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Error crediting wallet
 */
router.post('/credit', authMiddleware, requireAdmin, async (req, res) => {
  const wallet = new Wallet(req.db);
  const { amount, description, policyId } = req.body;
  try {
    await wallet.credit(req.user.id, amount, description, policyId || null);
    res.json({ message: 'Wallet credited' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } 
});

/**
 * @swagger
 * /wallet/debit:
 *   post:
 *     summary: Debit user's wallet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet debited successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Error debiting wallet
 */
router.post('/debit', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
  const { amount, description, policyId } = req.body;
  try {
    await wallet.debit(req.user.id, amount, description, policyId || null);
    res.json({ message: 'Wallet debited' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /wallet/transactions:
 *   get:
 *     summary: Get user's wallet transactions
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
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 */
router.get('/transactions', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.size) || 10;
  const transactions = await wallet.getTransactions(req.user.id, page, limit);
  res.json({ transactions: transactions }); 
});

/**
 * @swagger
 * /wallet/fund:
 *   post:
 *     summary: Initialize payment to fund wallet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 *       404:
 *         description: User not found
 *       500:
 *         description: Unable to initialize transaction
 */
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

// Missing endpoints needed by admin

/**
 * @swagger
 * /wallet/transactions/stats:
 *   get:
 *     summary: Get transaction statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction statistics
 */
router.get('/transactions/stats', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
  try {
    // Get total credit
    const [creditResult] = await req.db.execute(
      "SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE type = 'credit' AND status = 'completed'"
    );
    
    // Get total debit
    const [debitResult] = await req.db.execute(
      "SELECT COALESCE(SUM(amount), 0) as total FROM wallet_transactions WHERE type = 'debit' AND status = 'completed'"
    );
    
    // Get total transactions count
    const [totalResult] = await req.db.execute(
      "SELECT COUNT(*) as count FROM wallet_transactions"
    );
    
    // Get pending transactions count
    const [pendingResult] = await req.db.execute(
      "SELECT COUNT(*) as count FROM wallet_transactions WHERE status = 'pending'"
    );
    
    res.json({
      total_credit: creditResult[0]?.total || 0,
      total_debit: debitResult[0]?.total || 0,
      total_transactions: totalResult[0]?.count || 0,
      pending_transactions: pendingResult[0]?.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /wallet/user/{userId}/transactions:
 *   get:
 *     summary: Get transactions by user ID
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
 *         description: List of user transactions
 */
router.get('/user/:userId/transactions', authMiddleware, async (req, res) => {
  const wallet = new Wallet(req.db);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.size) || 10;
  
  try {
    // First get the user's wallet ID
    const [walletResult] = await req.db.execute(
      'SELECT id FROM wallets WHERE user_id = ?',
      [req.params.userId]
    );
    
    if (!walletResult.length) {
      return res.json({ transactions: [], total: 0, page, size: limit });
    }
    
    const walletId = walletResult[0].id;
    const transactions = await wallet.getTransactions(walletId, page, limit);
    
    // Get total count
    const [countResult] = await req.db.execute(
      'SELECT COUNT(*) as count FROM wallet_transactions WHERE wallet_id = ?',
      [walletId]
    );
    
    res.json({ 
      transactions: transactions,
      total: countResult[0]?.count || 0,
      page,
      size: limit
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /wallet/transactions/{id}/approve:
 *   post:
 *     summary: Approve a pending transaction
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
 *         description: Transaction approved
 */
router.post('/transactions/:id/approve', authMiddleware, async (req, res) => {
  try {
    // Get the transaction
    const [txnResult] = await req.db.execute(
      'SELECT * FROM wallet_transactions WHERE id = ?',
      [req.params.id]
    );
    
    if (!txnResult.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const txn = txnResult[0];
    
    if (txn.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending transactions can be approved' });
    }
    
    // Update transaction status to completed
    await req.db.execute(
      'UPDATE wallet_transactions SET status = ? WHERE id = ?',
      ['completed', req.params.id]
    );
    
    res.json({ message: 'Transaction approved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /wallet/transactions/{id}/reject:
 *   post:
 *     summary: Reject a pending transaction
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
 *         description: Transaction rejected
 */
router.post('/transactions/:id/reject', authMiddleware, async (req, res) => {
  try {
    // Get the transaction
    const [txnResult] = await req.db.execute(
      'SELECT * FROM wallet_transactions WHERE id = ?',
      [req.params.id]
    );
    
    if (!txnResult.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const txn = txnResult[0];
    
    if (txn.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending transactions can be rejected' });
    }
    
    // Update transaction status to failed
    await req.db.execute(
      'UPDATE wallet_transactions SET status = ? WHERE id = ?',
      ['failed', req.params.id]
    );
    
    res.json({ message: 'Transaction rejected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;