const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

//post request to signup
router.post('/signup', authController.signup);
//post request to login
router.post('/login', authController.login);

module.exports = router;
