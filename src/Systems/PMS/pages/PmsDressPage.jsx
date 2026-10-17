import React from 'react';
import { DressPage } from '../features/departments/dress/DressPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsDressPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <DressPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsDressPage;
