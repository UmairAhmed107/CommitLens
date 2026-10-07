// Project Controller (FR-PRJ-01, FR-PRJ-02, FR-PRJ-03)
const Project = require('../models/Project');
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

    // Role check: Only PM can create projects (FR-PRJ-01, SRS 3.2)
    // If the user belongs to existing projects but has no PM/owner privileges, forbid creation.
    const existingProjects = await Project.find({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    });

    if (existingProjects.length > 0) {
      const isPMInAny = existingProjects.some((p) => {
        const isOwner = p.ownerId.toString() === req.user._id.toString();
        const member = p.members.find((m) => m.userId.toString() === req.user._id.toString());
        return isOwner || (member && member.role === 'PM');
      });

      if (!isPMInAny) {
        return res.status(403).json({
          error: 'Forbidden',
          details: ['Only Project Managers (PM) are permitted to create projects']
        });
      }
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

async function updateProject(req, res, next) {
  try {
    const { name, description, status } = req.body;
    const errors = [];

    if (name !== undefined && !isNonEmptyString(name)) {
      errors.push('Project name cannot be empty');
    }
    if (status !== undefined && !['Active', 'Archived'].includes(status)) {
      errors.push('Status must be Active or Archived');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const updated = await projectService.updateProject(req.params.id, {
      name,
      description,
      status
    });

    return res.status(200).json(updated);
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
  updateProject,
  addMember
};

