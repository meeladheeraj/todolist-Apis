const asyncHandler = require('express-async-handler');
const Activity = require('../models/Activity');
const Project = require('../models/Project');
const Card = require('../models/Card'); // Add this import

// @desc    Get activities for a project
// @route   GET /api/projects/:projectId/activities
// @access  Private
exports.getProjectActivities = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  
  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Check if user is a member of the project
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );

  if (!isMember) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access activities for this project'
    });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  const activities = await Activity.find({ project: req.params.projectId })
    .sort('-created_at')
    .skip(startIndex)
    .limit(limit)
    .populate('user', 'username')
    .populate('card', 'title');

  // Get total count for pagination
  const total = await Activity.countDocuments({ project: req.params.projectId });

  res.status(200).json({
    success: true,
    count: activities.length,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    },
    data: activities
  });
});

// @desc    Get activities for a card
// @route   GET /api/cards/:cardId/activities
// @access  Private
exports.getCardActivities = asyncHandler(async (req, res) => {
  // Verify card exists and user has access
  const card = await Card.findById(req.params.cardId);
  
  if (!card) {
    return res.status(404).json({
      success: false,
      error: 'Card not found'
    });
  }

  // Check if user is a member of the project
  const project = await Project.findById(card.project);
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );

  if (!isMember) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access activities for this card'
    });
  }

  const activities = await Activity.find({ card: req.params.cardId })
    .sort('-created_at')
    .populate('user', 'username');

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities
  });
});