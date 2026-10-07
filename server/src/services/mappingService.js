// Mapping Rules Service (FR-IMP-01)
const MappingRule = require('../models/MappingRule');
const Requirement = require('../models/Requirement');

/**
 * Create a new pattern-to-requirement mapping rule (FR-IMP-01)
 */
async function createMappingRule(projectId, { pattern, requirementId, userId }) {
  // Validate that requirement exists in project
  const reqExists = await Requirement.findOne({ projectId, reqId: requirementId.trim() });
  if (!reqExists) {
    const err = new Error('Requirement not found');
    err.statusCode = 404;
    err.details = [`Requirement ${requirementId} does not exist in this project.`];
    throw err;
  }

  const rule = await MappingRule.create({
    projectId,
    pattern: pattern.trim(),
    requirementId: requirementId.trim(),
    createdBy: userId
  });

  return rule.populate('createdBy', 'name email');
}

/**
 * List all mapping rules for a project
 */
async function getMappingRules(projectId) {
  const rules = await MappingRule.find({ projectId })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');

  // Enrich with requirement title
  const reqs = await Requirement.find({ projectId }).select('reqId title');
  const reqMap = new Map(reqs.map((r) => [r.reqId, r.title]));

  return rules.map((r) => ({
    ...r.toObject(),
    requirementTitle: reqMap.get(r.requirementId) || ''
  }));
}

/**
 * Delete a mapping rule
 */
async function deleteMappingRule(ruleId) {
  const rule = await MappingRule.findByIdAndDelete(ruleId);
  if (!rule) {
    const err = new Error('Mapping rule not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true, deletedId: ruleId };
}

module.exports = {
  createMappingRule,
  getMappingRules,
  deleteMappingRule
};
