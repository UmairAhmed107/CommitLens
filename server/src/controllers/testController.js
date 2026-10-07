// Test Case Controller (FR-TST-01 to FR-TST-05)
const testService = require('../services/testService');
const { isNonEmptyString } = require('../middleware/validate');

async function createTestCase(req, res, next) {
  try {
    const { title, steps, expectedResult, priority, requirementIds } = req.body;
    const errors = [];

    if (!isNonEmptyString(title)) errors.push('Test case title is required');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const testCase = await testService.createTestCase(req.params.id, {
      title,
      steps,
      expectedResult,
      priority,
      requirementIds
    });

    return res.status(201).json(testCase);
  } catch (err) {
    next(err);
  }
}

async function getTestCases(req, res, next) {
  try {
    const { priority, status, requirementId, search, needsRerun } = req.query;
    const tests = await testService.getTestCases(req.params.id, {
      priority,
      status,
      requirementId,
      search,
      needsRerun
    });
    return res.status(200).json(tests);
  } catch (err) {
    next(err);
  }
}

async function updateTestCase(req, res, next) {
  try {
    const testCase = await testService.updateTestCase(req.params.tid, req.body);
    return res.status(200).json(testCase);
  } catch (err) {
    next(err);
  }
}

async function recordTestRun(req, res, next) {
  try {
    const { status, notes } = req.body;
    const errors = [];

    if (!['Not Run', 'Passed', 'Failed', 'Blocked'].includes(status)) {
      errors.push("Status must be one of: 'Not Run', 'Passed', 'Failed', 'Blocked'");
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const result = await testService.recordTestRun(
      req.params.tid,
      { status, notes },
      req.user._id
    );

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTestCase,
  getTestCases,
  updateTestCase,
  recordTestRun
};
