// server/controllers/authController.js
const bcrypt = require('bcryptjs'); // For password hashing
const pool = require('../config/db'); // Our database connection pool
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Function to handle user registration
exports.register = async (req, res) => {
    const { email, password, role = 'patient', name, age, gender, contactInfo, dietaryRestrictions, allergies } = req.body;

    // Basic validation
    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Email, password, and name are required for registration.' });
    }

    try {
        // 1. Check if user with this email already exists
        const userCheck = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
        const hashedPassword = await bcrypt.hash(password, salt); // Hash the password with the salt

        // 3. Insert new user into Users table
        // We use 'RETURNING id' to get the new user's ID back after insertion
        const newUserResult = await pool.query(
            'INSERT INTO Users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
            [email, hashedPassword, role]
        );
        const userId = newUserResult.rows[0].id; // Get the newly created user's ID

        // 4. Depending on the role, insert into specific table (Doctors or Patients)
        if (role === 'doctor') {
            // For a doctor, 'specialization' and 'contactInfo' are also required
            // In a real app, you might have more robust validation for doctor creation
            if (!req.body.specialization) {
                 // Clean up the created user if doctor specific details are missing
                await pool.query('DELETE FROM Users WHERE id = $1', [userId]);
                return res.status(400).json({ message: 'Specialization is required for doctor registration.' });
            }
            await pool.query(
                'INSERT INTO Doctors (user_id, name, specialization, contact_info) VALUES ($1, $2, $3, $4)',
                [userId, name, req.body.specialization, contactInfo]
            );
        } else if (role === 'patient') {
            // For a patient, insert into Patients table
            await pool.query(
                'INSERT INTO Patients (user_id, name, age, gender, contact_info, dietary_restrictions, allergies) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [userId, name, age, gender, contactInfo, dietaryRestrictions, allergies]
            );
        }
        // Add else if for 'staff' later if they have specific staff profiles

        // 5. Send success response
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('Registration error:', error);
        // Check for specific error codes if needed (e.g., unique constraint violation)
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    }
};
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // 1. Check if user exists by email
        const userResult = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
        const user = userResult.rows[0]; // Get the first row (user object)

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // 2. Compare provided password with stored hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // 3. Generate JWT (JSON Web Token)
        // The payload contains data we want to include in the token (e.g., user ID, email, role)
        // DO NOT put sensitive data like passwords in the token payload!
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // 4. Send the token and basic user info back to the client
        res.json({
            message: 'Login successful!',
            token, // The JWT
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
};
// Other controller functions (login, etc.) will be added here later.
// exports.login = async (req, res) => { ... };