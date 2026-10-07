# System Design: Architecture, Database, and API

**Product:** Smart Change Impact & Test Management System **Version:** 0.1 (Draft). Implements SRS v0.1.

## 1. Architecture

The system is a three-tier web application: a React single-page app talks to a Node.js/Express REST API, which stores data in MongoDB and calls GitHub.

```
Browser (React SPA)
      |  HTTPS + JSON, JWT in Authorization header
      v
Express API
  routes -> controllers -> services -> models
      |                |
      |                +--> Impact Engine (service)
      |                +--> GitHub Service (REST client)
      |                +--> Report Service (PDF / Excel)
      v
MongoDB            GitHub REST API   <---  GitHub webhook (push)
```

### 1.1 Technology choices

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | React, React Router, Axios, Chart.js | Component UI, simple charts |
| Backend | Node.js, Express | Same language as frontend |
| Database | MongoDB with Mongoose | Flexible links between requirements, tests, and commits |
| Auth | JWT, bcrypt | Stateless sessions, hashed passwords |
| Git | GitHub REST API via Octokit | Commit and file data |
| Reports | pdfkit (PDF), exceljs (Excel) | Export required by SRS |
| Testing | Selenium (JavaScript), Mocha, Postman | Course requirement and API checks |

### 1.2 Suggested folder structure

```
project-root/
  server/
    src/
      config/        db and env setup
      models/        Mongoose schemas
      routes/        Express routers
      controllers/   request handling
      services/      impact engine, github, reports
      middleware/    auth, role check, error handler
      app.js
  client/
    src/
      pages/         Login, Dashboard, Requirements, Tests, Git, Impact, Bugs, Reports
      components/    tables, forms, charts, layout
      api/           Axios calls
      context/       auth state
  tests/
    selenium/        UI automation
    postman/         API collection
  docs/
```

## 2. Database Design (MongoDB collections)

| Collection | Key fields | Notes |
| --- | --- | --- |
| users | name, email (unique), passwordHash, createdAt | Global accounts |
| projects | name, description, status, ownerId, members\[{userId, role}\] | Role is per project: PM, DEV, QA, TL |
| requirements | projectId, reqId (REQ-n), title, description, type, priority, status, version, history\[\] | Unique (projectId, reqId); history keeps old versions |
| testcases | projectId, testId (TC-n), title, steps\[\], expectedResult, priority, requirementIds\[\], status, needsRerun, lastRunBy, lastRunAt | status: Not Run, Passed, Failed, Blocked |
| testruns | testId, status, executedBy, executedAt, notes | One row per recorded result |
| repositories | projectId, url, owner, name, defaultBranch, tokenEncrypted, lastSyncAt | One repository per project in v1 |
| commits | projectId, sha (unique per project), message, author, branch, date, files\[{path, status}\] | Prevents duplicates by sha |
| mappingrules | projectId, pattern, requirementId, createdBy | Pattern is a glob such as `src/auth/**` |
| impactresults | projectId, commitSha, impacted\[{requirementId, reasons\[\]}\], recommendedTestIds\[\], unmappedFiles\[\], totalTests, reductionPct, createdAt | Stored so dashboards load fast |
| bugs | projectId, bugId (BUG-n), title, description, severity, priority, status, testId, reportedBy, assignedTo, createdAt | status: Open, In Progress, Fixed, Verified, Closed |
| counters | projectId, key, value | Generates REQ-n, TC-n, BUG-n |

### 2.1 Relationships

- A project has many requirements, test cases, commits, mapping rules, and bugs.
- A test case links to many requirements (array of requirement ids); a requirement is covered when at least one test links to it.
- A commit has one impact result.
- A bug references the failed test that produced it.

### 2.2 Indexes

- `requirements`: unique `(projectId, reqId)`
- `commits`: unique `(projectId, sha)`
- `testcases`: index on `requirementIds`
- `mappingrules`: index on `projectId`

## 3. Impact Engine Algorithm

Input: a commit with its changed file paths. Output: an impact result.

