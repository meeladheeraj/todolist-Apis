const asyncHandler = require('express-async-handler');
const  Project = require('../models/Project');
const Status = require('../models/Status');
const Activity = require('../models/Activity');

// @desc    Get all projects for logged in user
// @route   GET /api/projects
// @access  Private
exports.getProjects = asyncHandler(async (req, res) => {
  // Find projects where the user is a member
  const projects = await Project.find({
    'members.user': req.user.id
  }).populate('created_by', 'username email');

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects
  });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('created_by', 'username email')
    .populate('members.user', 'username email');

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Check if user is a member of the project
  const isMember = project.members.some(
    member => member.user._id.toString() === req.user.id.toString()
  );

  if (!isMember) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this project'
    });
  }

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = asyncHandler(async (req, res) => {
  // Add user to request body
  req.body.created_by = req.user.id;
  console.log('Creating project with data:', req.body);
  console.log('Current user:', req.user);
  // Add creator as admin member
  req.body.members = [
    {
      user: req.user.id,
      role: 'admin',
      joined_at: Date.now()
    }
  ];

  const project = await Project.create(req.body);

  // Create default statuses for the project
  const defaultStatuses = [
    {
      name: 'To Do',
      description: 'Tasks that need to be done',
      color: '#3498db',
      position: 1,
      project: project._id
    },
    {
      name: 'In Progress',
      description: 'Tasks currently being worked on',
      color: '#f39c12',
      position: 2,
      project: project._id
    },
    {
      name: 'Done',
      description: 'Completed tasks',
      color: '#2ecc71',
      position: 3,
      project: project._id
    }
  ];

  await Status.insertMany(defaultStatuses);
  
  // Log activity
  await Activity.create({
    user: req.user.id,
    project: project._id,
    action: 'created_project',
    details: { project_name: project.name }
  });

  res.status(201).json({
    success: true,
    data: project
  });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = asyncHandler(async (req, res) => {
  let project = await Project.findById(req.params.id);

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
      error: 'Not authorized to update this project'
    });
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: project._id,
    action: 'updated_project',
    details: { project_name: project.name }
  });

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }

  // Check if user is admin or creator of the project
  const isAdmin = project.members.some(
    member => member.user.toString() === req.user.id && member.role === 'admin'
  );
  const isCreator = project.created_by.toString() === req.user.id;

  if (!(isAdmin || isCreator)) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this project'
    });
  }

  await project.deleteOne();

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: project._id,
    action: 'deleted_project',
    details: { project_name: project.name }
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private
exports.addMember = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;
  
  if (!userId || !role) {
    return res.status(400).json({
      success: false,
      error: 'Please provide user ID and role'
    });
  }

  const project = await Project.findById(req.params.id);

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
      error: 'Not authorized to add members to this project'
    });
  }

  // Check if user is already a member
  const alreadyMember = project.members.some(
    member => member.user.toString() === userId
  );

  if (alreadyMember) {
    return res.status(400).json({
      success: false,
      error: 'User is already a member of this project'
    });
  }

  // Add member to project
  project.members.push({
    user: userId,
    role,
    joined_at: Date.now()
  });

  await project.save();

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: project._id,
    action: 'added_member',
    details: { member_id: userId, role }
  });

  res.status(200).json({
    success: true,
    data: project
  });
});

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
exports.removeMember = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

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

  // Prevent removing project creator
  if (project.created_by.toString() === req.params.userId) {
    return res.status(400).json({
      success: false,
      error: 'Cannot remove project creator'
    });
  }

  // Allow admins or users themselves to remove membership
  if (!isAdmin && req.user.id !== req.params.userId) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to remove members from this project'
    });
  }

  // Check if user is a member
  const memberIndex = project.members.findIndex(
    member => member.user.toString() === req.params.userId
  );

  if (memberIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Member not found in this project'
    });
  }

  // Remove member
  project.members.splice(memberIndex, 1);

  await project.save();

  // Log activity
  await Activity.create({
    user: req.user.id,
    project: project._id,
    action: 'removed_member',
    details: { member_id: req.params.userId }
  });

  res.status(200).json({
    success: true,
    data: project
  });
});