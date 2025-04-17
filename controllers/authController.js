const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });

  if (userExists) {
    return res.status(400).json({
      success: false,
      error: 'User already exists'
    });
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password
  });

  if (user) {
    const { accessToken, refreshToken } = generateTokens(user._id);
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        accessToken: accessToken,
        refreshToken:refreshToken
      }
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Invalid user data'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Generate tokens

  const { accessToken, refreshToken } = generateTokens(user._id);
  // Store refresh token in database
  user.refresh_token = refreshToken;

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      username: user.username,
      email: user.email,
      accessToken: accessToken,
      refreshToken:refreshToken
    }
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (with refresh token)

exports.refreshToken = asyncHandler(async (req, res) => {

  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token is required'
    });

  }
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken,  process.env.JWT_SECRET);

    // Find user with this refresh token
    const user = await User.findOne({ 
      _id: decoded.id,
      refresh_token: refreshToken 
    });


    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Invalid refresh token'
      });

    }
    // Generate new tokens
    const tokens = generateTokens(user._id);
    // Update refresh token in database
    user.refresh_token = tokens.refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }

    });

  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});



// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  // Find user with this refresh token and clear it
  await User.findOneAndUpdate(
    { refresh_token: refreshToken },
    { refresh_token: null }
  );

  res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully' }
  });

});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

const generateTokens = (id) => {
  // Access token - short lived (24 hours)
  const accessToken = jwt.sign(
    { id }, 
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET, 
    { expiresIn: '24h' }
  );

  
  // Refresh token - long lived (60 days)
  const refreshToken = jwt.sign(
    { id }, 
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, 
    { expiresIn: '60d' }
  );
  return { accessToken, refreshToken };
};