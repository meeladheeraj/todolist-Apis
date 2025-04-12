const asyncHandler = require('express-async-handler');
const Tag = require('../models/Tag');
const Project = require('../models/Project');
const Card = require('../models/Card');
const Activity = require('../models/Activity');

// @desc    Get all tags for a project
// @route   GET /api/projects/:projectId/tags
// @access  Private
exports.getTags = asyncHandler(async (req, res) => {
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
      error: 'Not authorized to access tags for this project'
    });
  }

  const tags = await Tag.find({ project: req.params.projectId });

  res.status(200).json({
    success: true,
    count: tags.length,
    data: tags
  });
});

// @desc    Create new tag
// @route   POST /api/projects/:projectId/tags
// @access  Private
exports.createTag = asyncHandler(async (req, res) => {
  // Add project to request body
  req.body.project = req.params.projectId;

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
      error: 'Not authorized to create tags for this project'
    });
  }

  const tag = await Tag.create(req.body);

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: req.params.projectId,
    action: 'created_tag',
    details: { tag_name: tag.name }
  });

  res.status(201).json({
    success: true,
    data: tag
  });
});

// @desc    Update tag
// @route   PUT /api/tags/:id
// @access  Private
exports.updateTag = asyncHandler(async (req, res) => {
  let tag = await Tag.findById(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      error: 'Tag not found'
    });
  }

  // Check if user is a member of the project
  const project = await Project.findById(tag.project);
  const isAdmin = project.members.some(
    member => member.user.toString() === req.user.id && member.role === 'admin'
  );

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this tag'
    });
  }

  tag = await Tag.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: tag.project,
    action: 'updated_tag',
    details: { tag_name: tag.name }
  });

  res.status(200).json({
    success: true,
    data: tag
  });
});

// @desc    Delete tag
// @route   DELETE /api/tags/:id
// @access  Private
exports.deleteTag = asyncHandler(async (req, res) => {
  const tag = await Tag.findById(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      error: 'Tag not found'
    });
  }

  // Check if user is a member of the project
  const project = await Project.findById(tag.project);
  const isAdmin = project.members.some(
    member => member.user.toString() === req.user.id && member.role === 'admin'
  );

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this tag'
    });
  }

  // Remove tag from all cards
  await Card.updateMany(
    { tags: tag._id },
    { $pull: { tags: tag._id } }
  );

  await tag.deleteOne();

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: tag.project,
    action: 'deleted_tag',
    details: { tag_name: tag.name }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add tag to card
// @route   POST /api/cards/:cardId/tags
// @access  Private
exports.addTagToCard = asyncHandler(async (req, res) => {
  const { tagId } = req.body;
  
  if (!tagId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide tag ID'
    });
  }

  const card = await Card.findById(req.params.cardId);
  
  if (!card) {
    return res.status(404).json({
      success: false,
      error: 'Card not found'
    });
  }

  const tag = await Tag.findById(tagId);
  
  if (!tag) {
    return res.status(404).json({
      success: false,
      error: 'Tag not found'
    });
  }

  // Check if tag belongs to the same project
  if (tag.project.toString() !== card.project.toString()) {
    return res.status(400).json({
      success: false,
      error: 'Tag does not belong to the same project as the card'
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
      error: 'Not authorized to add tags to this card'
    });
  }

  // Check if card already has this tag
  if (card.tags.includes(tagId)) {
    return res.status(400).json({
      success: false,
      error: 'Card already has this tag'
    });
  }

  // Add tag to card
  card.tags.push(tagId);
  await card.save();

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: card.project,
    card: card._id,
    action: 'added_tag',
    details: { 
      card_title: card.title,
      tag_name: tag.name 
    }
  });

  // Get updated card with populated tags
  const updatedCard = await Card.findById(card._id)
    .populate('tags', 'name color');

  res.status(200).json({
    success: true,
    data: updatedCard
  });
});

// @desc    Remove tag from card
// @route   DELETE /api/cards/:cardId/tags/:tagId
// @access  Private
exports.removeTagFromCard = asyncHandler(async (req, res) => {
  const card = await Card.findById(req.params.cardId);
  
  if (!card) {
    return res.status(404).json({
      success: false,
      error: 'Card not found'
    });
  }

  const tag = await Tag.findById(req.params.tagId);
  
  if (!tag) {
    return res.status(404).json({
      success: false,
      error: 'Tag not found'
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
      error: 'Not authorized to remove tags from this card'
    });
  }

  // Check if card has this tag
  if (!card.tags.includes(req.params.tagId)) {
    return res.status(400).json({
      success: false,
      error: 'Card does not have this tag'
    });
  }

  // Remove tag from card
  card.tags = card.tags.filter(
    tag => tag.toString() !== req.params.tagId
  );
  
  await card.save();

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: card.project,
    card: card._id,
    action: 'removed_tag',
    details: { 
      card_title: card.title,
      tag_name: tag.name 
    }
  });

  // Get updated card with populated tags
  const updatedCard = await Card.findById(card._id)
    .populate('tags', 'name color');

  res.status(200).json({
    success: true,
    data: updatedCard
  });
});