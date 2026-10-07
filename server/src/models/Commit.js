// Commit Model (FR-GIT-03, FR-GIT-04, FR-GIT-06)
const mongoose = require('mongoose');

const fileChangeSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['added', 'modified', 'removed', 'renamed'],
    default: 'modified'
  }
}, { _id: false });

const commitSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  sha: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: 'Unknown'
  },
  branch: {
    type: String,
    default: 'main'
  },
  date: {
    type: Date,
    default: Date.now
  },
  files: [fileChangeSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Unique compound index on (projectId, sha) per System Design 2.2
commitSchema.index({ projectId: 1, sha: 1 }, { unique: true });

module.exports = mongoose.model('Commit', commitSchema);
