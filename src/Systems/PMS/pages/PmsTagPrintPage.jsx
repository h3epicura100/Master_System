import React from 'react';
import { TagPrintPage } from '../features/departments/tagPrint/TagPrintPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsTagPrintPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <TagPrintPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsTagPrintPage;
