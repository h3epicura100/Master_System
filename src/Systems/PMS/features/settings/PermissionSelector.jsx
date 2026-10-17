import React from 'react';
import { ALL_PAGE_KEYS, NAVIGATION } from '../../constants/permissions';
import { ShieldCheck, Check } from 'lucide-react';

export function PermissionSelector({ role, fullAccess, onFullAccessChange, allowedPages = [], onPermissionToggle }) {
  if (role === 'admin') {
    return (
      <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-pms-primary flex-shrink-0" />
        <span>Admins automatically have unrestricted access to all pages, including Settings.</span>
      </div>
    );
  }

  const pageLabels = {};
  NAVIGATION.forEach(group => {
    group.items.forEach(item => {
      pageLabels[item.key] = item.label;
    });
  });

  const selectableKeys = ALL_PAGE_KEYS.filter(k => k !== 'dashboard');

  return (
    <div className="space-y-3 pt-2">
      {/* Full Access Toggle Card */}
      <label className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all ${
        fullAccess
          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <ShieldCheck className={`w-5 h-5 ${fullAccess ? 'text-pms-primary' : 'text-slate-400'}`} />
          <div>
            <div className="text-xs font-bold text-slate-900">Full Access to All Pages</div>
            <div className="text-[11px] text-slate-500">Unrestricted access across all catering workflow sections</div>
          </div>
        </div>
        <input
          type="checkbox"
          checked={fullAccess}
          onChange={(e) => onFullAccessChange(e.target.checked)}
          className="w-4 h-4 rounded text-pms-primary focus:ring-pms-accent border-slate-300 cursor-pointer"
        />
      </label>

      {/* Individual Page Permissions Grid */}
      <div className={`grid grid-cols-2 gap-2 transition-opacity ${fullAccess ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        {selectableKeys.map(key => {
          const isChecked = allowedPages.includes(key);
          return (
            <label
              key={key}
              className={`flex items-center justify-between p-2.5 border rounded-xl transition-all cursor-pointer text-xs ${
                isChecked
                  ? 'border-blue-500 bg-blue-50/40 font-semibold text-pms-primary'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-medium'
              }`}
            >
              <span>{pageLabels[key] || key}</span>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onPermissionToggle(key)}
                className="w-3.5 h-3.5 rounded text-pms-primary focus:ring-pms-accent border-slate-300 cursor-pointer"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
