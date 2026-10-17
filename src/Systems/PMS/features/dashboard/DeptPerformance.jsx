import React from 'react';

export function DeptPerformance({ deptStats = [], performance = [] }) {
  const data = deptStats.length ? deptStats : performance;

  return (
    <div className="bg-white border border-pms-border rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-pms-border bg-slate-50/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <h3 className="text-sm font-bold text-pms-text">Department Performance Overview</h3>
        </div>
        <span className="text-xs text-pms-muted bg-slate-100 px-2 py-0.5 rounded font-medium">
          {data.length} Departments
        </span>
      </div>

      {!data.length ? (
        <div className="p-8 text-center text-xs text-pms-muted">
          No department data available.
        </div>
      ) : (
        <>
          {/* Mobile Cards Grid */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden max-h-[380px] overflow-y-auto">
            {data.map((d) => {
              const pct = d.total > 0 ? Math.round((d.complete / d.total) * 100) : 0;
              return (
                <div
                  key={d.key}
                  className="bg-slate-50/60 border border-pms-border rounded-xl p-3 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="font-bold text-xs text-pms-text">{d.label}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {pct}%
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    <div className="bg-white p-1 rounded border border-slate-100">
                      <span className="text-[9px] uppercase font-semibold text-slate-400 block">Total</span>
                      <span className="font-bold text-slate-700 text-xs">{d.total}</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-100">
                      <span className="text-[9px] uppercase font-semibold text-slate-400 block">Pending</span>
                      <span className="font-bold text-slate-700 text-xs">{d.pending}</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-100">
                      <span className="text-[9px] uppercase font-semibold text-emerald-600 block">Done</span>
                      <span className="font-bold text-emerald-700 text-xs">{d.complete}</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-100">
                      <span className="text-[9px] uppercase font-semibold text-red-600 block">Delayed</span>
                      <span className="font-bold text-red-700 text-xs">{d.delayed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table with Sticky Headers */}
          <div className="hidden md:block overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                <tr className="border-b border-pms-border text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-4 bg-slate-50">Department</th>
                  <th className="py-2.5 px-4 bg-slate-50">Total Tasks</th>
                  <th className="py-2.5 px-4 bg-slate-50">Completion</th>
                  <th className="py-2.5 px-4 bg-slate-50">Pending</th>
                  <th className="py-2.5 px-4 bg-slate-50">Complete</th>
                  <th className="py-2.5 px-4 bg-slate-50">Due Today</th>
                  <th className="py-2.5 px-4 bg-slate-50">Delayed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pms-border">
                {data.map((d) => {
                  const pct = d.total > 0 ? Math.round((d.complete / d.total) * 100) : 0;
                  return (
                    <tr key={d.key} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-pms-text whitespace-nowrap">
                        {d.label}
                      </td>
                      <td className="py-2.5 px-4 text-pms-text font-medium">{d.total}</td>
                      <td className="py-2.5 px-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-600 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-pms-text font-medium">{d.pending}</td>
                      <td className="py-2.5 px-4 text-emerald-600 font-semibold">{d.complete}</td>
                      <td className={`py-2.5 px-4 font-semibold ${d.dueToday > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                        {d.dueToday}
                      </td>
                      <td className={`py-2.5 px-4 font-semibold ${d.delayed > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                        {d.delayed}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
