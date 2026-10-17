import React from 'react';
import { VegetablesPage } from '../features/departments/vegetables/VegetablesPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsVegetablesPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <VegetablesPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsVegetablesPage;
