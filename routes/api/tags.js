const express = require('express');
const router = express.Router();
const path = require('path');
const tagController = require(path.join(__dirname, '../../controllers/tagsController'));
const { protect } = require('../../middleWare/authorization');

// Routes for /api/tags
router.route('/:id')
  .put(protect, tagController.updateTag)
  .delete(protect, tagController.deleteTag);

module.exports = router;