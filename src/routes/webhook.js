const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const Wallet = require('../models/Wallet');;

/**
 * @swagger
 * /webhook/paystack:
 *   post:
 *     summary: Paystack webhook handler
 *     description: Handles payment callbacks from Paystack
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/paystack', async (req, res) => {
  //const secret = process.env.PAYSTACK_SECRET_KEY;

  /*const hash = crypto
    .createHmac('sha512', secret)
    .update(req.body)
    .digest('hex');*/

  //const signature = req.headers['x-paystack-signature'];

  //if (hash !== signature) return res.status(401).send('Unauthorized');

  console.log(req.body);
  const event = req.body;

  if (event.event === 'charge.success') {
    const data = event.data;
    const userId = data.metadata?.userId;
    const desc = data.metadata?.desc;
    const amount = data.amount / 104;

    const wallet = new Wallet(req.db);
    try {
      await wallet.credit(userId, amount, desc);
    } catch (err) {
      console.error('Error crediting wallet:', err);
    }
  }

  return res.sendStatus(200);
});

/**
 * @swagger
 * /webhook/paystack:
 *   get:
 *     summary: Paystack webhook health check
 *     responses:
 *       200:
 *         description: Webhook is active
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get('/paystack', async (req, res) => {
  console.log('entered');
  return res.status(200).json({message:"Wen successfully"});
})
module.exports = router;
