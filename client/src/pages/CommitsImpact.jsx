// Commits and Impact Analysis - Core Screen (FR-GIT-06, FR-IMP-03 to FR-IMP-08, UI-11, UI-12, UI Spec 3.8 & 4)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  GitCommit,
  AlertTriangle,
  PlayCircle,
  FileCode,
  CheckCircle,
  Percent,
  RefreshCw,
  Search
} from 'lucide-react';

export default function CommitsImpact() {
  const { activeProject, userRole, isSyncing, triggerSync } = useProject();

  const [commits, setCommits] = useState([]);
  const [selectedCommitSha, setSelectedCommitSha] = useState(null);
  const [impactData, setImpactData] = useState(null);
  const [loadingCommits, setLoadingCommits] = useState(true);
  const [loadingImpact, setLoadingImpact] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // Record Result Modal State for in-place test execution
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeTestForRun, setActiveTestForRun] = useState(null);
  const [runStatus, setRunStatus] = useState('Passed');
  const [runNotes, setRunNotes] = useState('');

  const fetchCommits = async (defaultSelectSha = null) => {
    if (!activeProject) return;
    try {
      setLoadingCommits(true);
      const params = {};
      if (search) params.search = search;
      if (branchFilter) params.branch = branchFilter;

      const res = await api.get(`/projects/${activeProject._id}/commits`, { params });
      setCommits(res.data);

      if (res.data.length > 0) {
        const shaToSelect = defaultSelectSha || selectedCommitSha || res.data[0].sha;
        setSelectedCommitSha(shaToSelect);
      } else {
        setSelectedCommitSha(null);
        setImpactData(null);
      }
    } catch (err) {
      console.error('[Commits Error]', err);
    } finally {
      setLoadingCommits(false);
    }
  };

  useEffect(() => {
    fetchCommits();
  }, [activeProject, branchFilter]);

  // When selectedCommitSha changes, load its impact details
  useEffect(() => {
    async function loadImpact() {
      if (!selectedCommitSha || !activeProject) return;
      try {
        setLoadingImpact(true);
        const res = await api.get(`/commits/${selectedCommitSha}/impact`, {
          params: { projectId: activeProject._id }
        });
        setImpactData(res.data);
      } catch (err) {
        console.error('[Impact Error]', err);
      } finally {
        setLoadingImpact(false);
      }
    }
    loadImpact();
  }, [selectedCommitSha, activeProject]);

  const handleManualSync = async () => {
    await triggerSync();
    fetchCommits();
  };

  const openRecordModal = (test) => {
    setActiveTestForRun(test);
    setRunStatus('Passed');
    setRunNotes('');
    setIsRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!activeTestForRun) return;

    try {
      await api.post(`/tests/${activeTestForRun._id}/runs`, {
        status: runStatus,
        notes: runNotes
      });
      setIsRecordModalOpen(false);
      // Reload impact for current commit
      const res = await api.get(`/commits/${selectedCommitSha}/impact`, {
        params: { projectId: activeProject._id }
      });
      setImpactData(res.data);
    } catch (err) {
      alert(err.response?.data?.details?.[0] || 'Failed to record test result');
    }
  };

  const selectedCommit = commits.find((c) => c.sha === selectedCommitSha);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Change Impact Engine
          </span>
          <h1 className="serif-heading">Commits & Impact Analysis</h1>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleManualSync}
          disabled={isSyncing}
          data-testid="sync-commits-btn"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Syncing...' : 'Sync New Commits'}</span>
        </button>
      </div>

      {loadingCommits ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading commits...
        </div>
      ) : commits.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            No commits ingested yet for this project.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleManualSync}
            disabled={isSyncing}
          >
            Run Git Sync Now
          </button>
        </div>
      ) : (
        /* Core Two-Pane Impact Screen Layout (UI Spec Section 4 Wireframe) */
        <div className="impact-split-container">
          {/* Left Pane: Commit List */}
          <div className="commit-list-pane">
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Commits ({commits.length})
              </span>
            </div>

            <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
              {commits.map((c) => {
                const isSelected = c.sha === selectedCommitSha;
                return (
                  <div
                    key={c.sha}
                    className={`commit-card-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCommitSha(c.sha)}
                    data-testid={`commit-item-${c.sha.slice(0, 7)}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                        {c.sha.slice(0, 7)}
                      </span>
                      <span
                        className="brand-badge"
                        style={{
                          background: c.impactedCount > 0 ? '#E0F2FE' : '#F1F5F9',
                          color: c.impactedCount > 0 ? '#0284C7' : '#64748B'
                        }}
                        data-testid={`impact-badge-${c.sha.slice(0, 7)}`}
                        title={`${c.impactedCount} impacted requirements`}
                      >
                        [{c.impactedCount}]
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.35rem', lineHeight: '1.3' }}>
                      {c.message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>{c.author}</span>
                      <span>{new Date(c.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Selected Commit Impact Details (4 Blocks) */}
          <div className="impact-detail-pane">
            {selectedCommit && (
              <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Commit {selectedCommit.sha.slice(0, 7)} on {selectedCommit.branch}
                    </span>
                    <h2 className="serif-heading" style={{ fontSize: '1.35rem', marginTop: '0.2rem' }}>
                      {selectedCommit.message}
                    </h2>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    By <strong>{selectedCommit.author}</strong> on {new Date(selectedCommit.date).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {loadingImpact ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Analyzing commit impact...
              </div>
            ) : impactData ? (
              <div>
                {/* 4. Summary Reduction Strip (UI Spec 3.8 #4, FR-IMP-07, UT-07) */}
                <div className="reduction-summary-strip" data-testid="commit-reduction-summary">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Percent size={18} />
                    <span>
                      {impactData.recommendedTestIds.length} of {impactData.totalTests} tests recommended,{' '}
                      <strong>{impactData.reductionPct}% test suite reduction</strong>
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', background: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                    Calculated by Impact Engine
                  </span>
                </div>

                {/* 1. Changed Files Block (UI Spec 3.8 #1, FR-IMP-06, UI-12) */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <span className="form-label" style={{ fontSize: '0.9rem' }}>
                    Changed Files ({selectedCommit?.files?.length || 0})
                  </span>
                  <div
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      overflow: 'hidden'
                    }}
                    data-testid="commit-files"
                  >
                    {selectedCommit?.files && selectedCommit.files.length > 0 ? (
                      selectedCommit.files.map((f, i) => {
                        const isUnmapped = impactData.unmappedFiles.includes(f.path);
                        return (
                          <div
                            key={i}
                            style={{
                              padding: '0.65rem 1rem',
                              borderBottom: i < selectedCommit.files.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace' }}>
                              <FileCode size={15} color="var(--text-muted)" />
                              <span>{f.path}</span>
                            </div>

                            {/* Unmapped file indicator (FR-IMP-06, UI-12) */}
                            {isUnmapped ? (
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  color: '#B45309',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: '#FEF3C7',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)'
                                }}
                                data-testid={`unmapped-${f.path}`}
                              >
                                <AlertTriangle size={13} />
                                <span>(unmapped)</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                                Mapped
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No changed files recorded for this commit.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Impacted Requirements Block with Reason Chips (UI Spec 3.8 #2, FR-IMP-05) */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <span className="form-label" style={{ fontSize: '0.9rem' }}>
                    Impacted Requirements ({impactData.impacted.length})
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                    data-testid="commit-impacted-reqs"
                  >
                    {impactData.impactedDetails && impactData.impactedDetails.length > 0 ? (
                      impactData.impactedDetails.map((imp) => (
                        <div
                          key={imp.requirementId}
                          style={{
                            padding: '0.75rem 1rem',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-surface)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', marginRight: '0.5rem' }}>
                              {imp.requirementId}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                              {imp.title || ''}
                            </span>
                          </div>

                          {/* Reason Chips: Pattern or Tag (FR-IMP-05) */}
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {imp.reasons.map((reason) => (
                              <span
                                key={reason}
                                className="brand-badge"
                                style={{
                                  background: reason === 'pattern' ? '#E0E7FF' : '#FEF3C7',
                                  color: reason === 'pattern' ? '#3730A3' : '#92400E'
                                }}
                              >
                                {reason === 'pattern' ? 'Pattern Rule' : '@req Tag'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '0.85rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No requirements matched. Add mappings in the Mappings tab to improve results.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Recommended Tests Block with Quick Run Action (UI Spec 3.8 #3, FR-IMP-04, FR-IMP-08) */}
                <div>
                  <span className="form-label" style={{ fontSize: '0.9rem' }}>
                    Recommended Tests ({impactData.recommendedTestDetails?.length || 0})
                  </span>
                  <div
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden'
                    }}
                    data-testid="commit-recommended-tests"
                  >
                    {impactData.recommendedTestDetails && impactData.recommendedTestDetails.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Test ID</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Flag</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {impactData.recommendedTestDetails.map((t) => (
                            <tr key={t._id}>
                              <td style={{ fontWeight: 600 }}>{t.testId}</td>
                              <td>{t.title}</td>
                              <td><Badge status={t.status} /></td>
                              <td>
                                {t.needsRerun ? (
                                  <Badge status="needs-rerun" label="Needs Re-run" />
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified</span>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openRecordModal(t)}
                                  data-testid={`run-recommended-${t.testId}`}
                                >
                                  <PlayCircle size={14} />
                                  <span>Record Result</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        No tests recommended for this commit.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Select a commit to view impact analysis.</p>
            )}
          </div>
        </div>
      )}

      {/* Record Result Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={`Record Execution: ${activeTestForRun?.testId}`}
      >
        <form onSubmit={handleRecordSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="impact-run-status">Result</label>
            <select
              id="impact-run-status"
              className="form-select"
              value={runStatus}
              onChange={(e) => setRunStatus(e.target.value)}
            >
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
              <option value="Blocked">Blocked</option>
              <option value="Not Run">Not Run</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="impact-run-notes">Notes</label>
            <textarea
              id="impact-run-notes"
              rows={2}
              className="form-textarea"
              placeholder="Result notes..."
              value={runNotes}
              onChange={(e) => setRunNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Result
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
