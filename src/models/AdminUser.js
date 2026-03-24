const bcrypt = require('bcryptjs');

class AdminUser {
    constructor(db) {
        this.db = db;
    }

    async create(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const role = userData.role || 'admin';
        const [result] = await this.db.execute(
          `INSERT INTO admin_users (first_name, last_name, username, password, role)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userData.firstname || null,
            userData.lastname || null,
            userData.username || null,
            hashedPassword,
            role
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

    async findAll(page = 1, size = 10) {
        const offset = (page - 1) * size;
        const [rows] = await this.db.execute(
          `SELECT id, first_name, last_name, username, role, created_at, updated_at 
           FROM admin_users 
           ORDER BY created_at DESC 
           LIMIT ${parseInt(size)} OFFSET ${parseInt(offset)}`
        );
        return rows;
    }

    async update(adminId, userData) {
        const updates = [];
        const params = [];

        if (userData.firstname) {
          updates.push(`first_name = ?`);
          params.push(userData.firstname);
        }
        if (userData.lastname) {
          updates.push(`last_name = ?`);
          params.push(userData.lastname);
        }
        if (userData.username) {
          updates.push(`username = ?`);
          params.push(userData.username);
        }
        if (userData.role) {
          updates.push(`role = ?`);
          params.push(userData.role);
        }
        if (userData.password) {
          updates.push(`password = ?`);
          params.push(await bcrypt.hash(userData.password, 10));
        }

        if (updates.length === 0) return { affectedRows: 0 };

        params.push(adminId);
        const [result] = await this.db.execute(
          `UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
        return result;
    }

    async delete(adminId) {
        const [result] = await this.db.execute(
          `DELETE FROM admin_users WHERE id = ?`,
          [adminId]
        );
        return result;
    }
}

module.exports = AdminUser;
