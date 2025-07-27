// server/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
    process.exit(1);
}

// Function to handle user registration
exports.register = async (req, res) => {
    const { email, password, role = 'patient', name, age, gender, contactInfo, dietaryRestrictions, allergies } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Email, password, and name are required for registration.' });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query('BEGIN');

        // UPDATED: Insert name into Users table
        const newUserResult = await pool.query(
            'INSERT INTO Users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING id',
            [email, hashedPassword, role, name]
        );
        const userId = newUserResult.rows[0].id;

        if (role === 'doctor') {
            if (!req.body.specialization) {
                await pool.query('ROLLBACK'); // Rollback if specialization is missing for doctor
                return res.status(400).json({ message: 'Specialization is required for doctor registration.' });
            }
            // UPDATED: Only insert doctor-specific fields (name is in Users table now)
            await pool.query(
                'INSERT INTO Doctors (user_id, name, specialization, contact_info) VALUES ($1, $2, $3, $4)', // Keep name here for Doctors table, as it's part of Doctors profile details
                [userId, name, req.body.specialization, contactInfo]
            );
        } else if (role === 'patient') {
            // UPDATED: Only insert patient-specific fields (name is in Users table now)
            await pool.query(
                'INSERT INTO Patients (user_id, name, age, gender, contact_info, dietary_restrictions, allergies) VALUES ($1, $2, $3, $4, $5, $6, $7)', // Keep name here for Patients table, as it's part of Patients profile details
                [userId, name, age, gender, contactInfo, dietaryRestrictions, allergies]
            );
        }

        await pool.query('COMMIT');
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    }
};

// Function to handle user login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // UPDATED: Fetch name directly from Users table
        const userResult = await pool.query('SELECT id, email, password_hash, role, name FROM Users WHERE email = $1', [email]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Name is now directly from 'user' object from Users table
        const userName = user.name;

        // Generate JWT (JSON Web Token) with updated payload
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: userName }, // Include name in token
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Send the token and comprehensive user info back to the client
        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: userName
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
};