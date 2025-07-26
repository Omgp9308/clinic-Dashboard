// server/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController'); // We'll create this next

// Staff Capabilities:

// 1. POST /api/staff/appointments - Schedule appointments for patients (walk-ins)
router.post('/appointments', staffController.scheduleAppointment);

// 2. GET /api/staff/queue/next3 - See who are the next 3 people in the overall queue
router.get('/queue/next3', staffController.getNext3InQueue);

module.exports = router;