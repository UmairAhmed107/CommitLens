// Verification script for FR-REQ-01 to FR-REQ-05
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
  console.log('--- Starting FR-REQ-01 to FR-REQ-05 Verification ---');
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

  // Get active demo project
  const projectsRes = await request('GET', '/projects', null, pmToken);
  assert(projectsRes.data && projectsRes.data.length > 0, 'Found demo projects');
  const projectId = projectsRes.data[0]._id;

  // 2. FR-REQ-01 & FR-REQ-02: Create requirements with auto-generated ID (REQ-n) via Counter
  const req1Data = {
    title: 'OAuth2 Authentication Support',
    description: 'Allow users to sign in using GitHub and Google OAuth credentials.',
    type: 'functional',
    priority: 'High',
    status: 'Active'
  };

  const createReq1 = await request(
    'POST',
    `/projects/${projectId}/requirements`,
    req1Data,
    pmToken
  );
  assert(createReq1.status === 201, 'FR-REQ-01: PM can create requirement (status 201)');
  assert(createReq1.data?.reqId && createReq1.data.reqId.startsWith('REQ-'), `FR-REQ-02: ID auto-generated: ${createReq1.data?.reqId}`);
  assert(createReq1.data?.version === 1, 'FR-REQ-01: Initial version is 1');
  assert(createReq1.data?.coverageState === 'uncovered', 'FR-REQ-05: New requirement initial state is uncovered');
  const req1Id = createReq1.data._id;
  const req1SequenceId = createReq1.data.reqId;

  // Create second requirement to verify counter increments
  const createReq2 = await request(
    'POST',
    `/projects/${projectId}/requirements`,
    {
      title: 'Real-time WebSocket Notifications',
      description: 'Stream build and test run updates in real time.',
      type: 'non-functional',
      priority: 'Low',
      status: 'Draft'
    },
    pmToken
  );
  assert(createReq2.status === 201, 'FR-REQ-01: PM creates second requirement');
  assert(createReq2.data?.reqId && createReq2.data.reqId !== req1SequenceId, `FR-REQ-02: Next auto-generated ID is unique (${createReq2.data?.reqId})`);

  // Role check: QA cannot create requirements
  const qaCreateReq = await request(
    'POST',
    `/projects/${projectId}/requirements`,
    { title: 'Unauthorized Req' },
    qaToken
  );
  assert(qaCreateReq.status === 403, 'Role check: QA is rejected with 403 Forbidden on requirement creation');

  // 3. FR-REQ-03: Edit requirement retaining version history (MT-02)
  // Edit 1: Update title and priority
  const edit1Res = await request(
    'PUT',
    `/requirements/${req1Id}`,
    {
      title: 'OAuth2 Authentication Support (v2)',
      priority: 'Medium'
    },
    pmToken
  );
  assert(edit1Res.status === 200, 'FR-REQ-03: PM edits requirement (status 200)');
  assert(edit1Res.data.version === 2, 'FR-REQ-03: Version incremented to 2');
  assert(edit1Res.data.history.length === 1, 'FR-REQ-03: History holds 1 previous snapshot');
  assert(edit1Res.data.history[0].version === 1, 'FR-REQ-03: Snapshot records version 1 data');
  assert(edit1Res.data.history[0].title === 'OAuth2 Authentication Support', 'FR-REQ-03: Snapshot retained original title');

  // Edit 2: Update status to Approved
  const edit2Res = await request(
    'PUT',
    `/requirements/${req1Id}`,
    {
      status: 'Approved',
      description: 'Expanded acceptance criteria for OAuth scopes.'
    },
    pmToken
  );
  assert(edit2Res.status === 200, 'FR-REQ-03: PM edits requirement a second time');
  assert(edit2Res.data.version === 3, 'FR-REQ-03: Version incremented to 3');
  assert(edit2Res.data.history.length === 2, 'FR-REQ-03: History now holds 2 previous versions');
  assert(edit2Res.data.history[1].version === 2, 'FR-REQ-03: Second snapshot records version 2 data');

  // Non-PM cannot edit requirement
  const qaEditRes = await request(
    'PUT',
    `/requirements/${req1Id}`,
    { title: 'Hacked Req' },
    qaToken
  );
  assert(qaEditRes.status === 403, 'Role check: QA cannot edit requirement (403 Forbidden)');

  // 4. FR-REQ-04: Filter and search requirements
  // Filter by priority: Low
  const filterPriorityRes = await request(
    'GET',
    `/projects/${projectId}/requirements?priority=Low`,
    null,
    pmToken
  );
  assert(filterPriorityRes.status === 200, 'FR-REQ-04: Filter by priority endpoint responds 200');
  const allLow = filterPriorityRes.data.every((r) => r.priority === 'Low');
  assert(allLow, 'FR-REQ-04: Filter by priority returns only Low priority requirements');

  // Filter by type: non-functional
  const filterTypeRes = await request(
    'GET',
    `/projects/${projectId}/requirements?type=non-functional`,
    null,
    pmToken
  );
  const allNonFunctional = filterTypeRes.data.every((r) => r.type === 'non-functional');
  assert(allNonFunctional, 'FR-REQ-04: Filter by type returns only non-functional requirements');

  // Search keyword: 'OAuth2'
  const searchRes = await request(
    'GET',
    `/projects/${projectId}/requirements?search=OAuth2`,
    null,
    pmToken
  );
  assert(searchRes.data.some((r) => r._id === req1Id), 'FR-REQ-04: Search returns requirements matching keyword');

  // 5. FR-REQ-05: Show linked tests and coverage state
  // Check coverage API
  const coverageRes = await request(
    'GET',
    `/projects/${projectId}/coverage`,
    null,
    pmToken
  );
  assert(coverageRes.status === 200, 'FR-REQ-05: Coverage endpoint responds 200');
  assert(typeof coverageRes.data.coveragePercentage === 'number', 'FR-REQ-05: Returns coveragePercentage');
  assert(Array.isArray(coverageRes.data.covered), 'FR-REQ-05: Returns list of covered requirements');
  assert(Array.isArray(coverageRes.data.uncovered), 'FR-REQ-05: Returns list of uncovered requirements');

  // 6. Test GET /requirements/:rid endpoint for detail drawer
  const getSingleReq = await request('GET', `/requirements/${req1Id}`, null, pmToken);
  assert(getSingleReq.status === 200, 'Detail Drawer: GET /requirements/:rid returns 200');
  assert(getSingleReq.data._id === req1Id, 'Detail Drawer: Matches requirement ID');
  assert(Array.isArray(getSingleReq.data.history) && getSingleReq.data.history.length === 2, 'Detail Drawer: Returns full version history');
  assert(Array.isArray(getSingleReq.data.linkedTests), 'Detail Drawer: Returns linkedTests array');

  console.log(`\nRequirements Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
