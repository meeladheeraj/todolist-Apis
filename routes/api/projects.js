const express = require('express');
const router = express.Router();
const { 
  getProjects, 
  getProject, 
  createProject, 
  updateProject, 
  deleteProject,
  addMember,
  removeMember
} = require('../../controllers/projectController');

const { 
  getStatuses,
  createStatus
} = require('../../controllers/statusController');

const {
  getCards,
  createCard
} = require('../../controllers/cardController');

const {
  getTags,
  createTag
} = require('../../controllers/tagsController');

const {
  getProjectActivities
} = require('../../controllers/activityController');

const { protect } = require('../../middleWare/authorization');

// Routes for /api/projects
router.route('/')
  .get(protect, getProjects)
  .post(protect, createProject);

router.route('/:id')
  .get(protect, getProject)
  .put(protect, updateProject)
  .delete(protect, deleteProject);

// Project members routes
router.route('/:id/members')
  .post(protect, addMember);

router.route('/:id/members/:userId')
  .delete(protect, removeMember);

// Status routes
router.route('/:projectId/statuses')
  .get(protect, getStatuses)
  .post(protect, createStatus);

// Card routes
router.route('/:projectId/cards')
  .get(protect, getCards)
  .post(protect, createCard);

// Tag routes
router.route('/:projectId/tags')
  .get(protect, getTags)
  .post(protect, createTag);

// Activity routes
router.route('/:projectId/activities')
  .get(protect, getProjectActivities);

module.exports = router;
