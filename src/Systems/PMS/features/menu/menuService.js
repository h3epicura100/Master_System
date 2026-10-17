import { supabase } from '../../services/supabase';
import { storageService } from '../../services/storageService';
import { whatsappService } from '../../services/whatsappService';

export const menuService = {
  /**
   * Updates menu decision status, reason, remarks & attachments in Supabase,
   * and triggers WhatsApp notifications when finalized.
   */
  async updateMenuDecision(bookingId, {
    status,
    reason,
    remarks,
    attachments,
    attachmentFiles = [],
    keptAttachments = [],
    deletedPaths = [],
    bookingData
  }) {
    let finalAttachments = attachments !== undefined
      ? [...(attachments || [])]
      : [...(keptAttachments || [])];

    // Fallback if legacy attachmentFiles are passed
    if (status === 'Finalized' && attachmentFiles && attachmentFiles.length > 0) {
      const uploadedList = await storageService.uploadMultipleAttachments(`menu/${bookingId}`, attachmentFiles);
      if (uploadedList && uploadedList.length > 0) {
        finalAttachments = [...finalAttachments, ...uploadedList];
      }
    }

    if (deletedPaths && deletedPaths.length > 0) {
      await storageService.deleteAttachments(deletedPaths);
    }

    const finalizationDate = status === 'Finalized' ? new Date().toISOString().slice(0, 10) : null;

    const upsertPayload = {
      booking_id: bookingId,
      status,
      reason: status !== 'Finalized' ? reason : null,
      remarks: status === 'Finalized' ? remarks : null,
      attachments: finalAttachments,
      finalization_date: finalizationDate,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pms_menu_tasks')
      .upsert(upsertPayload, { onConflict: 'booking_id' })
      .select();

    if (error) {
      console.error('Failed to update menu decision in Supabase:', error.message);
      throw new Error(error.message);
    }

    let whatsappResult = null;

    // Trigger WhatsApp notification if status is Finalized
    if (status === 'Finalized') {
      try {
        const primaryAtt = finalAttachments[0] || null;
        whatsappResult = await whatsappService.sendMenuFinalizedNotification(
          bookingData || { id: bookingId },
          primaryAtt?.path,
          primaryAtt?.name,
          remarks
        );

        // Update WhatsApp status in database
        if (whatsappResult) {
          await supabase
            .from('pms_menu_tasks')
            .update({
              whatsapp_status: whatsappResult.status,
              whatsapp_sent_at: new Date().toISOString(),
            })
            .eq('booking_id', bookingId);
        }
      } catch (err) {
        console.warn('WhatsApp notification error:', err);
        whatsappResult = { status: 'Failed', error: err.message };
        try {
          await supabase
            .from('pms_menu_tasks')
            .update({
              whatsapp_status: 'Failed',
              whatsapp_sent_at: new Date().toISOString(),
            })
            .eq('booking_id', bookingId);
        } catch (dbErr) {}
      }
    }

    return { data, whatsappResult };
  }
};
