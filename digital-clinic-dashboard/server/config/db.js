// server/config/db.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    /* // THIS BLOCK MUST BE COMMENTED OUT FOR LOCAL DEVELOPMENT
    ssl: {
        rejectUnauthorized: false
    }
    */
});

// Test the database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('--- Database Connection Error ---');
        console.error('Error acquiring client from DB pool:', err.stack);
        console.error('Please check your DATABASE_URL in server/.env and ensure PostgreSQL is running and accessible.');
        console.error('---------------------------------');
        return;
    }
    console.log('Successfully connected to PostgreSQL database!');
    release();
});

module.exports = pool;
