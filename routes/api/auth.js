const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../../controllers/authController');
const { protect } = require('../../middleWare/authorization');

// Routes for /api/auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;