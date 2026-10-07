# UI Specification

**Product:** Smart Change Impact & Test Management System **Version:** 0.1 (Draft). Screens for the React frontend.

## 1. Design Principles

- One left sidebar and one top bar on every page after login; the sidebar shows only items allowed for the user's role.
- A project selector in the top bar scopes every page to one project.
- Status is shown with colored badges plus text: Passed (green), Failed (red), Blocked (amber), Not Run (grey), Needs Re-run (blue).
- Tables are the main pattern, with search, filters, and a primary action button at top right.
- Forms use inline validation messages and a disabled Save button until required fields are valid.
- Every interactive element gets a stable `id` or `data-testid` attribute so Selenium can find it.

## 2. Navigation Map

| Sidebar item | Route | PM | DEV | QA | TL |
| --- | --- | --- | --- | --- | --- |
| Dashboard | /dashboard | Yes | Yes | Yes | Yes |
| Requirements | /requirements | Edit | View | View | View |
| Test Cases | /tests | View | View | Edit | View |
| Repository | /repository | View | Edit | View | View |
| Mappings | /mappings | Edit | Edit | View | View |
| Commits and Impact | /commits | View | Yes | Yes | Yes |
| Bugs | /bugs | Yes | Yes | Yes | View |
| Reports | /reports | Yes | View | Yes | Yes |
| Projects and Members | /projects | Edit | No | No | View |

## 3. Screens

### 3.1 Login and Register

- Fields: email, password; register adds name. Role is assigned later by a PM when added to a project.
- Elements: Login button, link to Register, error banner for wrong credentials.
- Test ids: `login-email`, `login-password`, `login-submit`, `login-error`.

### 3.2 Projects

- Card grid of the user's projects with name, member count, and coverage percentage.
- PM sees a New Project button opening a modal (name, description).
- Project page has a Members tab to add a user by email and pick a role.

### 3.3 Dashboard (per role)

| Role | Widgets |
| --- | --- |
| PM | Total requirements, covered requirements, coverage %, open bugs, commit count; requirement status bar chart |
| DEV | Recent commits with impacted requirement chips; bugs assigned to me; Sync button |
| QA | Tests marked Needs Re-run (list with Run actions); failed tests; coverage % |
| TL | Pass/fail doughnut chart; open bugs by severity; latest commit impact summary |

### 3.4 Requirements

- Table: ID, title, type, priority, status, version, linked tests count, coverage badge.
- Filters: priority, status, type; search box.
- Add or edit modal with title, description, type, priority, status.
- Detail drawer shows linked tests and version history.

### 3.5 Test Cases

- Table: ID, title, priority, linked requirements, status badge, Needs Re-run flag.
- Create or edit form: title, steps (repeatable rows), expected result, priority, multi-select of requirements.
- Row action: Record Result opens a small dialog with status and notes.
- Failed result shows a Create Bug button.

### 3.6 Repository

- Form: repository URL, access token (password field), Connect button.
- After connecting: repository name, default branch, last sync time, and a Sync Now button.
- Webhook help box showing the webhook URL to paste into GitHub.

### 3.7 Mappings

- Table: pattern, requirement, created by, delete action.
- Add form: pattern text (with example hint `src/auth/**`) and requirement dropdown.
- Tip box explaining the `@req REQ-01` comment tag.

### 3.8 Commits and Impact (core screen)

- Left: commit list with short SHA, message, author, branch, date, and an impact badge showing the number of impacted requirements.
- Right: detail of the selected commit with four blocks:
  1. Changed files (unmapped ones marked with a warning icon)
  2. Impacted requirements, each with a reason chip (Pattern or Tag)
  3. Recommended tests with current status and a Record Result action
  4. Summary strip: `3 of 8 tests recommended, 62.5% reduction`

### 3.9 Bugs

- Table: ID, title, severity, priority, status, assignee, linked test.
- Filters by status, severity, assignee.
- Detail view with status dropdown following Open, In Progress, Fixed, Verified, Closed.

### 3.10 Reports

- Three cards: Requirement Traceability Matrix, Test Execution Report, Requirement Coverage Report.
- Each card opens a preview table with filters and two buttons: Export PDF, Export Excel.

## 4. Wireframe: Commits and Impact

```
+--------------------------------------------------------------------------+
| Logo  | Project: demo-shop v         | Sync Now                  | User |
+-------+------------------------------+----------------------------------+
| Dash  | Commits                      | Commit a1b2c3d  by Asha  main    |
| Reqs  |  a1b2c3d Fix login   [2]     |----------------------------------|
| Tests |  9f8e7d6 Cart bug    [1]     | Changed files                    |
| Repo  |  4c5d6e7 Docs        [0]     |   src/auth/LoginService.js       |
| Maps  |                              |   README.md  (unmapped)          |
| Commits|                             | Impacted requirements            |
| Bugs  |                              |   REQ-01 Secure Login [Pattern]  |
| Reports|                             | Recommended tests (3 of 8)       |
|       |                              |   TC-01 Login      Needs Re-run  |
|       |                              |   TC-02 Password   Needs Re-run  |
|       |                              |   TC-03 Session    Needs Re-run  |
+-------+------------------------------+----------------------------------+
```

## 5. Key User Flows

1. **PM:** Login, create project, add members, add requirements, view dashboard.
2. **QA:** Login, create tests, link to requirements, later open Needs Re-run list, record results, create a bug for a failure.
3. **DEV:** Login, connect repository, add mappings, click Sync, open the commit and read impacted requirements.
4. **TL:** Login, open dashboard, open Reports, export RTM.

## 6. States and Messages

| Situation | Behaviour |
| --- | --- |
| Empty list | Friendly message with the primary action button |
| Loading | Spinner on the table or card, never a blank page |
| API error | Red banner at top with the server message |
| Sync running | Button disabled with `Syncing...` text |
| No impact found | Message: `No requirements matched. Add mappings to improve results.` |
| Forbidden action | Button hidden for the role; direct URL shows an Access Denied page |

7. Visual Style

   • **Theme & Tone:** Soft Minimalist / Modern Organic light theme. Calm, airy aesthetic inspired by lifestyle publications.

   • **Color Palette:**

   • **Backgrounds:** Off-white / light grey base (`#F9F9FB` to `#F5F5F7`), warm cream tone accent blocks (`#E8F0EE` soft mint / `#EAF1F5` soft ice blue).

   • **Primary Accent:** Solid black (`#000000`) for high-contrast primary call-to-action buttons, badges, and key icons.

   • **Neutral Greys:** Soft border outlines (`#E5E5E5`), light card backgrounds (`#FAFAFA`), and dark charcoal body text (`#2B2B2B`).

   • **Typography:**

   • **Display & Headings:** Serif font (e.g., Playfair Display, Bodoni, or Cormorant Garamond) for primary headings and collection titles.

   • **Body & UI Elements:** Clean, modern system sans-serif (e.g., Inter, -apple-system, Segoe UI) for navigation, product details, and controls.

   • **Cards & Containers:** Flat, borderless or ultra-subtle light border (`1px solid #EAEAEA`) with 0px–8px radius; product images sit inside clean, padded light grey containers.

   • **Spacing:** Generous, breathable layout with 16px base unit and wide negative space around imagery and featured hero sections.

   • **Responsive & Accessibility:** Responsive down to 1024px wide; accessible contrast standards with high-visibility black focus rings on interactable elements.
