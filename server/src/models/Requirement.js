// Requirement Model (FR-REQ-01 to FR-REQ-05)
const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  title: String,
  description: String,
  type: {
    type: String,
    enum: ['user story', 'functional', 'non-functional']
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low']
  },
  status: {
    type: String,
    enum: ['Draft', 'In Review', 'Approved', 'Active', 'Implemented']
  },
  version: Number,
  modifiedAt: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

const requirementSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  reqId: {
    type: String,
    required: true // e.g., 'REQ-1', 'REQ-01'
  },
  title: {
    type: String,
    required: [true, 'Requirement title is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  type: {
    type: String,
    enum: ['user story', 'functional', 'non-functional'],
    default: 'functional'
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Draft', 'In Review', 'Approved', 'Active', 'Implemented'],
    default: 'Active'
  },
  version: {
    type: Number,
    default: 1
  },
  history: [historySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Unique index on (projectId, reqId) per System Design 2.2
requirementSchema.index({ projectId: 1, reqId: 1 }, { unique: true });

module.exports = mongoose.model('Requirement', requirementSchema);
