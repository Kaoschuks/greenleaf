const axios = require('axios');
const NodeCache = require('node-cache');

const tokenCache = new NodeCache(); // Default TTL is 0; we'll set per entry

const TOKEN_CACHE_KEY = 'sovereign_auth_token';
const TOKEN_TTL_SECONDS = 3600;

async function fetchNewTokenFromAuthAPI() {
  try {
    const response = await axios.post(process.env.SOVEREIGN_URL, {
      user: {
        "email": process.env.SOVEREIGN_USER,
        'password': process.env.SOVEREIGN_PASSWORD
      }
    });

    return response.data.user.token; // Adjust based on actual response
  } catch (err) {
    console.error('Failed to fetch token:', err.message);
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