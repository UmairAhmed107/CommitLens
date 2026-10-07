// Top Navigation Bar (UI Spec Section 1 & 4)
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { RefreshCw, LogOut, Layers } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { projects, activeProject, switchProject, isSyncing, triggerSync, userRole } = useProject();

  const handleProjectChange = (e) => {
    switchProject(e.target.value);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-title">
          <span>SCIT</span>
          <span className="brand-badge">Impact Studio</span>
        </div>

        {/* Project Selector (UI Spec Section 1) */}
        {projects.length > 0 && (
          <div className="project-selector-wrapper">
            <Layers size={16} color="var(--text-muted)" />
            <select
              className="project-select"
              data-testid="project-selector"
              value={activeProject ? activeProject._id : ''}
              onChange={handleProjectChange}
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Sync Now button (UI Spec Section 4 & 6) */}
        {activeProject && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            data-testid="sync-now-btn"
            onClick={triggerSync}
            disabled={isSyncing}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}

        {/* User Info and Role Badge */}
        {user && (
          <div className="user-profile-badge">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span className="user-name">{user.name}</span>
              <span className="role-tag" data-testid="user-role-badge">
                {userRole || 'Member'}
              </span>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          data-testid="logout-btn"
          onClick={logout}
          title="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
