const {PolicyStatus,PolicyFrequency} = require('../utils/enums');
const getCurrentDateTime = require('../utils/utils');

class Policy{
    constructor(db) {
        this.db = db;
    }

    async create(policyData, userId) {
        const now = new Date();
        const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
        const [result] = await db.execute(`INSERT INTO insurance_policies (user_id,the_name, provider_name, cost, frequency, 
            next_payment_time, the_status, provider_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId,policyData.name, policyData.provider, policyData.cost, policyData.frequency, getCurrentDateTime(), 
        PolicyStatus.INREVIEW, provider_reference]);
    }

    async getPolicies(userId, page = 1, size = 10){
        const offset = (page - 1) * size;
        const [rows] = await this.db.execute(
      `SELECT * FROM insurance_policies WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, size, offset]);
      return rows;
    }
}

module.exports = Policy;