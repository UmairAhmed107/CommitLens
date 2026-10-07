// Project Scope Context (UI Spec Section 1 & 2)
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const fetchProjects = async () => {
    if (!user) {
      setProjects([]);
      setActiveProject(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(res.data);

      // Restore active project or pick first
      const savedProjectId = localStorage.getItem('scit_active_project_id');
      const found = res.data.find((p) => p._id === savedProjectId);

      if (found) {
        setActiveProject(found);
      } else if (res.data.length > 0) {
        setActiveProject(res.data[0]);
        localStorage.setItem('scit_active_project_id', res.data[0]._id);
      } else {
        setActiveProject(null);
      }
    } catch (err) {
      console.error('[ProjectContext] Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const switchProject = (projectOrId) => {
    let proj = null;
    if (typeof projectOrId === 'string') {
      proj = projects.find((p) => p._id === projectOrId) || null;
    } else {
      proj = projectOrId;
    }
    setActiveProject(proj);
    if (proj) {
      localStorage.setItem('scit_active_project_id', proj._id);
    } else {
      localStorage.removeItem('scit_active_project_id');
    }
  };

  // Compute current user's role on active project
  const userRole = activeProject ? activeProject.currentUserRole || 'DEV' : null;

  // Trigger manual Git sync and impact analysis
  const triggerSync = async () => {
    if (!activeProject) return;
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const res = await api.post(`/projects/${activeProject._id}/sync`);
      setSyncFeedback({
        type: 'success',
        message: `Synced ${res.data.syncedCount} commits successfully!`
      });
      // Refresh project to update stats
      await fetchProjects();
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Sync failed.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        userRole,
        loading,
        isSyncing,
        syncFeedback,
        setSyncFeedback,
        fetchProjects,
        switchProject,
        triggerSync
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
