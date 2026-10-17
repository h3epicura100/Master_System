import { useMutation, useQueryClient } from '@tanstack/react-query';
import { menuService } from './menuService';
import { toast } from 'sonner';

export function useUpdateMenuDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, payload }) => menuService.updateMenuDecision(bookingId, payload),
    onSuccess: (result, { payload }) => {
      queryClient.invalidateQueries({ queryKey: ['pms_bookings'] });
      queryClient.invalidateQueries({ queryKey: ['pms_dashboard'] });
      
      const whatsapp = result?.whatsappResult;
      if (payload.status === 'Finalized' && whatsapp) {
        if (whatsapp.status === 'Sent') {
          toast.success(`Menu finalized & WhatsApp sent to ${whatsapp.sent} recipient(s)!`);
        } else if (whatsapp.status === 'Partial') {
          toast.warning(`Menu finalized. WhatsApp sent to ${whatsapp.sent}, failed for ${whatsapp.failed}.`);
        } else if (whatsapp.status === 'Failed') {
          toast.warning('Menu finalized, but WhatsApp notification failed to send.');
        } else {
          toast.success('Menu status updated to Finalized!');
        }
      } else {
        toast.success(`Menu status updated to ${payload.status}!`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update menu decision.');
    },
  });
}
