const asyncHandler = require('express-async-handler');
const Card = require('../models/Card');
const Project = require('../models/Project');
const Status = require('../models/Status');
const Activity = require('../models/Activity');

// @desc    Get all cards for a project
// @route   GET /api/projects/:projectId/cards
// @access  Private
exports.getCards = asyncHandler(async (req, res) => {
  const cards = await Card.find({ project: req.params.projectId })
    .populate('status', 'name color')
    .populate('assigned_to', 'username')
    .populate('reporter', 'username')
    .populate('tags', 'name color');

  res.status(200).json({
    success: true,
    count: cards.length,
    data: cards
  });
});

// @desc    Get cards for a specific status
// @route   GET /api/statuses/:statusId/cards
// @access  Private
exports.getCardsByStatus = asyncHandler(async (req, res) => {
  const status = await Status.findById(req.params.statusId);
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Status not found'
    });
  }

  // Check if user is a member of the project
  const project = await Project.findById(status.project);
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );

  if (!isMember) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access cards in this status'
    });
  }

  const cards = await Card.find({ status: req.params.statusId })
    .sort('position')
    .populate('assigned_to', 'username')
    .populate('reporter', 'username')
    .populate('tags', 'name color');

  res.status(200).json({
    success: true,
    count: cards.length,
    data: cards
  });
});

// @desc    Get single card
// @route   GET /api/cards/:id
// @access  Private
exports.getCard = asyncHandler(async (req, res) => {
  const card = await Card.findById(req.params.id)
    .populate('status', 'name color')
    .populate('assigned_to', 'username email')
    .populate('reporter', 'username email')
    .populate('tags', 'name color')
    .populate({
      path: 'project',
      select: 'name'
    });

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
      error: 'Not authorized to access this card'
    });
  }

  res.status(200).json({
    success: true,
    data: card
  });
});

// @desc    Create new card
// @route   POST /api/projects/:projectId/cards
// @access  Private
exports.createCard = asyncHandler(async (req, res) => {
  // Add project to request body
  req.body.project = req.params.projectId;
  
  // Add current user as reporter
  req.body.reporter = req.user.id;

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
      error: 'Not authorized to create cards in this project'
    });
  }

  // If status is not provided, get the first status (typically "To Do")
  if (!req.body.status) {
    const firstStatus = await Status.findOne({ project: req.params.projectId })
      .sort('position');
    
    if (firstStatus) {
      req.body.status = firstStatus._id;
    }
  }

  // Get highest position value for the status to append new card at the end
  const highestPositionCard = await Card.findOne({ 
    status: req.body.status 
  }).sort('-position');
  
  req.body.position = highestPositionCard ? highestPositionCard.position + 1 : 1;

  const card = await Card.create(req.body);

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: req.params.projectId,
    card: card._id,
    action: 'created_card',
    details: { card_title: card.title }
  });

  // Populate references
  const populatedCard = await Card.findById(card._id)
    .populate('status', 'name color')
    .populate('assigned_to', 'username')
    .populate('reporter', 'username')
    .populate('tags', 'name color');

  res.status(201).json({
    success: true,
    data: populatedCard
  });
});

// @desc    Update card
// @route   PUT /api/cards/:id
// @access  Private
exports.updateCard = asyncHandler(async (req, res) => {
  let card = await Card.findById(req.params.id);

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
      error: 'Not authorized to update this card'
    });
  }

  // Special handling for status changes
  let oldStatus = null;
  if (req.body.status && req.body.status !== card.status.toString()) {
    oldStatus = card.status;
    
    // Get highest position value for the new status to append moved card at the end
    const highestPositionCard = await Card.findOne({ 
      status: req.body.status 
    }).sort('-position');
    
    req.body.position = highestPositionCard ? highestPositionCard.position + 1 : 1;
  }

  card = await Card.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
    .populate('status', 'name color')
    .populate('assigned_to', 'username')
    .populate('reporter', 'username')
    .populate('tags', 'name color');

  // Log activity
  if (oldStatus) {
    await Activity.create({
      user: req.user.id,
      project: card.project,
      card: card._id,
      action: 'moved_card',
      details: { 
        card_title: card.title,
        from_status: oldStatus,
        to_status: card.status
      }
    });
  } else {
    await Activity.create({
      user: req.user.id,
      project: card.project,
      card: card._id,
      action: 'updated_card',
      details: { card_title: card.title }
    });
  }

  res.status(200).json({
    success: true,
    data: card
  });
});

// @desc    Delete card
// @route   DELETE /api/cards/:id
// @access  Private
exports.deleteCard = asyncHandler(async (req, res) => {
  const card = await Card.findById(req.params.id);

  if (!card) {
    return res.status(404).json({
      success: false,
      error: 'Card not found'
    });
  }

  // Check if user is a member of the project
  const project = await Project.findById(card.project);
  const isAdmin = project.members.some(
    member => member.user.toString() === req.user.id && member.role === 'admin'
  );
  const isCreator = card.reporter.toString() === req.user.id;

  if (!(isAdmin || isCreator)) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this card'
    });
  }

  await card.deleteOne();

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: card.project,
    action: 'deleted_card',
    details: { card_title: card.title }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Reorder cards within a status
// @route   PUT /api/statuses/:statusId/cards/reorder
// @access  Private
exports.reorderCards = asyncHandler(async (req, res) => {
  const { cardOrder } = req.body;
  
  if (!cardOrder || !Array.isArray(cardOrder)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide valid card order array'
    });
  }

  const status = await Status.findById(req.params.statusId);
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Status not found'
    });
  }

  // Check if user is a member of the project
  const project = await Project.findById(status.project);
  const isMember = project.members.some(
    member => member.user.toString() === req.user.id
  );

  if (!isMember) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to reorder cards in this status'
    });
  }

  // Update position for each card
  for (let i = 0; i < cardOrder.length; i++) {
    await Card.findByIdAndUpdate(cardOrder[i], { position: i + 1 });
  }

  // Get updated cards
  const cards = await Card.find({ status: req.params.statusId })
    .sort('position')
    .populate('assigned_to', 'username')
    .populate('reporter', 'username')
    .populate('tags', 'name color');

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: status.project,
    action: 'reordered_cards',
    details: { status_name: status.name }
  });

  res.status(200).json({
    success: true,
    data: cards
  });
});