const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Project = require('../models/Project');

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET ||process.env.JWT_SECRET);

    // Get user from the token
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        isExpired: true
      });

    }
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
});

// Grant access to specific roles
exports.authorize = asyncHandler(async (req, res, next) => {
  const projectId = req.params.projectId || req.body.project;
  
  if (!projectId) {
    return next();
  }
  
  try {
    // Find the project and check if user is a member with the required role
    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    const memberEntry = project.members.find(
      member => member.user.toString() === req.user.id
    );

    if (!memberEntry) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this project'
      });
    }

    // Add the user's role in this project to the request
    req.userRole = memberEntry.role;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error checking project permissions'
    });
  }
});