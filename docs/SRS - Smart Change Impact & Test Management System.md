# Software Requirements Specification (SRS)

**Product:** Smart Change Impact & Test Management System **Version:** 0.1 (Draft). Based on PRD v0.1. **Stack:** React, Node.js/Express, MongoDB. Testing tool: Selenium (JavaScript).

## 1. Introduction

### 1.1 Purpose

This SRS defines the functional and non-functional requirements of the Smart Change Impact & Test Management System, a web platform that links requirements, test cases, and Git commits and recommends only the tests impacted by a code change.

### 1.2 Scope

The system covers projects, requirements, test cases, GitHub commit ingestion, change impact analysis, basic bug tracking, role-based dashboards, and PDF/Excel reports. It recommends tests but does not execute them. AI features are out of scope.

### 1.3 Definitions

| Term | Meaning |
| --- | --- |
| RTM | Requirement Traceability Matrix: requirement to test to result |
| Mapping rule | A file or folder pattern linked to a requirement |
| Req tag | A code comment such as `@req REQ-01` linking a file to a requirement |
| Impact analysis | Computing impacted requirements and tests from a commit's changed files |
| Sync | Manual pull of commits from GitHub |

## 2. Overall Description

### 2.1 User classes

| Role | Permissions summary |
| --- | --- |
| Project Manager (PM) | Manage projects and requirements; view all dashboards and reports |
| Developer (DEV) | Connect repository, manage mapping rules, view impact, update bug status |
| QA Engineer (QA) | Manage test cases and links, record results, create bugs |
| Team Lead (TL) | Read-only access to everything; view reports and dashboards |

### 2.2 Operating environment

Modern desktop browsers (Chrome, Firefox). Node.js server, MongoDB database, GitHub REST API.

### 2.3 Assumptions and constraints

- Users supply a GitHub personal access token for their repository.
- Mapping quality depends on the rules and tags that users maintain.
- Webhooks need a public URL; manual sync is the baseline.

## 3. Functional Requirements

### 3.1 Authentication and roles (FR-AUTH)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-AUTH-01 | The system shall let a user register with name, email, and password. | High |
| FR-AUTH-02 | The system shall authenticate users by email and password and issue a session token. | High |
| FR-AUTH-03 | The system shall enforce role-based access for PM, DEV, QA, and TL on every page and API. | High |
| FR-AUTH-04 | The system shall let a user log out and invalidate the session. | Medium |

### 3.2 Projects (FR-PRJ)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-PRJ-01 | A PM shall create, edit, and archive projects with name and description. | High |
| FR-PRJ-02 | A PM shall add users to a project and assign each a role. | High |
| FR-PRJ-03 | Users shall see only the projects they belong to. | High |

### 3.3 Requirements management (FR-REQ)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-REQ-01 | A PM shall create a requirement with title, description, type (user story, functional, non-functional), priority, and status. | High |
| FR-REQ-02 | The system shall auto-generate a unique ID (REQ-n) per project. | High |
| FR-REQ-03 | A PM shall edit a requirement; each edit shall create a new version retaining the previous one. | Medium |
| FR-REQ-04 | Users shall filter and search requirements by priority, status, and type. | Medium |
| FR-REQ-05 | The system shall show each requirement's linked tests and coverage state (covered or uncovered). | High |

### 3.4 Test management (FR-TST)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-TST-01 | A QA shall create a test case with title, steps, expected result, and priority. | High |
| FR-TST-02 | A QA shall link a test case to one or more requirements. | High |
| FR-TST-03 | A QA shall set a test's execution status to Not Run, Passed, Failed, or Blocked, with a timestamp and executor. | High |
| FR-TST-04 | The system shall keep a history of execution results per test. | Medium |
| FR-TST-05 | The system shall display requirement coverage as the percentage of requirements with at least one linked test. | High |

### 3.5 Git integration (FR-GIT)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-GIT-01 | A DEV shall connect a GitHub repository to a project using the repository URL and an access token. | High |
| FR-GIT-02 | The system shall store the token encrypted. | High |
| FR-GIT-03 | A DEV shall trigger a manual Sync that fetches new commits (SHA, message, author, branch, date, changed files). | High |
| FR-GIT-04 | The system shall not create duplicate commits when a sync is repeated. | High |
| FR-GIT-05 | The system shall accept GitHub webhook push events and ingest commits the same way as a sync. | Medium |
| FR-GIT-06 | Users shall view commit history with filters for branch and author. | Medium |

### 3.6 Change impact engine (FR-IMP)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-IMP-01 | A DEV or PM shall create mapping rules linking a file or folder pattern to a requirement. | High |
| FR-IMP-02 | The system shall scan changed files for `@req REQ-n` tags and link them to the named requirements. | High |
| FR-IMP-03 | For each commit, the system shall compute the impacted requirements as the union of pattern matches and tag matches. | High |
| FR-IMP-04 | For each impacted requirement, the system shall list its linked test cases as recommended tests. | High |
| FR-IMP-05 | The system shall record the reason (pattern or tag) for each impacted requirement. | Medium |
| FR-IMP-06 | The system shall list changed files that matched no rule or tag as unmapped. | Medium |
| FR-IMP-07 | The system shall show recommended tests versus total tests as a reduction percentage. | Medium |
| FR-IMP-08 | When a commit impacts a requirement, the system shall mark its linked tests as Needs Re-run until a new result is recorded. | High |

