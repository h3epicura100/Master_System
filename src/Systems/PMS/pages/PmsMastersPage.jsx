import React from 'react';
import { MastersPage } from '../features/masters/MastersPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsMastersPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <MastersPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsMastersPage;
