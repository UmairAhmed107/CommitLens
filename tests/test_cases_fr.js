// Verification script for FR-TST-01 to FR-TST-05
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
  console.log('--- Starting FR-TST-01 to FR-TST-05 Verification ---');
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

  const qaLogin = await request('POST', '/auth/login', {
    email: 'qa@demo.com',
    password: 'password123'
  });
  assert(qaLogin.status === 200, 'QA logs in');
  const qaToken = qaLogin.data.token;

  const devLogin = await request('POST', '/auth/login', {
    email: 'dev@demo.com',
    password: 'password123'
  });
  assert(devLogin.status === 200, 'DEV logs in');
  const devToken = devLogin.data.token;

  // 2. Fetch active demo project
  const projectsRes = await request('GET', '/projects', null, qaToken);
  assert(projectsRes.status === 200 && projectsRes.data.length > 0, 'QA can list projects');
  const projectId = projectsRes.data[0]._id;

  // Ensure requirements exist on this project
  const req1 = await request('POST', `/projects/${projectId}/requirements`, {
    title: 'User Authentication Flow',
    description: 'Login via email and password',
    type: 'functional',
    priority: 'High'
  }, pmToken);
  assert(req1.status === 201, 'PM creates first requirement for test linking');
  const req1Id = req1.data.reqId;

  const req2 = await request('POST', `/projects/${projectId}/requirements`, {
    title: 'Session Revocation',
    description: 'Logout invalidates JWT session token',
    type: 'functional',
    priority: 'Medium'
  }, pmToken);
  assert(req2.status === 201, 'PM creates second requirement for test linking');
  const req2Id = req2.data.reqId;

  // 3. FR-TST-01 & FR-TST-02: QA creates test case linked to requirements
  const testCreateRes = await request('POST', `/projects/${projectId}/tests`, {
    title: 'Verify valid login credentials',
    steps: ['Open login page', 'Enter valid email', 'Enter valid password', 'Click Submit'],
    expectedResult: 'User dashboard is displayed',
    priority: 'High',
    requirementIds: [req1Id]
  }, qaToken);

  assert(testCreateRes.status === 201, 'FR-TST-01: QA creates test case (status 201)');
  const test1 = testCreateRes.data;
  assert(test1.testId && test1.testId.startsWith('TC-'), `FR-TST-01: Unique test ID auto-generated (${test1.testId})`);
  assert(test1.title === 'Verify valid login credentials', 'FR-TST-01: Title matches input');
  assert(test1.steps.length === 4, 'FR-TST-01: Test steps recorded as array');
  assert(test1.expectedResult === 'User dashboard is displayed', 'FR-TST-01: Expected result matches input');
  assert(test1.priority === 'High', 'FR-TST-01: Priority is High');
  assert(test1.status === 'Not Run', 'FR-TST-01: Initial status is Not Run');
  assert(test1.needsRerun === false, 'FR-TST-01: Initial needsRerun is false');
  assert(test1.requirementIds.includes(req1Id), 'FR-TST-02: Test case linked to requirement REQ-1');

  // 4. Role check: PM and DEV cannot create test cases
  const pmTestCreate = await request('POST', `/projects/${projectId}/tests`, {
    title: 'PM unauthorized test creation',
    priority: 'Low'
  }, pmToken);
  assert(pmTestCreate.status === 403, 'Role check: PM cannot create test cases (403 Forbidden)');

  const devTestCreate = await request('POST', `/projects/${projectId}/tests`, {
    title: 'DEV unauthorized test creation',
    priority: 'Low'
  }, devToken);
  assert(devTestCreate.status === 403, 'Role check: DEV cannot create test cases (403 Forbidden)');

  // 5. FR-TST-01: Create second test case with multiple requirement links
  const test2Res = await request('POST', `/projects/${projectId}/tests`, {
    title: 'Verify session logout and token invalidation',
    steps: ['Click logout button in top navigation', 'Observe redirect to /login'],
    expectedResult: 'Session token invalidated and user redirected to login',
    priority: 'Medium',
    requirementIds: [req1Id, req2Id]
  }, qaToken);

  assert(test2Res.status === 201, 'FR-TST-01: QA creates second test case');
  const test2 = test2Res.data;
  assert(test2.testId !== test1.testId, `FR-TST-01: Second test case gets unique auto-incremented ID (${test2.testId})`);
  assert(test2.requirementIds.length === 2, 'FR-TST-02: Test case linked to multiple requirements');

  // 6. FR-TST-02: Update test case and edit linked requirements
  const updateRes = await request('PUT', `/tests/${test1._id}`, {
    title: 'Verify valid login credentials with remember-me',
    priority: 'Medium',
    requirementIds: [req1Id, req2Id]
  }, qaToken);

  assert(updateRes.status === 200, 'FR-TST-02: QA edits test case details and linked requirements');
  assert(updateRes.data.title === 'Verify valid login credentials with remember-me', 'FR-TST-02: Title updated');
  assert(updateRes.data.priority === 'Medium', 'FR-TST-02: Priority updated');
  assert(updateRes.data.requirementIds.length === 2, 'FR-TST-02: Linked requirements updated to multiple');

  const pmUpdateRes = await request('PUT', `/tests/${test1._id}`, {
    title: 'PM unauthorized edit'
  }, pmToken);
  assert(pmUpdateRes.status === 403, 'Role check: PM cannot edit test cases (403 Forbidden)');

  // 7. FR-TST-03: QA records execution result
  const recordRunRes = await request('POST', `/tests/${test1._id}/runs`, {
    status: 'Failed',
    notes: 'Encountered 500 error when clicking submit'
  }, qaToken);

  assert(recordRunRes.status === 201, 'FR-TST-03: QA records execution result (status 201)');
  const updatedTest1 = recordRunRes.data.testCase || recordRunRes.data;
  assert(updatedTest1.status === 'Failed', 'FR-TST-03: Test case status updated to Failed');
  assert(updatedTest1.needsRerun === false, 'FR-TST-03: needsRerun is cleared to false upon recording result');
  assert(updatedTest1.lastRunBy !== null, 'FR-TST-03: lastRunBy is recorded');
  assert(updatedTest1.lastRunAt !== null, 'FR-TST-03: lastRunAt timestamp is recorded');

  // Validate status constraint
  const invalidStatusRes = await request('POST', `/tests/${test1._id}/runs`, {
    status: 'InvalidStatus'
  }, qaToken);
  assert(invalidStatusRes.status === 400, 'FR-TST-03: Invalid execution status rejected with 400 Validation Error');

  // Role check on record run
  const devRecordRes = await request('POST', `/tests/${test1._id}/runs`, {
    status: 'Passed'
  }, devToken);
  assert(devRecordRes.status === 403, 'Role check: DEV cannot record test runs (403 Forbidden)');

  // Record a second run on test 1 to test history
  const secondRunRes = await request('POST', `/tests/${test1._id}/runs`, {
    status: 'Passed',
    notes: 'Re-tested after backend fix in build 102. Passed.'
  }, qaToken);
  assert(secondRunRes.status === 201, 'FR-TST-03: Second execution run recorded');
  const secondTest1 = secondRunRes.data.testCase || secondRunRes.data;
  assert(secondTest1.status === 'Passed', 'FR-TST-03: Test case status updated to Passed');

  // 8. FR-TST-04: Execution History Retrieval
  const historyRes = await request('GET', `/tests/${test1._id}/runs`, null, qaToken);
  assert(historyRes.status === 200, 'FR-TST-04: Retrieve execution history returns 200');
  assert(Array.isArray(historyRes.data), 'FR-TST-04: History returned as array');
  assert(historyRes.data.length >= 2, `FR-TST-04: History contains all recorded runs (found ${historyRes.data.length})`);
  assert(historyRes.data[0].status === 'Passed', 'FR-TST-04: Latest run is first (descending chronological order)');
  assert(historyRes.data[1].status === 'Failed', 'FR-TST-04: Previous run retained in history');
  assert(historyRes.data[0].executedBy !== null, 'FR-TST-04: Execution run contains populated executedBy');
  assert(historyRes.data[0].notes.includes('Re-tested'), 'FR-TST-04: Execution run preserves notes');

  // Also verify lookup by testId string ('TC-1')
  const historyByStringIdRes = await request('GET', `/tests/${test1.testId}/runs`, null, qaToken);
  assert(historyByStringIdRes.status === 200, 'FR-TST-04: Retrieve execution history by string testId (e.g. TC-1) returns 200');

  // 9. FR-TST-05: Coverage endpoint
  const coverageRes = await request('GET', `/projects/${projectId}/coverage`, null, qaToken);
  assert(coverageRes.status === 200, 'FR-TST-05: Coverage endpoint returns 200');
  assert(typeof coverageRes.data.coveragePercentage === 'number', 'FR-TST-05: Returns coveragePercentage');
  assert(Array.isArray(coverageRes.data.covered), 'FR-TST-05: Returns covered requirements array');
  assert(Array.isArray(coverageRes.data.uncovered), 'FR-TST-05: Returns uncovered requirements array');
  assert(coverageRes.data.covered.some((c) => c.reqId === req1Id), 'FR-TST-05: REQ-1 is listed in covered requirements');
  assert(coverageRes.data.coveragePercentage > 0, `FR-TST-05: Coverage percentage is computed (${coverageRes.data.coveragePercentage}%)`);

  // 10. Filter and Search endpoints
  const filterPriorityRes = await request('GET', `/projects/${projectId}/tests?priority=High`, null, qaToken);
  assert(filterPriorityRes.status === 200, 'Filter tests by priority returns 200');

  const filterStatusRes = await request('GET', `/projects/${projectId}/tests?status=Passed`, null, qaToken);
  assert(filterStatusRes.status === 200, 'Filter tests by status returns 200');
  assert(filterStatusRes.data.every((t) => t.status === 'Passed'), 'All filtered tests have status Passed');

  const searchRes = await request('GET', `/projects/${projectId}/tests?search=logout`, null, qaToken);
  assert(searchRes.status === 200, 'Search tests by keyword returns 200');
  assert(searchRes.data.some((t) => t.title.includes('logout')), 'Search result contains matching test case');

  console.log(`\nTest Cases Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[Error in test execution]', err);
  process.exit(1);
});
