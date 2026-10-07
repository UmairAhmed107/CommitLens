// Repository Model (FR-GIT-01, FR-GIT-02)
const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    unique: true // One repository per project in v1
  },
  url: {
    type: String,
    required: [true, 'Repository URL is required'],
    trim: true
  },
  owner: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  defaultBranch: {
    type: String,
    default: 'main'
  },
  tokenEncrypted: {
    type: String,
    default: '',
    select: false // Never return tokenEncrypted in default queries
  },
  lastSyncAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure tokenEncrypted is never included in toJSON or toObject outputs
repositorySchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.tokenEncrypted;
    return ret;
  }
});

module.exports = mongoose.model('Repository', repositorySchema);
