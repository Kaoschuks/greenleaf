class BaseProviderAdapter {
    constructor(provider) {
        this.provider = provider;
    }

    async buyPolicy(policyType, payload) {
        throw new Error(`buyPolicy not implemented for ${this.constructor.name}`);
    }

    async renewPolicy(policyType, providerReference, amount) {
        throw new Error(`renewPolicy not implemented for ${this.constructor.name}`);
    }

    async getPolicy(policyNumber) {
        throw new Error(`getPolicy not implemented for ${this.constructor.name}`);
    }

    async getWalletDetails() {
        throw new Error(`getWalletDetails not implemented for ${this.constructor.name}`);
    }

    async getWalletHistory() {
        throw new Error(`getWalletHistory not implemented for ${this.constructor.name}`);
    }
}

module.exports = BaseProviderAdapter;
