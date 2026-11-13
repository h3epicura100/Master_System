import React from 'react';
import { TagCreatorPage } from '../features/tagCreator/TagCreatorPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsTagCreatorPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
        <TagCreatorPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsTagCreatorPage;
