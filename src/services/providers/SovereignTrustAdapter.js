const axios = require('axios');
const NodeCache = require('node-cache');
const BaseProviderAdapter = require('./BaseProviderAdapter');

const TOKEN_KEY = 'token';
const TOKEN_TTL = 3600;

// Shared token cache keyed by base URL so multiple instances for the same
// provider don't each fetch their own token on every request.
const tokenCacheMap = new Map();

class SovereignTrustAdapter extends BaseProviderAdapter {
    constructor(provider) {
        super(provider);
        this.baseUrl = (provider.api_base_url || process.env.SOVEREIGN_URL || 'http://206.189.119.166:8040/api').replace(/\/$/, '');
        this.email = provider.agent_email || process.env.SOVEREIGN_USER;
        this.password = provider.agent_password || process.env.SOVEREIGN_PASSWORD;

        if (!tokenCacheMap.has(this.baseUrl)) {
            tokenCacheMap.set(this.baseUrl, new NodeCache());
        }
        this.tokenCache = tokenCacheMap.get(this.baseUrl);
    }

    async _getToken(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = this.tokenCache.get(TOKEN_KEY);
            if (cached) return cached;
        }

        const response = await axios.post(`${this.baseUrl}/users/login`, {
            user: { email: this.email, password: this.password }
        });

        const token = response.data.user.token;
        this.tokenCache.set(TOKEN_KEY, token, TOKEN_TTL);
        return token;
    }

    async _request(method, endpoint, data = null) {
        const token = await this._getToken();
        try {
            const response = await axios({
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Authorization': `Token ${token}`
                },
                data
            });
            // console.log(`[SovereignTrust] ${method} ${endpoint} response:`, JSON.stringify(response.data));
            return response.data;
        } catch (err) {
            console.error(`Sovereign Trust API error [${method} ${endpoint}]:`, err.response?.data || err.message);
            throw err;
        }
    }

    async buyPolicy(policyType, payload) {
        const { persona, vehicle, cargoes, items, trip, quote_price, pin, payment_source } = payload;
        const base = { persona, quote_price, pin, payment_source };

        switch (policyType) {
            case 'vehicle':
                return this._request('POST', '/agents/buy-vehicle-policy', { ...base, vehicle });
            case 'marine':
                return this._request('POST', '/agents/buy-marine-policy', { ...base, marine: cargoes });
            case 'allrisk':
                return this._request('POST', '/agents/buy-all-risk-policy', { ...base, allrisk: items, total_items: items ? items.length : 1 });
            case 'travel':
                return this._request('POST', '/agents/buy-travel-policy', { ...base, travel: trip });
            case 'swiss':
                return this._request('POST', '/agents/buy-swiss-policy', base);
            default:
                throw new Error(`Sovereign Trust does not support policy type: ${policyType}`);
        }
    }

    async renewPolicy(policyType, providerReference, amount) {
        if (policyType !== 'vehicle') {
            throw new Error(`Sovereign Trust does not support renewal for policy type: ${policyType}`);
        }
        return this._request('POST', '/renew-vehicle-policy', {
            policy_number: providerReference,
            payment_amount: amount,
            payment_mode: 'wallet'
        });
    }

    async getPolicy(policyNumber) {
        return this._request('POST', '/get-niid-policy', { policy_number: policyNumber });
    }

    async getWalletDetails() {
        return this._request('GET', '/wallet');
    }

    async getWalletHistory() {
        return this._request('GET', '/wallet-history');
    }

    async getVehicleBrands() {
        return this._request('GET', '/vehicle-brands');
    }

    async getVehicleModels(brandId) {
        // ST collection has a copy-paste error for this endpoint — update path if ST returns 404
        return this._request('GET', `/vehicle-brand-types?brand_id=${brandId}`);
    }

    async getMyClaims() {
        return this._request('GET', '/my-claims');
    }

    async makeClaim(data) {
        return this._request('POST', '/make-claim', data);
    }

    async trackClaim(claimNumber) {
        return this._request('POST', '/track-claim', { claim_number: claimNumber });
    }

    async getQuote(policyType, data) {
        switch (policyType) {
            case 'vehicle':
                return this._request('POST', '/get-vehicle-quote', data);
            case 'marine':
                return this._request('POST', '/get-marine-quote', data);
            case 'allrisk':
                return this._request('POST', '/get-all-risk-quote', data);
            case 'travel':
                return this._request('POST', '/get-travel-quote', data);
            case 'swiss':
                return this._request('POST', '/get-swiss-quote', data);
            default:
                throw new Error(`No quote endpoint for policy type: ${policyType}`);
        }
    }
}

module.exports = SovereignTrustAdapter;
