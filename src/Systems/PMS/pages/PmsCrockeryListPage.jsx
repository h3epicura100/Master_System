import React from 'react';
import { CrockeryPage } from '../features/departments/crockery/CrockeryPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsCrockeryListPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <CrockeryPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsCrockeryListPage;
