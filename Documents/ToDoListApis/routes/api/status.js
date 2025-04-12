const express = require('express');
const router = express.Router();
const path = require('path');

// Import controllers using absolute paths
const statusController = require(path.join(__dirname, '../../controllers/statusController'));
const cardController = require(path.join(__dirname, '../../controllers/cardController'));
const { protect } = require('../../middleware/auth');

// Routes for /api/statuses
router.route('/:id')
  .get(protect, statusController.getStatus)
  .put(protect, statusController.updateStatus)
  .delete(protect, statusController.deleteStatus);

// Card routes by status
router.route('/:statusId/cards')
  .get(protect, cardController.getCardsByStatus);

// Reorder cards within a status
router.route('/:statusId/cards/reorder')
  .put(protect, cardController.reorderCards);

// Reorder statuses within a project
router.route('/reorder/:projectId')
  .put(protect, statusController.reorderStatuses);

module.exports = router;