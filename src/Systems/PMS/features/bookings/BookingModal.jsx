import React from 'react';
import { Modal } from '../../components/common/Modal';
import { BookingForm } from './BookingForm';
import { useCreateBooking, useUpdateBooking } from './bookingHooks';
import { useAuth } from '../../hooks/useAuth';

export function BookingModal({ isOpen, onClose, initialValues }) {
  const isEditing = Boolean(initialValues?.id);
  const createMutation = useCreateBooking();
  const updateMutation = useUpdateBooking();
  const { currentUser } = useAuth();

  const handleSubmit = async (data) => {
    if (isEditing) {
      await updateMutation.mutateAsync({ id: initialValues.id, bookingData: data });
    } else {
      await createMutation.mutateAsync({
        bookingData: data,
        createdBy: currentUser?.id || 'admin',
      });
    }
    onClose();
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Booking — ${initialValues.id}` : 'New Booking'}
      subtitle="Capture the customer details and event parameters."
    >
      <BookingForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
      />
    </Modal>
  );
}
