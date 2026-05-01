const SovereignTrustAdapter = require('./SovereignTrustAdapter');

// Maps normalised provider name → adapter class.
// Add a new entry here when onboarding a new broker.
const REGISTRY = {
    'sovereign-trust': SovereignTrustAdapter,
    'sovereign_trust': SovereignTrustAdapter,
    'sovereigntrust': SovereignTrustAdapter,
    'sovereign trust': SovereignTrustAdapter,
};

function normalise(name) {
    return name.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Returns the correct adapter instance for a provider DB record.
 * Throws with a clear message if no adapter is registered yet.
 */
function getProviderAdapter(provider) {
    const key = normalise(provider.name);
    const AdapterClass = REGISTRY[key];

    if (!AdapterClass) {
        throw new Error(
            `No adapter registered for provider "${provider.name}". ` +
            `Add the adapter to src/services/providers/index.js to enable this provider.`
        );
    }

    return new AdapterClass(provider);
}

module.exports = { getProviderAdapter };
