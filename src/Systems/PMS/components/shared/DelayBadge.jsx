import React from 'react';

export function DelayBadge({ delayInfo }) {
  if (!delayInfo || !delayInfo.label) {
    return <span className="text-slate-400 font-mono text-[11px]">—</span>;
  }

  const { label, cls } = delayInfo;

  const styles = {
    completed: 'border-emerald-300 text-emerald-700 bg-emerald-50',
    atrisk: 'border-amber-300 text-amber-800 bg-amber-50',
    delayed: 'border-red-300 text-red-700 bg-red-50',
    pending: 'border-slate-300 text-slate-600 bg-slate-50',
  };

  const currentStyle = styles[cls] || styles.pending;

  return (
    <span className={`inline-block font-mono text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border shadow-sm whitespace-nowrap ${currentStyle}`}>
      {label}
    </span>
  );
}
