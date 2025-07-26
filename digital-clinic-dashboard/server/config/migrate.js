// server/config/migrate.js
const fs = require('fs'); // Node.js built-in file system module
const path = require('path'); // Node.js built-in path module
const pool = require('./db'); // Our database connection pool

// Define the path to our schema.sql file
const schemaPath = path.join(__dirname, 'schema.sql');

async function migrate() {
    try {
        // Read the SQL commands from schema.sql
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute the SQL commands using the database pool
        await pool.query(schemaSql);

        console.log('Database migration successful: Tables created/recreated!');
    } catch (error) {
        console.error('--- Database Migration Error ---');
        console.error('Failed to run database migration:', error.message);
        console.error('Ensure PostgreSQL is running, DATABASE_URL is correct, and the database exists.');
        console.error('---------------------------------');
        process.exit(1); // Exit with an error code
    } finally {
        // End the pool after migration to close all client connections
        // This is important for a script that runs and then exits.
        await pool.end();
        console.log('Database connection pool closed.');
    }
}

// Execute the migrate function when this script is run
migrate();