const { Pool } = require('pg');
require('dotenv').config();

// Create a new connection pool using individual environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Export a query function that logs the query text
module.exports = {
  query: (text, params) => pool.query(text, params),
};