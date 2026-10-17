import React from 'react';
import { MenuChatbotPage } from '../features/menuChatbot/MenuChatbotPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsMenuChatbotPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
        <MenuChatbotPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsMenuChatbotPage;
