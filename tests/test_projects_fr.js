// Verification script for FR-PRJ-01 to FR-PRJ-03
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
  console.log('--- Starting FR-PRJ-01 to FR-PRJ-03 Verification ---');
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

  // 1. Authenticate as demo users
  const pmLogin = await request('POST', '/auth/login', {
    email: 'pm@demo.com',
    password: 'password123'
  });
  assert(pmLogin.status === 200 && pmLogin.data.token, 'PM logs in and receives JWT token');
  const pmToken = pmLogin.data?.token;

  const qaLogin = await request('POST', '/auth/login', {
    email: 'qa@demo.com',
    password: 'password123'
  });
  assert(qaLogin.status === 200 && qaLogin.data.token, 'QA logs in and receives JWT token');
  const qaToken = qaLogin.data?.token;

  const devLogin = await request('POST', '/auth/login', {
    email: 'dev@demo.com',
    password: 'password123'
  });
  assert(devLogin.status === 200 && devLogin.data.token, 'DEV logs in and receives JWT token');
  const devToken = devLogin.data?.token;

  // 2. FR-PRJ-01: PM creates a project
  const testProjectName = `Test-PRJ-${Date.now()}`;
  const createRes = await request(
    'POST',
    '/projects',
    {
      name: testProjectName,
      description: 'Project created by PM for FR-PRJ-01 verification'
    },
    pmToken
  );
  assert(createRes.status === 201, `FR-PRJ-01: PM can create project (status 201)`);
  assert(createRes.data?.name === testProjectName, `FR-PRJ-01: Project name matches`);
  assert(
    createRes.data?.members?.some((m) => m.role === 'PM'),
    `FR-PRJ-01: Creator is assigned PM role in members array`
  );
  const projectId = createRes.data?._id;

  // 3. FR-PRJ-01 Role Check: QA or non-PM cannot create project
  const qaCreateRes = await request(
    'POST',
    '/projects',
    {
      name: 'QA Unauthorized Project',
      description: 'Should be rejected'
    },
    qaToken
  );
  assert(
    qaCreateRes.status === 403,
    `Role check: Non-PM user (QA) is rejected with 403 Forbidden when creating a project`
  );

  // 4. FR-PRJ-01: PM edits and archives project
  const editRes = await request(
    'PUT',
    `/projects/${projectId}`,
    {
      name: `${testProjectName}-Updated`,
      description: 'Updated description',
      status: 'Archived'
    },
    pmToken
  );
  assert(editRes.status === 200, `FR-PRJ-01: PM can edit and archive project (status 200)`);
  assert(editRes.data?.name === `${testProjectName}-Updated`, `FR-PRJ-01: Edited name updated`);
  assert(editRes.data?.status === 'Archived', `FR-PRJ-01: Status updated to Archived`);

  // Non-PM cannot edit project
  const devEditRes = await request(
    'PUT',
    `/projects/${projectId}`,
    { name: 'Hacked' },
    devToken
  );
  assert(devEditRes.status === 403, `Role check: Non-PM cannot edit project (403 Forbidden)`);

  // Unarchive project for further member testing
  await request('PUT', `/projects/${projectId}`, { status: 'Active' }, pmToken);

  // 5. FR-PRJ-02: PM adds user to project and assigns role
  const addDevMember = await request(
    'POST',
    `/projects/${projectId}/members`,
    {
      email: 'dev@demo.com',
      role: 'DEV'
    },
    pmToken
  );
  assert(addDevMember.status === 200, `FR-PRJ-02: PM can add member with role DEV (status 200)`);
  const hasDevMember = addDevMember.data?.members?.some(
    (m) => m.userId?.email === 'dev@demo.com' && m.role === 'DEV'
  );
  assert(hasDevMember, `FR-PRJ-02: User dev@demo.com is verified in members array with role DEV`);

  // Non-PM cannot add member
  const qaAddMember = await request(
    'POST',
    `/projects/${projectId}/members`,
    {
      email: 'qa@demo.com',
      role: 'QA'
    },
    devToken
  );
  assert(qaAddMember.status === 403, `FR-PRJ-02: Non-PM cannot add member (403 Forbidden)`);

  // 6. FR-PRJ-03: Users see only the projects they belong to
  // PM should see testProject
  const pmProjects = await request('GET', '/projects', null, pmToken);
  assert(
    pmProjects.data?.some((p) => p._id === projectId),
    `FR-PRJ-03: PM sees project ${testProjectName}`
  );

  // DEV should see testProject (because PM just added DEV)
  const devProjects = await request('GET', '/projects', null, devToken);
  assert(
    devProjects.data?.some((p) => p._id === projectId),
    `FR-PRJ-03: DEV sees project ${testProjectName} after being added`
  );

  // QA was NOT added to testProject, so QA should NOT see it
  const qaProjects = await request('GET', '/projects', null, qaToken);
  assert(
    !qaProjects.data?.some((p) => p._id === projectId),
    `FR-PRJ-03: QA does NOT see project ${testProjectName} because QA was not added`
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
