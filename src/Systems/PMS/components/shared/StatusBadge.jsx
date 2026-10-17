import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return null;

  const styles = {
    Pending: 'border-slate-300 text-slate-600 bg-slate-50',
    Complete: 'border-emerald-300 text-emerald-700 bg-emerald-50',
    Finalized: 'border-emerald-300 text-emerald-700 bg-emerald-50',
    Rejected: 'border-red-300 text-red-700 bg-red-50',
    Cancelled: 'border-red-300 text-red-700 bg-red-50',
  };

  const currentStyle = styles[status] || styles.Pending;

  return (
    <span className={`inline-block font-mono text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border -rotate-1 shadow-sm whitespace-nowrap ${currentStyle}`}>
      {status}
    </span>
  );
}
