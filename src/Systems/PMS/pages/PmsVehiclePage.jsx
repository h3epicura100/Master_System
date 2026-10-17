import React from 'react';
import { VehiclePage } from '../features/departments/vehicle/VehiclePage';
import { PmsQueryProvider } from '../queryClient';

export function PmsVehiclePage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <VehiclePage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsVehiclePage;
