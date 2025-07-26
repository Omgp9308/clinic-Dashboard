// server/controllers/doctorController.js
const pool = require('../config/db');

// Helper function to get doctor_id from user_id
async function getDoctorIdFromUserId(userId) {
    const doctorResult = await pool.query('SELECT id FROM Doctors WHERE user_id = $1', [userId]);
    if (doctorResult.rows.length === 0) {
        return null;
    }
    return doctorResult.rows[0].id;
}

// Helper: Estimate time per patient (e.g., 15 minutes) - used for patient dashboard
const AVERAGE_CONSULTATION_TIME_MINUTES = 15;

// 1. Doctor: See the queue of his patients
exports.getMyQueue = async (req, res) => {
    const doctorUserId = req.user.id;
    try {
        const doctorId = await getDoctorIdFromUserId(doctorUserId);
        if (!doctorId) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        const queueResult = await pool.query(`
            SELECT
                Q.id AS queue_entry_id,
                Q.queue_number,
                Q.status,
                P.name AS patient_name,
                P.age AS patient_age,
                P.gender AS patient_gender,
                A.id AS appointment_id,
                A.appointment_time
            FROM Queue Q
            JOIN Patients P ON Q.patient_id = P.id
            JOIN Appointments A ON Q.appointment_id = A.id
            WHERE Q.doctor_id = $1 AND (Q.status = 'waiting' OR Q.status = 'consulting')
            ORDER BY Q.queue_number ASC, Q.entered_at ASC;
        `, [doctorId]);

        res.json(queueResult.rows);

    } catch (error) {
        console.error('Doctor getMyQueue error:', error);
        res.status(500).json({ message: 'Server error fetching doctor queue.', error: error.message });
    }
};

