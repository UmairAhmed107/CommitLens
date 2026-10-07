// Role-based access control middleware (FR-AUTH-03)
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const TestCase = require('../models/TestCase');
const MappingRule = require('../models/MappingRule');
const Bug = require('../models/Bug');
const Commit = require('../models/Commit');

/**
 * Resolves the projectId associated with the current request
 */
async function resolveProjectId(req) {
  // Direct project ID from route params or body or query
  if (req.params.id) return req.params.id;
  if (req.params.projectId) return req.params.projectId;
  if (req.body && req.body.projectId) return req.body.projectId;
  if (req.query && req.query.projectId) return req.query.projectId;

  // If modifying a requirement by :rid
  if (req.params.rid) {
    const reqDoc = await Requirement.findById(req.params.rid);
    return reqDoc ? reqDoc.projectId : null;
  }

  // If modifying a test by :tid
  if (req.params.tid) {
    const testDoc = await TestCase.findById(req.params.tid);
    return testDoc ? testDoc.projectId : null;
  }

  // If modifying a mapping by :mid
  if (req.params.mid) {
    const mapDoc = await MappingRule.findById(req.params.mid);
    return mapDoc ? mapDoc.projectId : null;
  }

  // If modifying a bug by :bid
  if (req.params.bid) {
    const bugDoc = await Bug.findById(req.params.bid);
    return bugDoc ? bugDoc.projectId : null;
  }

  // If querying a commit impact by :sha
  if (req.params.sha) {
    const commitDoc = await Commit.findOne({ sha: req.params.sha });
    return commitDoc ? commitDoc.projectId : null;
  }

  return null;
}

/**
 * Enforces that user is a member of the project and holds one of the required roles.
 * Passing no roles means any active project member (PM, DEV, QA, TL) or owner is allowed.
 *
 * @param {string[]} allowedRoles - List of allowed roles: 'PM', 'DEV', 'QA', 'TL'
 */
function requireProjectRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthenticated',
          details: ['User is not authenticated']
        });
      }

      const projectId = await resolveProjectId(req);
      if (!projectId) {
        return res.status(400).json({
          error: 'Validation failed',
          details: ['Target project could not be identified for permission check']
        });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          error: 'Not found',
          details: ['Target project was not found']
        });
      }

      // Check if user is owner (owner implicitly has PM role privileges)
      const isOwner = project.ownerId.toString() === req.user._id.toString();
      const member = project.members.find(
        (m) => m.userId.toString() === req.user._id.toString()
      );

      if (!isOwner && !member) {
        return res.status(403).json({
          error: 'Forbidden',
          details: ['You are not a member of this project']
        });
      }

      const userRole = isOwner ? 'PM' : member.role;

      // If specific roles required, check membership
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Forbidden',
          details: [
            `Your project role is ${userRole}, but this action requires one of: ${allowedRoles.join(', ')}`
          ]
        });
      }

      // Attach resolved project and role to request
      req.project = project;
      req.userRole = userRole;
      next();
    } catch (err) {
      console.error('[Role Middleware Error]', err);
      return res.status(500).json({
        error: 'Authorization error',
        details: [err.message]
      });
    }
  };
}

module.exports = {
  requireProjectRole
};
