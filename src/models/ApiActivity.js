class ApiActivity {
    constructor(db) {
        this.db = db;
    }

    async create(activityData) {
        const [result] = await this.db.execute(
            `INSERT INTO api_activities (user_id, admin_user_id, action, method, endpoint, request_body, response_status, response_body, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                activityData.user_id || null,
                activityData.admin_user_id || null,
                activityData.action,
                activityData.method,
                activityData.endpoint,
                activityData.request_body || null,
                activityData.response_status || null,
                activityData.response_body || null,
                activityData.ip_address || null,
                activityData.user_agent || null
            ]
        );
        return result;
    }

    async findByUserId(userId, limit = 50, offset = 0) {
        const [rows] = await this.db.execute(
            `SELECT * FROM api_activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return rows;
    }

    async findByAdminUserId(adminUserId, limit = 50, offset = 0) {
        const [rows] = await this.db.execute(
            `SELECT * FROM api_activities WHERE admin_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [adminUserId, limit, offset]
        );
        return rows;
    }

    async findAll(limit = 100, offset = 0) {
        const [rows] = await this.db.execute(
            `SELECT * FROM api_activities ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return rows;
    }

    async countByUserId(userId) {
        const [rows] = await this.db.execute(
            `SELECT COUNT(*) as count FROM api_activities WHERE user_id = ?`,
            [userId]
        );
        return rows[0].count;
    }

    async findByDateRange(userId, startDate, endDate) {
        const [rows] = await this.db.execute(
            `SELECT * FROM api_activities WHERE user_id = ? AND created_at BETWEEN ? AND ? ORDER BY created_at DESC`,
            [userId, startDate, endDate]
        );
        return rows;
    }
}

module.exports = ApiActivity;
