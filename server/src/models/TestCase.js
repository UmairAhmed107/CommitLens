// Test Case Model (FR-TST-01 to FR-TST-05)
const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  testId: {
    type: String,
    required: true // e.g. 'TC-1', 'TC-01'
  },
  title: {
    type: String,
    required: [true, 'Test case title is required'],
    trim: true
  },
  steps: {
    type: [String],
    default: []
  },
  expectedResult: {
    type: String,
    default: '',
    trim: true
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  requirementIds: {
    type: [String],
    default: [],
    index: true // Index on requirementIds per System Design 2.2
  },
  status: {
    type: String,
    enum: ['Not Run', 'Passed', 'Failed', 'Blocked'],
    default: 'Not Run'
  },
  needsRerun: {
    type: Boolean,
    default: false
  },
  lastRunBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastRunAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Unique index on (projectId, testId)
testCaseSchema.index({ projectId: 1, testId: 1 }, { unique: true });

module.exports = mongoose.model('TestCase', testCaseSchema);
