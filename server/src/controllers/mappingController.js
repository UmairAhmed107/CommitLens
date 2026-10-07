// Mapping Rules Controller (FR-IMP-01)
const mappingService = require('../services/mappingService');
const { isNonEmptyString } = require('../middleware/validate');

async function createMapping(req, res, next) {
  try {
    const { pattern, requirementId } = req.body;
    const errors = [];

    if (!isNonEmptyString(pattern)) errors.push('Pattern (e.g. src/auth/**) is required');
    if (!isNonEmptyString(requirementId)) errors.push('Requirement ID is required');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const rule = await mappingService.createMappingRule(req.params.id, {
      pattern,
      requirementId,
      userId: req.user._id
    });

    return res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

async function getMappings(req, res, next) {
  try {
    const rules = await mappingService.getMappingRules(req.params.id);
    return res.status(200).json(rules);
  } catch (err) {
    next(err);
  }
}

async function deleteMapping(req, res, next) {
  try {
    const result = await mappingService.deleteMappingRule(req.params.mid);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createMapping,
  getMappings,
  deleteMapping
};
