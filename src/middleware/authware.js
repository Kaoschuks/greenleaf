const jwt = require('jsonwebtoken');
const db = require('../config/db');
const Admin = require('../models/AdminUser');
const User = require('../models/User');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) return res.status(401).json({ error: 'Access token required' });

  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let account;
    const userModel = new User(db);
    const adminModel = new Admin(db);
    if (decoded.type === 'admin') {
      account = await adminModel.findById(decoded.id);
    } else if (decoded.type === 'user') {
      account = await userModel.findById(decoded.id);
    } else {
      return res.status(403).json({ error: 'Invalid account type' });
    }

    if (!account) {
      return res.status(403).json({ error: 'Account no longer exists' });
    }

    req.user = account;
    req.userType = decoded.type;
    next();
  }
  catch(err){
    console.error(err)
    return res.status(403).json({ error: 'Invalid token' });
  }
}

module.exports = authenticateToken;
