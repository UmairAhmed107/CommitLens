// Project Controller (FR-PRJ-01, FR-PRJ-02, FR-PRJ-03)
const projectService = require('../services/projectService');
const { isNonEmptyString, isValidEmail } = require('../middleware/validate');

async function createProject(req, res, next) {
  try {
    const { name, description } = req.body;
    const errors = [];

    if (!isNonEmptyString(name)) errors.push('Project name is required');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const project = await projectService.createProject({
      name,
      description,
      ownerId: req.user._id
    });

    return res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

async function getProjects(req, res, next) {
  try {
    const projects = await projectService.getUserProjects(req.user._id);
    return res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

async function getProject(req, res, next) {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user._id);
    return res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const { email, role } = req.body;
    const errors = [];

    if (!isValidEmail(email)) errors.push('Valid user email is required');
    if (!['PM', 'DEV', 'QA', 'TL'].includes(role)) {
      errors.push('Role must be one of: PM, DEV, QA, TL');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const updatedProject = await projectService.addMember(req.params.id, { email, role });
    return res.status(200).json(updatedProject);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProject,
  getProjects,
  getProject,
  addMember
};
