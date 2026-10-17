import React from 'react';
import { WaitersPage } from '../features/departments/waiters/WaitersPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsWaitersPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <WaitersPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsWaitersPage;
