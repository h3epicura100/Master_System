import React from 'react';
import { NotificationLogs } from '../features/settings/NotificationLogs';
import { PmsQueryProvider } from '../queryClient';

export function PmsNotificationsPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Delay & Notification Logs
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Automated 11 AM, 3 PM & 6 PM WhatsApp delay alerts, manual triggers and audit logs
            </p>
          </div>
        </div>
        <NotificationLogs />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsNotificationsPage;
