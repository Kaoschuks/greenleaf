// middleware/db.js
const pool = require('../config/db');

const dbMiddleware = async (req, res, next) => {
  req.db = await pool.getConnection();
  res.on('finish', () => {
    if (req.db) req.db.release(); // auto-release
  });
  next();
};

module.exports = dbMiddleware;
