// Bug Management Service (FR-BUG-01 to FR-BUG-05)
const Bug = require('../models/Bug');
const Counter = require('../models/Counter');

/**
 * Valid lifecycle transitions for bug status (FR-BUG-04)
 */
const STATUS_ORDER = ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed'];

/**
 * Create a new bug report (FR-BUG-01, FR-BUG-02, FR-BUG-03)
 */
async function createBug(projectId, { title, description, severity, priority, testId, assignedTo }, userId) {
  // Generate BUG-n auto-increment ID per project
  const bugId = await Counter.getNextSequence(projectId, 'BUG', 'BUG');

  const bug = await Bug.create({
    projectId,
    bugId,
    title: title.trim(),
    description: description ? description.trim() : '',
    severity: severity || 'Medium',
    priority: priority || 'P2',
    status: 'Open',
    testId: testId || null,
    reportedBy: userId,
    assignedTo: assignedTo || null
  });

  return bug.populate([
    { path: 'reportedBy', select: 'name email' },
    { path: 'assignedTo', select: 'name email' }
  ]);
}

/**
 * List bugs with filtering capabilities (FR-BUG-05)
 */
async function getBugs(projectId, { status, severity, assignee, search }) {
  const query = { projectId };

  if (status) query.status = status;
  if (severity) query.severity = severity;
  if (assignee) query.assignedTo = assignee;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { bugId: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const bugs = await Bug.find(query)
    .sort({ createdAt: -1 })
    .populate('reportedBy', 'name email')
    .populate('assignedTo', 'name email');

  return bugs;
}

/**
 * Update bug details, assignee, or status (FR-BUG-03, FR-BUG-04)
 */
async function updateBug(bugId, updates) {
  const bug = await Bug.findById(bugId);
  if (!bug) {
    const err = new Error('Bug not found');
    err.statusCode = 404;
    throw err;
  }

  if (updates.title !== undefined) bug.title = updates.title.trim();
  if (updates.description !== undefined) bug.description = updates.description.trim();
  if (updates.severity !== undefined) bug.severity = updates.severity;
  if (updates.priority !== undefined) bug.priority = updates.priority;
  if (updates.assignedTo !== undefined) bug.assignedTo = updates.assignedTo || null;

  if (updates.status !== undefined) {
    if (!STATUS_ORDER.includes(updates.status)) {
      const err = new Error('Invalid status');
      err.statusCode = 400;
      err.details = [`Status must be one of: ${STATUS_ORDER.join(', ')}`];
      throw err;
    }
    bug.status = updates.status;
  }

  await bug.save();

  return bug.populate([
    { path: 'reportedBy', select: 'name email' },
    { path: 'assignedTo', select: 'name email' }
  ]);
}

module.exports = {
  createBug,
  getBugs,
  updateBug,
  STATUS_ORDER
};
