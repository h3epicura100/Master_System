import React from 'react';
import { CheeseDairyPage } from '../features/departments/cheeseDairy/CheeseDairyPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsCheeseDairyPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <CheeseDairyPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsCheeseDairyPage;
