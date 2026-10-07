// Defect & Bug Management Page (FR-BUG-01 to FR-BUG-05, UI-13, UI Spec 3.9)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  Plus,
  Search,
  Bug as BugIcon,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Eye,
  Check,
  AlertTriangle
} from 'lucide-react';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed'];

export default function Bugs() {
  const { activeProject, userRole } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [bugs, setBugs] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (FR-BUG-05, UI Spec 3.9)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Create Bug Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'Medium',
    priority: 'P2',
    testId: '',
    assignedTo: ''
  });
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail View Modal (UI Spec 3.9)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [detailStatus, setDetailStatus] = useState('');
  const [detailAssignee, setDetailAssignee] = useState('');
  const [detailNotes, setDetailNotes] = useState('');
  const [isUpdatingDetail, setIsUpdatingDetail] = useState(false);

  // Handle pre-filled creation from failed test (UI-13, FR-BUG-01)
  useEffect(() => {
    const fromTest = searchParams.get('createFrom');
    if (fromTest && activeProject) {
      // Pre-fill form from failed test case
      setFormData({
        title: `Failure in test ${fromTest}`,
        description: `Automated test execution for ${fromTest} resulted in failure.\nPlease inspect test steps and verify defect root cause.`,
        severity: 'High',
        priority: 'P1',
        testId: fromTest,
        assignedTo: ''
      });
      setIsCreateModalOpen(true);
    }
  }, [searchParams, activeProject]);

  const fetchBugsAndMembers = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (assigneeFilter) params.assignee = assigneeFilter;

      const [bugsRes, projectRes] = await Promise.all([
        api.get(`/projects/${activeProject._id}/bugs`, { params }),
        api.get(`/projects/${activeProject._id}`)
      ]);

      setBugs(bugsRes.data);
      setMembers(projectRes.data.members || []);

      // If detail modal is open, refresh selected bug
      if (selectedBug) {
        const refreshed = bugsRes.data.find((b) => b._id === selectedBug._id);
        if (refreshed) {
          setSelectedBug(refreshed);
          setDetailStatus(refreshed.status);
          setDetailAssignee(refreshed.assignedTo ? refreshed.assignedTo._id : '');
        }
      }
    } catch (err) {
      console.error('[Bugs Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugsAndMembers();
  }, [activeProject, statusFilter, severityFilter, assigneeFilter]);

  const handleCreateBug = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!formData.title.trim()) {
      setCreateError('Bug title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/projects/${activeProject._id}/bugs`, {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignedTo: formData.assignedTo || null
      });

      // Clear search param if created from test
      if (searchParams.get('createFrom')) {
        setSearchParams({});
      }

      setIsCreateModalOpen(false);
      fetchBugsAndMembers();
    } catch (err) {
      setCreateError(err.response?.data?.details?.[0] || err.message || 'Failed to create bug report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (bugId, newStatus, notes = '') => {
    try {
      await api.put(`/bugs/${bugId}`, { status: newStatus, notes });
      fetchBugsAndMembers();
    } catch (err) {
      alert(err.response?.data?.details?.[0] || err.message || 'Failed to update status');
    }
  };

  const handleAssigneeChange = async (bugId, newAssigneeId) => {
    try {
      await api.put(`/bugs/${bugId}`, { assignedTo: newAssigneeId });
      fetchBugsAndMembers();
    } catch (err) {
      alert(err.response?.data?.details?.[0] || err.message || 'Failed to update assignee');
    }
  };

  const openDetailModal = (bug) => {
    setSelectedBug(bug);
    setDetailStatus(bug.status);
    setDetailAssignee(bug.assignedTo ? bug.assignedTo._id : '');
    setDetailNotes('');
    setIsDetailModalOpen(true);
  };

  const handleSaveDetailChanges = async (e) => {
    e.preventDefault();
    if (!selectedBug) return;
    try {
      setIsUpdatingDetail(true);
      await api.put(`/bugs/${selectedBug._id}`, {
        status: detailStatus,
        assignedTo: detailAssignee || null,
        notes: detailNotes
      });
      setIsDetailModalOpen(false);
      fetchBugsAndMembers();
    } catch (err) {
      alert(err.response?.data?.details?.[0] || err.message || 'Failed to update bug');
    } finally {
      setIsUpdatingDetail(false);
    }
  };

  // Next status in flow Open > In Progress > Fixed > Verified > Closed
  const getNextStatus = (currentStatus) => {
    const idx = STATUS_OPTIONS.indexOf(currentStatus);
    if (idx >= 0 && idx < STATUS_OPTIONS.length - 1) {
      return STATUS_OPTIONS[idx + 1];
    }
    return null;
  };

  const canCreate = userRole === 'QA' || userRole === 'PM';
  const canUpdate = userRole === 'QA' || userRole === 'DEV' || userRole === 'PM';

  // Counts by status
  const countOpen = bugs.filter((b) => b.status === 'Open').length;
  const countInProgress = bugs.filter((b) => b.status === 'In Progress').length;
  const countFixed = bugs.filter((b) => b.status === 'Fixed').length;
  const countVerified = bugs.filter((b) => b.status === 'Verified').length;
  const countClosed = bugs.filter((b) => b.status === 'Closed').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Defect Tracking & Lifecycle Management
          </span>
          <h1 className="serif-heading">Bug Reports</h1>
        </div>

        {canCreate && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="bug-add-btn"
            id="report-bug-btn"
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                severity: 'Medium',
                priority: 'P2',
                testId: '',
                assignedTo: ''
              });
              setCreateError('');
              setIsCreateModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Report Bug</span>
          </button>
        )}
      </div>

      {/* Status Lifecycle Overview Bar (FR-BUG-04) */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '1rem',
          background: 'var(--bg-card)'
        }}
      >
        <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>1. Open</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#B91C1C' }}>{countOpen}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Awaiting developer</span>
        </div>
        <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>2. In Progress</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#D97706' }}>{countInProgress}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Under investigation</span>
        </div>
        <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>3. Fixed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563EB' }}>{countFixed}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Code resolved</span>
        </div>
        <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>4. Verified</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{countVerified}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>QA re-tested pass</span>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>5. Closed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4B5563' }}>{countClosed}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completed lifecycle</span>
        </div>
      </div>

      {/* Table Toolbar & Filters (FR-BUG-05, UI Spec 3.9) */}
      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-search-box">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search bugs by ID, title, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchBugsAndMembers()}
              data-testid="bug-search"
            />
          </div>

          <div className="table-filters" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Status Filter (FR-BUG-05) */}
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

            {/* Severity Filter (FR-BUG-05) */}
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

            {/* Assignee Filter (FR-BUG-05, UI Spec 3.9) */}
            <select
              className="filter-select"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              data-testid="bug-filter-assignee"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                  {m.userId?.name || 'Member'} ({m.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bugs Table (UI Spec 3.9) */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading defect reports...
          </div>
        ) : bugs.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <BugIcon size={36} color="var(--border-light)" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
            <p style={{ fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>No bug reports found</p>
            <p style={{ fontSize: '0.85rem' }}>Change search/filters or report a new bug above.</p>
          </div>
        ) : (
          <table data-testid="bugs-table">
            <thead>
              <tr>
                <th>Bug ID</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status Flow</th>
                <th>Assignee</th>
                <th>Source Test</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((b) => {
                const nextSt = getNextStatus(b.status);
                return (
                  <tr key={b._id} data-testid={`bug-row-${b.bugId}`} id={`bug-item-${b.bugId}`}>
                    {/* Bug ID (BUG-n) */}
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      <span className="brand-badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                        {b.bugId}
                      </span>
                    </td>

                    {/* Title & Description preview */}
                    <td style={{ maxWidth: '280px' }}>
                      <div
                        style={{ fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}
                        onClick={() => openDetailModal(b)}
                        title="Click to view details"
                      >
                        {b.title}
                      </div>
                      {b.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.description}
                        </div>
                      )}
                    </td>

                    {/* Severity */}
                    <td>
                      <Badge status={b.severity} />
                    </td>

                    {/* Priority */}
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
                        {b.priority}
                      </span>
                    </td>

                    {/* Status with Lifecycle Dropdown (FR-BUG-04) */}
                    <td>
                      {canUpdate ? (
                        <select
                          className="form-select"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.8rem',
                            width: 'auto',
                            fontWeight: 600,
                            borderRadius: '4px'
                          }}
                          value={b.status}
                          onChange={(e) => handleStatusChange(b._id, e.target.value)}
                          data-testid={`bug-status-select-${b.bugId}`}
                          id={`status-select-${b.bugId}`}
                        >
                          {STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge status={b.status} />
                      )}
                    </td>

                    {/* Assignee (FR-BUG-03) */}
                    <td>
                      {canUpdate ? (
                        <select
                          className="form-select"
                          style={{ padding: '3px 8px', fontSize: '0.8rem', width: 'auto', maxWidth: '140px' }}
                          value={b.assignedTo ? (b.assignedTo._id || b.assignedTo) : ''}
                          onChange={(e) => handleAssigneeChange(b._id, e.target.value)}
                          data-testid={`bug-assignee-select-${b.bugId}`}
                          id={`assignee-select-${b.bugId}`}
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                              {m.userId?.name || 'Member'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: b.assignedTo ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {b.assignedTo ? b.assignedTo.name : 'Unassigned'}
                        </span>
                      )}
                    </td>

                    {/* Source Test ID */}
                    <td>
                      {b.testId ? (
                        <span
                          className="brand-badge"
                          style={{ background: '#EDE9FE', color: '#5B21B6', cursor: 'pointer' }}
                          onClick={() => navigate('/tests')}
                          title="View Test Cases"
                        >
                          {b.testId}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct</span>
                      )}
                    </td>

                    {/* Row Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        {/* Quick View Detail Drawer */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openDetailModal(b)}
                          data-testid={`bug-view-${b.bugId}`}
                          title="View bug detail"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {/* Quick Advance Status in lifecycle flow */}
                        {canUpdate && nextSt && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '3px 7px' }}
                            onClick={() => handleStatusChange(b._id, nextSt)}
                            title={`Advance status to ${nextSt}`}
                          >
                            <ArrowRight size={12} />
                            <span>{nextSt}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail View Modal (UI Spec 3.9) */}
      {selectedBug && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Bug Detail: ${selectedBug.bugId}`}
        >
          <div>
            {/* Visual Lifecycle Stepper (FR-BUG-04: Open > In Progress > Fixed > Verified > Closed) */}
            <div style={{ marginBottom: '1.5rem', background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                Status Flow Progression
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {STATUS_OPTIONS.map((st, i) => {
                  const currentIdx = STATUS_OPTIONS.indexOf(selectedBug.status);
                  const isPast = i < currentIdx;
                  const isCurrent = i === currentIdx;

                  return (
                    <React.Fragment key={st}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isCurrent ? 'var(--primary)' : (isPast ? '#059669' : '#E2E8F0'),
                            color: isCurrent || isPast ? '#FFFFFF' : '#64748B',
                            border: isCurrent ? '2px solid #000000' : 'none'
                          }}
                        >
                          {isPast ? <Check size={14} /> : i + 1}
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
                            marginTop: '0.3rem',
                            textAlign: 'center'
                          }}
                        >
                          {st}
                        </span>
                      </div>
                      {i < STATUS_OPTIONS.length - 1 && (
                        <div
                          style={{
                            flex: 1,
                            height: '2px',
                            background: i < currentIdx ? '#059669' : '#E2E8F0',
                            margin: '0 4px',
                            position: 'relative',
                            top: '-8px'
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Bug Metadata & Form */}
            <form onSubmit={handleSaveDetailChanges}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 className="serif-heading" style={{ fontSize: '1.2rem', marginBottom: '0.35rem' }}>
                  {selectedBug.title}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge status={selectedBug.severity} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                    Priority: {selectedBug.priority}
                  </span>
                  {selectedBug.testId && (
                    <span className="brand-badge" style={{ background: '#EDE9FE', color: '#5B21B6' }}>
                      Linked: {selectedBug.testId}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Reported by {selectedBug.reportedBy?.name || 'QA'} on {new Date(selectedBug.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedBug.description && (
                <div style={{ marginBottom: '1.25rem', background: 'var(--bg-card)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                    Description & Steps to Reproduce
                  </span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                    {selectedBug.description}
                  </p>
                </div>
              )}

              {/* Status & Assignee Controls (FR-BUG-03, FR-BUG-04) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="detail-status-select">Update Status</label>
                  <select
                    id="detail-status-select"
                    className="form-select"
                    data-testid="detail-status-select"
                    value={detailStatus}
                    onChange={(e) => setDetailStatus(e.target.value)}
                    disabled={!canUpdate}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="detail-assignee-select">Assign to Developer</label>
                  <select
                    id="detail-assignee-select"
                    className="form-select"
                    data-testid="detail-assignee-select"
                    value={detailAssignee}
                    onChange={(e) => setDetailAssignee(e.target.value)}
                    disabled={!canUpdate}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                        {m.userId?.name || 'Member'} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {canUpdate && (
                <div className="form-group">
                  <label className="form-label" htmlFor="detail-notes">Transition Notes (Optional)</label>
                  <input
                    id="detail-notes"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Fixed in commit a1b2c3d; ready for verification"
                    value={detailNotes}
                    onChange={(e) => setDetailNotes(e.target.value)}
                  />
                </div>
              )}

              {/* Status History (if available) */}
              {selectedBug.history && selectedBug.history.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                    Status History Audit
                  </span>
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {selectedBug.history.map((h, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                          <strong>{h.fromStatus} &rarr; {h.toStatus}</strong> {h.notes && `(${h.notes})`}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(h.changedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </button>
                {canUpdate && (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isUpdatingDetail}
                  >
                    {isUpdatingDetail ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Create Bug Modal (FR-BUG-01, FR-BUG-02, FR-BUG-03, UI-13) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          if (searchParams.get('createFrom')) setSearchParams({});
        }}
        title="Report New Bug"
      >
        {createError && (
          <div className="alert-banner alert-error">
            <span>{createError}</span>
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
              <label className="form-label" htmlFor="bug-assignee">Assign to Developer (FR-BUG-03)</label>
              <select
                id="bug-assignee"
                className="form-select"
                data-testid="bug-assignee"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              >
                <option value="">Select Developer</option>
                {members.map((m) => (
                  <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                    {m.userId?.name || 'Member'} ({m.role})
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
              onClick={() => {
                setIsCreateModalOpen(false);
                if (searchParams.get('createFrom')) setSearchParams({});
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              data-testid="bug-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Report Bug'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
