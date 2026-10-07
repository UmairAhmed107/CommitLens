// Pure Impact Analysis Engine (System Design Section 3, FR-IMP-01 to FR-IMP-08)
const { minimatch } = require('minimatch');

/**
 * Pure function: Match a single file path against a glob pattern (UT-01, UT-02)
 *
 * @param {string} filePath - Path to the file (e.g. "src/auth/LoginService.js")
 * @param {string} pattern - Glob pattern (e.g. "src/auth/**")
 * @returns {boolean} True if filePath matches pattern
 */
function matchesPattern(filePath, pattern) {
  if (!filePath || !pattern) return false;
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');
  return minimatch(normalizedPath, normalizedPattern, { dot: true });
}

/**
 * Pure function: Match files against mapping rules (FR-IMP-01)
 *
 * @param {Array<string|Object>} files - List of file paths or file objects { path, status }
 * @param {Array<Object>} rules - List of mapping rules { pattern, requirementId }
 * @returns {Object} { matches: Array, matchedFiles: Array<string>, requirementMap: Object }
 */
function matchPatterns(files, rules) {
  const matches = [];
  const matchedFiles = new Set();
  const requirementMap = {}; // requirementId -> Set of matched file paths

  const fileList = (files || []).map((f) => (typeof f === 'string' ? f : f.path)).filter(Boolean);
  const ruleList = rules || [];

  for (const filePath of fileList) {
    for (const rule of ruleList) {
      if (matchesPattern(filePath, rule.pattern)) {
        matches.push({
          file: filePath,
          pattern: rule.pattern,
          requirementId: rule.requirementId
        });
        matchedFiles.add(filePath);
        if (!requirementMap[rule.requirementId]) {
          requirementMap[rule.requirementId] = new Set();
        }
        requirementMap[rule.requirementId].add(filePath);
      }
    }
  }

  return {
    matches,
    matchedFiles: Array.from(matchedFiles),
    requirementMap: Object.fromEntries(
      Object.entries(requirementMap).map(([k, set]) => [k, Array.from(set)])
    )
  };
}

/**
 * Pure function: Scan file content(s) for @req (REQ-n) annotations (FR-IMP-02, UT-03, UT-04)
 *
 * Supports both a single content string and an object mapping { [filePath]: content }
 *
 * @param {string|Object} fileContents - Raw file string or map of filePath -> content
 * @returns {Array<string>|Object} Array of unique tags if string; map of tags if object
 */
function scanTags(fileContents) {
  const regex = /@req\s+(REQ-\d+)/gi;

  if (typeof fileContents === 'string') {
    const tags = new Set();
    let match;
    while ((match = regex.exec(fileContents)) !== null) {
      if (match[1]) {
        tags.add(match[1].toUpperCase());
      }
    }
    return Array.from(tags);
  }

  // If object of { [filePath]: contentString }
  const matches = [];
  const tagMap = {};

  for (const [filePath, content] of Object.entries(fileContents || {})) {
    if (typeof content !== 'string') continue;
    const tags = scanTags(content);
    for (const tag of tags) {
      matches.push({ file: filePath, requirementId: tag });
      if (!tagMap[tag]) tagMap[tag] = new Set();
      tagMap[tag].add(filePath);
    }
  }

  return {
    matches,
    requirementIds: Object.keys(tagMap),
    tagMap: Object.fromEntries(
      Object.entries(tagMap).map(([k, set]) => [k, Array.from(set)])
    )
  };
}

/**
 * Pure function: Calculate test suite reduction percentage (FR-IMP-07, UT-07)
 * Formula: ((1 - recommended / total) * 100), rounded to 1 decimal place
 *
 * @param {number} recommendedCount - Number of recommended tests
 * @param {number} totalCount - Total number of test cases in project
 * @returns {number} Reduction percentage
 */
function calculateReductionPercentage(recommendedCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  const reduction = ((1 - recommendedCount / totalCount) * 100);
  return Math.round(reduction * 10) / 10;
}

/**
 * Pure function: Calculate requirement coverage percentage (UT-08)
 *
 * @param {number} coveredCount - Number of requirements linked to >= 1 test
 * @param {number} totalCount - Total requirements
 * @returns {number} Coverage percentage
 */
function calculateCoveragePercentage(coveredCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  const coverage = (coveredCount / totalCount) * 100;
  return Math.round(coverage * 10) / 10;
}

