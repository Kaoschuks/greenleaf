const bcrypt = require('bcryptjs');
function generateCode(length = 5) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

function getCurrentDateTime() {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace('T', ' ');
}

function getCurrentDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

async function compareHash(input, hashed) {
  return await bcrypt.compare(input, hashed);
}

module.exports = {generateCode, getCurrentDateTime, getCurrentDate, compareHash};