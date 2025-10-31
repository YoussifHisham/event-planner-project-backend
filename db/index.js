const { Pool } = require('pg');
require('dotenv').config();

// Create a new connection pool using the Database URL from .env
const pool = new Pool({
  connectionString: process.env.DB_URL,
});

// Export a query function that logs the query text
// This allows us to use this pool in other files
module.exports = {
  query: (text, params) => pool.query(text, params),
};