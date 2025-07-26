// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController'); // We'll create this next

// Admin Capabilities:

// 1. POST /api/admin/doctors - Add a new doctor
router.post('/doctors', adminController.addDoctor);

// 2. GET /api/admin/queue - Monitor the overall patient queue
router.get('/queue', adminController.monitorQueue);

// 3. GET /api/admin/patients/count - Get the total number of registered patients
router.get('/patients/count', adminController.getRegisteredPatientsCount);

module.exports = router;