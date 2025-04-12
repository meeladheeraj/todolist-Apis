const mongoose = require('mongoose');

const StatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a status name'],
    trim: true,
    maxlength: [50, 'Status name cannot be more than 50 characters']
  },
  description: {
    type: String
  },
  color: {
    type: String,
    default: '#3498db'
  },
  position: {
    type: Number,
    required: [true, 'Please add a position']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  }
});

// Composite index for project and name to ensure uniqueness
StatusSchema.index({ project: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Status', StatusSchema);
