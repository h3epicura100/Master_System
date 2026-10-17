import React from 'react';
import { KitchenPage } from '../features/departments/kitchen/KitchenPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsKitchenRawMtlPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <KitchenPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsKitchenRawMtlPage;
