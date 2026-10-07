// Dashboard Service (FR-DSH-01 to FR-DSH-04)
const Requirement = require('../models/Requirement');
const TestCase = require('../models/TestCase');
const Commit = require('../models/Commit');
const Bug = require('../models/Bug');
const ImpactResult = require('../models/ImpactResult');

/**
 * Project Dashboard View (FR-DSH-01)
 * Shows total requirements, covered requirements, coverage percentage, open bugs, and commit count.
 */
async function getProjectDashboard(projectId) {
  const totalReqs = await Requirement.countDocuments({ projectId });
  const linkedReqIds = await TestCase.distinct('requirementIds', { projectId });
  const coveredCount = await Requirement.countDocuments({
    projectId,
    reqId: { $in: linkedReqIds }
  });

  const coveragePct = totalReqs > 0 ? Math.round((coveredCount / totalReqs) * 100) : 0;
  const openBugsCount = await Bug.countDocuments({
    projectId,
    status: { $in: ['Open', 'In Progress'] }
  });
  const commitCount = await Commit.countDocuments({ projectId });

  // Status breakdown of requirements for bar chart
  const reqStatusCounts = await Requirement.aggregate([
    { $match: { projectId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  return {
    totalRequirements: totalReqs,
    coveredRequirements: coveredCount,
    coveragePercentage: coveragePct,
    openBugs: openBugsCount,
    commitCount,
    requirementStatusBreakdown: reqStatusCounts.map((r) => ({
      status: r._id,
      count: r.count
    }))
  };
}

/**
 * Developer Dashboard View (FR-DSH-02)
 * Shows recent commits, their impacted requirements, and bugs assigned to the developer.
 */
async function getDevDashboard(projectId, userId) {
  // 5 most recent commits
  const recentCommits = await Commit.find({ projectId }).sort({ date: -1 }).limit(5);

  const commitsWithImpact = await Promise.all(
    recentCommits.map(async (c) => {
      const impact = await ImpactResult.findOne({ projectId, commitSha: c.sha });
      return {
        ...c.toObject(),
        impactedRequirements: impact ? impact.impacted : [],
        recommendedTestsCount: impact ? impact.recommendedTestIds.length : 0,
        reductionPct: impact ? impact.reductionPct : 0
      };
    })
  );

  // Bugs assigned to this developer
  const myBugs = await Bug.find({
    projectId,
    assignedTo: userId,
    status: { $ne: 'Closed' }
  }).sort({ priority: 1, createdAt: -1 });

  return {
    recentCommits: commitsWithImpact,
    assignedBugs: myBugs,
    totalAssignedBugs: myBugs.length
  };
}

/**
 * QA Dashboard View (FR-DSH-03)
 * Shows tests marked Needs Re-run, failed tests, and coverage percentage.
 */
async function getQADashboard(projectId) {
  const needsRerunTests = await TestCase.find({
    projectId,
    needsRerun: true
  }).sort({ priority: 1, testId: 1 });

  const failedTests = await TestCase.find({
    projectId,
    status: 'Failed'
  }).sort({ priority: 1, testId: 1 });

  const totalReqs = await Requirement.countDocuments({ projectId });
  const linkedReqIds = await TestCase.distinct('requirementIds', { projectId });
  const coveredCount = await Requirement.countDocuments({
    projectId,
    reqId: { $in: linkedReqIds }
  });
  const coveragePct = totalReqs > 0 ? Math.round((coveredCount / totalReqs) * 100) : 0;

  return {
    needsRerunTests,
    needsRerunCount: needsRerunTests.length,
    failedTests,
    failedCount: failedTests.length,
    coveragePercentage: coveragePct,
    totalRequirements: totalReqs,
    coveredRequirements: coveredCount
  };
}

/**
 * Team Lead Dashboard View (FR-DSH-04)
 * Shows pass/fail test execution summary, open bugs by severity, and latest commit impact summary.
 */
async function getLeadDashboard(projectId) {
  // Pass/fail summary of testcases
  const testStatusCounts = await TestCase.aggregate([
    { $match: { projectId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const testSummary = {
    Passed: 0,
    Failed: 0,
    Blocked: 0,
    'Not Run': 0
  };

  testStatusCounts.forEach((item) => {
    if (testSummary[item._id] !== undefined) {
      testSummary[item._id] = item.count;
    }
  });

  // Open bugs by severity
  const bugSeverityCounts = await Bug.aggregate([
    {
      $match: {
        projectId,
        status: { $in: ['Open', 'In Progress'] }
      }
    },
    { $group: { _id: '$severity', count: { $sum: 1 } } }
  ]);

  const bugsBySeverity = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0
  };

  bugSeverityCounts.forEach((item) => {
    if (bugsBySeverity[item._id] !== undefined) {
      bugsBySeverity[item._id] = item.count;
    }
  });

  // Latest commit impact
  const latestCommit = await Commit.findOne({ projectId }).sort({ date: -1 });
  let latestImpact = null;
  if (latestCommit) {
    latestImpact = await ImpactResult.findOne({ projectId, commitSha: latestCommit.sha });
  }

  return {
    testSummary,
    bugsBySeverity,
    latestCommit: latestCommit
      ? {
          sha: latestCommit.sha,
          message: latestCommit.message,
          author: latestCommit.author,
          date: latestCommit.date,
          impactedCount: latestImpact ? latestImpact.impacted.length : 0,
          recommendedTestCount: latestImpact ? latestImpact.recommendedTestIds.length : 0,
          reductionPct: latestImpact ? latestImpact.reductionPct : 0
        }
      : null
  };
}

/**
 * Route dispatcher for role-based dashboard views
 */
async function getDashboard(projectId, view, userId) {
  switch (view) {
    case 'project':
      return await getProjectDashboard(projectId);
    case 'dev':
      return await getDevDashboard(projectId, userId);
    case 'qa':
      return await getQADashboard(projectId);
    case 'lead':
      return await getLeadDashboard(projectId);
    default:
      return await getProjectDashboard(projectId);
  }
}

module.exports = {
  getDashboard,
  getProjectDashboard,
  getDevDashboard,
  getQADashboard,
  getLeadDashboard
};
