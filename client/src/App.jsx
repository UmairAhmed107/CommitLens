// Main Application Routing and App Shell
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider, useProject } from './context/ProjectContext';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Requirements from './pages/Requirements';
import TestCases from './pages/TestCases';
import Repository from './pages/Repository';
import Mappings from './pages/Mappings';
import CommitsImpact from './pages/CommitsImpact';
import Bugs from './pages/Bugs';
import Reports from './pages/Reports';
import Projects from './pages/Projects';

// Protected App Shell Layout
function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const { syncFeedback, setSyncFeedback } = useProject();

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar />

        {/* Global Git Sync Feedback Alert */}
        {syncFeedback && (
          <div style={{ padding: '0 2.5rem', paddingTop: '1rem' }}>
            <div
              className={`alert-banner ${syncFeedback.type === 'error' ? 'alert-error' : 'alert-success'}`}
              style={{ marginBottom: 0 }}
            >
              <span>{syncFeedback.message}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px' }}
                onClick={() => setSyncFeedback(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Workspace Routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/requirements" element={<Requirements />} />
              <Route path="/tests" element={<TestCases />} />
              <Route path="/repository" element={<Repository />} />
              <Route path="/mappings" element={<Mappings />} />
              <Route path="/commits" element={<CommitsImpact />} />
              <Route path="/bugs" element={<Bugs />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
