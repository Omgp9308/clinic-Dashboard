// server/controllers/patientController.js
const pool = require('../config/db');

// Helper function to get patient_id from user_id
async function getPatientIdFromUserId(userId) {
    const patientResult = await pool.query('SELECT id FROM Patients WHERE user_id = $1', [userId]);
    if (patientResult.rows.length === 0) {
        return null;
    }
    return patientResult.rows[0].id;
}

// Helper: Estimate time per patient (e.g., 15 minutes)
const AVERAGE_CONSULTATION_TIME_MINUTES = 15;

// 1. Patient: See how much time for his turn
exports.getMyTurn = async (req, res) => {
    const patientUserId = req.user.id;

    try {
        const patientId = await getPatientIdFromUserId(patientUserId);
        if (!patientId) {
            return res.status(404).json({ message: 'Patient profile not found. Please ensure you have a patient profile linked to your account.' });
        }

        const queueEntryResult = await pool.query(`
            SELECT
                Q.id AS queue_entry_id,
                Q.queue_number,
                Q.status,
                D.name AS doctor_name,
                D.specialization
            FROM Queue Q
            JOIN Doctors D ON Q.doctor_id = D.id
            WHERE Q.patient_id = $1 AND (Q.status = 'waiting' OR Q.status = 'consulting')
            LIMIT 1;
        `, [patientId]);

        const queueEntry = queueEntryResult.rows[0];

        if (!queueEntry) {
            return res.status(404).json({ message: 'You are not currently in any active queue.' });
        }

        const patientsAheadResult = await pool.query(`
            SELECT COUNT(*) AS count_ahead
            FROM Queue
            WHERE doctor_id = (SELECT doctor_id FROM Queue WHERE id = $1)
              AND status = 'waiting'
              AND queue_number < $2;
        `, [queueEntry.queue_entry_id, queueEntry.queue_number]);

        const patientsAhead = parseInt(patientsAheadResult.rows[0].count_ahead, 10);
        const estimatedWaitTime = patientsAhead * AVERAGE_CONSULTATION_TIME_MINUTES;

        res.json({
            queueNumber: queueEntry.queue_number,
            status: queueEntry.status,
            doctorName: queueEntry.doctor_name,
            doctorSpecialization: queueEntry.specialization,
            patientsAhead: patientsAhead,
            estimatedWaitTimeMinutes: estimatedWaitTime,
            message: `You are currently number ${queueEntry.queue_number} for Dr. ${queueEntry.doctor_name}. Estimated wait time: ${estimatedWaitTime} minutes.`
        });

    } catch (error) {
        console.error('Patient getMyTurn error:', error);
        res.status(500).json({ message: 'Server error fetching your queue status.', error: error.message });
    }
};

// 2. Patient: Book an appointment
exports.bookAppointment = async (req, res) => {
    const { doctorId, appointmentTime } = req.body;
    const patientUserId = req.user.id;

    // Basic validation (existing)
    if (!doctorId || !appointmentTime) {
        return res.status(400).json({ message: 'Doctor and appointment time are required.' });
    }

    // Appointment Time Validation (existing)
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
        const patientId = await getPatientIdFromUserId(patientUserId);
        if (!patientId) {
            return res.status(404).json({ message: 'Patient profile not found. Please ensure your user account is linked to a patient profile.' });
        }

        // Check if this patient already has an active appointment/queue entry for this doctor
        const activeAppointmentCheck = await pool.query(`
            SELECT Q.id FROM Queue Q
            JOIN Appointments A ON Q.appointment_id = A.id
            WHERE Q.patient_id = $1 AND Q.doctor_id = $2
            AND (Q.status = 'waiting' OR Q.status = 'consulting' OR A.status = 'scheduled');
        `, [patientId, doctorId]);

        if (activeAppointmentCheck.rows.length > 0) {
            return res.status(409).json({ message: 'You already have an active appointment or are in queue for this doctor.' });
        }

        await pool.query('BEGIN');

        const appointmentResult = await pool.query(
            'INSERT INTO Appointments (patient_id, doctor_id, appointment_time, status, scheduled_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [patientId, doctorId, appointmentTime, 'scheduled', 'patient']
        );
        const appointmentId = appointmentResult.rows[0].id;

        // UPDATED: Calculate next queue number across ALL statuses
        const lastQueueNumberResult = await pool.query(
            'SELECT COALESCE(MAX(queue_number), 0) AS max_queue_number FROM Queue WHERE doctor_id = $1', // Removed status filter
            [doctorId]
        );
        const nextQueueNumber = lastQueueNumberResult.rows[0].max_queue_number + 1;

        await pool.query(
            'INSERT INTO Queue (appointment_id, doctor_id, patient_id, queue_number, status) VALUES ($1, $2, $3, $4, $5)',
            [appointmentId, doctorId, patientId, nextQueueNumber, 'waiting']
        );

        await pool.query('COMMIT');
        res.status(201).json({
            message: 'Appointment booked successfully!',
            appointmentId,
            queueNumber: nextQueueNumber
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Patient bookAppointment error:', error);
        res.status(500).json({ message: 'Server error booking appointment.', error: error.message });
    }
};

// Handle Cancel Appointment (existing)
exports.cancelAppointment = async (req, res) => {
    const { id } = req.params;
    const patientUserId = req.user.id;

    try {
        const patientId = await getPatientIdFromUserId(patientUserId);
        if (!patientId) {
            return res.status(404).json({ message: 'Patient profile not found.' });
        }

        await pool.query('BEGIN');

        const appointmentUpdateResult = await pool.query(`
            UPDATE Appointments
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND patient_id = $2
            RETURNING id;
        `, [id, patientId]);

        if (appointmentUpdateResult.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Appointment not found or not owned by this patient.' });
        }

        await pool.query(`
            UPDATE Queue
            SET status = 'cancelled'
            WHERE appointment_id = $1;
        `, [id]);

        await pool.query('COMMIT');
        res.json({ message: 'Appointment cancelled successfully.' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Patient cancelAppointment error:', error);
        res.status(500).json({ message: 'Server error cancelling appointment.', error: error.message });
    }
};

// Optional: Patient: See all their booked appointments (existing)
exports.getMyAppointments = async (req, res) => {
    const patientUserId = req.user.id;

    try {
        const patientId = await getPatientIdFromUserId(patientUserId);
        if (!patientId) {
            return res.status(404).json({ message: 'Patient profile not found.' });
        }

        const appointments = await pool.query(`
            SELECT
                A.id AS appointment_id,
                A.appointment_time,
                A.status,
                D.name AS doctor_name,
                D.specialization
            FROM Appointments A
            JOIN Doctors D ON A.doctor_id = D.id
            WHERE A.patient_id = $1
            ORDER BY A.appointment_time DESC;
        `, [patientId]);

        res.json(appointments.rows);

    } catch (error) {
        console.error('Patient getMyAppointments error:', error);
        res.status(500).json({ message: 'Server error fetching appointments.', error: error.message });
    }
};