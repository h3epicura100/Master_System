import React from 'react';
import { IceWaterPage } from '../features/departments/iceWater/IceWaterPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsIceWaterPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <IceWaterPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsIceWaterPage;
