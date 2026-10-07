// Test Management Service (FR-TST-01 to FR-TST-05)
const TestCase = require('../models/TestCase');
const TestRun = require('../models/TestRun');
const Counter = require('../models/Counter');
const Requirement = require('../models/Requirement');

/**
 * Create a new test case linked to one or more requirements (FR-TST-01, FR-TST-02)
 */
async function createTestCase(projectId, { title, steps, expectedResult, priority, requirementIds }) {
  // Generate TC-n auto-increment ID
  const testId = await Counter.getNextSequence(projectId, 'TC', 'TC');

  // Ensure steps is an array
  const formattedSteps = Array.isArray(steps)
    ? steps.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    : [];

  const testCase = await TestCase.create({
    projectId,
    testId,
    title: title.trim(),
    steps: formattedSteps,
    expectedResult: expectedResult ? expectedResult.trim() : '',
    priority: priority || 'Medium',
    requirementIds: Array.isArray(requirementIds) ? requirementIds : [],
    status: 'Not Run',
    needsRerun: false
  });

  return testCase;
}

/**
 * List test cases with optional filters (FR-TST-01)
 */
async function getTestCases(projectId, { priority, status, requirementId, search, needsRerun }) {
  const query = { projectId };

  if (priority) query.priority = priority;
  if (status) query.status = status;
  if (requirementId) query.requirementIds = requirementId;
  if (needsRerun !== undefined) query.needsRerun = needsRerun === 'true' || needsRerun === true;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { testId: { $regex: search, $options: 'i' } }
    ];
  }

  const tests = await TestCase.find(query)
    .sort({ testId: 1 })
    .populate('lastRunBy', 'name email');

  return tests;
}

/**
 * Update test case details or requirement links (FR-TST-02)
 */
async function updateTestCase(testCaseId, updates) {
  const testCase = await TestCase.findById(testCaseId);
  if (!testCase) {
    const err = new Error('Test case not found');
    err.statusCode = 404;
    throw err;
  }

  if (updates.title !== undefined) testCase.title = updates.title.trim();
  if (updates.steps !== undefined) {
    testCase.steps = Array.isArray(updates.steps)
      ? updates.steps.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
      : testCase.steps;
  }
  if (updates.expectedResult !== undefined) testCase.expectedResult = updates.expectedResult.trim();
  if (updates.priority !== undefined) testCase.priority = updates.priority;
  if (updates.requirementIds !== undefined) {
    testCase.requirementIds = Array.isArray(updates.requirementIds)
      ? updates.requirementIds
      : testCase.requirementIds;
  }
  if (updates.status !== undefined) testCase.status = updates.status;
  if (updates.needsRerun !== undefined) testCase.needsRerun = updates.needsRerun;

  await testCase.save();
  return testCase.populate('lastRunBy', 'name email');
}

/**
 * Record test execution result, log to history, and clear needsRerun (FR-TST-03, FR-TST-04)
 */
async function recordTestRun(testCaseId, { status, notes }, userId) {
  const testCase = await TestCase.findById(testCaseId);
  if (!testCase) {
    const err = new Error('Test case not found');
    err.statusCode = 404;
    throw err;
  }

  const runDate = new Date();

  // Create execution history entry in testruns collection
  const testRun = await TestRun.create({
    projectId: testCase.projectId,
    testId: testCase.testId,
    status,
    executedBy: userId,
    executedAt: runDate,
    notes: notes ? notes.trim() : ''
  });

  // Update test case status, last run info, and clear needsRerun
  testCase.status = status;
  testCase.needsRerun = false; // As defined in SRS & System Design Section 3 & 4.2
  testCase.lastRunBy = userId;
  testCase.lastRunAt = runDate;

  await testCase.save();

  await testCase.populate('lastRunBy', 'name email');

  return {
    testCase,
    testRun
  };
}

/**
 * Retrieve execution history for a test case (FR-TST-04)
 */
async function getTestRuns(projectId, testId) {
  const runs = await TestRun.find({ projectId, testId })
    .sort({ executedAt: -1 })
    .populate('executedBy', 'name email');

  return runs;
}

module.exports = {
  createTestCase,
  getTestCases,
  updateTestCase,
  recordTestRun,
  getTestRuns
};
