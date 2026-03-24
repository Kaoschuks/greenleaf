const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function importDatabase() {
  const sql = fs.readFileSync('./src/dbscript.sql', 'utf8');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('Importing database...');
    await connection.query(sql);
    console.log('Database imported successfully!');
  } catch (error) {
    console.error('Error importing database:', error.message);
  } finally {
    await connection.end();
  }
}

importDatabase();
