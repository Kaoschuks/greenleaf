class UserSettings {
    constructor(db) {
        this.db = db;
    }

    async create(settingsData) {
        const [result] = await this.db.execute(
            `INSERT INTO user_settings (user_id, email_notifications, push_notifications, sms_notifications, policy_reminders, marketing_emails)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                settingsData.user_id,
                settingsData.email_notifications !== false,
                settingsData.push_notifications !== false,
                settingsData.sms_notifications || false,
                settingsData.policy_reminders !== false,
                settingsData.marketing_emails || false
            ]
        );
        return result;
    }

    async findByUserId(userId) {
        const [rows] = await this.db.execute(
            `SELECT * FROM user_settings WHERE user_id = ?`,
            [userId]
        );
        return rows[0];
    }

    async update(userId, settingsData) {
        const updates = [];
        const params = [];

        if (settingsData.email_notifications !== undefined) {
            updates.push(`email_notifications = ?`);
            params.push(settingsData.email_notifications);
        }
        if (settingsData.push_notifications !== undefined) {
            updates.push(`push_notifications = ?`);
            params.push(settingsData.push_notifications);
        }
        if (settingsData.sms_notifications !== undefined) {
            updates.push(`sms_notifications = ?`);
            params.push(settingsData.sms_notifications);
        }
        if (settingsData.policy_reminders !== undefined) {
            updates.push(`policy_reminders = ?`);
            params.push(settingsData.policy_reminders);
        }
        if (settingsData.marketing_emails !== undefined) {
            updates.push(`marketing_emails = ?`);
            params.push(settingsData.marketing_emails);
        }

        if (updates.length === 0) return { affectedRows: 0 };

        params.push(userId);
        const [result] = await this.db.execute(
            `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`,
            params
        );
        return result;
    }

    async createOrUpdate(userId, settingsData) {
        const existing = await this.findByUserId(userId);
        if (existing) {
            return await this.update(userId, settingsData);
        } else {
            settingsData.user_id = userId;
            return await this.create(settingsData);
        }
    }
}

module.exports = UserSettings;
