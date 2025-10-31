const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// --- Authentication Routes ---

// POST /auth/signup
// Route for new user registration
router.post('/signup', authController.signup);

// POST /auth/login
// Route for existing user login
router.post('/login', authController.login);

module.exports = router;