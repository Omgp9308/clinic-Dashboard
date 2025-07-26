// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // We'll create this next

// POST /api/register
// This route will handle new user registration requests.
router.post('/register', authController.register);

// Other authentication routes (login, forgot password) will go here later.
router.post('/login', authController.login);
// router.post('/forgot-password', authController.forgotPassword);

module.exports = router;