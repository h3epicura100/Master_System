import React from 'react';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsDashboardPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <DashboardPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsDashboardPage;
