// Reports Generation and Export Service (FR-RPT-01 to FR-RPT-04)
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Requirement = require('../models/Requirement');
const TestCase = require('../models/TestCase');
const TestRun = require('../models/TestRun');
const Project = require('../models/Project');

/**
 * Generate Requirement Traceability Matrix (RTM) Data (FR-RPT-01)
 * Requirement -> Linked Tests -> Latest Execution Result
 */
async function generateRTMData(projectId) {
  const requirements = await Requirement.find({ projectId }).sort({ reqId: 1 });
  const testCases = await TestCase.find({ projectId }).sort({ testId: 1 });

  const rtmRows = [];

  for (const req of requirements) {
    const linkedTests = testCases.filter((t) => t.requirementIds.includes(req.reqId));

    if (linkedTests.length === 0) {
      rtmRows.push({
        reqId: req.reqId,
        reqTitle: req.title,
        reqPriority: req.priority,
        reqStatus: req.status,
        testId: 'None',
        testTitle: 'No linked tests',
        testStatus: 'Uncovered',
        needsRerun: false,
        lastRunAt: null
      });
    } else {
      for (const t of linkedTests) {
        rtmRows.push({
          reqId: req.reqId,
          reqTitle: req.title,
          reqPriority: req.priority,
          reqStatus: req.status,
          testId: t.testId,
          testTitle: t.title,
          testStatus: t.status,
          needsRerun: t.needsRerun,
          lastRunAt: t.lastRunAt
        });
      }
    }
  }

  return {
    type: 'rtm',
    title: 'Requirement Traceability Matrix (RTM)',
    generatedAt: new Date(),
    rows: rtmRows
  };
}

/**
 * Generate Test Execution Report Data (FR-RPT-02)
 * Total runs, counts by status, list of failures
 */
async function generateExecutionData(projectId) {
  const tests = await TestCase.find({ projectId }).sort({ testId: 1 });

  const statusCounts = {
    Passed: 0,
    Failed: 0,
    Blocked: 0,
    'Not Run': 0
  };

  const failedTests = [];

  tests.forEach((t) => {
    if (statusCounts[t.status] !== undefined) {
      statusCounts[t.status] += 1;
    }
    if (t.status === 'Failed') {
      failedTests.push({
        testId: t.testId,
        title: t.title,
        priority: t.priority,
        requirementIds: t.requirementIds,
        lastRunAt: t.lastRunAt
      });
    }
  });

  // Recent test execution runs log
  const recentRuns = await TestRun.find({ projectId })
    .sort({ executedAt: -1 })
    .limit(20)
    .populate('executedBy', 'name email');

  return {
    type: 'execution',
    title: 'Test Execution Summary Report',
    generatedAt: new Date(),
    totalTests: tests.length,
    statusCounts,
    failedTests,
    recentRuns: recentRuns.map((r) => ({
      testId: r.testId,
      status: r.status,
      executedBy: r.executedBy ? r.executedBy.name : 'Unknown',
      executedAt: r.executedAt,
      notes: r.notes
    }))
  };
}

/**
 * Generate Requirement Coverage Report Data (FR-RPT-03)
 * Covered vs Uncovered requirements list with coverage %
 */
async function generateCoverageData(projectId) {
  const requirements = await Requirement.find({ projectId }).sort({ reqId: 1 });
  const totalCount = requirements.length;

  const linkedReqIds = await TestCase.distinct('requirementIds', { projectId });
  const linkedSet = new Set(linkedReqIds);

  const covered = [];
  const uncovered = [];

  requirements.forEach((r) => {
    const item = {
      reqId: r.reqId,
      title: r.title,
      type: r.type,
      priority: r.priority,
      status: r.status
    };
    if (linkedSet.has(r.reqId)) {
      covered.push(item);
    } else {
      uncovered.push(item);
    }
  });

  const coveragePct = totalCount > 0 ? Math.round((covered.length / totalCount) * 100) : 0;

  return {
    type: 'coverage',
    title: 'Requirement Coverage Report',
    generatedAt: new Date(),
    totalRequirements: totalCount,
    coveredCount: covered.length,
    uncoveredCount: uncovered.length,
    coveragePercentage: coveragePct,
    covered,
    uncovered
  };
}

/**
 * Dispatcher to get report structured data
 */
async function getReportData(projectId, type) {
  switch (type) {
    case 'rtm':
      return await generateRTMData(projectId);
    case 'execution':
      return await generateExecutionData(projectId);
    case 'coverage':
      return await generateCoverageData(projectId);
    default: {
      const err = new Error(`Unsupported report type: ${type}`);
      err.statusCode = 400;
      throw err;
    }
  }
}

/**
 * Export report to PDF format via PDFKit (FR-RPT-04)
 */