1. Load all mapping rules for the project.
2. For each changed file, test the path against every rule's glob pattern. Each match adds the rule's requirement with reason `pattern`.
3. For each changed file that is not deleted, fetch its content from GitHub and search for the regular expression `@req\s+(REQ-\d+)`. Each match adds that requirement with reason `tag`.
4. Merge by requirement: impacted requirements are the union, with all reasons kept.
5. Find all test cases whose `requirementIds` include any impacted requirement. These are the recommended tests.
6. Set `needsRerun = true` on each recommended test.
7. Any changed file with no pattern or tag match goes to `unmappedFiles`.
8. Compute `reductionPct = (1 - recommended / total) * 100` and save the result.

Edge cases: a commit with no matches returns an empty recommendation and lists all files as unmapped; a missing tag target (REQ-99 does not exist) is ignored and logged.

## 4. REST API

All routes are under `/api`. All except register, login, and the webhook require a JWT. Roles shown are the minimum allowed.

### 4.1 Auth and projects

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | /auth/register | Public | Create account |
| POST | /auth/login | Public | Return JWT |
| GET | /auth/me | Any | Current user |
| POST | /projects | PM | Create project |
| GET | /projects | Any | List my projects |
| GET | /projects/:id | Member | Project details |
| POST | /projects/:id/members | PM | Add member with role |

### 4.2 Requirements and tests

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | /projects/:id/requirements | PM | Create requirement |
| GET | /projects/:id/requirements | Member | List with filters |
| PUT | /requirements/:rid | PM | Edit, creating a new version |
| POST | /projects/:id/tests | QA | Create test case |
| GET | /projects/:id/tests | Member | List with filters |
| PUT | /tests/:tid | QA | Edit test or links |
| POST | /tests/:tid/runs | QA | Record result, clears needsRerun |
| GET | /projects/:id/coverage | Member | Coverage percentage and uncovered list |

### 4.3 Git and impact

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | /projects/:id/repository | DEV | Connect repository |
| POST | /projects/:id/sync | DEV | Manual sync and impact analysis |
| POST | /webhooks/github | Signed | Receive push events |
| GET | /projects/:id/commits | Member | Commit history |
| POST | /projects/:id/mappings | DEV, PM | Create mapping rule |
| GET | /projects/:id/mappings | Member | List rules |
| DELETE | /mappings/:mid | DEV, PM | Delete rule |
| GET | /commits/:sha/impact | Member | Impact result for a commit |

### 4.4 Bugs, dashboards, and reports

| Method | Endpoint | Role | Purpose |
| --- | --- | --- | --- |
| POST | /projects/:id/bugs | QA | Create bug |
| GET | /projects/:id/bugs | Member | List with filters |
| PUT | /bugs/:bid | QA, DEV, PM | Update status or assignee |
| GET | /projects/:id/dashboard/:view | Member | view = project, dev, qa, lead |
| GET | /projects/:id/reports/:type | Member | type = rtm, execution, coverage |
| GET | /projects/:id/reports/:type/export?format=pdf or xlsx | Member | Download file |

### 4.5 Response conventions

- Success: `200` or `201` with JSON body.
- Validation error: `400` with `{ error, details }`.
- Unauthenticated: `401`. Forbidden role: `403`. Not found: `404`.

## 5. Security Design

- Passwords hashed with bcrypt; JWT signed with a secret from environment variables and set to expire.
- Role middleware checks the user's role on the project for each protected route.
- GitHub tokens encrypted with AES using a server key and never returned by any endpoint.
- Webhook requests verified with the GitHub HMAC signature.
- Input validated on the server with a schema library such as Joi or express-validator.

## 6. Demo Data

The `demo-shop` repository supports the demonstration.

| Requirement | Mapping pattern | Tests |
| --- | --- | --- |
| REQ-01 Secure Login | `src/auth/**` | TC-01 Login, TC-02 Password, TC-03 Session |
| REQ-02 Shopping Cart | `src/cart/**` | TC-04 Add Item, TC-05 Remove Item |
| REQ-03 Payment | `src/payment/**` | TC-06 Card Payment, TC-07 Refund |
| REQ-04 Order Tracking | `src/orders/**` | TC-08 Order Status |

Pushing a change to `src/auth/LoginService.js` should recommend TC-01 to TC-03 only, a 62.5% reduction from the 8 total tests.
