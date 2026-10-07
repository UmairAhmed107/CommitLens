// Bug Controller (FR-BUG-01 to FR-BUG-05)
const bugService = require('../services/bugService');
const { isNonEmptyString } = require('../middleware/validate');

async function createBug(req, res, next) {
  try {
    const { title, description, severity, priority, testId, assignedTo } = req.body;
    const errors = [];

    if (!isNonEmptyString(title)) errors.push('Bug title is required');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const bug = await bugService.createBug(
      req.params.id,
      { title, description, severity, priority, testId, assignedTo },
      req.user._id
    );

    return res.status(201).json(bug);
  } catch (err) {
    next(err);
  }
}

async function getBugs(req, res, next) {
  try {
    const { status, severity, assignee, search } = req.query;
    const bugs = await bugService.getBugs(req.params.id, {
      status,
      severity,
      assignee,
      search
    });
    return res.status(200).json(bugs);
  } catch (err) {
    next(err);
  }
}

async function getBugById(req, res, next) {
  try {
    const bug = await bugService.getBugById(req.params.bid);
    return res.status(200).json(bug);
  } catch (err) {
    next(err);
  }
}

async function updateBug(req, res, next) {
  try {
    const bug = await bugService.updateBug(req.params.bid, req.body, req.user._id);
    return res.status(200).json(bug);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBug,
  getBugs,
  getBugById,
  updateBug
};
