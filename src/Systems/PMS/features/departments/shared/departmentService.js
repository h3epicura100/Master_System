import { supabase } from '../../../services/supabase';
import { storageService } from '../../../services/storageService';

export const departmentService = {
  /**
   * Updates status, remarks and attachments for simple department tasks strictly in Supabase.
   * @param {string} bookingId
   * @param {string} deptKey
   * @param {Object} params
   * @param {string} params.status
   * @param {string} params.remarks
   * @param {Array} [params.attachments] - Final list of attachment objects
   * @param {File[]} [params.attachmentFiles] - Local files to upload (legacy fallback)
   * @param {Array} [params.keptAttachments] - Retained existing attachment objects (legacy fallback)
   * @param {string[]} [params.deletedPaths] - Storage paths to permanently remove
   * @param {string} params.updatedBy
   */
  async updateDeptTask(bookingId, deptKey, {
    status,
    remarks,
    attachments,
    attachmentFiles = [],
    keptAttachments = [],
    deletedPaths = [],
    updatedBy,
  }) {
    let finalAttachments = attachments !== undefined
      ? [...(attachments || [])]
      : [...(keptAttachments || [])];

    // Fallback if legacy attachmentFiles are passed
    if (attachmentFiles && attachmentFiles.length > 0) {
      const uploadedList = await storageService.uploadMultipleAttachments(
        `departments/${bookingId}/${deptKey}`,
        attachmentFiles
      );
      if (uploadedList && uploadedList.length > 0) {
        finalAttachments = [...finalAttachments, ...uploadedList];
      }
    }

    // Clean up deleted files from Supabase Storage
    if (deletedPaths && deletedPaths.length > 0) {
      await storageService.deleteAttachments(deletedPaths);
    }

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('pms_department_tasks')
      .upsert({
        booking_id: bookingId,
        department_key: deptKey,
        status,
        remarks,
        attachments: finalAttachments,
        updated_by: updatedBy,
        updated_at: nowIso,
        completed_at: status === 'Complete' ? nowIso : null,
      }, { onConflict: 'booking_id,department_key' })
      .select();

    if (error) {
      console.error('Failed to update department task in Supabase:', error.message);
      throw new Error(error.message);
    }

    return data;
  }
};
