// server/config/db.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config(); // Ensure environment variables are loaded here too

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Optional: SSL configuration for production.
    // If your hosted PostgreSQL requires SSL (like Render's Free Tier Postgres):
    ssl: {
        rejectUnauthorized: false // This bypasses strict certificate checks, common for self-signed or certain cloud providers
    }
});

// Test the database connection when the pool is created
pool.connect((err, client, release) => {
    if (err) {
        console.error('--- Database Connection Error ---');
        console.error('Error acquiring client from DB pool:', err.stack);
        console.error('Please check your DATABASE_URL in server/.env and ensure PostgreSQL is running and accessible.');
        console.error('---------------------------------');
        return;
    }
    console.log('Successfully connected to PostgreSQL database!');
    release(); // Release the client back to the pool immediately after testing
});

module.exports = pool; // Export the pool so other files can use it for queries