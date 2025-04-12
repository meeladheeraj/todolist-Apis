const express = require('express');
const router = express.Router();
const path = require('path');

// Import controllers using absolute paths
const cardController = require(path.join(__dirname, '../../controllers/cardController'));
const commentController = require(path.join(__dirname, '../../controllers/commentsController'));
const tagController = require(path.join(__dirname, '../../controllers/tagsController'));

// Check if the activity controller exists and contains the required function
const activityControllerPath = path.join(__dirname, '../../controllers/activityController');
let activityController;
try {
  activityController = require(activityControllerPath);
} catch (error) {
  console.error(`Error loading activity controller: ${error.message}`);
  // Create a placeholder function if the controller or function doesn't exist
  activityController = {
    getCardActivities: (req, res) => {
      res.status(501).json({
        success: false,
        error: 'This functionality is not yet implemented'
      });
    }
  };
}

const { protect } = require('../../middleWare/authorization');

// Routes for /api/cards
router.route('/:id')
  .get(protect, cardController.getCard)
  .put(protect, cardController.updateCard)
  .delete(protect, cardController.deleteCard);

// Comment routes
router.route('/:cardId/comments')
  .get(protect, commentController.getComments)
  .post(protect, commentController.addComment);

// Tag routes
router.route('/:cardId/tags')
  .post(protect, tagController.addTagToCard);

router.route('/:cardId/tags/:tagId')
  .delete(protect, tagController.removeTagFromCard);

// Activity routes - using the safely loaded controller
router.route('/:cardId/activities')
  .get(protect, activityController.getCardActivities);

module.exports = router;