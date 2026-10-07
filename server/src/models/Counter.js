// Counter Model for auto-generating unique per-project sequence IDs (REQ-n, TC-n, BUG-n)
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  key: {
    type: String,
    required: true // 'REQ', 'TC', 'BUG'
  },
  value: {
    type: Number,
    default: 0
  }
});

// Unique combination of projectId and counter key
counterSchema.index({ projectId: 1, key: 1 }, { unique: true });

/**
 * Atomically increments counter and returns formatted next ID (e.g. REQ-1)
 */
counterSchema.statics.getNextSequence = async function(projectId, key, prefix = key) {
  const counter = await this.findOneAndUpdate(
    { projectId, key },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${counter.value}`;
};

module.exports = mongoose.model('Counter', counterSchema);
