import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function Topbar({ title, subtitle, onToggleSidebar }) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-pms-border px-4 lg:px-8 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-pms-border"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-pms-text">{title || 'Dashboard'}</h2>
          {subtitle && <p className="text-xs text-pms-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-pms-muted bg-white border border-pms-border rounded-lg hover:text-pms-text hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
}
