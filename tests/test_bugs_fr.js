// Automated Verification Script for FR-BUG-01 to FR-BUG-05
const http = require('http');

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api${path}`,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('=== Starting FR-BUG-01 to FR-BUG-05 Verification ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Authenticate users
  const pmLogin = await request('POST', '/auth/login', {
    email: 'pm@demo.com',
    password: 'password123'
  });
  assert(pmLogin.status === 200, 'PM logs in');
  const pmToken = pmLogin.data.token;
  const pmUser = pmLogin.data.user;

  const devLogin = await request('POST', '/auth/login', {
    email: 'dev@demo.com',
    password: 'password123'
  });
  assert(devLogin.status === 200, 'DEV logs in');
  const devToken = devLogin.data.token;
  const devUser = devLogin.data.user;
  const devUserId = devUser._id || devUser.id;

  const qaLogin = await request('POST', '/auth/login', {
    email: 'qa@demo.com',
    password: 'password123'
  });
  assert(qaLogin.status === 200, 'QA logs in');
  const qaToken = qaLogin.data.token;
  const qaUser = qaLogin.data.user;

  const tlLogin = await request('POST', '/auth/login', {
    email: 'tl@demo.com',
    password: 'password123'
  });
  assert(tlLogin.status === 200, 'TL logs in');
  const tlToken = tlLogin.data.token;

  // 2. Create dedicated project
  const createProjRes = await request('POST', '/projects', {
    name: `Bug-Tracking-Test-${Date.now()}`,
    description: 'Testing FR-BUG-01 to FR-BUG-05 defect management'
  }, pmToken);
  assert(createProjRes.status === 201, 'PM creates project');
  const projectId = createProjRes.data._id;

  // Add members
  await request('POST', `/projects/${projectId}/members`, { email: 'dev@demo.com', role: 'DEV' }, pmToken);
  await request('POST', `/projects/${projectId}/members`, { email: 'qa@demo.com', role: 'QA' }, pmToken);
  await request('POST', `/projects/${projectId}/members`, { email: 'tl@demo.com', role: 'TL' }, pmToken);

  // 3. Create a requirement and a test case that fails
  const reqRes = await request('POST', `/projects/${projectId}/requirements`, {
    title: 'User Login & Session Invalidation',
    description: 'Logout must invalidate session tokens',
    type: 'functional',
    priority: 'High',
    status: 'Active'
  }, pmToken);
  assert(reqRes.status === 201, 'PM creates requirement REQ-1');
  const reqId = reqRes.data.reqId;

  const testRes = await request('POST', `/projects/${projectId}/tests`, {
    title: 'Logout token invalidation test',
    steps: ['Log in', 'Obtain token', 'Log out', 'Try to reuse token'],
    expectedResult: 'HTTP 401 Unauthorized',
    priority: 'High',
    requirementIds: [reqId]
  }, qaToken);
  assert(testRes.status === 201, 'QA creates test case TC-1');
  const testId = testRes.data.testId;
  const testMongoId = testRes.data._id;

  // QA marks test Failed (FR-TST-03)
  const failRunRes = await request('POST', `/tests/${testMongoId}/runs`, {
    status: 'Failed',
    notes: 'Token is still accepted after logout endpoint returns 200'
  }, qaToken);
  assert(failRunRes.status === 201, 'QA executes test and records Failed result');

  // 4. FR-BUG-01 & FR-BUG-02: QA creates a bug from failed test
  const bug1Res = await request('POST', `/projects/${projectId}/bugs`, {
    title: 'Session token remains valid after user logout',
    description: `Reported from failed test ${testId}. Server does not blacklist token on /auth/logout.`,
    severity: 'Critical',
    priority: 'P1',
    testId: testId,
    assignedTo: devUserId
  }, qaToken);

  assert(bug1Res.status === 201, 'FR-BUG-01: QA creates bug from failed test (status 201)');
  assert(bug1Res.data.bugId === 'BUG-1', 'FR-BUG-02: First bug ID auto-generated as BUG-1');
  assert(bug1Res.data.title === 'Session token remains valid after user logout', 'FR-BUG-01: Bug title matches');
  assert(bug1Res.data.severity === 'Critical', 'FR-BUG-01: Bug severity matches');
  assert(bug1Res.data.priority === 'P1', 'FR-BUG-01: Bug priority matches');
  assert(bug1Res.data.testId === testId, 'FR-BUG-01: Bug links to failed test ID');
  assert(bug1Res.data.status === 'Open', 'FR-BUG-04: Initial bug status is Open');
  const bug1Assigned = bug1Res.data.assignedTo ? (bug1Res.data.assignedTo._id || bug1Res.data.assignedTo.id || bug1Res.data.assignedTo) : null;
  assert(bug1Assigned && bug1Assigned.toString() === devUserId.toString(), 'FR-BUG-03: Bug assigned to developer');
  const bug1MongoId = bug1Res.data._id;

  // 5. FR-BUG-02: Create second bug to verify auto-increment ID uniqueness
  const bug2Res = await request('POST', `/projects/${projectId}/bugs`, {
    title: 'Password reset email contains unescaped HTML',
    description: 'Reset email template injects raw user input.',
    severity: 'Medium',
    priority: 'P2',
    testId: null,
    assignedTo: null
  }, qaToken);

  assert(bug2Res.status === 201, 'QA creates second bug');
  assert(bug2Res.data.bugId === 'BUG-2', 'FR-BUG-02: Second bug ID auto-generated as unique BUG-2');
  assert(!bug2Res.data.assignedTo, 'Second bug initially unassigned');
  const bug2MongoId = bug2Res.data._id;

  // 6. FR-BUG-03: QA or PM assigns bug to developer
  const assignRes = await request('PUT', `/bugs/${bug2MongoId}`, {
    assignedTo: devUserId
  }, pmToken);
  assert(assignRes.status === 200, 'FR-BUG-03: PM assigns BUG-2 to developer');
  const bug2Assigned = assignRes.data.assignedTo ? (assignRes.data.assignedTo._id || assignRes.data.assignedTo.id || assignRes.data.assignedTo) : null;
  assert(bug2Assigned && bug2Assigned.toString() === devUserId.toString(), 'FR-BUG-03: Assignee successfully updated');

  // 7. FR-BUG-04: Status flow Open > In Progress > Fixed > Verified > Closed
  // Step 1: DEV moves bug from Open to In Progress
  const step1Res = await request('PUT', `/bugs/${bug1MongoId}`, {
    status: 'In Progress',
    notes: 'Developer started root-cause analysis'
  }, devToken);
  assert(step1Res.status === 200, 'FR-BUG-04: Bug status moves to In Progress');
  assert(step1Res.data.status === 'In Progress', 'FR-BUG-04: Status is In Progress');

  // Step 2: DEV moves bug from In Progress to Fixed
  const step2Res = await request('PUT', `/bugs/${bug1MongoId}`, {
    status: 'Fixed',
    notes: 'Token blocklist implemented in Redis cache'
  }, devToken);
  assert(step2Res.status === 200, 'FR-BUG-04: Bug status moves to Fixed');
  assert(step2Res.data.status === 'Fixed', 'FR-BUG-04: Status is Fixed');

  // Step 3: QA moves bug from Fixed to Verified
  const step3Res = await request('PUT', `/bugs/${bug1MongoId}`, {
    status: 'Verified',
    notes: 'QA re-ran TC-1 and verified 401 response'
  }, qaToken);
  assert(step3Res.status === 200, 'FR-BUG-04: Bug status moves to Verified');
  assert(step3Res.data.status === 'Verified', 'FR-BUG-04: Status is Verified');

  // Step 4: PM moves bug from Verified to Closed
  const step4Res = await request('PUT', `/bugs/${bug1MongoId}`, {
    status: 'Closed',
    notes: 'Verified in staging; closed for release'
  }, pmToken);
  assert(step4Res.status === 200, 'FR-BUG-04: Bug status moves to Closed');
  assert(step4Res.data.status === 'Closed', 'FR-BUG-04: Status is Closed');

  // Step 5: Test invalid status rejection
  const invalidStatusRes = await request('PUT', `/bugs/${bug1MongoId}`, {
    status: 'NonExistentStatus'
  }, devToken);
  assert(invalidStatusRes.status === 400, 'FR-BUG-04: Invalid status is rejected with 400 Validation Error');

  // 8. FR-BUG-05: Filter bugs by status, severity, and assignee
  // Filter by status = 'Closed'
  const filterStatusRes = await request('GET', `/projects/${projectId}/bugs?status=Closed`, null, qaToken);
  assert(filterStatusRes.status === 200, 'FR-BUG-05: Filter bugs by status returns 200');
  assert(filterStatusRes.data.length === 1 && filterStatusRes.data[0].bugId === 'BUG-1', 'FR-BUG-05: Filter returns only Closed bugs');

  // Filter by status = 'Open'
  const filterOpenRes = await request('GET', `/projects/${projectId}/bugs?status=Open`, null, qaToken);
  assert(filterOpenRes.status === 200, 'FR-BUG-05: Filter by Open status returns 200');
  assert(filterOpenRes.data.length === 1 && filterOpenRes.data[0].bugId === 'BUG-2', 'FR-BUG-05: Filter returns only Open bugs');

  // Filter by severity = 'Critical'
  const filterSevRes = await request('GET', `/projects/${projectId}/bugs?severity=Critical`, null, devToken);
  assert(filterSevRes.status === 200, 'FR-BUG-05: Filter bugs by severity returns 200');
  assert(filterSevRes.data.every((b) => b.severity === 'Critical'), 'FR-BUG-05: All returned bugs have Critical severity');

  // Filter by assignee
  const filterAssigneeRes = await request('GET', `/projects/${projectId}/bugs?assignee=${devUserId}`, null, pmToken);
  assert(filterAssigneeRes.status === 200, 'FR-BUG-05: Filter bugs by assignee returns 200');
  assert(filterAssigneeRes.data.length === 2, 'FR-BUG-05: Returns both bugs assigned to developer');

  // Filter by keyword search
  const searchRes = await request('GET', `/projects/${projectId}/bugs?search=logout`, null, qaToken);
  assert(searchRes.status === 200, 'FR-BUG-05: Search bugs by keyword returns 200');
  assert(searchRes.data.some((b) => b.bugId === 'BUG-1'), 'FR-BUG-05: Keyword search finds BUG-1');

  // 9. Single bug retrieval with history audit
  const singleBugRes = await request('GET', `/bugs/${bug1MongoId}`, null, devToken);
  assert(singleBugRes.status === 200, 'GET /bugs/:bid returns 200');
  assert(singleBugRes.data.history && singleBugRes.data.history.length >= 4, 'FR-BUG-04: Full status transition history recorded');

  // Also verify lookup by string bugId (BUG-1)
  const byStringIdRes = await request('GET', `/bugs/BUG-1`, null, devToken);
  assert(byStringIdRes.status === 200, 'GET /bugs/BUG-1 by string bugId returns 200');

  // 10. Role permission checks
  // TL cannot update bug status (read-only role per System Design 4.4)
  const tlUpdateRes = await request('PUT', `/bugs/${bug1MongoId}`, {
    status: 'Open'
  }, tlToken);
  assert(tlUpdateRes.status === 403, 'Role check: TL cannot update bug status (403 Forbidden)');

  console.log(`\n=== FR-BUG Verification Complete: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[Fatal Error in Test Run]', err);
  process.exit(1);
});
