const axios = require('axios');
const NodeCache = require('node-cache');

const tokenCache = new NodeCache();

const TOKEN_CACHE_KEY = 'sovereign_auth_token';
const TOKEN_TTL_SECONDS = 3600; // 1 hour

const API_BASE_URL = process.env.SOVEREIGN_URL || 'http://206.189.119.166:8040/api';

// Token management
async function fetchNewTokenFromAuthAPI() {
  try {
    const response = await axios.post(`${API_BASE_URL}/users/login`, {
      user: {
        email: process.env.SOVEREIGN_USER,
        password: process.env.SOVEREIGN_PASSWORD
      }
    });

    return response.data.user.token;
  } catch (err) {
    console.error('Failed to fetch Sovereign token:', err.response?.data || err.message);
    throw err;
  }
}

async function getToken(forceRefresh = false) {
  if (!forceRefresh) {
    const cachedToken = tokenCache.get(TOKEN_CACHE_KEY);
    if (cachedToken) return cachedToken;
  }

  const newToken = await fetchNewTokenFromAuthAPI();
  tokenCache.set(TOKEN_CACHE_KEY, newToken, TOKEN_TTL_SECONDS);
  return newToken;
}

// Generic API request helper
async function sovereignRequest(method, endpoint, data = null, useToken = true) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  };

  if (useToken) {
    const token = await getToken();
    headers['Authorization'] = `Token ${token}`;
  }

  const config = {
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers,
    data
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (err) {
    console.error(`Sovereign API Error [${method} ${endpoint}]:`, err.response?.data || err.message);
    throw err;
  }
}

// ==================== WALLET OPERATIONS ====================

async function getWalletDetails() {
  return sovereignRequest('GET', '/wallet');
}

async function getWalletHistory() {
  return sovereignRequest('GET', '/wallet-history');
}

async function fundWallet(walletUid, amount, description = 'Funding') {
  return sovereignRequest('POST', '/fund-wallet', {
    amount,
    description,
    transaction_type: 'CREDIT',
    wallet_uid: walletUid
  });
}

async function debitWallet(walletUid, amount, description = 'Withdrawal') {
  return sovereignRequest('POST', '/debit-wwallet', {
    amount,
    description,
    transaction_type: 'DEBIT',
    wallet_uid: walletUid
  });
}

// ==================== POLICY OPERATIONS (Agent) ====================

async function buyVehiclePolicy({ persona, vehicle, quote_price, pin, payment_source }) {
  return sovereignRequest('POST', '/agents/buy-vehicle-policy', {
    persona,
    vehicle,
    quote_price,
    pin,
    payment_source
  });
}

async function buyMarinePolicy({ persona, cargoes, quote_price, pin, payment_source }) {
  return sovereignRequest('POST', '/agents/buy-marine-policy', {
    persona,
    marine: cargoes,
    quote_price,
    pin,
    payment_source
  });
}

async function buySwissPolicy({ persona, quote_price, pin, payment_source }) {
  return sovereignRequest('POST', '/agents/buy-swiss-policy', {
    persona,
    quote_price,
    pin,
    payment_source
  });
}

async function buyAllRiskPolicy({ persona, items, total_items, quote_price, pin, payment_source }) {
  return sovereignRequest('POST', '/agents/buy-all-risk-policy', {
    persona,
    allrisk: items,
    total_items,
    quote_price,
    pin,
    payment_source
  });
}

async function buyTravelPolicy({ persona, trip, quote_price, pin, payment_source }) {
  return sovereignRequest('POST', '/agents/buy-travel-policy', {
    persona,
    travel: trip,
    quote_price,
    pin,
    payment_source
  });
}

async function renewVehiclePolicy(policyNumber, paymentAmount, paymentMode = 'paystack') {
  return sovereignRequest('POST', '/renew-vehicle-policy', {
    policy_number: policyNumber,
    payment_amount: paymentAmount,
    payment_mode: paymentMode
  });
}

async function getPolicy(policyNumber) {
  return sovereignRequest('POST', '/get-niid-policy', {
    policy_number: policyNumber
  });
}

// ==================== CLAIMS ====================

async function createClaim(claimData) {
  return sovereignRequest('POST', '/claims', claimData);
}

module.exports = {
  getToken,
  getWalletDetails,
  getWalletHistory,
  fundWallet,
  debitWallet,
  buyVehiclePolicy,
  buyMarinePolicy,
  buySwissPolicy,
  buyAllRiskPolicy,
  buyTravelPolicy,
  renewVehiclePolicy,
  getPolicy,
  createClaim,
  sovereignRequest
};
