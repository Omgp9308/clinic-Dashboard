// server/controllers/publicController.js
const pool = require('../config/db');

// Get all doctors (accessible publicly or by any authenticated user for selection)
exports.getAllDoctors = async (req, res) => {
    try {
        const doctorsResult = await pool.query('SELECT id, name, specialization FROM Doctors ORDER BY name ASC');
        res.json(doctorsResult.rows);
    } catch (error) {
        console.error('publicController.getAllDoctors error:', error);
        res.status(500).json({ message: 'Server error fetching doctors.', error: error.message });
    }
};