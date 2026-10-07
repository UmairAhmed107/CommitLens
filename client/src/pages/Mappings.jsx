// Mapping Rules Page (FR-IMP-01, UI-10, UI Spec 3.7)
import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useProject } from '../context/ProjectContext';
import { Plus, Trash2, HelpCircle, Code2, GitFork } from 'lucide-react';

export default function Mappings() {
  const { activeProject, userRole } = useProject();

  const [mappings, setMappings] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [pattern, setPattern] = useState('');
  const [selectedReqId, setSelectedReqId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMappingsAndReqs = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const [mapsRes, reqsRes] = await Promise.all([
        api.get(`/projects/${activeProject._id}/mappings`),
        api.get(`/projects/${activeProject._id}/requirements`)
      ]);
      setMappings(mapsRes.data);
      setRequirements(reqsRes.data);
      if (reqsRes.data.length > 0 && !selectedReqId) {
        setSelectedReqId(reqsRes.data[0].reqId);
      }
    } catch (err) {
      console.error('[Mappings Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappingsAndReqs();
  }, [activeProject]);

  const handleAddRule = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!pattern.trim() || !selectedReqId) {
      setFormError('Pattern and target requirement are both required.');
      return;
    }

    try {
      setSaving(true);
      await api.post(`/projects/${activeProject._id}/mappings`, {
        pattern: pattern.trim(),
        requirementId: selectedReqId
      });
      setPattern('');
      fetchMappingsAndReqs();
    } catch (err) {
      setFormError(err.response?.data?.details?.[0] || err.message || 'Failed to add rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this mapping rule?')) return;
    try {
      await api.delete(`/mappings/${ruleId}`);
      fetchMappingsAndReqs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete rule.');
    }
  };

  const canEdit = userRole === 'DEV' || userRole === 'PM';

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
          Impact Engine Configuration
        </span>
        <h1 className="serif-heading">Path-to-Requirement Mappings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>
        <div>
          {/* Add Rule Form (DEV, PM) */}
          {canEdit && (
            <div className="card" style={{ marginBottom: '1.75rem' }}>
              <div className="card-header">
                <h3 className="serif-heading">Define Mapping Rule</h3>
              </div>

              {formError && (
                <div className="alert-banner alert-error">
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddRule}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="mapping-pattern">File / Folder Glob Pattern</label>
                    <input
                      id="mapping-pattern"
                      type="text"
                      className="form-input"
                      data-testid="map-pattern"
                      data-test-alias="mapping-pattern"
                      placeholder="e.g. src/auth/**"
                      value={pattern}
                      onChange={(e) => setPattern(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="mapping-req-select">Target Requirement</label>
                    <select
                      id="mapping-req-select"
                      className="form-select"
                      data-testid="map-requirement"
                      data-test-alias="mapping-req-select"
                      value={selectedReqId}
                      onChange={(e) => setSelectedReqId(e.target.value)}
                      required
                    >
                      {requirements.map((r) => (
                        <option key={r.reqId} value={r.reqId}>
                          {r.reqId} - {r.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    data-testid="map-submit"
                    data-add-btn="map-add-btn"
                    disabled={saving}
                  >
                    <Plus size={16} />
                    <span>{saving ? 'Adding...' : 'Add Rule'}</span>
                  </button>
                </div>
                <span className="form-help" style={{ marginTop: '0.5rem', display: 'block' }}>
                  Matches filenames changed in Git commits (e.g., <code>src/auth/**</code> matches any file inside <code>src/auth/</code>).
                </span>
              </form>
            </div>
          )}

          {/* Mappings Table */}
          <div className="table-container">
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading mapping rules...
              </div>
            ) : mappings.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No mapping rules defined yet. Add a rule above to start automating change impact analysis.
              </div>
            ) : (
              <table data-testid="map-table" id="mappings-table">
                <thead>
                  <tr>
                    <th>Pattern</th>
                    <th>Linked Requirement</th>
                    <th>Created By</th>
                    {canEdit && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m._id} data-testid={`map-row-${m.pattern}`} id={`mapping-row-${m.pattern}`}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.pattern}</td>
                      <td>
                        <span className="brand-badge" style={{ background: '#E0F2FE', color: '#0369A1', marginRight: '0.5rem' }}>
                          {m.requirementId}
                        </span>
                        <span>{m.requirementTitle}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {m.createdBy ? m.createdBy.name : 'System'}
                      </td>
                      {canEdit && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteRule(m._id)}
                            data-testid={`map-delete-${m._id}`}
                            id={`delete-mapping-${m._id}`}
                            title="Delete rule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tip Box: In-Code Comment Tagging (UI Spec 3.7) */}
        <div>
          <div className="card" style={{ background: 'var(--accent-sand)', borderColor: '#E5E1D8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#451A03' }}>
              <Code2 size={18} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Direct In-Code Tagging</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#78350F', marginBottom: '0.85rem', lineHeight: '1.5' }}>
              In addition to glob rules, developers can directly link source files to requirements by adding comment tags anywhere inside code:
            </p>
            <div style={{ background: '#FFFFFF', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #D6D3D1', fontSize: '0.8rem', fontFamily: 'monospace', color: '#1C1917', marginBottom: '0.85rem' }}>
              // @req REQ-01 Secure Login<br />
              export class LoginService &#123; ... &#125;
            </div>
            <p style={{ fontSize: '0.8rem', color: '#78350F', lineHeight: '1.4' }}>
              The Impact Engine automatically parses commit diffs and combines glob matches with code comment tags into a unified recommendation!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
