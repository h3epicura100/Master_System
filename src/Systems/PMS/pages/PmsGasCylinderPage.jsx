import React from 'react';
import { GasCylinderPage } from '../features/departments/gasCylinder/GasCylinderPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsGasCylinderPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <GasCylinderPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsGasCylinderPage;
