// Seed Service for Demo Data (System Design Section 6, Test Plan Section 4)
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Requirement = require('../models/Requirement');
const TestCase = require('../models/TestCase');
const MappingRule = require('../models/MappingRule');
const Repository = require('../models/Repository');
const Commit = require('../models/Commit');
const Bug = require('../models/Bug');
const Counter = require('../models/Counter');
const githubService = require('./githubService');
const impactService = require('./impactService');

/**
 * Seeds complete demo-shop project matching System Design specs
 */
async function seedDatabase() {
  console.log('[Seed] Seeding database with demo data...');

  // 1. Create or retrieve users for each role
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const usersData = [
    { name: 'Sarah PM', email: 'pm@demo.com', passwordHash },
    { name: 'Asha Dev', email: 'dev@demo.com', passwordHash },
    { name: 'Kabir QA', email: 'qa@demo.com', passwordHash },
    { name: 'David TL', email: 'tl@demo.com', passwordHash }
  ];

  const userMap = {};
  for (const u of usersData) {
    let user = await User.findOne({ email: u.email });
    if (!user) {
      user = await User.create(u);
    }
    userMap[u.email] = user;
  }

  // 2. Create demo-shop project
  let project = await Project.findOne({ name: 'demo-shop' });
  if (project) {
    console.log('[Seed] demo-shop project already exists. Clearing previous data for fresh seed...');
    await Requirement.deleteMany({ projectId: project._id });
    await TestCase.deleteMany({ projectId: project._id });
    await MappingRule.deleteMany({ projectId: project._id });
    await Repository.deleteMany({ projectId: project._id });
    await Commit.deleteMany({ projectId: project._id });
    await Bug.deleteMany({ projectId: project._id });
    await Counter.deleteMany({ projectId: project._id });
    await Project.deleteOne({ _id: project._id });
  }

  project = await Project.create({
    name: 'demo-shop',
    description: 'E-commerce demonstration project for Change Impact & Test Management',
    status: 'Active',
    ownerId: userMap['pm@demo.com']._id,
    members: [
      { userId: userMap['pm@demo.com']._id, role: 'PM' },
      { userId: userMap['dev@demo.com']._id, role: 'DEV' },
      { userId: userMap['qa@demo.com']._id, role: 'QA' },
      { userId: userMap['tl@demo.com']._id, role: 'TL' }
    ]
  });

  // 3. Create Requirements (REQ-01 to REQ-04)
  const reqsData = [
    {
      reqId: 'REQ-01',
      title: 'Secure Login',
      description: 'User authentication with password hashing, lockout, and session tokens',
      type: 'functional',
      priority: 'High',
      status: 'Active'
    },
    {
      reqId: 'REQ-02',
      title: 'Shopping Cart',
      description: 'Manage cart items, update quantities, calculate subtotals and discounts',
      type: 'functional',
      priority: 'High',
      status: 'Active'
    },
    {
      reqId: 'REQ-03',
      title: 'Payment',
      description: 'Credit card payment authorization, gateway communication, and refund processing',
      type: 'functional',
      priority: 'High',
      status: 'Active'
    },
    {
      reqId: 'REQ-04',
      title: 'Order Tracking',
      description: 'View order status, shipment notifications, and package tracking timeline',
      type: 'functional',
      priority: 'Medium',
      status: 'Active'
    }
  ];

  for (const r of reqsData) {
    await Requirement.create({
      projectId: project._id,
      ...r,
      version: 1,
      history: []
    });
  }
  await Counter.create({ projectId: project._id, key: 'REQ', value: 4 });

  // 4. Create Test Cases (TC-01 to TC-08)
  const testsData = [
    {
      testId: 'TC-01',
      title: 'Login with valid credentials',
      steps: ['Navigate to /login', 'Enter valid email & password', 'Click Submit'],
      expectedResult: 'User lands on Dashboard with active session token',
      priority: 'High',
      requirementIds: ['REQ-01'],
      status: 'Passed'
    },
    {
      testId: 'TC-02',
      title: 'Password reset and lockout',
      steps: ['Attempt 5 failed logins', 'Verify account is locked', 'Trigger reset link'],
      expectedResult: 'Lockout active for 15 mins, reset email sent',
      priority: 'High',
      requirementIds: ['REQ-01'],
      status: 'Passed'
    },
    {
      testId: 'TC-03',
      title: 'Session expiry check',
      steps: ['Wait for token expiry window', 'Send authenticated request'],
      expectedResult: 'Returns 401 and redirects to login',
      priority: 'Medium',
      requirementIds: ['REQ-01'],
      status: 'Passed'
    },
    {
      testId: 'TC-04',
      title: 'Add item to cart',
      steps: ['View product page', 'Select quantity 2', 'Click Add to Cart'],
      expectedResult: 'Item added, badge shows count 2, cart subtotal updated',
      priority: 'High',
      requirementIds: ['REQ-02'],
      status: 'Passed'
    },
    {
      testId: 'TC-05',
      title: 'Remove item from cart',
      steps: ['Open cart drawer', 'Click Remove Item'],
      expectedResult: 'Item removed, total refreshed immediately',
      priority: 'Medium',
      requirementIds: ['REQ-02'],
      status: 'Passed'
    },
    {
      testId: 'TC-06',
      title: 'Card Payment authorization',
      steps: ['Enter valid card details on checkout', 'Submit payment'],
      expectedResult: 'Payment authorized, confirmation email dispatched',
      priority: 'High',
      requirementIds: ['REQ-03'],
      status: 'Passed'
    },
    {
      testId: 'TC-07',
      title: 'Refund processing',
      steps: ['Open order details', 'Click Request Refund with reason'],
      expectedResult: 'Refund webhook received and order marked Refunded',
      priority: 'Medium',
      requirementIds: ['REQ-03'],
      status: 'Passed'
    },
    {
      testId: 'TC-08',
      title: 'Order Status updates',
      steps: ['Query tracking page with order ID', 'Verify carrier info'],
      expectedResult: 'Current status Shipped displayed with carrier ETA',
      priority: 'Low',
      requirementIds: ['REQ-04'],
      status: 'Passed'
    }
  ];

  for (const t of testsData) {
    await TestCase.create({
      projectId: project._id,
      ...t,
      needsRerun: false,
      lastRunBy: userMap['qa@demo.com']._id,
      lastRunAt: new Date()
    });
  }
  await Counter.create({ projectId: project._id, key: 'TC', value: 8 });

  // 5. Create Mapping Rules
  const mappingsData = [
    { pattern: 'src/auth/**', requirementId: 'REQ-01' },
    { pattern: 'src/cart/**', requirementId: 'REQ-02' },
    { pattern: 'src/payment/**', requirementId: 'REQ-03' },
    { pattern: 'src/orders/**', requirementId: 'REQ-04' }
  ];

  for (const m of mappingsData) {
    await MappingRule.create({
      projectId: project._id,
      pattern: m.pattern,
      requirementId: m.requirementId,
      createdBy: userMap['dev@demo.com']._id
    });
  }

  // 6. Connect demo repository
  await githubService.connectRepository(project._id, {
    url: 'https://github.com/demo-team/demo-shop.git',
    token: 'demo',
    defaultBranch: 'main'
  });

  // 7. Sync demo commits and run initial impact analysis
  await githubService.syncCommits(project._id);

  // 8. Create a sample defect linked to TC-02
  await Bug.create({
    projectId: project._id,
    bugId: 'BUG-01',
    title: 'Lockout duration resets on server restart',
    description: 'When server is rebooted, failed login attempt counters are wiped from memory.',
    severity: 'High',
    priority: 'P1',
    status: 'Open',
    testId: 'TC-02',
    reportedBy: userMap['qa@demo.com']._id,
    assignedTo: userMap['dev@demo.com']._id
  });
  await Counter.create({ projectId: project._id, key: 'BUG', value: 1 });

  console.log('[Seed] Demo database seeding completed successfully!');
  console.log('[Seed] Demo accounts:');
  console.log('       - PM:   pm@demo.com   / password123');
  console.log('       - DEV:  dev@demo.com  / password123');
  console.log('       - QA:   qa@demo.com   / password123');
  console.log('       - TL:   tl@demo.com   / password123');

  return project;
}

module.exports = {
  seedDatabase
};
