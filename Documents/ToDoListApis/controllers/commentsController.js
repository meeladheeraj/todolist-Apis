const asyncHandler = require('express-async-handler');
const Comment = require('../models/Comment');
const Card = require('../models/Card');
const Project = require('../models/Project');
const Activity = require('../models/Activity');

// @desc    Get comments for a card
// @route   GET /api/cards/:cardId/comments
// @access  Private
exports.getComments = asyncHandler(async (req, res) => {
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
      error: 'Not authorized to access comments for this card'
    });
  }

  const comments = await Comment.find({ card: req.params.cardId })
    .sort('-created_at')
    .populate('user', 'username');

  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments
  });
});

// @desc    Add comment to card
// @route   POST /api/cards/:cardId/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res) => {
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
      error: 'Not authorized to comment on this card'
    });
  }

  // Create comment
  const comment = await Comment.create({
    card: req.params.cardId,
    user: req.user.id,
    content: req.body.content
  });

  // Populate user field
  const populatedComment = await Comment.findById(comment._id)
    .populate('user', 'username');

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: card.project,
    card: card._id,
    action: 'commented',
    details: { 
      card_title: card.title,
      comment_id: comment._id
    }
  });

  res.status(201).json({
    success: true,
    data: populatedComment
  });
});

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private
exports.updateComment = asyncHandler(async (req, res) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Check if user is the comment author
  if (comment.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this comment'
    });
  }

  comment = await Comment.findByIdAndUpdate(
    req.params.id, 
    { content: req.body.content }, 
    {
      new: true,
      runValidators: true
    }
  ).populate('user', 'username');

  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Get the card and project for permissions check
  const card = await Card.findById(comment.card);
  const project = await Project.findById(card.project);

  // Check if user is the comment author or a project admin
  const isAuthor = comment.user.toString() === req.user.id;
  const isAdmin = project.members.some(
    member => member.user.toString() === req.user.id && member.role === 'admin'
  );

  if (!(isAuthor || isAdmin)) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this comment'
    });
  }

  await comment.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});