const bcrypt = require('bcryptjs');
const generateReferralCode = require('../utils/utils');

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
        userData.firstName,
        userData.middleName,
        userData.lastName,
        userData.gender,
        userData.email,
        hashedPassword,
        userData.phone,
        userData.dateOfBirth,
        userData.nin
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
    return await bcrypt.compare(password, hashedPassword);
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

  
}

module.exports = User;