### 3.7 Bug management (FR-BUG)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-BUG-01 | A QA shall create a bug from a failed test with title, description, severity, and priority. | High |
| FR-BUG-02 | The system shall auto-generate a unique bug ID (BUG-n) per project. | High |
| FR-BUG-03 | A QA or PM shall assign a bug to a developer. | High |
| FR-BUG-04 | The bug status shall move through Open, In Progress, Fixed, Verified, and Closed. | High |
| FR-BUG-05 | Users shall filter bugs by status, severity, and assignee. | Medium |

### 3.8 Dashboards (FR-DSH)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-DSH-01 | The project dashboard shall show total requirements, covered requirements, coverage percentage, open bugs, and commit count. | High |
| FR-DSH-02 | The developer dashboard shall show recent commits, their impacted requirements, and bugs assigned to the developer. | High |
| FR-DSH-03 | The QA dashboard shall show tests marked Needs Re-run, failed tests, and coverage percentage. | High |
| FR-DSH-04 | The team lead dashboard shall show a pass/fail summary and open bugs by severity. | Medium |

### 3.9 Reports (FR-RPT)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-RPT-01 | The system shall generate an RTM showing requirement, linked tests, and latest result. | High |
| FR-RPT-02 | The system shall generate a Test Execution Report with counts by status and a list of failures. | High |
| FR-RPT-03 | The system shall generate a Requirement Coverage Report listing covered and uncovered requirements. | High |
| FR-RPT-04 | Each report shall export to PDF and to Excel. | High |

## 4. Use Cases

| ID | Use case | Actor | Main flow |
| --- | --- | --- | --- |
| UC-01 | Create requirement | PM | Open project, choose Add Requirement, fill form, save; system assigns REQ-n. |
| UC-02 | Link test to requirement | QA | Create or open test, select requirements, save link. |
| UC-03 | Connect repository | DEV | Enter repo URL and token, save; system validates access. |
| UC-04 | Define mapping | DEV | Add pattern, choose requirement, save. |
| UC-05 | Sync and analyse commits | DEV | Click Sync; system fetches commits and runs impact analysis; DEV views impact. |
| UC-06 | Execute recommended tests | QA | Open Needs Re-run list, run tests externally, record each result. |
| UC-07 | Report bug | QA | From a failed test choose Create Bug, fill form, assign developer. |
| UC-08 | Export report | PM, TL | Choose report, apply filters, click Export PDF or Excel. |

## 5. Non-Functional Requirements

| ID | Category | Requirement |
| --- | --- | --- |
| NFR-01 | Performance | Impact analysis of a commit with up to 100 files shall complete within 5 seconds. |
| NFR-02 | Performance | Standard pages shall load within 3 seconds on a normal connection. |
| NFR-03 | Security | Passwords shall be stored hashed; sessions shall use signed tokens with expiry. |
| NFR-04 | Security | GitHub tokens shall be encrypted at rest and never returned by the API. |
| NFR-05 | Security | All inputs shall be validated server-side. |
| NFR-06 | Usability | Each role shall reach its main task within three clicks from its dashboard. |
| NFR-07 | Reliability | Failed syncs and webhooks shall be logged and shall not corrupt data. |
| NFR-08 | Compatibility | The UI shall work in current Chrome and Firefox. |
| NFR-09 | Maintainability | The backend shall expose a documented REST API with separate route, service, and model layers. |

## 6. External Interfaces

- **User interface:** React single-page application; screens are defined in the UI Specification.
- **GitHub REST API:** commits and changed files per commit.
- **GitHub webhook:** push events to `POST /api/webhooks/github`.
- **Database:** MongoDB, schema in the System Design document.

## 7. Requirement-to-Test Traceability (Selenium)

| Requirement | Selenium test ID | Scenario |
| --- | --- | --- |
| FR-AUTH-01, 02 | UI-01 | Register and log in with valid data |
| FR-AUTH-02 | UI-02 | Login fails with wrong password |
| FR-AUTH-03 | UI-03 | QA cannot open project creation page |
| FR-PRJ-01 | UI-04 | PM creates a project |
| FR-REQ-01, 02 | UI-05 | PM creates a requirement and gets REQ-n |
| FR-REQ-04 | UI-06 | Filter requirements by priority |
| FR-TST-01, 02 | UI-07 | QA creates a test and links it to a requirement |
| FR-TST-03 | UI-08 | QA marks a test Failed |
| FR-GIT-01 | UI-09 | DEV connects a repository |
| FR-IMP-01 | UI-10 | DEV adds a mapping rule |
| FR-GIT-03, FR-IMP-03, 04 | UI-11 | Sync shows impacted requirements and recommended tests |
| FR-IMP-06 | UI-12 | Unmapped files are listed |
| FR-BUG-01, 03 | UI-13 | QA creates and assigns a bug from a failed test |
| FR-DSH-01 | UI-14 | Project dashboard shows correct counts |
| FR-RPT-01, 04 | UI-15 | RTM exports to PDF and Excel |

## 8. Future Requirements

AI test suggestions, impacted-module prediction, duplicate bug detection, release readiness score, per-commit risk analysis, screenshot attachments, automated result import, and Release Readiness and Regression reports.
