// Repository Connection Page (FR-GIT-01 to FR-GIT-04, FR-GIT-06, UI-09, UI Spec 3.6)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import { GitBranch, RefreshCw, CheckCircle, Key, Link2, Info, Search, GitCommit } from 'lucide-react';

export default function Repository() {
  const { activeProject, userRole, isSyncing, triggerSync } = useProject();

  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Connection Form State
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Commits List State (FR-GIT-06)
  const [commits, setCommits] = useState([]);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [loadingCommits, setLoadingCommits] = useState(false);

  const fetchRepo = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const res = await api.get(`/projects/${activeProject._id}/repository`);
      setRepo(res.data);
      if (res.data) {
        setUrl(res.data.url);
        setDefaultBranch(res.data.defaultBranch || 'main');
      }
    } catch (err) {
      console.error('[Repository Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommits = async () => {
    if (!activeProject) return;
    try {
      setLoadingCommits(true);
      const params = {};
      if (branchFilter) params.branch = branchFilter;
      if (authorFilter) params.author = authorFilter;
      if (search) params.search = search;
      const res = await api.get(`/projects/${activeProject._id}/commits`, { params });
      setCommits(res.data);
    } catch (err) {
      console.error('[Commits Error]', err);
    } finally {
      setLoadingCommits(false);
    }
  };

  useEffect(() => {
    fetchRepo();
  }, [activeProject]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCommits();
    }, 250);
    return () => clearTimeout(timer);
  }, [activeProject, branchFilter, authorFilter, search]);

  const handleConnect = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!url.trim()) {
      setMessage({ type: 'error', text: 'Repository URL is required.' });
      return;
    }

    try {
      setSaving(true);
      const res = await api.post(`/projects/${activeProject._id}/repository`, {
        url,
        token: token || 'demo',
        defaultBranch
      });
      setRepo(res.data);
      setToken(''); // Clear token input immediately
      setMessage({ type: 'success', text: 'Repository connected successfully!' });
      fetchCommits();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.details?.[0] || err.message || 'Failed to connect repository.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    await triggerSync();
    fetchRepo();
    fetchCommits();
  };

  const canEdit = userRole === 'DEV' || userRole === 'PM';
  const webhookUrl = `${window.location.origin}/api/webhooks/github`;

  if (!activeProject) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 className="serif-heading">Repository Integration</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Please select or create a project from the top bar to manage version control settings.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
          Version Control
        </span>
        <h1 className="serif-heading">Repository Integration</h1>
      </div>

      {message && (
        <div className={`alert-banner ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Connection Form & Status */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="serif-heading">GitHub Repository Settings</h3>
              {repo && (
                <span className="brand-badge" style={{ background: '#ECFDF5', color: '#065F46' }}>
                  Connected
                </span>
              )}
            </div>

            <form onSubmit={handleConnect}>
              <div className="form-group">
                <label className="form-label" htmlFor="repo-url">Repository URL</label>
                <input
                  id="repo-url"
                  type="text"
                  className="form-input"
                  data-testid="repo-url"
                  placeholder="https://github.com/owner/repository.git"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={!canEdit}
                  required
                />
                <span className="form-help">Enter HTTPS clone URL or demo repository URL.</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="repo-token">
                  Personal Access Token (Encrypted at rest)
                </label>
                <input
                  id="repo-token"
                  type="password"
                  className="form-input"
                  data-testid="repo-token"
                  placeholder={repo ? '•••••••••••••••• (Leave blank to keep existing)' : 'ghp_xxxxxxxxxxxxxxxxxxxx or "demo"'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={!canEdit}
                />
                <span className="form-help">
                  Stored securely with AES encryption and never returned over the API.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="repo-branch">Default Branch</label>
                <input
                  id="repo-branch"
                  type="text"
                  className="form-input"
                  data-testid="repo-branch"
                  placeholder="main"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  disabled={!canEdit}
                />
              </div>

              {canEdit && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    data-testid="repo-connect-btn"
                    disabled={saving}
                  >
                    <Link2 size={16} />
                    <span>{saving ? 'Connecting...' : repo ? 'Update Repository' : 'Connect Repository'}</span>
                  </button>

                  {repo && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      data-testid="repo-sync-btn"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                    >
                      <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Connected Details Summary */}
          {repo && (
            <div className="card">
              <h3 className="serif-heading" style={{ marginBottom: '1rem' }}>Repository Telemetry</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <span className="form-label">Repository Name</span>
                  <p style={{ fontWeight: 600 }} data-testid="repo-telemetry-name">{repo.owner}/{repo.name}</p>
                </div>
                <div>
                  <span className="form-label">Default Branch</span>
                  <p style={{ fontWeight: 600 }}>{repo.defaultBranch}</p>
                </div>
                <div>
                  <span className="form-label">Last Synchronization</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }} data-testid="repo-last-sync">
                    {repo.lastSyncAt ? new Date(repo.lastSyncAt).toLocaleString() : 'Never synced'}
                  </p>
                </div>
                <div>
                  <span className="form-label">Token Security</span>
                  <p style={{ color: '#065F46', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Key size={14} /> AES-256 Encrypted
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Webhook Help Box (UI Spec 3.6) */}
        <div>
          <div className="card" style={{ background: 'var(--accent-ice)', borderColor: '#CBD5E1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#0F172A' }}>
              <Info size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>GitHub Webhook Setup</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '1rem' }}>
              To receive instant commit ingestion on every <code>git push</code>, add this Webhook URL in your GitHub repository settings under <strong>Webhooks &gt; Add webhook</strong>:
            </p>

            <div style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #94A3B8', wordBreak: 'break-all', fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: '1rem' }}>
              {webhookUrl}
            </div>

            <ul style={{ fontSize: '0.8rem', color: '#475569', paddingLeft: '1.2rem', lineHeight: '1.5' }}>
              <li>Content type: <code>application/json</code></li>
              <li>Events: <code>Just the push event</code></li>
              <li>Secret: matches <code>GITHUB_WEBHOOK_SECRET</code> in .env</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Commits List Section (FR-GIT-06, UI Spec 3.6 & 3.8) */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 className="serif-heading">Repository Commits</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Commits ingested from repository with file changes and commit history.
            </p>
          </div>
          <span className="brand-badge" style={{ background: '#F1F5F9', color: '#334155' }}>
            {commits.length} {commits.length === 1 ? 'commit' : 'commits'}
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="table-toolbar" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <div className="table-search-box">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search commit messages or SHA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="commit-search"
            />
          </div>

          <div className="table-filters">
            <input
              type="text"
              className="form-input"
              placeholder="Filter by branch..."
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              data-testid="commit-filter-branch"
              style={{ width: '160px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            />

            <input
              type="text"
              className="form-input"
              placeholder="Filter by author..."
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              data-testid="commit-filter-author"
              style={{ width: '160px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Commits Table */}
        <div className="table-container" style={{ border: 'none' }}>
          <table data-testid="commits-table">
            <thead>
              <tr>
                <th>SHA</th>
                <th>Commit Message</th>
                <th>Author</th>
                <th>Branch</th>
                <th>Date</th>
                <th>Changed Files</th>
              </tr>
            </thead>
            <tbody>
              {loadingCommits ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Loading commits...
                  </td>
                </tr>
              ) : commits.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No commits synced yet. Click "Sync Now" to pull commits from the repository.
                  </td>
                </tr>
              ) : (
                commits.map((c) => (
                  <tr key={c._id || c.sha} data-testid={`commit-row-${c.sha}`}>
                    <td>
                      <code style={{ fontWeight: 600, fontSize: '0.8rem', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                        {c.sha.slice(0, 7)}
                      </code>
                    </td>
                    <td style={{ fontWeight: 500, maxWidth: '350px' }}>
                      {c.message}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{c.author}</td>
                    <td>
                      <span className="brand-badge" style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.75rem' }}>
                        <GitBranch size={11} style={{ marginRight: '3px' }} />
                        {c.branch}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(c.date).toLocaleString()}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {c.files?.length || 0} files
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
