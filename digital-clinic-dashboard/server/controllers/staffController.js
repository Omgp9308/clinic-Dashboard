// server/controllers/staffController.js
const pool = require('../config/db'); // Our database connection pool
const bcrypt = require('bcryptjs'); // Needed for password hashing if staff could register users (though currently for doctor via admin)

// 1. Staff: Schedule appointments for patients who arrive directly (walk-ins)
exports.scheduleAppointment = async (req, res) => {
    const {
        patientName,
        patientAge,
        patientGender,
        patientContactInfo,
        patientDietaryRestrictions,
        patientAllergies,
        doctorId,
        appointmentTime
    } = req.body;

    // Basic validation
    if (!patientName || !doctorId || !appointmentTime) {
        return res.status(400).json({ message: 'Patient name, doctor, and appointment time are required.' });
    }

    // Appointment Time Validation (from previous step)
    const now = new Date();
    const appointmentDate = new Date(appointmentTime);

    if (appointmentDate < now) {
        return res.status(400).json({ message: 'Appointment time cannot be in the past.' });
    }

    const minFutureTime = new Date(now.getTime() + 30 * 60 * 1000);
    if (appointmentDate < minFutureTime) {
        return res.status(400).json({ message: 'Appointment must be at least 30 minutes from now.' });
    }

    const maxFutureTime = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    if (appointmentDate > maxFutureTime) {
        return res.status(400).json({ message: 'Appointment cannot be more than 15 days in the future.' });
    }

    const minutes = appointmentDate.getMinutes();
    if (minutes % 15 !== 0) {
        return res.status(400).json({ message: 'Appointment time must be in 15-minute intervals (e.g., XX:00, XX:15, XX:30, XX:45).' });
    }

    try {
        // Start a transaction for atomicity
        await pool.query('BEGIN');

        // 1. Find or create the patient
        let patientId;
        const existingPatient = await pool.query(
            'SELECT id FROM Patients WHERE name = $1 AND age = $2',
            [patientName, patientAge]
        );

        if (existingPatient.rows.length > 0) {
            patientId = existingPatient.rows[0].id;
        } else {
            const newPatientResult = await pool.query(
                'INSERT INTO Patients (name, age, gender, contact_info, dietary_restrictions, allergies) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [patientName, patientAge, patientGender, patientContactInfo, patientDietaryRestrictions, patientAllergies]
            );
            patientId = newPatientResult.rows[0].id;
        }

        // 2. Create the Appointment
        const appointmentResult = await pool.query(
            'INSERT INTO Appointments (patient_id, doctor_id, appointment_time, status, scheduled_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [patientId, doctorId, appointmentTime, 'scheduled', 'staff']
        );
        const appointmentId = appointmentResult.rows[0].id;

        // 3. Add patient to the Queue for the specified doctor
        // UPDATED FIX: Calculate the next queue number across ALL statuses for the doctor
        const lastQueueNumberResult = await pool.query(
            'SELECT COALESCE(MAX(queue_number), 0) AS max_queue_number FROM Queue WHERE doctor_id = $1', // REMOVED: AND status IN (\'waiting\', \'consulting\')
            [doctorId]
        );
        const nextQueueNumber = lastQueueNumberResult.rows[0].max_queue_number + 1;

        await pool.query(
            'INSERT INTO Queue (appointment_id, doctor_id, patient_id, queue_number, status) VALUES ($1, $2, $3, $4, $5)',
            [appointmentId, doctorId, patientId, nextQueueNumber, 'waiting']
        );

        await pool.query('COMMIT');
        res.status(201).json({
            message: 'Appointment scheduled and patient added to queue successfully!',
            appointmentId,
            queueNumber: nextQueueNumber
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Staff scheduleAppointment error:', error);
        res.status(500).json({ message: 'Server error scheduling appointment.', error: error.message });
    }
};

// 2. Staff: See who are the next 3 people in the overall queue (existing)
exports.getNext3InQueue = async (req, res) => {
    try {
        const next3Queue = await pool.query(`
            SELECT
                Q.queue_number,
                P.name AS patient_name,
                D.name AS doctor_name,
                D.specialization
            FROM Queue Q
            JOIN Patients P ON Q.patient_id = P.id
            JOIN Doctors D ON Q.doctor_id = D.id
            WHERE Q.status = 'waiting' OR Q.status = 'consulting'
            ORDER BY Q.entered_at ASC
            LIMIT 3;
        `);
        res.json(next3Queue.rows);

    } catch (error) {
        console.error('Staff getNext3InQueue error:', error);
        res.status(500).json({ message: 'Server error fetching next 3 in queue.', error: error.message });
    }
};