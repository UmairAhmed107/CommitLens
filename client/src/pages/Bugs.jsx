// Defect & Bug Management Page (FR-BUG-01 to FR-BUG-05, UI-13, UI Spec 3.9)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import { useSearchParams } from 'react-router-dom';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Plus, Search, Bug as BugIcon, CheckCircle2, User, AlertCircle } from 'lucide-react';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed'];

export default function Bugs() {
  const { activeProject, userRole } = useProject();
  const [searchParams] = useSearchParams();

  const [bugs, setBugs] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'Medium',
    priority: 'P2',
    testId: '',
    assignedTo: ''
  });
  const [formError, setFormError] = useState('');

  // Handle pre-filled creation from failed test (UI-13)
  useEffect(() => {
    const fromTest = searchParams.get('createFrom');
    if (fromTest) {
      setFormData({
        title: `Failure reported from test ${fromTest}`,
        description: `Automated test execution for ${fromTest} resulted in failure.`,
        severity: 'High',
        priority: 'P1',
        testId: fromTest,
        assignedTo: ''
      });
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const fetchBugsAndMembers = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;

      const [bugsRes, projectRes] = await Promise.all([
        api.get(`/projects/${activeProject._id}/bugs`, { params }),
        api.get(`/projects/${activeProject._id}`)
      ]);

      setBugs(bugsRes.data);
      setMembers(projectRes.data.members || []);
    } catch (err) {
      console.error('[Bugs Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugsAndMembers();
  }, [activeProject, statusFilter, severityFilter]);

  const handleCreateBug = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Bug title is required');
      return;
    }

    try {
      await api.post(`/projects/${activeProject._id}/bugs`, formData);
      setIsModalOpen(false);
      fetchBugsAndMembers();
    } catch (err) {
      setFormError(err.response?.data?.details?.[0] || err.message || 'Failed to create bug');
    }
  };

  const handleStatusChange = async (bugId, newStatus) => {
    try {
      await api.put(`/bugs/${bugId}`, { status: newStatus });
      fetchBugsAndMembers();
    } catch (err) {
      alert(err.response?.data?.details?.[0] || 'Failed to update status');
    }
  };

  const handleAssigneeChange = async (bugId, newAssigneeId) => {
    try {
      await api.put(`/bugs/${bugId}`, { assignedTo: newAssigneeId });
      fetchBugsAndMembers();
    } catch (err) {
      alert(err.response?.data?.details?.[0] || 'Failed to update assignee');
    }
  };

  const canCreate = userRole === 'QA' || userRole === 'PM';
  const canUpdate = userRole === 'QA' || userRole === 'DEV' || userRole === 'PM';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Defect Tracking
          </span>
          <h1 className="serif-heading">Bug Reports</h1>
        </div>

        {canCreate && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="bug-add-btn"
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                severity: 'Medium',
                priority: 'P2',
                testId: '',
                assignedTo: ''
              });
              setFormError('');
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Report Bug</span>
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
              placeholder="Search bugs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchBugsAndMembers()}
              data-testid="bug-search"
            />
          </div>

          <div className="table-filters">
            {/* Status Filter */}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              data-testid="bug-filter-status"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              className="filter-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              data-testid="bug-filter-severity"
            >
              <option value="">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Table View (UI Spec 3.9) */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading defects...
          </div>
        ) : bugs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No bug reports found.
          </div>
        ) : (
          <table data-testid="bugs-table">
            <thead>
              <tr>
                <th>Bug ID</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Source Test</th>
                <th>Reported By</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((b) => (
                <tr key={b._id} data-testid={`bug-row-${b.bugId}`}>
                  <td style={{ fontWeight: 600 }}>{b.bugId}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.title}</div>
                    {b.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {b.description.slice(0, 80)}...
                      </div>
                    )}
                  </td>
                  <td><Badge status={b.severity} /></td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{b.priority}</span>
                  </td>
                  <td>
                    {canUpdate ? (
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                        value={b.status}
                        onChange={(e) => handleStatusChange(b._id, e.target.value)}
                        data-testid={`bug-status-select-${b.bugId}`}
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge status={b.status} />
                    )}
                  </td>
                  <td>
                    {canUpdate ? (
                      <select
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                        value={b.assignedTo ? b.assignedTo._id : ''}
                        onChange={(e) => handleAssigneeChange(b._id, e.target.value)}
                        data-testid={`bug-assignee-select-${b.bugId}`}
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.userId._id} value={m.userId._id}>
                            {m.userId.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.85rem' }}>
                        {b.assignedTo ? b.assignedTo.name : 'Unassigned'}
                      </span>
                    )}
                  </td>
                  <td>
                    {b.testId ? (
                      <span className="brand-badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                        {b.testId}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Direct</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {b.reportedBy ? b.reportedBy.name : 'QA'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Bug Modal (FR-BUG-01, FR-BUG-03, UI-13) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Report New Bug"
      >
        {formError && (
          <div className="alert-banner alert-error">
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateBug}>
          <div className="form-group">
            <label className="form-label" htmlFor="bug-title">Bug Title</label>
            <input
              id="bug-title"
              type="text"
              className="form-input"
              data-testid="bug-title"
              placeholder="e.g. Session token does not invalidate on logout"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bug-desc">Description & Steps to Reproduce</label>
            <textarea
              id="bug-desc"
              rows={3}
              className="form-textarea"
              data-testid="bug-desc"
              placeholder="Steps, observed result, expected result..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-severity">Severity</label>
              <select
                id="bug-severity"
                className="form-select"
                data-testid="bug-severity"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bug-priority">Priority</label>
              <select
                id="bug-priority"
                className="form-select"
                data-testid="bug-priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="P1">P1 (Immediate)</option>
                <option value="P2">P2 (Normal)</option>
                <option value="P3">P3 (Low)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-assignee">Assign to Developer</label>
              <select
                id="bug-assignee"
                className="form-select"
                data-testid="bug-assignee"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              >
                <option value="">Select Developer</option>
                {members.map((m) => (
                  <option key={m.userId._id} value={m.userId._id}>
                    {m.userId.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bug-testid">Linked Test ID (Optional)</label>
              <input
                id="bug-testid"
                type="text"
                className="form-input"
                placeholder="e.g. TC-02"
                value={formData.testId}
                onChange={(e) => setFormData({ ...formData, testId: e.target.value })}
              />
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
              data-testid="bug-submit"
            >
              Report Bug
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