// 2. Doctor: Deny service to a patient with a reason
exports.denyPatientService = async (req, res) => {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const doctorUserId = req.user.id;

    if (!reason) {
        return res.status(400).json({ message: 'Reason for denial is required.' });
    }

    try {
        const doctorId = await getDoctorIdFromUserId(doctorUserId);
        if (!doctorId) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        await pool.query('BEGIN');

        const appointmentUpdateResult = await pool.query(`
            UPDATE Appointments
            SET status = 'denied', reason_for_denial = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND doctor_id = $3
            RETURNING id;
        `, [reason, appointmentId, doctorId]);

        if (appointmentUpdateResult.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Appointment not found or not assigned to this doctor.' });
        }

        await pool.query(`
            UPDATE Queue
            SET status = 'denied'
            WHERE appointment_id = $1 AND doctor_id = $2;
        `, [appointmentId, doctorId]);

        await pool.query('COMMIT');
        res.json({ message: 'Patient service denied successfully.' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Doctor denyPatientService error:', error);
        res.status(500).json({ message: 'Server error denying patient service.', error: error.message });
    }
};

// 3. Doctor: See current patient's name, age, dietary restrictions, allergies etc.
exports.getCurrentPatientDetails = async (req, res) => {
    const doctorUserId = req.user.id;

    try {
        const doctorId = await getDoctorIdFromUserId(doctorUserId);
        if (!doctorId) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        const patientResult = await pool.query(`
            SELECT
                P.name,
                P.age,
                P.gender,
                P.contact_info,
                P.dietary_restrictions,
                P.allergies,
                Q.queue_number,
                A.id AS appointment_id,
                P.user_id AS patient_user_id -- NEW: Get patient's user_id for Socket.IO targeting
            FROM Queue Q
            JOIN Patients P ON Q.patient_id = P.id
            JOIN Appointments A ON Q.appointment_id = A.id
            WHERE Q.doctor_id = $1 AND Q.status = 'consulting'
            ORDER BY Q.entered_at ASC
            LIMIT 1;
        `, [doctorId]);

        if (patientResult.rows.length === 0) {
            return res.status(404).json({ message: 'No patient currently in consultation.' });
        }

        res.json(patientResult.rows[0]);

    } catch (error) {
        console.error('Doctor getCurrentPatientDetails error:', error);
        res.status(500).json({ message: 'Server error fetching current patient details.', error: error.message });
    }
};

// Doctor completes current appointment and calls next patient
exports.completeCurrentAndCallNext = async (req, res) => {
    const doctorUserId = req.user.id;
    const io = req.app.get('socketio'); // NEW: Get Socket.IO instance from Express app

    try {
        const doctorId = await getDoctorIdFromUserId(doctorUserId);
        if (!doctorId) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        await pool.query('BEGIN');

        let currentPatientAppointmentId = null;
        let currentPatientUserId = null; // NEW: To notify completed patient
        let nextPatientQueueEntryId = null;
        let nextPatientAppointmentId = null;
        let nextPatientName = null;
        let nextPatientUserId = null; // NEW: To notify next patient

        // 1. Find the current patient (status: 'consulting') for this doctor
        const currentPatientQueueEntry = await pool.query(`
            SELECT Q.id, Q.appointment_id, P.user_id FROM Queue Q
            JOIN Patients P ON Q.patient_id = P.id -- NEW: Join Patients to get patient_user_id
            WHERE Q.doctor_id = $1 AND Q.status = 'consulting'
            ORDER BY entered_at ASC LIMIT 1;
        `, [doctorId]);

        if (currentPatientQueueEntry.rows.length > 0) {
            currentPatientAppointmentId = currentPatientQueueEntry.rows[0].appointment_id;
            currentPatientUserId = currentPatientQueueEntry.rows[0].user_id; // NEW: Get user_id of current patient
            // Update current patient's queue status to 'completed'
            await pool.query(`
                UPDATE Queue SET status = 'completed' WHERE id = $1;
            `, [currentPatientQueueEntry.rows[0].id]);
            // Update current patient's appointment status to 'completed'
            await pool.query(`
                UPDATE Appointments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1;
            `, [currentPatientAppointmentId]);

            // NEW: Emit notification to the completed patient (if they have an account)
            if (currentPatientUserId && io) {
                io.to(currentPatientUserId).emit('appointment_status_update', {
                    type: 'completed',
                    message: 'Your appointment has been completed.',
                    appointmentId: currentPatientAppointmentId
                });
            }
        }

        // 2. Find the next patient (status: 'waiting') in line for this doctor
        const nextPatientQueueEntry = await pool.query(`
            SELECT Q.id, Q.appointment_id, P.name, P.user_id FROM Queue Q
            JOIN Patients P ON Q.patient_id = P.id -- NEW: Join Patients to get patient_user_id
            WHERE Q.doctor_id = $1 AND Q.status = 'waiting'
            ORDER BY Q.queue_number ASC, Q.entered_at ASC LIMIT 1;
        `, [doctorId]);

        if (nextPatientQueueEntry.rows.length > 0) {
            nextPatientQueueEntryId = nextPatientQueueEntry.rows[0].id;
            nextPatientAppointmentId = nextPatientQueueEntry.rows[0].appointment_id;
            nextPatientName = nextPatientQueueEntry.rows[0].name;
            nextPatientUserId = nextPatientQueueEntry.rows[0].user_id; // NEW: Get user_id of next patient

            // Update next patient's queue status to 'consulting'
            await pool.query(`
                UPDATE Queue SET status = 'consulting' WHERE id = $1;
            `, [nextPatientQueueEntryId]);
            // Update next patient's appointment status to 'in_queue'
            await pool.query(`
                UPDATE Appointments SET status = 'in_queue', updated_at = CURRENT_TIMESTAMP WHERE id = $1;
            `, [nextPatientAppointmentId]);

            // NEW: Emit notification to the next patient (if they have an account)
            if (nextPatientUserId && io) {
                io.to(nextPatientUserId).emit('appointment_status_update', {
                    type: 'consulting',
                    message: `It's your turn! Dr. ${req.user.email} is ready to see you.`,
                    appointmentId: nextPatientAppointmentId
                });
            }
        }

        await pool.query('COMMIT'); // Commit the transaction

        let responseMessage = 'Operation completed.';
        if (currentPatientAppointmentId && nextPatientAppointmentId) {
            responseMessage = `Current patient completed, next patient '${nextPatientName}' called.`;
        } else if (currentPatientAppointmentId && !nextPatientAppointmentId) {
            responseMessage = 'Current patient completed. No more patients in queue.';
        } else if (!currentPatientAppointmentId && nextPatientAppointmentId) {
            responseMessage = `No patient currently consulting. Next patient '${nextPatientName}' called to consultation.`;
        } else {
            responseMessage = 'No active patient or next patient in queue to call.';
        }

        res.json({ message: responseMessage, nextPatient: nextPatientName });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Doctor completeCurrentAndCallNext error:', error);
        res.status(500).json({ message: 'Server error completing appointment and calling next patient.', error: error.message });
    }
};