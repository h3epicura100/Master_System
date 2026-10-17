import React from 'react';
import { FreshFlowersPage } from '../features/departments/freshFlowers/FreshFlowersPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsFreshFlowersPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <FreshFlowersPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsFreshFlowersPage;
