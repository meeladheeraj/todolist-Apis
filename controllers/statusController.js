const asyncHandler = require('express-async-handler');
const Status = require('../models/Status');
const Project = require('../models/Project');
const Activity = require('../models/Activity');

// @desc    Get all statuses for a project
// @route   GET /api/projects/:projectId/statuses
// @access  Private
exports.getStatuses = asyncHandler(async (req, res) => {
  const statuses = await Status.find({ project: req.params.projectId }).sort('position');

  res.status(200).json({
    success: true,
    count: statuses.length,
    data: statuses
  });
});

// @desc    Get single status
// @route   GET /api/statuses/:id
// @access  Private
exports.getStatus = asyncHandler(async (req, res) => {
  const status = await Status.findById(req.params.id);

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
      error: 'Not authorized to access this status'
    });
  }

  res.status(200).json({
    success: true,
    data: status
  });
});

// @desc    Create new status
// @route   POST /api/projects/:projectId/statuses
// @access  Private
exports.createStatus = asyncHandler(async (req, res) => {
  try {
    // Add project to request body
    req.body.project = req.params.projectId;
    
    console.log('Creating status with data:', req.body);

    const project = await Project.findById(req.params.projectId);
    console.log('Found project:', project ? project._id : 'Not found');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user is admin in the project
    const isAdmin = project.members.some(
      member => member.user.toString() === req.user.id && member.role === 'admin'
    );
    console.log('User is admin:', isAdmin);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create statuses for this project'
      });
    }

    // Get highest position value to append new status at the end
    const highestPositionStatus = await Status.findOne({ project: req.params.projectId })
      .sort('-position');
    
    req.body.position = highestPositionStatus ? highestPositionStatus.position + 1 : 1;
    console.log('Status position:', req.body.position);

    const status = await Status.create(req.body);
    console.log('Created status:', status._id);

    // Log activity
    await Activity.create({
      user: req.user.id,
      project: req.params.projectId,
      action: 'created_status',
      details: { status_name: status.name }
    });
    console.log('Activity logged');

    res.status(201).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error creating status:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @desc    Update status
// @route   PUT /api/statuses/:id
// @access  Private
exports.updateStatus = asyncHandler(async (req, res) => {
  let status = await Status.findById(req.params.id);

  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Status not found'
    });
  }

  // Check if user is admin in the project
  const project = await Project.findById(status.project);
  
  const isAdmin = project.members.some(
    member => member.user.toString() === req.user.id && member.role === 'admin'
  );

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this status'
    });
  }

  status = await Status.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: status.project,
    action: 'updated_status',
    details: { status_name: status.name }
  });

  res.status(200).json({
    success: true,
    data: status
  });
});

// @desc    Delete status
// @route   DELETE /api/statuses/:id
// @access  Private
exports.deleteStatus = asyncHandler(async (req, res) => {
  const status = await Status.findById(req.params.id);

  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Status not found'
    });
  }

  // Check if user is admin in the project
  const project = await Project.findById(status.project);
  
  const isAdmin = project.members.some(
    member => member.user.toString() === req.user.id && member.role === 'admin'
  );

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this status'
    });
  }

  // Count statuses in the project
  const statusCount = await Status.countDocuments({ project: status.project });
  
  // Don't allow deleting the last status
  if (statusCount <= 1) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete the last status of a project'
    });
  }

  await status.deleteOne();

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: status.project,
    action: 'deleted_status',
    details: { status_name: status.name }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Reorder statuses
// @route   PUT /api/projects/:projectId/statuses/reorder
// @access  Private
exports.reorderStatuses = asyncHandler(async (req, res) => {
  const { statusOrder } = req.body;
  
  if (!statusOrder || !Array.isArray(statusOrder)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide valid status order array'
    });
  }

  const project = await Project.findById(req.params.projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Check if user is admin in the project
  const isAdmin = project.members.some(
    member => member.user.toString() === req.user.id && member.role === 'admin'
  );

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to reorder statuses for this project'
    });
  }

  // Update position for each status
  for (let i = 0; i < statusOrder.length; i++) {
    await Status.findByIdAndUpdate(statusOrder[i], { position: i + 1 });
  }

  // Get updated statuses
  const statuses = await Status.find({ project: req.params.projectId }).sort('position');

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: req.params.projectId,
    action: 'reordered_statuses',
    details: { status_order: statusOrder }
  });

  res.status(200).json({
    success: true,
    data: statuses
  });
});