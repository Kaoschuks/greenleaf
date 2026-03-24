// middleware/db.js
const pool = require('../config/db');

const dbMiddleware = async (req, res, next) => {
  req.db = await pool.getConnection();
  res.on('finish', () => {
    if (req.db) req.db.release(); // auto-release
  });
  next();
};

// Export function to get database pool directly
function getDb() {
  return pool;
}

module.exports = dbMiddleware;
module.exports.getDb = getDb;
