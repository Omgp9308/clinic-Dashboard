// server/controllers/adminController.js
const bcrypt = require('bcryptjs'); // For password hashing (when adding new doctor user)
const pool = require('../config/db'); // Our database connection pool

// 1. Admin: Add a new doctor
exports.addDoctor = async (req, res) => {
    // Admin creates a User entry for the doctor, then a Doctor profile
    const { email, password, name, specialization, contactInfo } = req.body;

    // Basic validation for doctor details
    if (!email || !password || !name || !specialization) {
        return res.status(400).json({ message: 'Email, password, name, and specialization are required for doctor.' });
    }

    try {
        // Check if user with this email already exists
        const userCheck = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        // Hash the password for the new doctor user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Start a transaction for atomicity
        // This ensures that either both User and Doctor entries are created, or neither are.
        await pool.query('BEGIN');

        // 1. Create a User entry with 'doctor' role
        const newUserResult = await pool.query(
            'INSERT INTO Users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
            [email, hashedPassword, 'doctor']
        );
        const userId = newUserResult.rows[0].id; // Get the ID of the newly created user

        // 2. Create the Doctor profile, linking to the new User
        await pool.query(
            'INSERT INTO Doctors (user_id, name, specialization, contact_info) VALUES ($1, $2, $3, $4)',
            [userId, name, specialization, contactInfo]
        );

        await pool.query('COMMIT'); // Commit the transaction
        res.status(201).json({ message: 'Doctor added successfully!' });

    } catch (error) {
        await pool.query('ROLLBACK'); // Rollback the transaction on error
        console.error('Admin addDoctor error:', error);
        res.status(500).json({ message: 'Server error adding doctor.', error: error.message });
    }
};

// 2. Admin: Monitor the overall patient queue
exports.monitorQueue = async (req, res) => {
    try {
        // Select relevant information from Queue, Patients, and Doctors tables
        const queueResult = await pool.query(`
            SELECT
                Q.id AS queue_entry_id,
                Q.queue_number,
                Q.status,
                Q.entered_at,
                P.name AS patient_name,
                P.age AS patient_age,
                D.name AS doctor_name,
                D.specialization AS doctor_specialization
            FROM Queue Q
            JOIN Patients P ON Q.patient_id = P.id
            JOIN Doctors D ON Q.doctor_id = D.id
            WHERE Q.status = 'waiting' OR Q.status = 'consulting'
            ORDER BY Q.entered_at ASC;
        `);
        res.json(queueResult.rows);

    } catch (error) {
        console.error('Admin monitorQueue error:', error);
        res.status(500).json({ message: 'Server error monitoring queue.', error: error.message });
    }
};

// 3. Admin: Get the total number of registered patients
exports.getRegisteredPatientsCount = async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM Patients');
        const patientCount = parseInt(result.rows[0].count, 10); // COUNT(*) returns a string
        res.json({ count: patientCount });

    } catch (error) {
        console.error('Admin getRegisteredPatientsCount error:', error);
        res.status(500).json({ message: 'Server error getting patient count.', error: error.message });
    }
};