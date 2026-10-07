// Change Impact Engine Service (FR-IMP-01 to FR-IMP-08)
const { minimatch } = require('minimatch');
const MappingRule = require('../models/MappingRule');
const TestCase = require('../models/TestCase');
const Requirement = require('../models/Requirement');
const ImpactResult = require('../models/ImpactResult');

/**
 * Pure function: Match file path against glob pattern (UT-01, UT-02)
 */
function matchesPattern(filePath, pattern) {
  if (!filePath || !pattern) return false;
  // Normalize Windows/Unix path separators to forward slash
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');
  return minimatch(normalizedPath, normalizedPattern, { dot: true });
}

/**
 * Pure function: Scan file content for @req (REQ-n) annotations (UT-03, UT-04)
 */
function scanContentForReqTags(content) {
  if (!content || typeof content !== 'string') return [];
  const regex = /@req\s+(REQ-\d+)/gi;
  const matches = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1]) {
      matches.add(match[1].toUpperCase());
    }
  }
  return Array.from(matches);
}

/**
 * Pure function: Calculate test suite reduction percentage (UT-07)
 */
function calculateReductionPercentage(recommendedCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  const reduction = ((1 - recommendedCount / totalCount) * 100);
  return Math.round(reduction * 10) / 10; // 1 decimal place precision
}

/**
 * Pure function: Calculate requirement coverage percentage (UT-08)
 */
function calculateCoveragePercentage(coveredCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  const coverage = (coveredCount / totalCount) * 100;
  return Math.round(coverage * 10) / 10;
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
  const mappingRules = await MappingRule.find({ projectId });

  // Load existing requirements to ignore invalid tags (e.g. REQ-99 does not exist)
  const existingReqs = await Requirement.find({ projectId }).select('reqId');
  const validReqIds = new Set(existingReqs.map((r) => r.reqId));

  // Structure: Map of requirementId -> Set of reasons ('pattern', 'tag')
  const impactedMap = new Map();

  const files = commit.files || [];
  const unmappedFiles = [];

  // 2. For each changed file, test against glob patterns and scan content tags
  for (const file of files) {
    let fileMatched = false;
    const filePath = file.path;

    // Pattern matching
    for (const rule of mappingRules) {
      if (matchesPattern(filePath, rule.pattern)) {
        fileMatched = true;
        if (!impactedMap.has(rule.requirementId)) {
          impactedMap.set(rule.requirementId, new Set());
        }
        impactedMap.get(rule.requirementId).add('pattern');
      }
    }

    // Tag scanning (only if file is not deleted)
    if (file.status !== 'removed') {
      const content = fileContents[filePath] || '';
      const tags = scanContentForReqTags(content);
      for (const tag of tags) {
        // Only consider if requirement exists in project
        if (validReqIds.has(tag)) {
          fileMatched = true;
          if (!impactedMap.has(tag)) {
            impactedMap.set(tag, new Set());
          }
          impactedMap.get(tag).add('tag');
        } else {
          console.warn(`[Impact Engine] Ignoring non-existent requirement tag ${tag} in ${filePath}`);
        }
      }
    }

    // 7. Any changed file with no pattern or tag match goes to unmappedFiles
    if (!fileMatched) {
      unmappedFiles.push(filePath);
    }
  }

  // 4. Merge by requirement: union, with all reasons kept
  const impacted = [];
  for (const [reqId, reasonsSet] of impactedMap.entries()) {
    impacted.push({
      requirementId: reqId,
      reasons: Array.from(reasonsSet)
    });
  }

  const impactedReqIds = impacted.map((i) => i.requirementId);

  // 5. Find all test cases whose requirementIds include any impacted requirement
  const recommendedTests = await TestCase.find({
    projectId,
    requirementIds: { $in: impactedReqIds }
  });

  const recommendedTestIds = recommendedTests.map((t) => t.testId);

  // 6. Set needsRerun = true on each recommended test
  if (recommendedTestIds.length > 0) {
    await TestCase.updateMany(
      {
        projectId,
        testId: { $in: recommendedTestIds }
      },
      {
        $set: { needsRerun: true }
      }
    );
  }

  // 8. Compute reductionPct and save result
  const totalTests = await TestCase.countDocuments({ projectId });
  const reductionPct = calculateReductionPercentage(recommendedTestIds.length, totalTests);

  const impactResult = await ImpactResult.findOneAndUpdate(
    { projectId, commitSha: commit.sha },
    {
      projectId,
      commitSha: commit.sha,
      impacted,
      recommendedTestIds,
      unmappedFiles,
      totalTests,
      reductionPct,
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
