// Test Cases Management Page (FR-TST-01 to FR-TST-05, UI-07, UI-08, UI Spec 3.5)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Plus, Search, PlayCircle, Bug, Trash2, CheckCircle2, History, Edit } from 'lucide-react';

export default function TestCases() {
  const { activeProject, userRole } = useProject();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [requirementsList, setRequirementsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const needsRerunParam = searchParams.get('needsRerun');
  const [needsRerunFilter, setNeedsRerunFilter] = useState(needsRerunParam === 'true');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    steps: [''],
    expectedResult: '',
    priority: 'Medium',
    requirementIds: []
  });
  const [formError, setFormError] = useState('');

  // Record Result Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [activeTestForRun, setActiveTestForRun] = useState(null);
  const [runStatus, setRunStatus] = useState('Passed');
  const [runNotes, setRunNotes] = useState('');
  const [recordError, setRecordError] = useState('');

  // Execution History Modal State (FR-TST-04)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeTestForHistory, setActiveTestForHistory] = useState(null);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchTests = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;
      if (needsRerunFilter) params.needsRerun = true;

      const [testsRes, reqsRes] = await Promise.all([
        api.get(`/projects/${activeProject._id}/tests`, { params }),
        api.get(`/projects/${activeProject._id}/requirements`)
      ]);

      setTests(testsRes.data);
      setRequirementsList(reqsRes.data);
    } catch (err) {
      console.error('[TestCases Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTests();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeProject, priorityFilter, statusFilter, needsRerunFilter, search]);

  // Steps handling in form
  const addStep = () => {
    setFormData({ ...formData, steps: [...formData.steps, ''] });
  };

  const removeStep = (index) => {
    const updated = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: updated.length > 0 ? updated : [''] });
  };

  const handleStepChange = (index, value) => {
    const updated = [...formData.steps];
    updated[index] = value;
    setFormData({ ...formData, steps: updated });
  };

  const handleReqToggle = (reqId) => {
    const current = new Set(formData.requirementIds);
    if (current.has(reqId)) {
      current.delete(reqId);
    } else {
      current.add(reqId);
    }
    setFormData({ ...formData, requirementIds: Array.from(current) });
  };

  const openCreateModal = () => {
    setEditingTest(null);
    setFormData({
      title: '',
      steps: [''],
      expectedResult: '',
      priority: 'Medium',
      requirementIds: []
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (test) => {
    setEditingTest(test);
    setFormData({
      title: test.title,
      steps: test.steps?.length > 0 ? test.steps : [''],
      expectedResult: test.expectedResult || '',
      priority: test.priority || 'Medium',
      requirementIds: test.requirementIds || []
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Test case title is required');
      return;
    }

    try {
      if (editingTest) {
        await api.put(`/tests/${editingTest._id}`, formData);
      } else {
        await api.post(`/projects/${activeProject._id}/tests`, formData);
      }
      setIsModalOpen(false);
      fetchTests();
    } catch (err) {
      setFormError(err.response?.data?.details?.[0] || err.message || 'Operation failed');
    }
  };

  // Open Record Result Dialog (FR-TST-03, UI-08)
  const openRecordModal = (test) => {
    setActiveTestForRun(test);
    setRunStatus('Passed');
    setRunNotes('');
    setRecordError('');
    setIsRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setRecordError('');

    try {
      await api.post(`/tests/${activeTestForRun._id}/runs`, {
        status: runStatus,
        notes: runNotes
      });
      setIsRecordModalOpen(false);
      fetchTests();
    } catch (err) {
      setRecordError(err.response?.data?.details?.[0] || err.message || 'Failed to record test run');
    }
  };

  // Open Execution History Modal (FR-TST-04)
  const openHistoryModal = async (test) => {
    setActiveTestForHistory(test);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/tests/${test._id}/runs`);
      setHistoryRuns(res.data);
    } catch (err) {
      console.error('[Fetch History Error]', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const canEdit = userRole === 'QA';

  if (!activeProject) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 className="serif-heading">Test Cases</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Please select or create a project from the top bar to view test cases.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Quality Assurance
          </span>
          <h1 className="serif-heading">Test Cases</h1>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="test-add-btn"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            <span>Create Test Case</span>
          </button>
        )}
      </div>

      {/* Table Toolbar */}
      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-search-box">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search test cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTests()}
              data-testid="test-search"
            />
          </div>

          <div className="table-filters">
            {/* Priority Filter */}
            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              data-testid="test-filter-priority"
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="test-filter-status"
            >
              <option value="">All Statuses</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
              <option value="Blocked">Blocked</option>
              <option value="Not Run">Not Run</option>
            </select>

            {/* Needs Re-run toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={needsRerunFilter}
                onChange={(e) => setNeedsRerunFilter(e.target.checked)}
                data-testid="test-filter-needs-rerun"
              />
              <span>Needs Re-run only</span>
            </label>
          </div>
        </div>

        {/* Table View (UI Spec 3.5) */}
        <table data-testid="test-table">
          <thead>
            <tr>
              <th>Test ID</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Linked Requirements</th>
              <th>Status</th>
              <th>Impact Flag</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading test cases...
                </td>
              </tr>
            ) : tests.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No test cases found.
                </td>
              </tr>
            ) : (
              tests.map((t) => (
                <tr key={t._id} data-testid={`test-row-${t.testId}`}>
                  <td style={{ fontWeight: 600 }}>{t.testId}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    {t.expectedResult && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Expected: {t.expectedResult}
                      </div>
                    )}
                  </td>
                  <td><Badge status={t.priority} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {t.requirementIds && t.requirementIds.length > 0 ? (
                        t.requirementIds.map((rid) => (
                          <span
                            key={rid}
                            className="brand-badge"
                            style={{ background: '#F1F5F9', color: '#334155' }}
                            data-testid={`link-${rid}`}
                          >
                            {rid}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge status={t.status} data-testid={`status-${t.testId}`} />
                  </td>
                  <td>
                    {t.needsRerun ? (
                      <Badge status="needs-rerun" label="Needs Re-run" />
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Clean</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openRecordModal(t)}
                          data-testid={`record-${t.testId}`}
                          title="Record Execution Result"
                        >
                          <PlayCircle size={14} />
                          <span>Run</span>
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(t)}
                          data-testid={`edit-${t.testId}`}
                          title="Edit Test Case"
                        >
                          <Edit size={14} />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openHistoryModal(t)}
                        data-testid={`history-btn-${t.testId}`}
                        title="View Execution History"
                      >
                        <History size={14} />
                        <span>History</span>
                      </button>

                      {/* If test failed, show Create Bug button (FR-BUG-01, UI-13) */}
                      {t.status === 'Failed' && canEdit && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => navigate(`/bugs?createFrom=${t.testId}`)}
                          data-testid={`create-bug-btn-${t.testId}`}
                          id={`create-bug-btn-${t.testId}`}
                          data-action="create-bug"
                          title="Report bug from this failed test"
                        >
                          <Bug size={14} />
                          <span>Create Bug</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Test Modal (FR-TST-01, FR-TST-02) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTest ? `Edit Test ${editingTest.testId}` : 'New Test Case'}
      >
        {formError && (
          <div className="alert-banner alert-error">
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="test-modal-title">Title</label>
            <input
              id="test-modal-title"
              type="text"
              className="form-input"
              data-testid="test-modal-title"
              name="test-title"
              placeholder="e.g. Verify Login with Invalid Password"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Repeatable Steps */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Test Steps</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addStep}
                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
              >
                + Add Step
              </button>
            </label>
            {formData.steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Step ${idx + 1}`}
                  value={step}
                  onChange={(e) => handleStepChange(idx, e.target.value)}
                  data-testid={`test-step-${idx}`}
                />
                {formData.steps.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => removeStep(idx)}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="test-modal-expected">Expected Result</label>
            <textarea
              id="test-modal-expected"
              rows={2}
              className="form-textarea"
              data-testid="test-modal-expected"
              placeholder="e.g. Error message appears and login is denied"
              value={formData.expectedResult}
              onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="test-modal-priority">Priority</label>
            <select
              id="test-modal-priority"
              className="form-select"
              data-testid="test-modal-priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Linked Requirements Multi-Select (FR-TST-02) */}
          <div className="form-group">
            <label className="form-label">Link to Requirements</label>
            <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.65rem' }}>
              {requirementsList.map((r) => (
                <label
                  key={r.reqId}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <input
                    type="checkbox"
                    checked={formData.requirementIds.includes(r.reqId)}
                    onChange={() => handleReqToggle(r.reqId)}
                    data-testid={`req-checkbox-${r.reqId}`}
                  />
                  <span style={{ fontWeight: 600 }}>{r.reqId}</span>
                  <span style={{ color: 'var(--text-muted)' }}>- {r.title}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              data-testid="test-modal-submit"
              id="test-submit"
            >
              Save Test Case
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Execution Result Modal (FR-TST-03, UI-08) */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={`Record Result: ${activeTestForRun?.testId}`}
      >
        {recordError && (
          <div className="alert-banner alert-error">
            <span>{recordError}</span>
          </div>
        )}

        <form onSubmit={handleRecordSubmit} data-testid="record-result-form">
          <div className="form-group">
            <label className="form-label" htmlFor="record-modal-status">Execution Status</label>
            <select
              id="record-modal-status"
              className="form-select"
              data-testid="run-status"
              name="record-modal-status"
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
            <label className="form-label" htmlFor="record-modal-notes">Notes / Observations</label>
            <textarea
              id="record-modal-notes"
              rows={3}
              className="form-textarea"
              data-testid="run-notes"
              name="record-modal-notes"
              placeholder="e.g. Executed in Chrome v130. Observed response code 200."
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
            {runStatus === 'Failed' && (
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={async (e) => {
                  await handleRecordSubmit(e);
                  navigate(`/bugs?createFrom=${activeTestForRun.testId}`);
                }}
                data-testid="run-save-and-create-bug"
              >
                <Bug size={14} />
                <span>Save & Create Bug</span>
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              data-testid="run-submit"
              id="record-modal-submit"
            >
              Save Result
            </button>
          </div>
        </form>
      </Modal>

      {/* Execution History Modal (FR-TST-04) */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Execution History: ${activeTestForHistory?.testId}`}
      >
        <div data-testid="test-history-modal">
          {loadingHistory ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading history...
            </div>
          ) : historyRuns.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No execution runs recorded yet for this test case.
            </div>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                    <th style={{ padding: '0.5rem' }}>Date</th>
                    <th style={{ padding: '0.5rem' }}>Executed By</th>
                    <th style={{ padding: '0.5rem' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRuns.map((run, i) => (
                    <tr key={run._id || i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <Badge status={run.status} />
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(run.executedAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {run.executedBy?.name || run.executedBy?.email || 'QA User'}
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                        {run.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
