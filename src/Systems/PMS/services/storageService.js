import { supabase } from './supabase';

const BUCKET_NAME = 'pms-attachments';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const storageService = {
  /**
   * Uploads a single file to Supabase Storage (up to 50 MB).
   * @param {string} folderPath - e.g. 'departments/PMS-001/chef'
   * @param {File} file - Browser File object
   * @returns {Promise<{ path: string, name: string, size: number, mimeType: string, uploadedAt: string }>}
   */
  async uploadAttachment(folderPath, file) {
    if (!file) return null;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File "${file.name}" exceeds the maximum allowed size of 50 MB.`);
    }

    const fileExt = file.name.split('.').pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanFileName}`;
    const filePath = `${folderPath}/${uniqueName}`;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

      if (error) {
        console.error('Storage upload error from Supabase:', error.message);
        throw error;
      }

      if (data) {
        return {
          path: data.path,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('Storage upload error:', e);

      // Only attempt base64 fallback for very small files (< 5MB)
      if (file.size <= 5 * 1024 * 1024) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            path: reader.result,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            uploadedAt: new Date().toISOString(),
            dataUrl: reader.result,
          });
          reader.readAsDataURL(file);
        });
      }

      throw e;
    }

    return null;
  },

  /**
   * Uploads multiple files concurrently to Supabase Storage.
   * @param {string} folderPath
   * @param {File[]} files
   * @returns {Promise<Array<{ path: string, name: string, size: number, mimeType: string, uploadedAt: string }>>}
   */
  async uploadMultipleAttachments(folderPath, files = []) {
    if (!files || !files.length) return [];

    const uploadPromises = files.map((file) => this.uploadAttachment(folderPath, file));
    const results = await Promise.all(uploadPromises);
    return results.filter(Boolean);
  },

  /**
   * Generates a signed URL or returns direct path/dataUrl.
   */
  async getSignedUrl(filePath) {
    if (!filePath) return null;
    if (filePath.startsWith('data:') || filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 3600);

      if (!error && data?.signedUrl) return data.signedUrl;
    } catch (e) {
      console.warn('Error generating signed URL:', e);
    }

    return this.getPublicUrl(filePath);
  },

  /**
   * Generates a public URL or returns direct path/dataUrl.
   */
  getPublicUrl(filePath) {
    if (!filePath) return null;
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
      return filePath;
    }

    try {
      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (data?.publicUrl) return data.publicUrl;
    } catch (e) {
      console.warn('Error getting public URL:', e);
    }

    return filePath;
  },

  /**
   * Removes a single attachment from Supabase Storage.
   */
  async deleteAttachment(filePath) {
    if (!filePath || filePath.startsWith('data:')) return;
    try {
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    } catch (e) {
      console.warn('Failed to delete attachment from storage:', e);
    }
  },

  /**
   * Removes multiple attachments from Supabase Storage in a single call.
   * @param {string[]} filePaths
   */
  async deleteAttachments(filePaths = []) {
    if (!filePaths || !filePaths.length) return;
    const validPaths = filePaths.filter(p => p && !p.startsWith('data:') && !p.startsWith('http'));
    if (!validPaths.length) return;

    try {
      await supabase.storage.from(BUCKET_NAME).remove(validPaths);
    } catch (e) {
      console.warn('Failed to delete attachments from storage:', e);
    }
  }
};
