// Mapping Rule Model (FR-IMP-01)
const mongoose = require('mongoose');

const mappingRuleSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true // Index on projectId per System Design 2.2
  },
  pattern: {
    type: String,
    required: [true, 'Glob pattern is required'],
    trim: true // e.g. "src/auth/**"
  },
  requirementId: {
    type: String,
    required: [true, 'Requirement ID is required'],
    trim: true // e.g. "REQ-1"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MappingRule', mappingRuleSchema);