/**
 * Pure function: Compute impact result for a commit (System Design Section 3, FR-IMP-03 to FR-IMP-08)
 *
 * Algorithm:
 * 1. Test each changed file against every rule's glob pattern -> add requirement with reason 'pattern'.
 * 2. Scan each non-removed changed file for @req REQ-n tags -> add requirement with reason 'tag'.
 * 3. Union impacted requirements, preserving all reasons (UT-05, UT-06).
 * 4. List test cases whose requirementIds include any impacted requirement (recommended tests).
 * 5. Files with no pattern or tag match go to unmappedFiles (FR-IMP-06).
 * 6. Compute reduction percentage (FR-IMP-07).
 *
 * @param {Object} commit - { sha, files: Array<string|{path, status}> }
 * @param {Array<Object>} rules - Array of { pattern, requirementId }
 * @param {Array<Object>} tests - Array of { testId, requirementIds }
 * @param {Object} fileContents - Optional map of filePath -> content string
 * @param {Array<string>} validReqIds - Optional whitelist of valid requirement IDs to ignore stale tags
 * @returns {Object} Impact calculation result
 */
function computeImpact(commit, rules = [], tests = [], fileContents = {}, validReqIds = null) {
  const validSet = validReqIds ? new Set(validReqIds) : null;
  const files = commit?.files || [];
  const impactedMap = new Map(); // requirementId -> Set of reasons
  const matchedFilePaths = new Set();

  // Normalize files array to list of { path, status, content }
  const fileEntries = files.map((f) => {
    if (typeof f === 'string') return { path: f, status: 'modified', content: undefined };
    return { path: f.path || '', status: f.status || 'modified', content: f.content };
  });

  for (const file of fileEntries) {
    let fileMatched = false;
    const filePath = file.path;

    // 1. Pattern matching against mapping rules
    for (const rule of rules) {
      if (matchesPattern(filePath, rule.pattern)) {
        fileMatched = true;
        matchedFilePaths.add(filePath);
        if (!impactedMap.has(rule.requirementId)) {
          impactedMap.set(rule.requirementId, new Set());
        }
        impactedMap.get(rule.requirementId).add('pattern');
      }
    }

    // 2. Tag scanning (only for files not marked 'removed')
    if (file.status !== 'removed') {
      const content = (file.content !== undefined ? file.content : fileContents[filePath]) || '';
      const tags = scanTags(content);
      for (const tag of tags) {
        let targetReqId = tag;
        let isValid = false;

        if (validSet) {
          if (validSet.has(tag)) {
            targetReqId = tag;
            isValid = true;
          } else {
            const normalizedTag = tag.replace(/^REQ-0*(\d+)$/i, 'REQ-$1');
            const foundReq = Array.from(validSet).find(
              (r) => r === tag || r.replace(/^REQ-0*(\d+)$/i, 'REQ-$1') === normalizedTag
            );
            if (foundReq) {
              targetReqId = foundReq;
              isValid = true;
            }
          }
        } else {
          isValid = true;
          const normalizedTag = tag.replace(/^REQ-0*(\d+)$/i, 'REQ-$1');
          for (const existingId of impactedMap.keys()) {
            if (existingId.replace(/^REQ-0*(\d+)$/i, 'REQ-$1') === normalizedTag) {
              targetReqId = existingId;
              break;
            }
          }
        }

        if (isValid) {
          fileMatched = true;
          matchedFilePaths.add(filePath);
          if (!impactedMap.has(targetReqId)) {
            impactedMap.set(targetReqId, new Set());
          }
          impactedMap.get(targetReqId).add('tag');
        }
      }
    }
  }

  // 3. Build impacted array: union of requirements with all reasons kept
  const impacted = [];
  for (const [reqId, reasonsSet] of impactedMap.entries()) {
    impacted.push({
      requirementId: reqId,
      reasons: Array.from(reasonsSet)
    });
  }

  const impactedReqSet = new Set(impacted.map((i) => i.requirementId));

  // 4. Find recommended tests: tests linked to any impacted requirement (FR-IMP-04)
  const recommendedTestIds = [];
  for (const test of tests) {
    const testReqs = test.requirementIds || [];
    if (testReqs.some((r) => impactedReqSet.has(r))) {
      recommendedTestIds.push(test.testId);
    }
  }

  // 5. Unmapped files: changed files that matched no rule or tag (FR-IMP-06)
  const unmappedFiles = fileEntries
    .map((f) => f.path)
    .filter((p) => !matchedFilePaths.has(p));

  // 6. Test reduction percentage (FR-IMP-07)
  const totalTests = tests.length;
  const reductionPct = calculateReductionPercentage(recommendedTestIds.length, totalTests);

  return {
    commitSha: commit?.sha || '',
    impacted,
    impactedRequirements: impacted.map((i) => i.requirementId),
    recommendedTestIds,
    unmappedFiles,
    totalTests,
    reductionPct
  };
}

module.exports = {
  matchesPattern,
  matchPatterns,
  scanTags,
  calculateReductionPercentage,
  calculateCoveragePercentage,
  computeImpact
};
