// Change Impact Engine Service (FR-IMP-01 to FR-IMP-08)
const {
  matchesPattern,
  matchPatterns,
  scanTags,
  calculateReductionPercentage,
  calculateCoveragePercentage,
  computeImpact
} = require('./impactEngine');
const MappingRule = require('../models/MappingRule');
const TestCase = require('../models/TestCase');
const Requirement = require('../models/Requirement');
const ImpactResult = require('../models/ImpactResult');

/**
 * Pure function: Scan file content for @req (REQ-n) annotations (alias for scanTags)
 */
function scanContentForReqTags(content) {
  return scanTags(content);
}

/**
 * Run Impact Analysis Algorithm (System Design Section 3, FR-IMP-03 to FR-IMP-08)
 *
 * @param {ObjectId} projectId - Project identifier
 * @param {Object} commit - Commit object containing sha and files: [{ path, status }]
 * @param {Object} fileContents - Optional map of filePath -> content string for tag scanning
 */
async function analyzeCommitImpact(projectId, commit, fileContents = {}) {
  // 1. Load all mapping rules for the project
  const mappingRules = await MappingRule.find({ projectId }).lean();

  // 2. Load existing requirements to ignore invalid tags (e.g. REQ-99 does not exist)
  const existingReqs = await Requirement.find({ projectId }).select('reqId').lean();
  const validReqIds = existingReqs.map((r) => r.reqId);

  // 3. Load all test cases for the project
  const testCases = await TestCase.find({ projectId }).lean();

  // 4. Compute impact using pure impact engine (Section 3 Algorithm)
  const impact = computeImpact(commit, mappingRules, testCases, fileContents, validReqIds);

  // 5. Update recommended test cases with needsRerun = true (FR-IMP-08)
  if (impact.recommendedTestIds.length > 0) {
    await TestCase.updateMany(
      {
        projectId,
        testId: { $in: impact.recommendedTestIds }
      },
      {
        $set: { needsRerun: true }
      }
    );
  }

  // 6. Save or update ImpactResult
  const impactResult = await ImpactResult.findOneAndUpdate(
    { projectId, commitSha: commit.sha },
    {
      projectId,
      commitSha: commit.sha,
      impacted: impact.impacted,
      recommendedTestIds: impact.recommendedTestIds,
      unmappedFiles: impact.unmappedFiles,
      totalTests: impact.totalTests,
      reductionPct: impact.reductionPct,
      createdAt: new Date()
    },
    { new: true, upsert: true }
  );

  return impactResult;
}

/**
 * Retrieve impact result for a commit SHA (FR-IMP-03)
 */
async function getImpactForCommit(sha, projectId) {
  const query = { commitSha: sha };
  if (projectId) query.projectId = projectId;

  let result = await ImpactResult.findOne(query);

  if (!result && projectId) {
    // If not found yet, check if commit exists and re-run impact
    const Commit = require('../models/Commit');
    const commit = await Commit.findOne({ sha, projectId });
    if (commit) {
      result = await analyzeCommitImpact(projectId, commit);
    }
  }

  if (!result) {
    const err = new Error('Impact result not found for this commit');
    err.statusCode = 404;
    throw err;
  }

  // Enrich recommended test cases with full test object details
  const tests = await TestCase.find({
    projectId: result.projectId,
    testId: { $in: result.recommendedTestIds }
  });

  // Enrich impacted requirements with titles
  const reqs = await Requirement.find({
    projectId: result.projectId,
    reqId: { $in: result.impacted.map((i) => i.requirementId) }
  });

  const reqMap = new Map(reqs.map((r) => [r.reqId, r]));

  return {
    ...result.toObject(),
    recommendedTestDetails: tests,
    impactedDetails: result.impacted.map((imp) => ({
      requirementId: imp.requirementId,
      reasons: imp.reasons,
      title: reqMap.get(imp.requirementId) ? reqMap.get(imp.requirementId).title : ''
    }))
  };
}

module.exports = {
  matchesPattern,
  scanContentForReqTags,
  calculateReductionPercentage,
  calculateCoveragePercentage,
  analyzeCommitImpact,
  getImpactForCommit
};
