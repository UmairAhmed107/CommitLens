// Requirements Management Page (FR-REQ-01 to FR-REQ-05, UI-05, UI-06, UI Spec 3.4)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Plus, Search, Filter, History, Eye, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Requirements() {
  const { activeProject, userRole } = useProject();

  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'functional',
    priority: 'Medium',
    status: 'Active'
  });
  const [formError, setFormError] = useState('');

  // Detail & History Drawer State
  const [selectedReq, setSelectedReq] = useState(null);

  const fetchRequirements = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await api.get(`/projects/${activeProject._id}/requirements`, { params });
      setRequirements(res.data);
    } catch (err) {
      console.error('[Requirements Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [activeProject, priorityFilter, statusFilter, typeFilter]);

  // Handle Search on Submit or Debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequirements();
  };

  const openCreateModal = () => {
    setEditingReq(null);
    setFormData({
      title: '',
      description: '',
      type: 'functional',
      priority: 'Medium',
      status: 'Active'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (req) => {
    setEditingReq(req);
    setFormData({
      title: req.title,
      description: req.description,
      type: req.type,
      priority: req.priority,
      status: req.status
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.title.trim()) {
      setFormError('Requirement title is required');
      return;
    }

    try {
      if (editingReq) {
        // Edit requirement (FR-REQ-03)
        await api.put(`/requirements/${editingReq._id}`, formData);
      } else {
        // Create requirement (FR-REQ-01, FR-REQ-02)
        await api.post(`/projects/${activeProject._id}/requirements`, formData);
      }
      setIsModalOpen(false);
      fetchRequirements();
    } catch (err) {
      setFormError(err.response?.data?.details?.[0] || err.message || 'Operation failed');
    }
  };

  const canEdit = userRole === 'PM';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Traceability & Scope
          </span>
          <h1 className="serif-heading">Requirements</h1>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="req-add-btn"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            <span>Add Requirement</span>
          </button>
        )}
      </div>

      {/* Table Toolbar: Search and Filters (FR-REQ-04, UI-06) */}
      <div className="table-container">
        <div className="table-toolbar">
          <form onSubmit={handleSearchSubmit} className="table-search-box">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search requirements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="req-search"
            />
          </form>

          <div className="table-filters">
            {/* Priority Filter */}
            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              data-testid="req-filter-priority"
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
              data-testid="req-filter-status"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="In Review">In Review</option>
              <option value="Implemented">Implemented</option>
            </select>

            {/* Type Filter */}
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              data-testid="req-filter-type"
            >
              <option value="">All Types</option>
              <option value="functional">Functional</option>
              <option value="non-functional">Non-Functional</option>
              <option value="user story">User Story</option>
            </select>
          </div>
        </div>

        {/* Requirements Table (UI Spec 3.4) */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading requirements...
          </div>
        ) : requirements.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No requirements match the current filters.
          </div>
        ) : (
          <table data-testid="req-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Ver</th>
                <th>Linked Tests</th>
                <th>Coverage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((req) => (
                <tr key={req._id} data-testid={`req-row-${req.reqId}`}>
                  <td style={{ fontWeight: 600 }}>{req.reqId}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{req.title}</div>
                    {req.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {req.description.slice(0, 75)}...
                      </div>
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{req.type}</td>
                  <td><Badge status={req.priority} /></td>
                  <td><Badge status={req.status} /></td>
                  <td>v{req.version}</td>
                  <td>{req.linkedTestsCount} tests</td>
                  <td>
                    <Badge
                      status={req.coverageState}
                      label={req.coverageState === 'covered' ? 'Covered' : 'Uncovered'}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedReq(req)}
                        title="View details & version history"
                      >
                        <Eye size={14} />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(req)}
                          data-testid={`edit-${req.reqId}`}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal (FR-REQ-01, FR-REQ-03) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReq ? `Edit ${editingReq.reqId} (Creates v${editingReq.version + 1})` : 'New Requirement'}
      >
        {formError && (
          <div className="alert-banner alert-error">
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="req-modal-title">Title</label>
            <input
              id="req-modal-title"
              type="text"
              className="form-input"
              data-testid="req-modal-title"
              placeholder="e.g. Multi-Factor Authentication"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="req-modal-desc">Description</label>
            <textarea
              id="req-modal-desc"
              rows={3}
              className="form-textarea"
              data-testid="req-modal-desc"
              placeholder="Detailed acceptance criteria..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-modal-type">Type</label>
              <select
                id="req-modal-type"
                className="form-select"
                data-testid="req-modal-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="functional">Functional</option>
                <option value="non-functional">Non-Functional</option>
                <option value="user story">User Story</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-modal-priority">Priority</label>
              <select
                id="req-modal-priority"
                className="form-select"
                data-testid="req-modal-priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="req-modal-status">Status</label>
              <select
                id="req-modal-status"
                className="form-select"
                data-testid="req-modal-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="In Review">In Review</option>
                <option value="Implemented">Implemented</option>
              </select>
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
              data-testid="req-modal-submit"
            >
              {editingReq ? 'Save New Version' : 'Create Requirement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Drawer: Shows Linked Tests & Version History (FR-REQ-03, FR-REQ-05) */}
      {selectedReq && (
        <div className="drawer-overlay" onClick={() => setSelectedReq(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {selectedReq.reqId} (v{selectedReq.version})
                </span>
                <h2 className="serif-heading">{selectedReq.title}</h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedReq(null)}
              >
                Close
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <span className="form-label">Description</span>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                {selectedReq.description || 'No description provided.'}
              </p>
            </div>

            {/* Linked Test Cases */}
            <div style={{ marginBottom: '2rem' }}>
              <span className="form-label">Linked Test Cases ({selectedReq.linkedTests?.length || 0})</span>
              {selectedReq.linkedTests && selectedReq.linkedTests.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {selectedReq.linkedTests.map((t) => (
                    <div
                      key={t.testId}
                      style={{
                        padding: '0.75rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.testId}</span>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.title}</p>
                      </div>
                      <Badge status={t.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#DC2626', marginTop: '0.5rem' }}>
                  Uncovered: No test cases are currently linked to this requirement.
                </p>
              )}
            </div>

            {/* Version History (FR-REQ-03, MT-02) */}
            <div>
              <span className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={15} /> Version History
              </span>
              {selectedReq.history && selectedReq.history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {selectedReq.history.map((hist, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        <span>Version {hist.version}</span>
                        <span>{new Date(hist.modifiedAt).toLocaleString()}</span>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{hist.title}</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{hist.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Initial version (v1). No previous revisions.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
