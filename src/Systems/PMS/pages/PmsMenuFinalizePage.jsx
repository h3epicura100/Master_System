import React from 'react';
import { MenuFinalizePage } from '../features/menu/MenuFinalizePage';
import { PmsQueryProvider } from '../queryClient';

export function PmsMenuFinalizePage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <MenuFinalizePage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsMenuFinalizePage;
