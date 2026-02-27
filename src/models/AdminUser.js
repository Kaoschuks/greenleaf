const bcrypt = require('bcryptjs');

class AdminUser {
    constructor(db) {
        this.db = db;
    }

    async create(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const [result] = await this.db.execute(
          `INSERT INTO admin_users (first_name, last_name, username, password, role)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userData.firstname,
            userData.lastname,
            userData.username,
            hashedPassword,
            userData.role
          ]
        );
        return result;
    }

    async findByUsername(username) {
        const [rows] = await this.db.execute(
          `SELECT * FROM admin_users WHERE username = ?`, [username]
        );
        return rows[0];
    }

    async findById(id) {
        const [rows] = await this.db.execute(`SELECT * FROM admin_users WHERE id = ?`, [id]);
        return rows[0];
    }
}

module.exports = AdminUser;