const bcrypt = require('bcryptjs');
const { generateCode, compareHash } = require('../utils/utils');

class User {

    constructor(db) {
        this.db = db;
      }

  async create(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [result] = await this.db.execute(
      `INSERT INTO users (first_name, middle_name, last_name, gender, email, password, phone, date_of_birth, nin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userData.firstName || null,
        userData.middleName || null,
        userData.lastName || null,
        userData.gender || null,
        userData.email || null,
        hashedPassword,
        userData.phone || null,
        userData.dateOfBirth || null,
        userData.nin || null
      ]
    );
    return result;
  }

  async findByEmail(email) {
    const [rows] = await this.db.execute(
      `SELECT * FROM users WHERE email = ?`, [email]
    );
    return rows[0];
  }

  async validatePassword(password, hashedPassword) {
    return await compareHash(password, hashedPassword);
  }

  async findById(id) {
    const [rows] = await this.db.execute(`SELECT * FROM users WHERE id = ?`, [id]);
    return rows[0];
  }

  async findReferralCode(userId){
    const [userRows] = await this.db.execute('SELECT referral_code FROM users WHERE id = ?', [userId]);

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let referralCode = userRows[0].referral_code;

    if (!referralCode) {
      let isUnique = false;

      while (!isUnique) {
        referralCode = generateCode();
        const [existing] = await this.db.execute('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
        if (existing.length === 0) isUnique = true;
      }

      await this.db.execute('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, userId]);
    }
    return referralCode;
  }

  async update(userId, userData) {
    const updates = [];
    const params = [];

    if (userData.firstName) {
      updates.push(`first_name = ?`);
      params.push(userData.firstName);
    }
    if (userData.middleName) {
      updates.push(`middle_name = ?`);
      params.push(userData.middleName);
    }
    if (userData.lastName) {
      updates.push(`last_name = ?`);
      params.push(userData.lastName);
    }
    if (userData.gender) {
      updates.push(`gender = ?`);
      params.push(userData.gender);
    }
    if (userData.phone) {
      updates.push(`phone = ?`);
      params.push(userData.phone);
    }
    if (userData.dateOfBirth) {
      updates.push(`date_of_birth = ?`);
      params.push(userData.dateOfBirth);
    }
    if (userData.nin) {
      updates.push(`nin = ?`);
      params.push(userData.nin);
    }
    if (userData.profileImage !== undefined) {
      updates.push(`profile_image = ?`);
      params.push(userData.profileImage);
    }
    if (userData.userAddress) {
      updates.push(`user_address = ?`);
      params.push(userData.userAddress);
    }
    if (userData.maritalStatus) {
      updates.push(`marital_status = ?`);
      params.push(userData.maritalStatus);
    }
    if (userData.nextOfKin) {
      updates.push(`next_of_kin = ?`);
      params.push(userData.nextOfKin);
    }
    if (userData.nextOfKinPhone) {
      updates.push(`next_of_kin_phone = ?`);
      params.push(userData.nextOfKinPhone);
    }
    if (userData.nextOfKinEmail) {
      updates.push(`next_of_kin_email = ?`);
      params.push(userData.nextOfKinEmail);
    }
    if (userData.employer) {
      updates.push(`employer = ?`);
      params.push(userData.employer);
    }
    if (userData.employerAddress) {
      updates.push(`employer_address = ?`);
      params.push(userData.employerAddress);
    }
    if (userData.password) {
      updates.push(`password = ?`);
      params.push(await bcrypt.hash(userData.password, 10));
    }

    if (updates.length === 0) return { affectedRows: 0 };

    params.push(userId);
    const [result] = await this.db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return result;
  }

  async delete(userId) {
    await this.db.beginTransaction();
    try {
      // Delete wallet transactions first
      await this.db.execute(`DELETE FROM wallet_transactions WHERE user_id = ?`, [userId]);
      // Delete policies first
      await this.db.execute(`DELETE FROM insurance_policies WHERE user_id = ?`, [userId]);
      // Delete wallet
      await this.db.execute(`DELETE FROM wallets WHERE user_id = ?`, [userId]);
      // Delete user
      const [result] = await this.db.execute(`DELETE FROM users WHERE id = ?`, [userId]);
      await this.db.commit();
      return result;
    } catch (err) {
      await this.db.rollback();
      throw err;
    }
  }
}

module.exports = User;
