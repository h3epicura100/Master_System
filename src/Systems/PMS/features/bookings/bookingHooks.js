import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from './bookingService';
import { toast } from 'sonner';

export function useBookings() {
  return useQuery({
    queryKey: ['pms_bookings'],
    queryFn: () => bookingService.getBookings(),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingData, createdBy }) => bookingService.createBooking(bookingData, createdBy),
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      toast.success(`Booking ${newId} created successfully!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create booking.');
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, bookingData }) => bookingService.updateBooking(id, bookingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      toast.success('Booking updated!');
    },
  });
}

export function useCloseBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => bookingService.closeBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      toast.info('Booking moved to History.');
    },
  });
}

export function useReopenBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => bookingService.reopenBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      toast.success('Booking reopened.');
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => bookingService.deleteBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      toast.success('Booking deleted permanently from everywhere.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete booking.');
    },
  });
}

