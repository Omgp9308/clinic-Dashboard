// server/routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController'); // New public controller

// GET /api/public/doctors - Get list of all doctors (no authentication needed for this list)
router.get('/doctors', publicController.getAllDoctors);

module.exports = router;