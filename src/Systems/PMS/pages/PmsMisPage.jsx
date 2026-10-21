import React from 'react';
import { MisPage } from '../features/mis/MisPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsMisPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <MisPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsMisPage;
