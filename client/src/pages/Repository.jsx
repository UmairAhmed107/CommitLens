// Repository Connection Page (FR-GIT-01 to FR-GIT-03, UI-09, UI Spec 3.6)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import { GitBranch, RefreshCw, CheckCircle, Key, Link2, Info } from 'lucide-react';

export default function Repository() {
  const { activeProject, userRole, isSyncing, triggerSync } = useProject();

  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

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

  useEffect(() => {
    fetchRepo();
  }, [activeProject]);

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
  };

  const canEdit = userRole === 'DEV' || userRole === 'PM';
  const webhookUrl = `${window.location.origin}/api/webhooks/github`;

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
                  <p style={{ fontWeight: 600 }}>{repo.owner}/{repo.name}</p>
                </div>
                <div>
                  <span className="form-label">Default Branch</span>
                  <p style={{ fontWeight: 600 }}>{repo.defaultBranch}</p>
                </div>
                <div>
                  <span className="form-label">Last Synchronization</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
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
    </div>
  );
}
