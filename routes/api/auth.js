const express = require('express');
const router = express.Router();
const { register, login, getMe,refreshToken } = require('../../controllers/authController');
const {forgotPassword, resetPassword} = require('../../controllers/passwordResetController')
const { protect } = require('../../middleWare/authorization');

// Routes for /api/auth
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;