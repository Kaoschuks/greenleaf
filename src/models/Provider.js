class Provider {
    constructor(db) {
        this.db = db;
    }

    async create(providerData) {
        const [result] = await this.db.execute(
            `INSERT INTO providers (name, display_name, api_base_url, agent_email, agent_password, wallet_uid, wallet_balance, is_active, image, description, website, webhook_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                providerData.name,
                providerData.display_name,
                providerData.api_base_url || null,
                providerData.agent_email,
                providerData.agent_password,
                providerData.wallet_uid || null,
                providerData.wallet_balance || 0,
                providerData.is_active !== false,
                providerData.image || null,
                providerData.description || null,
                providerData.website || null,
                providerData.webhook_url || null
            ]
        );
        return result;
    }

    async findAll() {
        const [rows] = await this.db.execute(
            `SELECT * FROM providers ORDER BY created_at DESC`
        );
        return rows;
    }

    async findById(id) {
        const [rows] = await this.db.execute(
            `SELECT * FROM providers WHERE id = ?`,
            [id]
        );
        return rows[0];
    }

    async findByName(name) {
        const [rows] = await this.db.execute(
            `SELECT * FROM providers WHERE name = ?`,
            [name]
        );
        return rows[0];
    }

    async update(id, providerData) {
        const updates = [];
        const params = [];

        if (providerData.name) {
            updates.push(`name = ?`);
            params.push(providerData.name);
        }
        if (providerData.display_name) {
            updates.push(`display_name = ?`);
            params.push(providerData.display_name);
        }
        if (providerData.api_base_url !== undefined) {
            updates.push(`api_base_url = ?`);
            params.push(providerData.api_base_url);
        }
        if (providerData.agent_email) {
            updates.push(`agent_email = ?`);
            params.push(providerData.agent_email);
        }
        if (providerData.agent_password) {
            updates.push(`agent_password = ?`);
            params.push(providerData.agent_password);
        }
        if (providerData.wallet_uid) {
            updates.push(`wallet_uid = ?`);
            params.push(providerData.wallet_uid);
        }
        if (providerData.wallet_balance !== undefined) {
            updates.push(`wallet_balance = ?`);
            params.push(providerData.wallet_balance);
        }
        if (providerData.is_active !== undefined) {
            updates.push(`is_active = ?`);
            params.push(providerData.is_active);
        }
        if (providerData.image !== undefined) {
            updates.push(`image = ?`);
            params.push(providerData.image);
        }
        if (providerData.description !== undefined) {
            updates.push(`description = ?`);
            params.push(providerData.description);
        }
        if (providerData.website !== undefined) {
            updates.push(`website = ?`);
            params.push(providerData.website);
        }
        if (providerData.webhook_url !== undefined) {
            updates.push(`webhook_url = ?`);
            params.push(providerData.webhook_url);
        }
        if (providerData.last_synced_at !== undefined) {
            updates.push(`last_synced_at = ?`);
            params.push(providerData.last_synced_at);
        }

        if (updates.length === 0) return { affectedRows: 0 };

        params.push(id);
        const [result] = await this.db.execute(
            `UPDATE providers SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        return result;
    }

    async delete(id) {
        const [result] = await this.db.execute(
            `DELETE FROM providers WHERE id = ?`,
            [id]
        );
        return result;
    }

    async updateWalletBalance(id, newBalance) {
        const [result] = await this.db.execute(
            `UPDATE providers SET wallet_balance = ? WHERE id = ?`,
            [newBalance, id]
        );
        return result;
    }

    async updateLastSynced(id) {
        const [result] = await this.db.execute(
            `UPDATE providers SET last_synced_at = NOW() WHERE id = ?`,
            [id]
        );
        return result;
    }

    async findProvidersToSync(minutes = 30) {
        const [rows] = await this.db.execute(
            `SELECT * FROM providers 
             WHERE is_active = TRUE 
             AND (last_synced_at IS NULL OR last_synced_at < DATE_SUB(NOW(), INTERVAL ? MINUTE))
             ORDER BY last_synced_at ASC`,
            [minutes]
        );
        return rows;
    }
}

module.exports = Provider;
