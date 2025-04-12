const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  },
  action: {
    type: String,
    required: [true, 'Please specify the action'],
    enum: [
      // Card actions
      'created_card', 
      'updated_card', 
      'moved_card', 
      'commented', 
      'assigned_card', 
      'added_tag', 
      'removed_tag',
      'deleted_card',
      'reordered_cards',
      
      // Project actions
      'created_project', 
      'updated_project', 
      'deleted_project', 
      'added_member', 
      'removed_member',
      
      // Status actions
      'created_status', 
      'updated_status', 
      'deleted_status', 
      'reordered_statuses',
      
      // Tag actions
      'created_tag', 
      'updated_tag', 
      'deleted_tag'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Activity', ActivitySchema);