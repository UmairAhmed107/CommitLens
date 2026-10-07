// Impact Result Model (FR-IMP-03 to FR-IMP-08)
const mongoose = require('mongoose');

const impactedRequirementSchema = new mongoose.Schema({
  requirementId: {
    type: String,
    required: true
  },
  reasons: {
    type: [String], // ['pattern', 'tag']
    default: []
  }
}, { _id: false });

const impactResultSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  commitSha: {
    type: String,
    required: true,
    index: true
  },
  impacted: [impactedRequirementSchema],
  recommendedTestIds: {
    type: [String],
    default: []
  },
  unmappedFiles: {
    type: [String],
    default: []
  },
  totalTests: {
    type: Number,
    default: 0
  },
  reductionPct: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to quickly look up impact by project and sha
impactResultSchema.index({ projectId: 1, commitSha: 1 }, { unique: true });

module.exports = mongoose.model('ImpactResult', impactResultSchema);
