import React from 'react';
import { BookingsPage } from '../features/bookings/BookingsPage';
import { PmsQueryProvider } from '../queryClient';

export function PmsBookingsPage() {
  return (
    <PmsQueryProvider>
      <div className="w-full min-w-0">
        <BookingsPage />
      </div>
    </PmsQueryProvider>
  );
}

export default PmsBookingsPage;