async function exportToPDF(projectId, type, res) {
  const project = await Project.findById(projectId);
  const data = await getReportData(projectId, type);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${project ? project.name.replace(/\s+/g, '_') : 'project'}_${type}_report.pdf"`
  );

  doc.pipe(res);

  // Header
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Smart Change Impact & Test Management', { align: 'center' });
  doc
    .fontSize(14)
    .font('Helvetica')
    .text(data.title, { align: 'center' });
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .text(`Project: ${project ? project.name : 'Unknown'} | Date: ${new Date().toLocaleString()}`, {
      align: 'center'
    });
  doc.moveDown(1);
  doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);

  // Content rendering based on type
  if (type === 'rtm') {
    doc.fontSize(12).font('Helvetica-Bold').text('Traceability Matrix Rows:');
    doc.moveDown(0.5);

    data.rows.forEach((row, i) => {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${i + 1}. [${row.reqId}] ${row.reqTitle} (${row.reqPriority})`);
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`   Test: [${row.testId}] ${row.testTitle} | Status: ${row.testStatus} ${row.needsRerun ? '(Needs Re-run)' : ''}`);
      doc.moveDown(0.3);
    });
  } else if (type === 'execution') {
    doc.fontSize(12).font('Helvetica-Bold').text('Execution Summary:');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Total Test Cases: ${data.totalTests}`);
    doc.text(`Passed: ${data.statusCounts.Passed} | Failed: ${data.statusCounts.Failed} | Blocked: ${data.statusCounts.Blocked} | Not Run: ${data.statusCounts['Not Run']}`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text(`Failed Test Cases (${data.failedTests.length}):`);
    doc.moveDown(0.5);
    if (data.failedTests.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No failing tests.');
    } else {
      data.failedTests.forEach((f) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`- [${f.testId}] ${f.title} (Priority: ${f.priority})`);
      });
    }
  } else if (type === 'coverage') {
    doc.fontSize(12).font('Helvetica-Bold').text('Coverage Metrics:');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Coverage Rate: ${data.coveragePercentage}% (${data.coveredCount} of ${data.totalRequirements} covered)`);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').text(`Uncovered Requirements (${data.uncovered.length}):`);
    doc.moveDown(0.5);
    if (data.uncovered.length === 0) {
      doc.fontSize(10).font('Helvetica').text('All requirements have test coverage.');
    } else {
      data.uncovered.forEach((u) => {
        doc.fontSize(10).font('Helvetica').text(`- [${u.reqId}] ${u.title} (${u.priority})`);
      });
    }
  }

  doc.end();
}

/**
 * Export report to Excel (.xlsx) format via ExcelJS (FR-RPT-04)
 */
async function exportToExcel(projectId, type, res) {
  const project = await Project.findById(projectId);
  const data = await getReportData(projectId, type);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SCIT System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(data.title.substring(0, 30));

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${project ? project.name.replace(/\s+/g, '_') : 'project'}_${type}_report.xlsx"`
  );

  if (type === 'rtm') {
    worksheet.columns = [
      { header: 'Requirement ID', key: 'reqId', width: 16 },
      { header: 'Requirement Title', key: 'reqTitle', width: 32 },
      { header: 'Req Priority', key: 'reqPriority', width: 14 },
      { header: 'Req Status', key: 'reqStatus', width: 14 },
      { header: 'Test ID', key: 'testId', width: 14 },
      { header: 'Test Title', key: 'testTitle', width: 32 },
      { header: 'Test Status', key: 'testStatus', width: 14 },
      { header: 'Needs Re-run', key: 'needsRerun', width: 14 }
    ];

    data.rows.forEach((row) => {
      worksheet.addRow(row);
    });
  } else if (type === 'execution') {
    worksheet.columns = [
      { header: 'Test ID', key: 'testId', width: 16 },
      { header: 'Title', key: 'title', width: 32 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Last Run At', key: 'lastRunAt', width: 22 }
    ];

    const tests = await TestCase.find({ projectId }).sort({ testId: 1 });
    tests.forEach((t) => {
      worksheet.addRow({
        testId: t.testId,
        title: t.title,
        priority: t.priority,
        status: t.status,
        lastRunAt: t.lastRunAt ? t.lastRunAt.toISOString() : 'Never'
      });
    });
  } else if (type === 'coverage') {
    worksheet.columns = [
      { header: 'Requirement ID', key: 'reqId', width: 16 },
      { header: 'Title', key: 'title', width: 32 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Coverage State', key: 'coverage', width: 16 }
    ];

    data.covered.forEach((r) => {
      worksheet.addRow({ ...r, coverage: 'Covered' });
    });
    data.uncovered.forEach((r) => {
      worksheet.addRow({ ...r, coverage: 'Uncovered' });
    });
  }

  // Format header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F0EE' }
  };

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  getReportData,
  exportToPDF,
  exportToExcel
};
