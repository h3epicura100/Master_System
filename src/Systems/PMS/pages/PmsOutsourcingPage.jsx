import React from 'react';
import { OutsourcingPage } from '../features/departments/outsourcing/OutsourcingPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsOutsourcingPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <OutsourcingPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsOutsourcingPage;
