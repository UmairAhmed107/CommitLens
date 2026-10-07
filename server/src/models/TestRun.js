// Test Run Model (FR-TST-03, FR-TST-04)
const mongoose = require('mongoose');

const testRunSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  testId: {
    type: String, // String ID like TC-1
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Not Run', 'Passed', 'Failed', 'Blocked'],
    required: true
  },
  executedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  executedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: '',
    trim: true
  }
});

module.exports = mongoose.model('TestRun', testRunSchema);
