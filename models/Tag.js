const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a tag name'],
    trim: true,
    maxlength: [50, 'Tag name cannot be more than 50 characters']
  },
  color: {
    type: String,
    default: '#3498db'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  }
});

// Composite index for project and name to ensure uniqueness
TagSchema.index({ project: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Tag', TagSchema);