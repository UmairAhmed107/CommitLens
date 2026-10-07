// Reports Generation and Export Page (FR-RPT-01 to FR-RPT-04, UI-15, UI Spec 3.10)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import Badge from '../components/Badge';
import { FileText, Download, CheckCircle, BarChart2, Table } from 'lucide-react';

export default function Reports() {
  const { activeProject } = useProject();

  const [activeReportType, setActiveReportType] = useState('rtm'); // 'rtm', 'execution', 'coverage'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (type) => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const res = await api.get(`/projects/${activeProject._id}/reports/${type}`);
      setReportData(res.data);
    } catch (err) {
      console.error('[Reports Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeReportType);
  }, [activeProject, activeReportType]);

  const handleExport = (format) => {
    if (!activeProject) return;
    // Direct browser download via server export endpoint
    const url = `/api/projects/${activeProject._id}/reports/${activeReportType}/export?format=${format}`;
    window.open(url, '_blank');
  };

  const reportCards = [
    {
      id: 'rtm',
      title: 'Requirement Traceability Matrix',
      description: 'End-to-end audit mapping requirements to linked tests and execution states.',
      testId: 'report-card-rtm'
    },
    {
      id: 'execution',
      title: 'Test Execution Summary',
      description: 'Breakdown of tests by execution status (Passed, Failed, Blocked) and failed defects.',
      testId: 'report-card-execution'
    },
    {
      id: 'coverage',
      title: 'Requirement Coverage Report',
      description: 'Audit of covered versus uncovered requirements with test suite ratio metrics.',
      testId: 'report-card-coverage'
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
          Compliance & Auditing
        </span>
        <h1 className="serif-heading">Project Reports & Export</h1>
      </div>

      {/* 3 Report Selector Cards (UI Spec 3.10) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {reportCards.map((rc) => {
          const isSelected = rc.id === activeReportType;
          return (
            <div
              key={rc.id}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--primary)' : 'var(--border-light)',
                backgroundColor: isSelected ? 'var(--bg-card)' : 'var(--bg-surface)',
                borderWidth: isSelected ? '2px' : '1px'
              }}
              onClick={() => setActiveReportType(rc.id)}
              data-testid={rc.testId}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Table size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{rc.title}</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {rc.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Report Preview & Export Actions */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="serif-heading" style={{ fontSize: '1.25rem' }}>
              {reportData ? reportData.title : 'Report Preview'}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Project: {activeProject?.name} | Generated on {new Date().toLocaleDateString()}
            </span>
          </div>

          {/* Export PDF & Excel Buttons (FR-RPT-04, UI-15) */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport('pdf')}
              data-testid="export-pdf-btn"
            >
              <Download size={15} />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport('xlsx')}
              data-testid="export-excel-btn"
            >
              <Download size={15} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Generating report preview...
          </div>
        ) : !reportData ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No report data available.
          </div>
        ) : (
          <div>
            {/* Preview: Requirement Traceability Matrix (RTM) */}
            {activeReportType === 'rtm' && (
              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table data-testid="rtm-table">
                  <thead>
                    <tr>
                      <th>Req ID</th>
                      <th>Requirement Title</th>
                      <th>Priority</th>
                      <th>Req Status</th>
                      <th>Linked Test</th>
                      <th>Test Status</th>
                      <th>Impact Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{row.reqId}</td>
                        <td>{row.reqTitle}</td>
                        <td><Badge status={row.reqPriority} /></td>
                        <td><Badge status={row.reqStatus} /></td>
                        <td style={{ fontWeight: 500 }}>
                          {row.testId !== 'None' ? `${row.testId}: ${row.testTitle}` : <span style={{ color: '#DC2626' }}>No test linked</span>}
                        </td>
                        <td>
                          {row.testId !== 'None' ? (
                            <Badge status={row.testStatus} />
                          ) : (
                            <Badge status="uncovered" label="Uncovered" />
                          )}
                        </td>
                        <td>
                          {row.needsRerun ? (
                            <Badge status="needs-rerun" label="Needs Re-run" />
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clean</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Preview: Test Execution Report */}
            {activeReportType === 'execution' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: '#ECFDF5', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: 600 }}>PASSED</span>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: '#065F46' }}>
                      {reportData.statusCounts.Passed}
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: '#FEF2F2', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 600 }}>FAILED</span>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: '#991B1B' }}>
                      {reportData.statusCounts.Failed}
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: '#FFFBEB', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: 600 }}>BLOCKED</span>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: '#92400E' }}>
                      {reportData.statusCounts.Blocked}
                    </p>
                  </div>
                  <div style={{ padding: '1rem', background: '#F3F4F6', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '0.8rem', color: '#4B5563', fontWeight: 600 }}>NOT RUN</span>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 700, color: '#4B5563' }}>
                      {reportData.statusCounts['Not Run']}
                    </p>
                  </div>
                </div>

                <h3 className="serif-heading" style={{ marginBottom: '0.75rem' }}>Failed Test Cases ({reportData.failedTests.length})</h3>
                {reportData.failedTests.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No test failures currently reported.</p>
                ) : (
                  <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Test ID</th>
                          <th>Title</th>
                          <th>Priority</th>
                          <th>Requirements</th>
                          <th>Last Run</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.failedTests.map((f) => (
                          <tr key={f.testId}>
                            <td style={{ fontWeight: 600 }}>{f.testId}</td>
                            <td>{f.title}</td>
                            <td><Badge status={f.priority} /></td>
                            <td>{f.requirementIds.join(', ')}</td>
                            <td>{f.lastRunAt ? new Date(f.lastRunAt).toLocaleString() : 'Never'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Preview: Requirement Coverage Report */}
            {activeReportType === 'coverage' && (
              <div>
                <div style={{ padding: '1.25rem', background: 'var(--accent-mint)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#164E63', fontWeight: 600 }}>COVERAGE RATIO</span>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.85rem', fontWeight: 700, color: '#164E63' }}>
                      {reportData.coveragePercentage}%
                    </p>
                  </div>
                  <span style={{ fontSize: '0.9rem', color: '#164E63' }}>
                    {reportData.coveredCount} of {reportData.totalRequirements} requirements covered
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <h3 className="serif-heading" style={{ marginBottom: '0.75rem', color: '#065F46' }}>
                      Covered Requirements ({reportData.covered.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {reportData.covered.map((c) => (
                        <div key={c.reqId} style={{ padding: '0.75rem', background: '#ECFDF5', borderRadius: 'var(--radius-md)', border: '1px solid #A7F3D0' }}>
                          <span style={{ fontWeight: 600 }}>{c.reqId}</span> - {c.title}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="serif-heading" style={{ marginBottom: '0.75rem', color: '#991B1B' }}>
                      Uncovered Requirements ({reportData.uncovered.length})
                    </h3>
                    {reportData.uncovered.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>Zero coverage gaps detected!</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {reportData.uncovered.map((u) => (
                          <div key={u.reqId} style={{ padding: '0.75rem', background: '#FEF2F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECACA' }}>
                            <span style={{ fontWeight: 600 }}>{u.reqId}</span> - {u.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
