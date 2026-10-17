import React from 'react';
import { Button } from '../../components/common/Button';
import { Edit2, Trash2, MessageSquare } from 'lucide-react';
import { NAVIGATION } from '../../constants/permissions';

export function UsersTable({ users = [], onEdit, onDelete }) {
  const pageLabels = {};
  NAVIGATION.forEach(group => {
    group.items.forEach(item => {
      pageLabels[item.key] = item.label;
    });
  });

  return (
    <>
      {/* Mobile Card Layout (Visible on screens < md) */}
      <div className="space-y-3.5 md:hidden">
        {users.map((u) => {
          const isFull = u.role === 'admin' || Boolean(u.has_full_access);
          const phone = u.whatsapp_number || u.whatsappNumber;

          return (
            <div
              key={u.id}
              className="bg-white border border-pms-border rounded-xl p-4 shadow-sm space-y-3"
            >
              {/* Header: ID, Name & Role */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-bold text-pms-primary">
                    {u.id}
                  </div>
                  <div className="text-sm font-bold text-pms-text truncate mt-0.5">
                    {u.display_name || u.name || '—'}
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                  u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-700'
                }`}>
                  {u.role}
                </span>
              </div>

              {/* WhatsApp & Permissions */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-[11px] font-semibold uppercase text-slate-400">WhatsApp:</span>
                  {phone ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      {phone}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>

                <div className="py-1">
                  <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">Page Access:</span>
                  {isFull ? (
                    <span className="bg-blue-100 text-pms-primary font-semibold text-[10px] px-2 py-0.5 rounded inline-block">
                      Full Access (All Pages)
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(u.allowedPages || []).filter(p => p !== 'ALL' && p !== 'dashboard').map((p) => (
                        <span key={p} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                          {pageLabels[p] || p}
                        </span>
                      ))}
                      {(!u.allowedPages || u.allowedPages.filter(p => p !== 'ALL' && p !== 'dashboard').length === 0) && (
                        <span className="text-slate-400 italic text-[11px]">No pages assigned</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button size="sm" variant="ghost" onClick={() => onEdit(u)}>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(u.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (Visible on screens >= md) */}
      <div className="hidden md:block bg-white border border-pms-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-pms-border text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">WhatsApp</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Page Access</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pms-border">
              {users.map((u) => {
                const isFull = u.role === 'admin' || Boolean(u.has_full_access);
                const phone = u.whatsapp_number || u.whatsappNumber;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-pms-primary">
                      {u.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-pms-text">
                      {u.display_name || u.name || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {phone ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          {phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-pms-text capitalize">
                      {u.role}
                    </td>
                    <td className="py-3 px-4">
                      {isFull ? (
                        <span className="bg-blue-100 text-pms-primary font-semibold text-[10px] px-2 py-0.5 rounded">
                          Full Access
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(u.allowedPages || []).filter(p => p !== 'ALL' && p !== 'dashboard').map((p) => (
                            <span key={p} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                              {pageLabels[p] || p}
                            </span>
                          ))}
                          {(!u.allowedPages || u.allowedPages.filter(p => p !== 'ALL' && p !== 'dashboard').length === 0) && (
                            <span className="text-slate-400 italic text-[11px]">No pages assigned</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(u)}>
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => onDelete(u.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
