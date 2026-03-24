class UserNotification {
    constructor(db) {
        this.db = db;
    }

    async create(notificationData) {
        const [result] = await this.db.execute(
            `INSERT INTO user_notifications (user_id, title, message, type)
             VALUES (?, ?, ?, ?)`,
            [
                notificationData.user_id,
                notificationData.title,
                notificationData.message,
                notificationData.type || 'general'
            ]
        );
        return result;
    }

    async findByUserId(userId, limit = 50, offset = 0) {
        const [rows] = await this.db.execute(
            `SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return rows;
    }

    async findUnreadByUserId(userId) {
        const [rows] = await this.db.execute(
            `SELECT * FROM user_notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    }

    async countUnread(userId) {
        const [rows] = await this.db.execute(
            `SELECT COUNT(*) as count FROM user_notifications WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );
        return rows[0].count;
    }

    async markAsRead(id, userId) {
        const [result] = await this.db.execute(
            `UPDATE user_notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
        return result;
    }

    async markAllAsRead(userId) {
        const [result] = await this.db.execute(
            `UPDATE user_notifications SET is_read = TRUE WHERE user_id = ?`,
            [userId]
        );
        return result;
    }

    async delete(id, userId) {
        const [result] = await this.db.execute(
            `DELETE FROM user_notifications WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
        return result;
    }
}

module.exports = UserNotification;
