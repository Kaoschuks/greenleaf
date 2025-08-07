const PolicyStatus = Object.freeze({
    INREVIEW: 'in_review',
    ACTIVE: 'active',
    CANCELLED: 'cancelled'
});

const PolicyFrequency = Object.freeze({
    MONTHLY: 'monthly',
    YEARLY: 'yearly'
});

module.exports = {PolicyStatus,PolicyFrequency};