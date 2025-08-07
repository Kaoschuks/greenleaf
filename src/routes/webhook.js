const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const Wallet = require('../models/Wallet');;

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

router.get('/paystack', async (req, res) => {
  console.log('entered');
  return res.status(200).json({message:"Wen successfully"});
})
module.exports = router;
