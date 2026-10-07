// Bug Model (FR-BUG-01 to FR-BUG-05)
const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  bugId: {
    type: String,
    required: true // e.g. "BUG-1"
  },
  title: {
    type: String,
    required: [true, 'Bug title is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    default: 'Medium'
  },
  priority: {
    type: String,
    enum: ['P1', 'P2', 'P3'],
    default: 'P2'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed'],
    default: 'Open'
  },
  testId: {
    type: String, // references TC-n
    default: null
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  history: [
    {
      fromStatus: String,
      toStatus: String,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      notes: String
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Unique index on (projectId, bugId)
bugSchema.index({ projectId: 1, bugId: 1 }, { unique: true });

module.exports = mongoose.model('Bug', bugSchema);
