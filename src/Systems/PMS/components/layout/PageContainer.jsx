import React from 'react';

export function PageContainer({ children }) {
  return (
    <div className="p-4 lg:p-8 max-w-[1400px] w-full min-w-0 mx-auto pb-16">
      {children}
    </div>
  );
}
