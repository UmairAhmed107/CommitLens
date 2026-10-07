// Dashboard Page with Role-Based Views (FR-DSH-01 to FR-DSH-04, UI-14, UI Spec 3.3)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import { Link } from 'react-router-dom';
import Badge from '../components/Badge';
import {
  FileText,
  ShieldCheck,
  Percent,
  Bug as BugIcon,
  GitCommit,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export default function Dashboard() {
  const { activeProject, userRole, isSyncing, triggerSync } = useProject();

  // Active view: defaults to user's project role (or 'PM'/'project' if PM)
  const [activeView, setActiveView] = useState(() => {
    if (userRole === 'PM') return 'project';
    if (userRole === 'DEV') return 'dev';
    if (userRole === 'QA') return 'qa';
    if (userRole === 'TL') return 'lead';
    return 'project';
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Update view when user role changes
  useEffect(() => {
    if (userRole === 'PM') setActiveView('project');
    else if (userRole === 'DEV') setActiveView('dev');
    else if (userRole === 'QA') setActiveView('qa');
    else if (userRole === 'TL') setActiveView('lead');
  }, [userRole]);

  useEffect(() => {
    async function loadDashboard() {
      if (!activeProject) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/projects/${activeProject._id}/dashboard/${activeView}`);
        setData(res.data);
      } catch (err) {
        console.error('[Dashboard Error]', err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [activeProject, activeView]);

  if (!activeProject) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>No project selected. Please create or choose a project.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header and View Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Overview
          </span>
          <h1 className="serif-heading">{activeProject.name} Dashboard</h1>
        </div>

        {/* View Switcher Tabs allowing review of all 4 role perspectives */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeView === 'project' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveView('project')}
            data-testid="dashboard-view-pm"
          >
            PM View
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeView === 'dev' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveView('dev')}
            data-testid="dashboard-view-dev"
          >
            DEV View
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeView === 'qa' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveView('qa')}
            data-testid="dashboard-view-qa"
          >
            QA View
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeView === 'lead' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveView('lead')}
            data-testid="dashboard-view-tl"
          >
            Lead View
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading dashboard metrics...
        </div>
      ) : error ? (
        <div className="alert-banner alert-error">{error}</div>
      ) : (
        <>
          {/* =========================================================================
              PM DASHBOARD VIEW (FR-DSH-01, UI-14)
              ========================================================================= */}
          {activeView === 'project' && data && (
            <div>
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Total Requirements</span>
                  <span className="metric-value" data-testid="total-reqs-count">
                    {data.totalRequirements}
                  </span>
                  <span className="metric-sub">Defined project scope</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Covered Requirements</span>
                  <span className="metric-value" data-testid="covered-reqs-count">
                    {data.coveredRequirements}
                  </span>
                  <span className="metric-sub">With linked test cases</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Requirement Coverage</span>
                  <span className="metric-value" data-testid="coverage-pct">
                    {data.coveragePercentage}%
                  </span>
                  <span className="metric-sub">Target: ≥ 90%</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Open Bugs</span>
                  <span className="metric-value" data-testid="open-bugs-count">
                    {data.openBugs}
                  </span>
                  <span className="metric-sub">Active defect backlog</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Commit Count</span>
                  <span className="metric-value" data-testid="commits-count">
                    {data.commitCount}
                  </span>
                  <span className="metric-sub">Ingested Git history</span>
                </div>
              </div>

              {/* Requirement Status Distribution */}
              <div className="card">
                <div className="card-header">
                  <h3 className="serif-heading">Requirement Status Breakdown</h3>
                  <Link to="/requirements" className="btn btn-secondary btn-sm">
                    Manage Requirements
                  </Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {data.requirementStatusBreakdown && data.requirementStatusBreakdown.length > 0 ? (
                    data.requirementStatusBreakdown.map((item) => (
                      <div key={item.status} style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textTransform: 'capitalize' }}>
                          {item.status}
                        </span>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700 }}>
                          {item.count}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>No requirements created yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              DEV DASHBOARD VIEW (FR-DSH-02)
              ========================================================================= */}
          {activeView === 'dev' && data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="serif-heading">Recent Commits & Impact</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Ingested code changes and impacted requirements
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={triggerSync}
                    disabled={isSyncing}
                    data-testid="dev-sync-btn"
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Git'}</span>
                  </button>
                </div>

                {data.recentCommits && data.recentCommits.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {data.recentCommits.map((c) => (
                      <div
                        key={c.sha}
                        style={{
                          padding: '1rem',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                            {c.sha.slice(0, 7)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(c.date).toLocaleDateString()} by {c.author}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: 500 }}>
                          {c.message}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Impacted Reqs:</span>
                          {c.impactedRequirements && c.impactedRequirements.length > 0 ? (
                            c.impactedRequirements.map((imp) => (
                              <span
                                key={imp.requirementId}
                                className="brand-badge"
                                style={{ background: '#E0F2FE', color: '#0369A1' }}
                              >
                                {imp.requirementId} ({imp.reasons.join(', ')})
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None matched</span>
                          )}
                          <Link
                            to="/commits"
                            style={{ marginLeft: 'auto', fontSize: '0.8rem', textDecoration: 'underline', fontWeight: 500 }}
                          >
                            View Impact ({c.recommendedTestsCount} tests)
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>No commits found. Run a sync to fetch repository commits.</p>
                )}
              </div>

              {/* Bugs Assigned to DEV */}
              <div className="card">
                <div className="card-header">
                  <h3 className="serif-heading">My Assigned Bugs</h3>
                  <span className="badge badge-blocked">{data.totalAssignedBugs}</span>
                </div>
                {data.assignedBugs && data.assignedBugs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.assignedBugs.map((b) => (
                      <div
                        key={b._id}
                        style={{
                          padding: '0.85rem',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{b.bugId}</span>
                          <Badge status={b.status} />
                        </div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{b.title}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Severity: {b.severity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No open bugs assigned to you.</p>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              QA DASHBOARD VIEW (FR-DSH-03)
              ========================================================================= */}
          {activeView === 'qa' && data && (
            <div>
              <div className="metrics-grid">
                <div className="metric-card" style={{ borderLeft: '4px solid #2563EB' }}>
                  <span className="metric-label">Needs Re-run</span>
                  <span className="metric-value" style={{ color: '#2563EB' }} data-testid="qa-needs-rerun-count">
                    {data.needsRerunCount}
                  </span>
                  <span className="metric-sub">Tests impacted by latest code changes</span>
                </div>

                <div className="metric-card" style={{ borderLeft: '4px solid #DC2626' }}>
                  <span className="metric-label">Failed Tests</span>
                  <span className="metric-value" style={{ color: '#DC2626' }} data-testid="qa-failed-count">
                    {data.failedCount}
                  </span>
                  <span className="metric-sub">Blocking test executions</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Requirement Coverage</span>
                  <span className="metric-value">
                    {data.coveragePercentage}%
                  </span>
                  <span className="metric-sub">{data.coveredRequirements} of {data.totalRequirements} covered</span>
                </div>
              </div>

              {/* Tests marked Needs Re-run list with quick action */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <div>
                    <h3 className="serif-heading">Tests Marked "Needs Re-run"</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Re-run recommended test cases to clear impacted flags
                    </p>
                  </div>
                  <Link to="/tests?needsRerun=true" className="btn btn-secondary btn-sm">
                    Open in Test Cases
                  </Link>
                </div>

                {data.needsRerunTests && data.needsRerunTests.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Test ID</th>
                          <th>Title</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.needsRerunTests.map((t) => (
                          <tr key={t._id}>
                            <td style={{ fontWeight: 600 }}>{t.testId}</td>
                            <td>{t.title}</td>
                            <td><Badge status={t.priority} /></td>
                            <td><Badge status="needs-rerun" label="Needs Re-run" /></td>
                            <td>
                              <Link to="/tests" className="btn btn-secondary btn-sm" data-testid={`rerun-${t.testId}`}>
                                <PlayCircle size={14} />
                                Record Result
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>All tests are up-to-date. No tests need re-running.</p>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              TEAM LEAD DASHBOARD VIEW (FR-DSH-04)
              ========================================================================= */}
          {activeView === 'lead' && data && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* Test Pass/Fail Summary */}
              <div className="card">
                <div className="card-header">
                  <h3 className="serif-heading">Test Execution Summary</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1.25rem', background: '#ECFDF5', borderRadius: 'var(--radius-md)', border: '1px solid #A7F3D0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065F46', marginBottom: '0.35rem' }}>
                      <CheckCircle2 size={18} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Passed</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: '#065F46' }}>
                      {data.testSummary.Passed}
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', background: '#FEF2F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECACA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991B1B', marginBottom: '0.35rem' }}>
                      <XCircle size={18} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Failed</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: '#991B1B' }}>
                      {data.testSummary.Failed}
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', background: '#FFFBEB', borderRadius: 'var(--radius-md)', border: '1px solid #FDE68A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400E', marginBottom: '0.35rem' }}>
                      <AlertTriangle size={18} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Blocked</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: '#92400E' }}>
                      {data.testSummary.Blocked}
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', background: '#F3F4F6', borderRadius: 'var(--radius-md)', border: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4B5563', marginBottom: '0.35rem' }}>
                      <HelpCircle size={18} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Not Run</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, color: '#4B5563' }}>
                      {data.testSummary['Not Run']}
                    </span>
                  </div>
                </div>
              </div>

              {/* Open Bugs by Severity */}
              <div className="card">
                <div className="card-header">
                  <h3 className="serif-heading">Open Bugs by Severity</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontWeight: 600, color: '#991B1B' }}>Critical</span>
                    <span style={{ fontWeight: 700 }}>{data.bugsBySeverity.Critical}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontWeight: 600, color: '#B91C1C' }}>High</span>
                    <span style={{ fontWeight: 700 }}>{data.bugsBySeverity.High}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontWeight: 600, color: '#D97706' }}>Medium</span>
                    <span style={{ fontWeight: 700 }}>{data.bugsBySeverity.Medium}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontWeight: 600, color: '#4B5563' }}>Low</span>
                    <span style={{ fontWeight: 700 }}>{data.bugsBySeverity.Low}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
