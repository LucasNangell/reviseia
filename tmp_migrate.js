import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'reviseia',
  });

  try {
    await pool.query('ALTER TABLE users ADD COLUMN whatsapp VARCHAR(20) DEFAULT NULL');
    console.log("Added whatsapp column to users table.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("whatsapp column already exists.");
    } else {
      console.log("Error:", err.message);
    }
  }
  process.exit();
}

run();
