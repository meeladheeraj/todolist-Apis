const express = require('express');
const router = express.Router();
const path = require('path');
const commentController = require(path.join(__dirname, '../../controllers/commentsController'));
const { protect } = require('../../middleWare/authorization');

// Routes for /api/comments
router.route('/:id')
  .put(protect, commentController.updateComment)
  .delete(protect, commentController.deleteComment);

module.exports = router;