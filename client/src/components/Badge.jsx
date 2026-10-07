// Reusable Status Badge Component
import React from 'react';

export default function Badge({ status, label, className = '' }) {
  const norm = (status || '').toLowerCase().replace(/\s+/g, '-');
  const display = label || status || 'Unknown';

  let badgeClass = 'badge-not-run';
  if (norm === 'passed') badgeClass = 'badge-passed';
  else if (norm === 'failed') badgeClass = 'badge-failed';
  else if (norm === 'blocked') badgeClass = 'badge-blocked';
  else if (norm === 'needs-re-run' || norm === 'needs-rerun') badgeClass = 'badge-needs-rerun';
  else if (norm === 'covered') badgeClass = 'badge-covered';
  else if (norm === 'uncovered') badgeClass = 'badge-uncovered';
  else if (norm === 'high' || norm === 'critical') badgeClass = 'badge-failed';
  else if (norm === 'medium') badgeClass = 'badge-blocked';
  else if (norm === 'low') badgeClass = 'badge-passed';

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {display}
    </span>
  );
}
