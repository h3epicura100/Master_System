import React from 'react';
import { KitchenPrepPage } from '../features/departments/kitchenPrep/KitchenPrepPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsKitchenPrepPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <KitchenPrepPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsKitchenPrepPage;
