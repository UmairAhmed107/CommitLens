// Projects and Members Management (FR-PRJ-01, FR-PRJ-02, FR-PRJ-03, UI-03, UI-04, UI Spec 3.2)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import AccessDenied from '../components/AccessDenied';
import { Plus, Users, UserPlus, Layers, CheckCircle2, Edit3, Archive } from 'lucide-react';


export default function Projects() {
  const { user } = useAuth();
  const { projects, activeProject, fetchProjects, switchProject, userRole } = useProject();

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectError, setProjectError] = useState('');

  // Add Member State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('DEV');
  const [memberError, setMemberError] = useState('');

  // Active Project Detail
  const [currentProjectDetails, setCurrentProjectDetails] = useState(null);

  // Edit / Archive Project State (FR-PRJ-01)
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editError, setEditError] = useState('');

  // Enforcement for UI-03: If user is QA or DEV and tries to access project management, show Access Denied!
  const isAuthorized = userRole === 'PM' || userRole === 'TL' || projects.length === 0;

  useEffect(() => {
    async function loadActiveDetails() {
      if (activeProject) {
        try {
          const res = await api.get(`/projects/${activeProject._id}`);
          setCurrentProjectDetails(res.data);
          setEditName(res.data.name || '');
          setEditDesc(res.data.description || '');
          setEditStatus(res.data.status || 'Active');
        } catch (err) {
          console.error('[Project Details Error]', err);
        }
      }
    }
    loadActiveDetails();
  }, [activeProject]);

  if (!isAuthorized) {
    return <AccessDenied message="Only Project Managers and Team Leads have access to project configuration." />;
  }

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setProjectError('');

    if (!projectName.trim()) {
      setProjectError('Project name is required');
      return;
    }

    try {
      const res = await api.post('/projects', {
        name: projectName.trim(),
        description: projectDesc.trim()
      });
      setIsNewProjectModalOpen(false);
      setProjectName('');
      setProjectDesc('');
      await fetchProjects();
      switchProject(res.data);
    } catch (err) {
      setProjectError(err.response?.data?.details?.[0] || err.message || 'Failed to create project');
    }
  };

  const handleUpdateProject = async (e) => {

    e.preventDefault();
    setEditError('');

    if (!editName.trim()) {
      setEditError('Project name is required');
      return;
    }

    try {
      const res = await api.put(`/projects/${activeProject._id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
        status: editStatus
      });
      setIsEditProjectModalOpen(false);
      setCurrentProjectDetails(res.data);
      await fetchProjects();
      switchProject(res.data);
    } catch (err) {
      setEditError(err.response?.data?.details?.[0] || err.message || 'Failed to update project');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');

    if (!memberEmail.trim()) {
      setMemberError('User email is required');
      return;
    }

    try {
      await api.post(`/projects/${activeProject._id}/members`, {
        email: memberEmail.trim(),
        role: memberRole
      });
      setIsAddMemberModalOpen(false);
      setMemberEmail('');
      // Reload project details
      const res = await api.get(`/projects/${activeProject._id}`);
      setCurrentProjectDetails(res.data);
      fetchProjects();
    } catch (err) {
      setMemberError(err.response?.data?.details?.[0] || err.message || 'Failed to add member');
    }
  };

  const isPM = userRole === 'PM' || projects.length === 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Workspace Settings
          </span>
          <h1 className="serif-heading">Projects & Team Members</h1>
        </div>


        {/* New Project button: PM only (UI Spec 3.2, UI-04) */}
        {isPM && (
          <button
            type="button"
            className="btn btn-primary"
            data-testid="new-project-btn"
            onClick={() => {
              setProjectName('');
              setProjectDesc('');
              setProjectError('');
              setIsNewProjectModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Projects Card Grid (UI Spec 3.2) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 className="serif-heading" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Your Projects
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {projects.map((p) => {
            const isActive = activeProject && activeProject._id === p._id;
            return (
              <div
                key={p._id}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderColor: isActive ? 'var(--primary)' : 'var(--border-light)',
                  borderWidth: isActive ? '2px' : '1px'
                }}
                onClick={() => switchProject(p)}
                data-testid={`project-card-${p.name}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{p.name}</h3>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {p.status === 'Archived' ? (
                      <span className="brand-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>
                        Archived
                      </span>
                    ) : (
                      <span className="brand-badge" style={{ background: '#ECFDF5', color: '#065F46' }}>
                        Active
                      </span>
                    )}
                    {isActive && (
                      <span className="brand-badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>
                        Selected
                      </span>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '38px' }}>
                  {p.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Members: </span>
                    <strong>{p.memberCount || p.members?.length || 1}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Coverage: </span>
                    <strong style={{ color: '#065F46' }}>{p.coveragePercentage || 0}%</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Role: </span>
                    <strong>{p.currentUserRole || 'Member'}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Members Section for Selected Active Project (FR-PRJ-02) */}
      {currentProjectDetails && (
        <div className="card">
          <div className="card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 className="serif-heading" style={{ fontSize: '1.25rem' }}>
                  Team Members - {currentProjectDetails.name}
                </h2>
                {currentProjectDetails.status === 'Archived' && (
                  <span className="brand-badge" style={{ background: '#FEF3C7', color: '#92400E' }}>
                    Archived Project
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Role-based access assigned per project
              </span>
            </div>

            {isPM && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  data-testid="edit-project-btn"
                  onClick={() => {
                    setEditName(currentProjectDetails.name || '');
                    setEditDesc(currentProjectDetails.description || '');
                    setEditStatus(currentProjectDetails.status || 'Active');
                    setEditError('');
                    setIsEditProjectModalOpen(true);
                  }}
                >
                  <Edit3 size={15} />
                  <span>Edit Project</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  data-testid="add-member-btn"
                  onClick={() => {
                    setMemberEmail('');
                    setMemberRole('DEV');
                    setMemberError('');
                    setIsAddMemberModalOpen(true);
                  }}
                >
                  <UserPlus size={15} />
                  <span>Add Member</span>
                </button>
              </div>
            )}
          </div>

          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {currentProjectDetails.members && currentProjectDetails.members.map((m, idx) => {
                  const isOwner = currentProjectDetails.ownerId?._id === m.userId?._id;
                  return (
                    <tr key={idx} data-testid={`member-row-${m.userId?.email}`}>
                      <td style={{ fontWeight: 600 }}>{m.userId?.name || 'User'}</td>
                      <td>{m.userId?.email || 'N/A'}</td>
                      <td>
                        <span className="brand-badge" style={{ background: '#E0F2FE', color: '#0369A1' }}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {isOwner ? 'Project Owner' : 'Member'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Project Modal (PM Only) */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Create New Project"
      >
        {projectError && (
          <div className="alert-banner alert-error">
            <span>{projectError}</span>
          </div>
        )}

        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label className="form-label" htmlFor="project-name">Project Name</label>
            <input
              id="project-name"
              type="text"
              className="form-input"
              data-testid="project-name"
              placeholder="e.g. demo-shop"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="project-desc">Description</label>
            <textarea
              id="project-desc"
              rows={3}
              className="form-textarea"
              data-testid="project-desc"
              placeholder="Project purpose, goals, and scope..."
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsNewProjectModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              data-testid="project-submit"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title={`Add Member to ${activeProject?.name}`}
      >
        {memberError && (
          <div className="alert-banner alert-error">
            <span>{memberError}</span>
          </div>
        )}

        <form onSubmit={handleAddMember}>
          <div className="form-group">
            <label className="form-label" htmlFor="member-email">Registered User Email</label>
            <input
              id="member-email"
              type="email"
              className="form-input"
              data-testid="member-email"
              placeholder="colleague@demo.com"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="member-role">Assign Role</label>
            <select
              id="member-role"
              className="form-select"
              data-testid="member-role"
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
            >
              <option value="PM">PM - Project Manager (Manage requirements & projects)</option>
              <option value="DEV">DEV - Developer (Connect repo, rules & impact)</option>
              <option value="QA">QA - QA Engineer (Test cases, test runs & bugs)</option>
              <option value="TL">TL - Team Lead (Auditing & reports)</option>
            </select>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddMemberModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              data-testid="add-member-submit"
            >
              Add Member
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit / Archive Project Modal (PM Only, FR-PRJ-01) */}
      <Modal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        title={`Edit Project - ${currentProjectDetails?.name}`}
      >
        {editError && (
          <div className="alert-banner alert-error">
            <span>{editError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProject}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-project-name">Project Name</label>
            <input
              id="edit-project-name"
              type="text"
              className="form-input"
              data-testid="edit-project-name"
              placeholder="e.g. demo-shop"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-project-desc">Description</label>
            <textarea
              id="edit-project-desc"
              rows={3}
              className="form-textarea"
              data-testid="edit-project-desc"
              placeholder="Project purpose, goals, and scope..."
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-project-status">Project Status</label>
            <select
              id="edit-project-status"
              className="form-select"
              data-testid="edit-project-status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <option value="Active">Active (Available for development & testing)</option>
              <option value="Archived">Archived (Read-only / closed)</option>
            </select>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditProjectModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              data-testid="edit-project-submit"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

