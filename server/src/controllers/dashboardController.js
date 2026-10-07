// Dashboard Controller (FR-DSH-01 to FR-DSH-04)
const dashboardService = require('../services/dashboardService');

async function getDashboard(req, res, next) {
  try {
    const { id, view } = req.params;
    const validViews = ['project', 'dev', 'qa', 'lead'];

    if (!validViews.includes(view)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [`Dashboard view must be one of: ${validViews.join(', ')}`]
      });
    }

    const data = await dashboardService.getDashboard(id, view, req.user._id);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard
};
