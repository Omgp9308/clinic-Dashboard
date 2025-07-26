// server/routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

// Doctor Capabilities:

// 1. GET /api/doctor/my-queue - See the queue of his patients
router.get('/my-queue', doctorController.getMyQueue);

// 2. PUT /api/doctor/queue/:appointmentId/deny - Deny service to a patient with a reason
router.put('/queue/:appointmentId/deny', doctorController.denyPatientService);

// 3. GET /api/doctor/current-patient - See current patient's details
router.get('/current-patient', doctorController.getCurrentPatientDetails);

// NEW LINE: 4. PUT /api/doctor/complete-current-patient - Doctor completes current and calls next
router.put('/complete-current-patient', doctorController.completeCurrentAndCallNext);

module.exports = router;