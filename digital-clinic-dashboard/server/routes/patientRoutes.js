// server/routes/patientRoutes.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController'); // We'll create this next

// Patient Capabilities:

// 1. GET /api/patient/my-turn - See how much time for his turn in the queue
router.get('/my-turn', patientController.getMyTurn);

// 2. POST /api/patient/appointments - Book an appointment
router.post('/appointments', patientController.bookAppointment);

// 3. DELETE /api/patient/appointments/:id - Cancel an appointment
router.delete('/appointments/:id', patientController.cancelAppointment);

// Optional: GET /api/patient/my-appointments - See all their booked appointments
router.get('/my-appointments', patientController.getMyAppointments);

module.exports = router;