class AdminSettings {
    constructor(db) {
        this.db = db;
    }

    // Get all settings
    async getAll() {
        const [rows] = await this.db.execute('SELECT * FROM admin_settings ORDER BY id DESC LIMIT 1');
        return rows[0] || null;
    }

    // Create or update settings
    async upsert(settingsData) {
        const existing = await this.getAll();
        
        if (existing) {
            // Update existing settings
            const updates = [];
            const params = [];

            if (settingsData.appName !== undefined) {
                updates.push('app_name = ?');
                params.push(settingsData.appName);
            }
            if (settingsData.companyName !== undefined) {
                updates.push('company_name = ?');
                params.push(settingsData.companyName);
            }
            if (settingsData.companyEmail !== undefined) {
                updates.push('company_email = ?');
                params.push(settingsData.companyEmail);
            }
            if (settingsData.companyPhone !== undefined) {
                updates.push('company_phone = ?');
                params.push(settingsData.companyPhone);
            }
            if (settingsData.companyAddress !== undefined) {
                updates.push('company_address = ?');
                params.push(settingsData.companyAddress);
            }
            if (settingsData.companyWebsite !== undefined) {
                updates.push('company_website = ?');
                params.push(settingsData.companyWebsite);
            }
            if (settingsData.supportEmail !== undefined) {
                updates.push('support_email = ?');
                params.push(settingsData.supportEmail);
            }
            if (settingsData.minimumWithdrawal !== undefined) {
                updates.push('minimum_withdrawal = ?');
                params.push(settingsData.minimumWithdrawal);
            }
            if (settingsData.maximumWithdrawal !== undefined) {
                updates.push('maximum_withdrawal = ?');
                params.push(settingsData.maximumWithdrawal);
            }
            if (settingsData.kycRequired !== undefined) {
                updates.push('kyc_required = ?');
                params.push(settingsData.kycRequired ? 1 : 0);
            }
            if (settingsData.maintenanceMode !== undefined) {
                updates.push('maintenance_mode = ?');
                params.push(settingsData.maintenanceMode ? 1 : 0);
            }
            if (settingsData.allowRegistration !== undefined) {
                updates.push('allow_registration = ?');
                params.push(settingsData.allowRegistration ? 1 : 0);
            }
            if (settingsData.referralBonus !== undefined) {
                updates.push('referral_bonus = ?');
                params.push(settingsData.referralBonus);
            }
            if (settingsData.referralBonusType !== undefined) {
                updates.push('referral_bonus_type = ?');
                params.push(settingsData.referralBonusType);
            }
            if (settingsData.transactionFee !== undefined) {
                updates.push('transaction_fee = ?');
                params.push(settingsData.transactionFee);
            }
            if (settingsData.currency !== undefined) {
                updates.push('currency = ?');
                params.push(settingsData.currency);
            }
            if (settingsData.currencySymbol !== undefined) {
                updates.push('currency_symbol = ?');
                params.push(settingsData.currencySymbol);
            }

            if (updates.length === 0) return existing;

            const [result] = await this.db.execute(
                `UPDATE admin_settings SET ${updates.join(', ')} WHERE id = ?`,
                [...params, existing.id]
            );
            return await this.getAll();
        } else {
            // Insert new settings
            const [result] = await this.db.execute(
                `INSERT INTO admin_settings (
                    app_name, company_name, company_email, company_phone, company_address,
                    company_website, support_email, minimum_withdrawal, maximum_withdrawal,
                    kyc_required, maintenance_mode, allow_registration, referral_bonus,
                    referral_bonus_type, transaction_fee, currency, currency_symbol
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    settingsData.appName || 'GreenLeaf',
                    settingsData.companyName || '',
                    settingsData.companyEmail || '',
                    settingsData.companyPhone || '',
                    settingsData.companyAddress || '',
                    settingsData.companyWebsite || '',
                    settingsData.supportEmail || '',
                    settingsData.minimumWithdrawal || 1000,
                    settingsData.maximumWithdrawal || 1000000,
                    settingsData.kycRequired !== undefined ? (settingsData.kycRequired ? 1 : 0) : 1,
                    settingsData.maintenanceMode !== undefined ? (settingsData.maintenanceMode ? 1 : 0) : 0,
                    settingsData.allowRegistration !== undefined ? (settingsData.allowRegistration ? 1 : 0) : 1,
                    settingsData.referralBonus || 500,
                    settingsData.referralBonusType || 'fixed',
                    settingsData.transactionFee || 0,
                    settingsData.currency || 'NGN',
                    settingsData.currencySymbol || '₦'
                ]
            );
            return await this.getAll();
        }
    }

    // Check if in maintenance mode
    async isMaintenanceMode() {
        const settings = await this.getAll();
        return settings && settings.maintenance_mode === 1;
    }

    // Check if registration is allowed
    async isRegistrationAllowed() {
        const settings = await this.getAll();
        return settings && settings.allow_registration === 1;
    }

    // Check if KYC is required
    async isKycRequired() {
        const settings = await this.getAll();
        return settings && settings.kyc_required === 1;
    }
}

module.exports = AdminSettings;
