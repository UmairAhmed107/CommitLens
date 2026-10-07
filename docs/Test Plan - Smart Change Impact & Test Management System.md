# Test Plan

**Product:** Smart Change Impact & Test Management System **Version:** 0.1 (Draft). Follows SRS v0.1. Tool: Selenium (JavaScript).

## 1. Introduction

### 1.1 Purpose

This plan describes how the Smart Change Impact & Test Management System will be tested: what is tested, how, with which tools, by whom, and when testing is complete.

### 1.2 Objectives

- Verify every high-priority functional requirement in the SRS.
- Verify the impact engine returns correct requirements and tests for known inputs.
- Automate the main UI flows with Selenium.
- Record defects and show requirement-to-test traceability.

## 2. Scope

| In scope | Out of scope |
| --- | --- |
| Authentication and role access | Load testing beyond a small sample |
| Projects, requirements, tests, bugs | Mobile layouts |
| Git sync, mapping rules, impact engine | GitHub's own availability |
| Dashboards and reports with PDF/Excel export | Future AI features |

## 3. Test Strategy

| Level | What | Tool | Owner |
| --- | --- | --- | --- |
| Unit | Impact engine, pattern matching, tag scanning, coverage calculation, ID generators | Mocha with Chai (or Jest) | Developer |
| API | All endpoints: status codes, validation, role checks | Postman collection, optional Newman | Developer, QA |
| UI / System | End-to-end flows per role | **Selenium WebDriver (JavaScript) with Mocha** | QA |
| Manual / Exploratory | Look and feel, report content, odd inputs | Manual test cases | QA |
| Regression | Re-run affected tests after each change | The platform's own recommendations | QA |

### 3.1 Techniques

- Equivalence partitioning and boundary value analysis for forms (name length, password rules, priority values).
- Decision tables for role permissions.
- State transition testing for bug status and test status.
- Error guessing for Git sync (bad token, empty repository, duplicate sync).

## 4. Test Environment

| Item | Detail |
| --- | --- |
| Browsers | Chrome (primary), Firefox |
| Drivers | ChromeDriver, GeckoDriver matching the installed browsers |
| Runtime | Node.js LTS |
| Database | Local MongoDB with a separate test database `scit_test` |
| Test repository | `demo-shop` on GitHub with a test token |
| Test users | One account per role: PM, DEV, QA, TL |

## 5. Entry and Exit Criteria

**Entry:** build deploys locally, database is seeded, test accounts and demo repository exist.

**Exit:**

- 100% of high-priority test cases executed.
- At least 90% of all test cases passed.
- No open Critical or High severity bugs.
- Traceability matrix shows every high-priority requirement linked to at least one executed test.

## 6. Selenium Automation Design

- **Pattern:** Page Object Model, one class per page (LoginPage, RequirementsPage, TestsPage, CommitsPage, and so on).
- **Locators:** `data-testid` attributes, as set in the UI spec, never positional XPath.
- **Waits:** explicit waits (`until.elementLocated`) instead of fixed sleeps.
- **Data:** each suite creates its own project through the API in a `before` hook and removes it in `after`.
- **Reporting:** Mocha reporter writing HTML or JSON, plus a screenshot on failure.
- **Suggested layout:**

```
tests/selenium/
  pages/        LoginPage.js, RequirementsPage.js, ...
  specs/        auth.spec.js, requirements.spec.js, impact.spec.js, ...
  helpers/      driver.js, apiSeed.js
  package.json
```

## 7. Automated UI Test Cases

