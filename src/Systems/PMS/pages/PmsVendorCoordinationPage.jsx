import React from 'react';
import { VendorCoordinationPage } from '../features/departments/vendorCoordination/VendorCoordinationPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsVendorCoordinationPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <VendorCoordinationPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsVendorCoordinationPage;
