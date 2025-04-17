const express = require('express');
const router = express.Router();
const { register, login, getMe,refreshToken } = require('../../controllers/authController');
const { protect } = require('../../middleWare/authorization');

// Routes for /api/auth
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);

module.exports = router;