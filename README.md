# Smart Change Impact & Test Management System (SCIT)

An automated traceability and change impact analysis platform that links requirements, test cases, and Git commits to recommend targeted test runs and measure regression test reduction.

---

## 🏗️ Architecture & Technology Stack

- **Frontend:** React (Vite SPA) in `/client`, Vanilla CSS modern Soft Minimalist design system, React Router DOM, Axios, Lucide Icons.
- **Backend:** Node.js & Express in `/server` with clean layered architecture:
  `routes -> controllers -> services -> models`.
- **Database:** MongoDB with Mongoose (with automatic fallback to embedded in-memory MongoDB for zero-configuration local evaluation).
- **Authentication:** JWT (JSON Web Tokens) with 24-hour expiry and bcrypt password hashing.
- **Security:** AES-256 encrypted GitHub access tokens at rest (never returned via any API endpoint) and HMAC webhook verification.
- **Reports:** PDF generation via `pdfkit` and Excel spreadsheet generation via `exceljs`.
- **Testing:** Unit tests (`server/test/impactEngine.test.js`), Selenium UI automation Page Objects (`tests/selenium`), and Postman collection (`tests/postman`).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18+ or v20+ or v24+
- **npm** v9+

### 2. Environment Configuration
Copy `.env.example` to `server/.env` (already configured out-of-the-box):
```bash
cp .env.example server/.env
```

### 3. Install Dependencies
```bash
# In server directory:
cd server
npm install

# In client directory:
cd ../client
npm install
```

### 4. Seed the Database
Populate the system with the complete `demo-shop` project matching the System Design specification:
```bash
cd server
npm run seed
```

This sets up:
- **PM User:** `pm@demo.com` / `password123`
- **DEV User:** `dev@demo.com` / `password123`
- **QA User:** `qa@demo.com` / `password123`
- **TL User:** `tl@demo.com` / `password123`
- **Requirements:** `REQ-01` to `REQ-04`
- **Test Cases:** `TC-01` to `TC-08`
- **Mapping Rules:** `src/auth/**`, `src/cart/**`, `src/payment/**`, `src/orders/**`
- **Ingested Commits:** Includes commit `a1b2c3d` touching `src/auth/LoginService.js` and `README.md`
- **Defects:** `BUG-01` linked to `TC-02`

---

## 🏃 Running the Application

### Start Backend API Server
```bash
cd server
npm run dev
# Server will listen on http://localhost:5000/api
```

### Start Frontend Application
In a separate terminal:
```bash
cd client
npm run dev
# Web app will be accessible at http://localhost:5173
```

---

## 🧪 Testing & Verification

### 1. Unit Tests (Impact Engine UT-01 to UT-08)
Verify pattern matching, tag scanning, test suite reduction percentage, and coverage calculation:
```bash
cd server
npm test
```

### 2. Manual End-to-End Verification Flow
1. Open **http://localhost:5173/login** in your browser.
2. Click the quick **PM** button (or enter `pm@demo.com` / `password123`) and click **Sign In**.
3. **PM Dashboard:** View total requirements (4), covered requirements (4), 100% coverage, 1 open bug, and 3 commits.
4. **Requirements:** Click **Requirements** in the sidebar. Use filters (Priority: High) and view version histories.
5. **Commits & Impact:** Click **Commits & Impact** in the sidebar.
   - Select commit `a1b2c3d`.
   - Verify the reduction strip displays **3 of 8 tests recommended, 62.5% reduction** (recommends TC-01, TC-02, TC-03).
   - Verify `README.md` is flagged as **(unmapped)**.
6. **Reports:** Click **Reports** in the sidebar. Select **Requirement Traceability Matrix**, preview the table, and click **Export PDF** or **Export Excel** to download the deliverables.
7. **Role Restriction Check:** Click Logout, log in as QA (`qa@demo.com` / `password123`), and navigate directly to `http://localhost:5173/projects`. Verify the **Access Denied** message is displayed.

---

## 📂 Project Structure

```
├── docs/                      # PRD, SRS, System Design, UI Spec, Test Plan
├── server/
│   ├── src/
│   │   ├── config/            # DB connection & environment variables
│   │   ├── models/            # Mongoose schemas (User, Project, Requirement, etc.)
│   │   ├── routes/            # Express routers
│   │   ├── controllers/       # HTTP request handlers & validation
│   │   ├── services/          # Business logic: Impact Engine, GitHub sync, Reports
│   │   ├── middleware/        # Auth, role check (PM, DEV, QA, TL), error handler
│   │   ├── scripts/seed.js    # Database seeder
│   │   ├── app.js             # Express app setup
│   │   └── server.js          # Server entrypoint
│   └── test/                  # Unit tests for Impact Engine
├── client/
│   ├── src/
│   │   ├── api/               # Axios client with JWT interceptor
│   │   ├── context/           # AuthContext & ProjectContext
│   │   ├── components/        # Navbar, Sidebar, Modal, Badge, AccessDenied
│   │   ├── pages/             # Login, Dashboard, Requirements, Tests, Commits, Bugs, Reports
│   │   ├── index.css          # Modern Soft Minimalist CSS Design System
│   │   ├── App.jsx            # Routing and protected layout
│   │   └── main.jsx           # React DOM root
│   ├── index.html
│   └── vite.config.js
├── tests/
│   ├── selenium/              # Page Object Model UI automation suites
│   └── postman/               # Postman API Collection
├── .env.example               # Template environment configuration
└── README.md
```
