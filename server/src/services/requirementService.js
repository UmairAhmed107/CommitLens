// Requirement Service (FR-REQ-01 to FR-REQ-05)
const Requirement = require('../models/Requirement');
const Counter = require('../models/Counter');
const TestCase = require('../models/TestCase');

/**
 * Create a new requirement with auto-generated REQ-n ID (FR-REQ-01, FR-REQ-02)
 */
async function createRequirement(projectId, { title, description, type, priority, status }, userId) {
  // Generate unique REQ-n per project
  const reqId = await Counter.getNextSequence(projectId, 'REQ', 'REQ');

  const requirement = await Requirement.create({
    projectId,
    reqId,
    title: title.trim(),
    description: description ? description.trim() : '',
    type: (type || 'functional').toLowerCase(),
    priority: priority || 'Medium',
    status: status || 'Active',
    version: 1,
    history: []
  });

  return {
    ...requirement.toObject(),
    linkedTests: [],
    linkedTestsCount: 0,
    coverageState: 'uncovered'
  };
}


/**
 * List requirements with search and filter capabilities, enriched with linked tests and coverage state (FR-REQ-04, FR-REQ-05)
 */
async function getRequirements(projectId, { priority, status, type, search }) {
  const query = { projectId };

  if (priority) query.priority = priority;
  if (status) query.status = status;
  if (type) query.type = type;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { reqId: { $regex: search, $options: 'i' } }
    ];
  }

  const requirements = await Requirement.find(query).sort({ reqId: 1 });

  // Enrich each requirement with its linked test cases and coverage state
  const enriched = await Promise.all(
    requirements.map(async (reqDoc) => {
      const linkedTests = await TestCase.find({
        projectId,
        requirementIds: reqDoc.reqId
      }).select('testId title priority status needsRerun');

      const isCovered = linkedTests.length > 0;

      return {
        ...reqDoc.toObject(),
        linkedTests,
        linkedTestsCount: linkedTests.length,
        coverageState: isCovered ? 'covered' : 'uncovered'
      };
    })
  );

  return enriched;
}

/**
 * Update a requirement, automatically incrementing version and saving old snapshot in history (FR-REQ-03)
 */
async function updateRequirement(requirementId, updates, userId) {
  const requirement = await Requirement.findById(requirementId);
  if (!requirement) {
    const err = new Error('Requirement not found');
    err.statusCode = 404;
    throw err;
  }

  // Push previous snapshot into history
  requirement.history.push({
    title: requirement.title,
    description: requirement.description,
    type: requirement.type,
    priority: requirement.priority,
    status: requirement.status,
    version: requirement.version,
    modifiedAt: new Date(),
    modifiedBy: userId
  });

  // Increment version
  requirement.version += 1;

  if (updates.title !== undefined) requirement.title = updates.title.trim();
  if (updates.description !== undefined) requirement.description = updates.description.trim();
  if (updates.type !== undefined) requirement.type = updates.type;
  if (updates.priority !== undefined) requirement.priority = updates.priority;
  if (updates.status !== undefined) requirement.status = updates.status;

  await requirement.save();

  // Attach linked tests
  const linkedTests = await TestCase.find({
    projectId: requirement.projectId,
    requirementIds: requirement.reqId
  }).select('testId title priority status needsRerun');

  return {
    ...requirement.toObject(),
    linkedTests,
    linkedTestsCount: linkedTests.length,
    coverageState: linkedTests.length > 0 ? 'covered' : 'uncovered'
  };
}

/**
 * Calculate requirement coverage statistics and list uncovered requirements (FR-REQ-05, FR-TST-05)
 */
async function getRequirementCoverage(projectId) {
  const totalRequirements = await Requirement.find({ projectId }).sort({ reqId: 1 });
  const totalCount = totalRequirements.length;

  if (totalCount === 0) {
    return {
      totalRequirements: 0,
      coveredRequirements: 0,
      coveragePercentage: 0,
      covered: [],
      uncovered: []
    };
  }

  // Find all requirements linked to at least one test case
  const linkedReqIds = await TestCase.distinct('requirementIds', { projectId });
  const linkedSet = new Set(linkedReqIds);

  const covered = [];
  const uncovered = [];

  for (const req of totalRequirements) {
    if (linkedSet.has(req.reqId)) {
      covered.push({
        reqId: req.reqId,
        title: req.title,
        priority: req.priority,
        status: req.status
      });
    } else {
      uncovered.push({
        reqId: req.reqId,
        title: req.title,
        priority: req.priority,
        status: req.status
      });
    }
  }

  const coveragePercentage = Math.round((covered.length / totalCount) * 100);

  return {
    totalRequirements: totalCount,
    coveredRequirements: covered.length,
    coveragePercentage,
    covered,
    uncovered
  };
}

/**
 * Get detailed requirement by ID with linked tests and history
 */
async function getRequirementById(requirementId) {
  const requirement = await Requirement.findById(requirementId).populate('history.modifiedBy', 'name email');
  if (!requirement) {
    const err = new Error('Requirement not found');
    err.statusCode = 404;
    throw err;
  }

  const linkedTests = await TestCase.find({
    projectId: requirement.projectId,
    requirementIds: requirement.reqId
  }).select('testId title priority status needsRerun');

  return {
    ...requirement.toObject(),
    linkedTests,
    linkedTestsCount: linkedTests.length,
    coverageState: linkedTests.length > 0 ? 'covered' : 'uncovered'
  };
}

module.exports = {
  createRequirement,
  getRequirements,
  getRequirementById,
  updateRequirement,
  getRequirementCoverage
};