| ID | Requirement | Scenario | Steps | Expected result |
| --- | --- | --- | --- | --- |
| UI-01 | FR-AUTH-01, 02 | Valid register and login | Register, log in | Dashboard opens with user name |
| UI-02 | FR-AUTH-02 | Wrong password | Enter wrong password | Error message shown, stay on login |
| UI-03 | FR-AUTH-03 | Role restriction | Log in as QA, open /projects create page | Access Denied page |
| UI-04 | FR-PRJ-01 | Create project | PM clicks New Project, saves | Project card appears |
| UI-05 | FR-REQ-01, 02 | Create requirement | PM adds requirement | Row appears with ID REQ-1 |
| UI-06 | FR-REQ-04 | Filter requirements | Choose priority High | Only High rows shown |
| UI-07 | FR-TST-01, 02 | Create linked test | QA creates test, selects REQ-1 | Test row shows REQ-1 link |
| UI-08 | FR-TST-03 | Record failed result | QA marks test Failed | Red Failed badge appears |
| UI-09 | FR-GIT-01 | Connect repository | DEV enters URL and token | Repository name and Sync Now shown |
| UI-10 | FR-IMP-01 | Add mapping | DEV adds `src/auth/**` to REQ-1 | Rule listed in table |
| UI-11 | FR-GIT-03, FR-IMP-03, 04 | Sync and impact | Click Sync, open latest commit | REQ-1 shown with its 3 tests |
| UI-12 | FR-IMP-06 | Unmapped files | Open commit that touches README.md | README.md flagged unmapped |
| UI-13 | FR-BUG-01, 03 | Create bug from failure | QA clicks Create Bug on failed test, assigns DEV | Bug listed as Open, assigned |
| UI-14 | FR-DSH-01 | Dashboard counts | Open PM dashboard | Counts match seeded data |
| UI-15 | FR-RPT-01, 04 | Export RTM | Open Reports, click Export PDF | File downloads |

## 8. Unit and API Test Cases (Examples)

| ID | Component | Input | Expected |
| --- | --- | --- | --- |
| UT-01 | Pattern matcher | `src/auth/LoginService.js` against `src/auth/**` | Match |
| UT-02 | Pattern matcher | `src/cart/CartService.js` against `src/auth/**` | No match |
| UT-03 | Tag scanner | File text containing `// @req REQ-01` | Returns REQ-01 |
| UT-04 | Tag scanner | File with no tag | Returns empty list |
| UT-05 | Impact engine | Two files matching two requirements | Union of both requirements' tests |
| UT-06 | Impact engine | Same requirement matched by pattern and tag | One requirement with two reasons |
| UT-07 | Reduction calculator | 3 recommended of 8 total | 62.5 |
| UT-08 | Coverage calculator | 3 of 4 requirements linked | 75 |
| API-01 | POST /auth/login | Wrong password | 401 |
| API-02 | POST /projects/:id/requirements | QA token | 403 |
| API-03 | POST /projects/:id/sync | Run twice on the same commits | No duplicate commits |
| API-04 | POST /webhooks/github | Invalid signature | 401 |

## 9. Manual Test Cases (Examples)

| ID | Area | Scenario | Expected |
| --- | --- | --- | --- |
| MT-01 | Reports | Open exported Excel RTM | Columns and values match the on-screen preview |
| MT-02 | Requirements | Edit a requirement twice | Version history shows three versions |
| MT-03 | Git | Connect with an invalid token | Clear error, token not stored |
| MT-04 | Bugs | Move a bug from Open to Closed in one step | Status order enforced or warned |
| MT-05 | Impact | Delete a requirement that has mappings | Mappings removed or flagged, no crash |

## 10. Requirement Traceability

The full requirement-to-test table is in SRS section 7 and in the platform's own RTM report. During testing, enter the platform's requirements and test cases into the platform itself, so its RTM is the course deliverable that proves coverage.

## 11. Defect Management

| Field | Values |
| --- | --- |
| Severity | Critical, High, Medium, Low |
| Priority | P1, P2, P3 |
| Status | Open, In Progress, Fixed, Verified, Closed |
| Record | Bug ID, title, steps to reproduce, expected versus actual, test ID, screenshot, assignee |

Defects are logged in the platform's Bugs module and also exported in the final test report.

## 12. Schedule

| Phase | Activity |
| --- | --- |
| 1 | Finalize PRD, SRS, and this plan |
| 2 | Write test cases and Page Objects while features are built |
| 3 | Run unit and API tests per module |
| 4 | Run the full Selenium suite once the UI is complete |
| 5 | Fix defects, retest, and run regression using the impact engine |
| 6 | Final report with metrics and RTM |

## 13. Metrics for the Final Report

- Test cases planned, executed, passed, failed.
- Requirement coverage percentage.
- Defects found by severity and by module.
- Automation share: automated UI cases divided by total UI cases.
- Regression saving: tests recommended versus full suite for sample commits.

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Flaky Selenium tests from timing | Explicit waits and stable test ids |
| GitHub rate limits during tests | Use a small demo repository and cache commits |
| Driver and browser version mismatch | Pin versions or use selenium-manager |
| Test data left over between runs | Seed and clean up per suite, separate test database |
