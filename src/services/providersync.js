const Provider = require('../models/Provider');
const axios = require('axios');

/**
 * Provider Sync Service
 * Syncs provider data from external sources every 30 minutes
 */

let syncInterval = null;

/**
 * Sync a single provider's data from external source
 * @param {Object} db - Database connection
 * @param {Object} provider - Provider object from database
 */
async function syncProvider(db, provider) {
    try {
        console.log(`Syncing provider: ${provider.name} (ID: ${provider.id})`);
        
        // Check if provider has an API base URL
        if (!provider.api_base_url) {
            console.log(`Provider ${provider.name} has no API base URL, skipping sync`);
            return;
        }

        // Example: Fetch provider data from their API
        // This is a placeholder - actual implementation depends on provider's API
        let providerData = {};
        
        try {
            // Try to get wallet details if provider has credentials
            if (provider.agent_email && provider.agent_password && provider.wallet_uid) {
                const response = await axios.post(`${provider.api_base_url}/users/login`, {
                    user: {
                        email: provider.agent_email,
                        password: provider.agent_password
                    }
                }, { timeout: 10000 });

                if (response.data && response.data.user && response.data.user.token) {
                    const token = response.data.user.token;
                    
                    // Get wallet details
                    const walletResponse = await axios.get(`${provider.api_base_url}/wallet`, {
                        headers: { 'Authorization': `Token ${token}` },
                        timeout: 10000
                    });
                    
                    if (walletResponse.data && walletResponse.data.wallet) {
                        providerData.wallet_balance = walletResponse.data.wallet.balance || 0;
                    }
                }
            }
        } catch (apiError) {
            console.error(`Failed to sync provider ${provider.name} from API:`, apiError.message);
            // Continue with sync even if API call fails
        }

        // Update provider with synced data
        const providerModel = new Provider(db);
        await providerModel.update(provider.id, {
            wallet_balance: providerData.wallet_balance || provider.wallet_balance,
            last_synced_at: new Date()
        });

        console.log(`Successfully synced provider: ${provider.name}`);
    } catch (error) {
        console.error(`Error syncing provider ${provider.name}:`, error.message);
    }
}

/**
 * Sync all providers that need to be synced
 * @param {Object} db - Database connection
 * @param {number} minutes - Interval in minutes (default 30)
 */
async function syncAllProviders(db, minutes = 30) {
    try {
        const providerModel = new Provider(db);
        const providersToSync = await providerModel.findProvidersToSync(minutes);
        
        console.log(`Found ${providersToSync.length} providers to sync`);
        
        for (const provider of providersToSync) {
            await syncProvider(db, provider);
        }
        
        console.log('Provider sync completed');
    } catch (error) {
        console.error('Error during provider sync:', error.message);
    }
}

/**
 * Start the provider sync service
 * @param {Object} db - Database connection
 * @param {number} intervalMinutes - Sync interval in minutes (default 30)
 */
function startProviderSyncService(db, intervalMinutes = 30) {
    if (syncInterval) {
        console.log('Provider sync service already running');
        return;
    }

    console.log(`Starting provider sync service (every ${intervalMinutes} minutes)`);
    
    // Run immediately on start
    syncAllProviders(db, intervalMinutes);
    
    // Then run at the specified interval
    syncInterval = setInterval(() => {
        syncAllProviders(db, intervalMinutes);
    }, intervalMinutes * 60 * 1000);
}

/**
 * Stop the provider sync service
 */
function stopProviderSyncService() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('Provider sync service stopped');
    }
}

/**
 * Manually trigger a sync
 * @param {Object} db - Database connection
 */
async function triggerManualSync(db) {
    return await syncAllProviders(db, 0);
}

module.exports = {
    startProviderSyncService,
    stopProviderSyncService,
    syncAllProviders,
    syncProvider,
    triggerManualSync
};
