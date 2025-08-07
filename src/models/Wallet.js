class Wallet {
  constructor(db) {
    this.db = db;
  }

  async getBalance(userId) {
    const [rows] = await this.db.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
    return rows[0]?.balance || "0.00";
  }

  async credit(userId, amount, description = '') {
    await this.db.beginTransaction();
    try {
      await this.db.execute(`INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES (?, 'credit', ?, ?)`, [userId, amount, description]);
      await this.db.execute(`INSERT INTO wallets (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = balance + ?`, [userId, amount, amount]);
      await this.db.commit();
    } catch (err) {
      await this.db.rollback();
      throw err;
    }
  }

  async debit(userId, amount, description = '') {
    const balance = await this.getBalance(userId);
    if (balance < amount) throw new Error('Insufficient funds');

    await this.db.beginTransaction();
    try {
      await this.db.execute(`INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES (?, 'debit', ?, ?)`, [userId, amount, description]);
      await this.db.execute(`UPDATE wallets SET balance = balance - ? WHERE user_id = ?`, [amount, userId]);
      await this.db.commit();
    } catch (err) {
      await this.db.rollback();
      throw err;
    }
  }

  async getTransactions(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const [rows] = await this.db.execute(
      `SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return rows;
  }
}

module.exports = Wallet;
