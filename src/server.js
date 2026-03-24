require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const { specs, swaggerUi, getDynamicSpecs } = require('./config/swagger');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const webhookRoutes = require('./routes/webhook');
const policyRoutes = require('./routes/policy');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const providerRoutes = require('./routes/providers');
const dbMiddleware = require('./middleware/db');
const activityTracker = require('./middleware/activitytracker');
const { startProviderSyncService } = require('./services/providersync');

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(dbMiddleware);
app.use(activityTracker); // Track all API activities

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api-docs', swaggerUi.serve, (req, res) => {
    swaggerUi.setup(getDynamicSpecs(req))(req, res);
});
app.get('/api-docs.json', (req, res) => {
    res.json(getDynamicSpecs(req));
});
app.use('/auth', authRoutes);
app.use('/wallet',walletRoutes);
app.use('/webhook',webhookRoutes);
app.use('/policy', policyRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/providers', providerRoutes);

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server has started on port ${PORT}`);
    
    // Start provider sync service (every 30 minutes)
    // Note: We need to wait for db to be ready, so we'll start it after first request
    // Or we can initialize it here using the same db connection
});

// Start provider sync service after a short delay to ensure DB is ready
setTimeout(() => {
    try {
        // Access db through the middleware's pool
        const db = require('./middleware/db').getDb();
        if (db) {
            startProviderSyncService(db, 30);
        }
    } catch (err) {
        console.log('Provider sync service will start on first database request');
    }
}, 2000);

module.exports = app;