import React from 'react';
import { LoadingBoysPage } from '../features/departments/loadingBoys/LoadingBoysPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsLoadingBoysPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <LoadingBoysPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsLoadingBoysPage;
