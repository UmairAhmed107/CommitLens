// Verification script for FR-IMP-01 to FR-IMP-08
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
  console.log('--- Starting FR-IMP-01 to FR-IMP-08 Verification ---');
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

  const devLogin = await request('POST', '/auth/login', {
    email: 'dev@demo.com',
    password: 'password123'
  });
  assert(devLogin.status === 200, 'DEV logs in');
  const devToken = devLogin.data.token;

  const qaLogin = await request('POST', '/auth/login', {
    email: 'qa@demo.com',
    password: 'password123'
  });
  assert(qaLogin.status === 200, 'QA logs in');
  const qaToken = qaLogin.data.token;

  // 2. Create project
  const createProjRes = await request('POST', '/projects', {
    name: `Impact-Test-${Date.now()}`,
    description: 'Testing FR-IMP Change Impact Engine'
  }, pmToken);
  assert(createProjRes.status === 201, 'PM creates project');
  const projectId = createProjRes.data._id;

  // Add members
  await request('POST', `/projects/${projectId}/members`, { email: 'dev@demo.com', role: 'DEV' }, pmToken);
  await request('POST', `/projects/${projectId}/members`, { email: 'qa@demo.com', role: 'QA' }, pmToken);

  // 3. Create Requirements: REQ-1 (Auth), REQ-2 (Cart)
  const req1Res = await request('POST', `/projects/${projectId}/requirements`, {
    title: 'Secure Authentication & Login',
    description: 'Users must authenticate with secure credentials',
    type: 'functional',
    priority: 'High',
    status: 'Active'
  }, pmToken);
  assert(req1Res.status === 201, 'PM creates REQ-1');
  const req1Id = req1Res.data.reqId; // REQ-1

  const req2Res = await request('POST', `/projects/${projectId}/requirements`, {
    title: 'Shopping Cart Checkout',
    description: 'Users can checkout cart items',
    type: 'functional',
    priority: 'Medium',
    status: 'Active'
  }, pmToken);
  assert(req2Res.status === 201, 'PM creates REQ-2');
  const req2Id = req2Res.data.reqId; // REQ-2

  // 4. Create Test Cases: TC-1 (linked to REQ-1), TC-2 (linked to REQ-1), TC-3 (linked to REQ-2), TC-4 (unlinked)
  const tc1Res = await request('POST', `/projects/${projectId}/tests`, {
    title: 'Valid Login test',
    steps: ['Enter email', 'Enter password', 'Click login'],
    expectedResult: 'Dashboard opens',
    priority: 'High',
    requirementIds: [req1Id]
  }, qaToken);
  assert(tc1Res.status === 201, 'QA creates TC-1 linked to REQ-1');
  const tc1Id = tc1Res.data.testId;
  const tc1MongoId = tc1Res.data._id;

  const tc2Res = await request('POST', `/projects/${projectId}/tests`, {
    title: 'Password Validation test',
    steps: ['Enter short password'],
    expectedResult: 'Validation error shown',
    priority: 'Medium',
    requirementIds: [req1Id]
  }, qaToken);
  assert(tc2Res.status === 201, 'QA creates TC-2 linked to REQ-1');
  const tc2Id = tc2Res.data.testId;

  const tc3Res = await request('POST', `/projects/${projectId}/tests`, {
    title: 'Cart Total test',
    steps: ['Add item to cart'],
    expectedResult: 'Total updated',
    priority: 'Low',
    requirementIds: [req2Id]
  }, qaToken);
  assert(tc3Res.status === 201, 'QA creates TC-3 linked to REQ-2');
  const tc3Id = tc3Res.data.testId;

  const tc4Res = await request('POST', `/projects/${projectId}/tests`, {
    title: 'Healthcheck Ping test',
    steps: ['Ping /health'],
    expectedResult: 'Status 200',
    priority: 'Low',
    requirementIds: []
  }, qaToken);
  assert(tc4Res.status === 201, 'QA creates TC-4 (unlinked)');
  const tc4Id = tc4Res.data.testId;

  // 5. FR-IMP-01: Create Mapping Rules
  // DEV creates rule: src/auth/** -> REQ-1
  const mapRuleRes = await request('POST', `/projects/${projectId}/mappings`, {
    pattern: 'src/auth/**',
    requirementId: req1Id
  }, devToken);
  assert(mapRuleRes.status === 201, 'FR-IMP-01: DEV creates mapping rule src/auth/** -> REQ-1');
  assert(mapRuleRes.data.pattern === 'src/auth/**', 'FR-IMP-01: Mapping rule pattern stored');
  assert(mapRuleRes.data.requirementId === req1Id, 'FR-IMP-01: Mapping rule requirementId stored');
  const ruleId = mapRuleRes.data._id;

  // PM creates rule: src/cart/** -> REQ-2
  const mapRule2Res = await request('POST', `/projects/${projectId}/mappings`, {
    pattern: 'src/cart/**',
    requirementId: req2Id
  }, pmToken);
  assert(mapRule2Res.status === 201, 'FR-IMP-01: PM can also create mapping rule');

  // QA cannot create rule (DEV, PM only)
  const qaMapRes = await request('POST', `/projects/${projectId}/mappings`, {
    pattern: 'src/other/**',
    requirementId: req1Id
  }, qaToken);
  assert(qaMapRes.status === 403, 'FR-IMP-01: QA is forbidden from creating mapping rules (403)');

  // List mapping rules
  const listMapsRes = await request('GET', `/projects/${projectId}/mappings`, null, devToken);
  assert(listMapsRes.status === 200, 'FR-IMP-01: List mapping rules returns 200');
  assert(listMapsRes.data.length === 2, 'FR-IMP-01: Returns both mapping rules');

  // 6. Connect repository and Sync commits
  await request('POST', `/projects/${projectId}/repository`, {
    url: 'https://github.com/demo-org/demo-shop.git',
    token: 'test-token',
    defaultBranch: 'main'
  }, devToken);

  const syncRes = await request('POST', `/projects/${projectId}/sync`, {}, devToken);
  assert(syncRes.status === 200, 'Sync commits runs automatically and returns 200');
  assert(syncRes.data.syncedCount >= 1, 'Sync commits fetched at least 1 commit');

  // 7. Check impact result for login commit: sha starting with a1b2c3d
  const commitsRes = await request('GET', `/projects/${projectId}/commits`, null, devToken);
  assert(commitsRes.status === 200, 'Commits fetched with impact summary');
  const authCommit = commitsRes.data.find(c => c.sha.startsWith('a1b2c3d'));
  assert(!!authCommit, 'Found auth commit in project history');

  const impactRes = await request('GET', `/commits/${authCommit.sha}/impact?projectId=${projectId}`, null, devToken);
  assert(impactRes.status === 200, 'FR-IMP-03: Retrieve impact result for commit (200)');
  const impact = impactRes.data;

  // Verify FR-IMP-03 & FR-IMP-05: Impacted requirements with reasons
  assert(impact.impacted.length >= 1, 'FR-IMP-03: Commit has impacted requirements');
  const req1Impact = impact.impacted.find(i => i.requirementId === req1Id);
  assert(!!req1Impact, `FR-IMP-03: ${req1Id} is in impacted requirements`);
  assert(req1Impact.reasons.includes('pattern'), 'FR-IMP-05: Reason includes pattern');
  // In demo shop, src/auth/LoginService.js also contains @req REQ-01 tag
  assert(req1Impact.reasons.includes('tag'), 'FR-IMP-02 & FR-IMP-05: Reason also includes tag');

  // Verify FR-IMP-04: Recommended test cases (TC-1, TC-2 linked to REQ-1)
  assert(impact.recommendedTestIds.includes(tc1Id), `FR-IMP-04: Recommended tests include ${tc1Id}`);
  assert(impact.recommendedTestIds.includes(tc2Id), `FR-IMP-04: Recommended tests include ${tc2Id}`);
  assert(!impact.recommendedTestIds.includes(tc3Id), `FR-IMP-04: Recommended tests do NOT include ${tc3Id}`);
  assert(!impact.recommendedTestIds.includes(tc4Id), `FR-IMP-04: Recommended tests do NOT include ${tc4Id}`);

  // Verify FR-IMP-06: Unmapped files (README.md touches no rule or tag)
  assert(impact.unmappedFiles.includes('README.md'), 'FR-IMP-06: README.md is flagged in unmappedFiles');

  // Verify FR-IMP-07: Reduction percentage
  // Total tests in project = 4. Recommended tests = 2 (TC-1, TC-2).
  // Reduction = (1 - 2/4) * 100 = 50.0%
  assert(impact.totalTests === 4, 'FR-IMP-07: Total tests recorded accurately (4)');
  assert(impact.reductionPct === 50, `FR-IMP-07: Reduction percentage calculated accurately: ${impact.reductionPct}%`);

  // Verify FR-IMP-08: Tests marked as needsRerun
  const testsRes = await request('GET', `/projects/${projectId}/tests`, null, qaToken);
  const tc1Current = testsRes.data.find(t => t.testId === tc1Id);
  const tc2Current = testsRes.data.find(t => t.testId === tc2Id);
  const tc3Current = testsRes.data.find(t => t.testId === tc3Id);
  const tc4Current = testsRes.data.find(t => t.testId === tc4Id);
  assert(tc1Current.needsRerun === true, 'FR-IMP-08: TC-1 marked needsRerun = true (impacted by Auth commit)');
  assert(tc2Current.needsRerun === true, 'FR-IMP-08: TC-2 marked needsRerun = true (impacted by Auth commit)');
  assert(tc3Current.needsRerun === true, 'FR-IMP-08: TC-3 marked needsRerun = true (impacted by Cart commit)');
  assert(tc4Current.needsRerun === false, 'FR-IMP-08: TC-4 unlinked, needsRerun = false');

  // Recording a new run for TC-1 clears needsRerun
  const runRes = await request('POST', `/tests/${tc1MongoId}/runs`, {
    status: 'Passed',
    notes: 'Re-executed after change impact analysis'
  }, qaToken);
  assert(runRes.status === 201, 'QA records execution result for TC-1');
  const testsAfterRes = await request('GET', `/projects/${projectId}/tests`, null, qaToken);
  const tc1After = testsAfterRes.data.find(t => t.testId === tc1Id);
  assert(tc1After.needsRerun === false, 'FR-IMP-08: needsRerun flag cleared after recording execution result');

  // FR-IMP-01: Delete mapping rule
  const deleteRuleRes = await request('DELETE', `/mappings/${ruleId}`, null, devToken);
  assert(deleteRuleRes.status === 200, 'FR-IMP-01: DEV deletes mapping rule (200)');
  const listAfterDel = await request('GET', `/projects/${projectId}/mappings`, null, devToken);
  assert(listAfterDel.data.length === 1, 'FR-IMP-01: Rule successfully removed from mappings list');

  console.log(`\nFR-IMP Verification Complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('[Fatal Error in Test Run]', err);
  process.exit(1);
});
