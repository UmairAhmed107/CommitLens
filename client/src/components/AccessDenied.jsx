// Access Denied Component (FR-AUTH-03, UI-03)
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AccessDenied({ message }) {
  return (
    <div
      className="card"
      data-testid="access-denied"
      style={{
        maxWidth: '540px',
        margin: '3rem auto',
        textAlign: 'center',
        padding: '3rem 2rem'
      }}
    >
      <div style={{ display: 'inline-flex', padding: '1rem', background: '#FEF2F2', borderRadius: '50%', color: '#DC2626', marginBottom: '1.25rem' }}>
        <ShieldAlert size={44} />
      </div>
      <h2 className="serif-heading" style={{ marginBottom: '0.75rem' }}>Access Denied</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
        {message || 'You do not have the required permissions to access this page under your current project role.'}
      </p>
      <div>
        <Link to="/dashboard" className="btn btn-primary" data-testid="back-dashboard-btn">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
