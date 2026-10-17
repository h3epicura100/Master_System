import React from 'react';
import { BakeryPage } from '../features/departments/bakery/BakeryPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsBakeryPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <BakeryPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsBakeryPage;
