require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const webhookRoutes = require('./routes/webhook');
const dbMiddleware = require('./middleware/db');

const app = express();
app.use(express.json());
app.use(dbMiddleware);

app.use('/auth', authRoutes);
app.use('/wallet',walletRoutes);
app.use('/webhook',webhookRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server has started on port ${PORT}`));