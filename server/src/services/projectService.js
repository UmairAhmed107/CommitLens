// Project Service (FR-PRJ-01, FR-PRJ-02, FR-PRJ-03)
const Project = require('../models/Project');
const User = require('../models/User');
const Requirement = require('../models/Requirement');
const TestCase = require('../models/TestCase');

/**
 * Create a new project (FR-PRJ-01)
 * The creator is assigned as owner and project PM.
 */
async function createProject({ name, description, ownerId }) {
  const project = await Project.create({
    name: name.trim(),
    description: description ? description.trim() : '',
    ownerId,
    status: 'Active',
    members: [
      {
        userId: ownerId,
        role: 'PM'
      }
    ]
  });

  return project.populate([
    { path: 'ownerId', select: 'name email' },
    { path: 'members.userId', select: 'name email' }
  ]);
}

/**
 * Retrieve projects that the user belongs to (as owner or member) (FR-PRJ-03)
 * Enriched with member count and coverage percentage for project cards.
 */
async function getUserProjects(userId) {
  const projects = await Project.find({
    $or: [{ ownerId: userId }, { 'members.userId': userId }]
  })
    .sort({ createdAt: -1 })
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email');

  // Calculate coverage percentage and member count for each project
  const enriched = await Promise.all(
    projects.map(async (project) => {
      const totalReqs = await Requirement.countDocuments({ projectId: project._id });
      let coveragePct = 0;

      if (totalReqs > 0) {
        // Distinct requirements linked to at least one test case
        const linkedReqs = await TestCase.distinct('requirementIds', {
          projectId: project._id
        });
        // Count how many project requirements exist in the linkedReqs set
        const coveredCount = await Requirement.countDocuments({
          projectId: project._id,
          reqId: { $in: linkedReqs }
        });
        coveragePct = Math.round((coveredCount / totalReqs) * 100);
      }

      // Determine user's role on this project
      const isOwner = project.ownerId._id.toString() === userId.toString();
      const member = project.members.find(
        (m) => m.userId._id.toString() === userId.toString()
      );
      const userRole = isOwner ? 'PM' : member ? member.role : 'Member';

      return {
        ...project.toObject(),
        memberCount: project.members.length,
        totalRequirements: totalReqs,
        coveragePercentage: coveragePct,
        currentUserRole: userRole
      };
    })
  );

  return enriched;
}

/**
 * Get detailed project information by ID
 */
async function getProjectById(projectId, userId) {
  const project = await Project.findById(projectId)
    .populate('ownerId', 'name email')
    .populate('members.userId', 'name email');

  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  // Determine user's role on this project
  const isOwner = project.ownerId._id.toString() === userId.toString();
  const member = project.members.find(
    (m) => m.userId && m.userId._id.toString() === userId.toString()
  );
  const userRole = isOwner ? 'PM' : member ? member.role : null;

  return {
    ...project.toObject(),
    currentUserRole: userRole
  };
}

/**
 * Add a member with role to a project (FR-PRJ-02)
 */
async function addMember(projectId, { email, role }) {
  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.details = [`No user registered with email: ${email}`];
    throw err;
  }

  // Check if user is already a member
  const existingMemberIndex = project.members.findIndex(
    (m) => m.userId.toString() === user._id.toString()
  );

  if (existingMemberIndex >= 0) {
    // Update role if already existing
    project.members[existingMemberIndex].role = role;
  } else {
    // Add new member
    project.members.push({
      userId: user._id,
      role
    });
  }

  await project.save();

  return project.populate([
    { path: 'ownerId', select: 'name email' },
    { path: 'members.userId', select: 'name email' }
  ]);
}

module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  addMember
};
