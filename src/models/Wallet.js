class Wallet {
  constructor(db) {
    this.db = db;
  }

  async generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TXN${timestamp}${random}`;
  }

  async getBalance(userId) {
    const [rows] = await this.db.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
    return rows[0]?.balance || "0.00";
  }

  async credit(userId, amount, description = '', policyId = null) {
    const [wallet] = await this.db.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
    const balanceBefore = wallet[0]?.balance || 0;
    const balanceAfter = parseFloat(balanceBefore) + parseFloat(amount);
    const transactionId = await this.generateTransactionId();
    const reference = `CR-${Date.now()}`;
    
    await this.db.beginTransaction();
    try {
      await this.db.execute(
        `INSERT INTO wallet_transactions (transaction_id, user_id, policy_id, type, amount, reference, status, balance_before, balance_after, description) VALUES (?, ?, ?, 'credit', ?, ?, 'completed', ?, ?, ?)`,
        [transactionId, userId, policyId, amount, reference, balanceBefore, balanceAfter, description]
      );
      await this.db.execute(
        `INSERT INTO wallets (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = balance + ?`,
        [userId, amount, amount]
      );
      await this.db.commit();
    } catch (err) {
      await this.db.rollback();
      throw err;
    }
  }

  async debit(userId, amount, description = '', policyId = null) {
    const [wallet] = await this.db.execute(`SELECT balance FROM wallets WHERE user_id = ?`, [userId]);
    const balanceBefore = wallet[0]?.balance || 0;
    
    if (parseFloat(balanceBefore) < parseFloat(amount)) {
      throw new Error('Insufficient funds');
    }
    
    const balanceAfter = parseFloat(balanceBefore) - parseFloat(amount);
    const transactionId = await this.generateTransactionId();
    const reference = `DR-${Date.now()}`;
    
    await this.db.beginTransaction();
    try {
      await this.db.execute(
        `INSERT INTO wallet_transactions (transaction_id, user_id, policy_id, type, amount, reference, status, balance_before, balance_after, description) VALUES (?, ?, ?, 'debit', ?, ?, 'completed', ?, ?, ?)`,
        [transactionId, userId, policyId, amount, reference, balanceBefore, balanceAfter, description]
      );
      await this.db.execute(
        `UPDATE wallets SET balance = balance - ? WHERE user_id = ?`,
        [amount, userId]
      );
      await this.db.commit();
    } catch (err) {
      await this.db.rollback();
      throw err;
    }
  }

  async getTransactions(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const [rows] = await this.db.execute(
      `SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      [userId]
    );
    return rows;
  }
}

module.exports = Wallet;
