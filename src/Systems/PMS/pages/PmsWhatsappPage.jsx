import React from 'react';
import { WhatsappPage } from '../features/whatsapp/WhatsappPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsWhatsappPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
        <WhatsappPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsWhatsappPage;
