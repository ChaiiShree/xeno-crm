const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');
    console.log('📋 Database:', process.env.DB_NAME);
    console.log('👤 User:', process.env.DB_USER);
    
    const result = await client.query('SELECT NOW()');
    console.log('🕐 Current time from DB:', result.rows[0].now);
    
    client.release();
    await pool.end();
    console.log('🎉 Connection test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();
