const { PolicyStatus, PolicyFrequency } = require('../utils/enums');
const { getCurrentDateTime } = require('../utils/utils');

class Policy {
    constructor(db) {
        this.db = db;
    }

    async create(policyData, userId) {
        const [result] = await this.db.execute(
            `INSERT INTO insurance_policies (user_id, the_name, provider_name, cost, frequency, 
            next_payment_time, the_status, provider_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                policyData.name,
                policyData.provider,
                policyData.cost,
                policyData.frequency,
                getCurrentDateTime(),
                PolicyStatus.INREVIEW,
                policyData.provider_reference || null
            ]
        );
        return result;
    }

    async getByUserId(userId, page = 1, size = 10) {
        const offset = (page - 1) * size;
        const [rows] = await this.db.execute(
            `SELECT p.*, 
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                p.cost as premium,
                p.the_name as policy_type
             FROM insurance_policies p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ? 
             ORDER BY p.created_at DESC LIMIT ${parseInt(size)} OFFSET ${parseInt(offset)}`,
            [userId]
        );
        return rows;
    }

    async getAll(page = 1, size = 10, providerName = null) {
        const offset = (page - 1) * size;
        let query = `SELECT p.*, 
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            p.cost as premium,
            p.the_name as policy_type
         FROM insurance_policies p
         LEFT JOIN users u ON p.user_id = u.id`;
        const params = [];

        if (providerName) {
            query += ` WHERE p.provider_name = ?`;
            params.push(providerName);
        }

        query += ` ORDER BY p.created_at DESC LIMIT ${parseInt(size)} OFFSET ${parseInt(offset)}`;

        const [rows] = await this.db.execute(query, params);
        return rows;
    }

    async getById(policyId) {
        const [rows] = await this.db.execute(
            `SELECT p.*, 
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                p.cost as premium,
                p.the_name as policy_type
             FROM insurance_policies p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.id = ?`,
            [policyId]
        );
        return rows[0];
    }

    async update(policyId, policyData) {
        const updates = [];
        const params = [];

        if (policyData.name) {
            updates.push(`the_name = ?`);
            params.push(policyData.name);
        }
        if (policyData.provider) {
            updates.push(`provider_name = ?`);
            params.push(policyData.provider);
        }
        if (policyData.cost || policyData.premium) {
            updates.push(`cost = ?`);
            params.push(policyData.cost || policyData.premium);
        }
        if (policyData.frequency) {
            updates.push(`frequency = ?`);
            params.push(policyData.frequency);
        }
        if (policyData.status) {
            updates.push(`the_status = ?`);
            params.push(policyData.status);
        }
        if (policyData.provider_reference) {
            updates.push(`provider_reference = ?`);
            params.push(policyData.provider_reference);
        }
        if (policyData.activation_date) {
            updates.push(`activation_date = ?`);
            params.push(policyData.activation_date);
        }
        if (policyData.policy_number) {
            updates.push(`policy_number = ?`);
            params.push(policyData.policy_number);
        }
        if (policyData.sum_insured) {
            updates.push(`sum_insured = ?`);
            params.push(policyData.sum_insured);
        }
        if (policyData.policy_type) {
            updates.push(`policy_type = ?`);
            params.push(policyData.policy_type);
        }
        if (policyData.coverage_type) {
            updates.push(`coverage_type = ?`);
            params.push(policyData.coverage_type);
        }
        if (policyData.start_date) {
            updates.push(`start_date = ?`);
            params.push(policyData.start_date);
        }
        if (policyData.end_date) {
            updates.push(`end_date = ?`);
            params.push(policyData.end_date);
        }

        if (updates.length === 0) return { affectedRows: 0 };

        params.push(policyId);
        const [result] = await this.db.execute(
            `UPDATE insurance_policies SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        return result;
    }

    async delete(policyId) {
        const [result] = await this.db.execute(
            `DELETE FROM insurance_policies WHERE id = ?`,
            [policyId]
        );
        return result;
    }

    async getTransactions(policyId) {
        const [rows] = await this.db.execute(
            `SELECT * FROM wallet_transactions WHERE policy_id = ? ORDER BY created_at DESC`,
            [policyId]
        );
        return rows;
    }

    async getStats() {
        // Get total count
        const [totalResult] = await this.db.execute(
            `SELECT COUNT(*) as count FROM insurance_policies`
        );
        
        // Get active count
        const [activeResult] = await this.db.execute(
            `SELECT COUNT(*) as count FROM insurance_policies WHERE the_status = 'active'`
        );
        
        // Get expired count
        const [expiredResult] = await this.db.execute(
            `SELECT COUNT(*) as count FROM insurance_policies WHERE the_status = 'expired'`
        );
        
        // Get cancelled count
        const [cancelledResult] = await this.db.execute(
            `SELECT COUNT(*) as count FROM insurance_policies WHERE the_status = 'cancelled'`
        );
        
        // Get pending/in_review count
        const [pendingResult] = await this.db.execute(
            `SELECT COUNT(*) as count FROM insurance_policies WHERE the_status IN ('pending', 'in_review')`
        );
        
        // Get total premium sum
        const [premiumResult] = await this.db.execute(
            `SELECT SUM(cost) as total FROM insurance_policies`
        );

        return {
            total: totalResult[0]?.count || 0,
            active: activeResult[0]?.count || 0,
            expired: expiredResult[0]?.count || 0,
            cancelled: cancelledResult[0]?.count || 0,
            pending: pendingResult[0]?.count || 0,
            total_premium: premiumResult[0]?.total || 0
        };
    }
}

module.exports = Policy;
