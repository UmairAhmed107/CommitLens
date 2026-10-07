// Report Controller (FR-RPT-01 to FR-RPT-04)
const reportService = require('../services/reportService');

async function getReport(req, res, next) {
  try {
    const { id, type } = req.params;
    const validTypes = ['rtm', 'execution', 'coverage'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [`Report type must be one of: ${validTypes.join(', ')}`]
      });
    }

    const data = await reportService.getReportData(id, type);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function exportReport(req, res, next) {
  try {
    const { id, type } = req.params;
    const { format } = req.query; // 'pdf' or 'xlsx'
    const validTypes = ['rtm', 'execution', 'coverage'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [`Report type must be one of: ${validTypes.join(', ')}`]
      });
    }

    if (format === 'pdf') {
      await reportService.exportToPDF(id, type, res);
    } else if (format === 'xlsx' || format === 'excel') {
      await reportService.exportToExcel(id, type, res);
    } else {
      return res.status(400).json({
        error: 'Validation failed',
        details: ["Format parameter must be 'pdf' or 'xlsx'"]
      });
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReport,
  exportReport
};
