const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const { User } = require('../models/User');

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Please provide an email address'
    });
  }

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists for security
    return res.status(200).json({
      success: true,
      data: { message: 'If a user with that email exists, a reset token has been sent' }
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token for security
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Save token to user document with expiration
  user.reset_password_token = hashedToken;
  user.reset_password_expires = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save();

  // In a production app, you would send an email here with the reset link
  // For this example, we'll just return the token in the response
  // NOTE: In real production code, don't return the actual token in the response
  
  // For development:
  const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

  res.status(200).json({
    success: true,
    data: { 
      message: 'Password reset token generated',
      resetUrl: resetUrl,
      // Only include this in development, remove for production:
      token: resetToken 
    }
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a new password'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters'
    });
  }

  // Hash the token from params
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with the token and valid expiration
  const user = await User.findOne({
    reset_password_token: hashedToken,
    reset_password_expires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired reset token'
    });
  }

  // Set new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  
  // Clear reset token fields
  user.reset_password_token = undefined;
  user.reset_password_expires = undefined;
  
  // If the user has a refresh token, invalidate it for security
  user.refresh_token = undefined;
  
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: 'Password has been reset successfully' }
  });
});