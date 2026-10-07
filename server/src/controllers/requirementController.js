// Requirement Controller (FR-REQ-01 to FR-REQ-05)
const requirementService = require('../services/requirementService');
const { isNonEmptyString } = require('../middleware/validate');

async function createRequirement(req, res, next) {
  try {
    const { title, description, type, priority, status } = req.body;
    const errors = [];

    if (!isNonEmptyString(title)) errors.push('Requirement title is required');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const requirement = await requirementService.createRequirement(
      req.params.id,
      { title, description, type, priority, status },
      req.user._id
    );

    return res.status(201).json(requirement);
  } catch (err) {
    next(err);
  }
}

async function getRequirements(req, res, next) {
  try {
    const { priority, status, type, search } = req.query;
    const requirements = await requirementService.getRequirements(req.params.id, {
      priority,
      status,
      type,
      search
    });
    return res.status(200).json(requirements);
  } catch (err) {
    next(err);
  }
}

async function updateRequirement(req, res, next) {
  try {
    const requirement = await requirementService.updateRequirement(
      req.params.rid,
      req.body,
      req.user._id
    );
    return res.status(200).json(requirement);
  } catch (err) {
    next(err);
  }
}

async function getCoverage(req, res, next) {
  try {
    const coverage = await requirementService.getRequirementCoverage(req.params.id);
    return res.status(200).json(coverage);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRequirement,
  getRequirements,
  updateRequirement,
  getCoverage
};
