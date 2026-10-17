import React from 'react';
import { DecorPage } from '../features/departments/decor/DecorPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsDecorPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <DecorPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsDecorPage;
