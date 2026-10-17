import React, { useState, useRef, useId } from 'react';
import { storageService } from '../../services/storageService';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  X,
  ExternalLink,
  AlertCircle,
  Eye,
  Film,
  Loader2
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function getFileCategory(fileOrObj) {
  const mime = fileOrObj.type || fileOrObj.mimeType || '';
  const name = fileOrObj.name || fileOrObj.path || '';
  const ext = name.split('.').pop()?.toLowerCase();

  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(ext)) {
    return 'video';
  }
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  return 'document';
}

function FileTypeIcon({ category, className = 'w-4 h-4' }) {
  if (category === 'video') return <VideoIcon className={`${className} text-indigo-500 flex-shrink-0`} />;
  if (category === 'image') return <ImageIcon className={`${className} text-emerald-500 flex-shrink-0`} />;
  if (category === 'pdf') return <FileText className={`${className} text-rose-500 flex-shrink-0`} />;
  return <FileText className={`${className} text-blue-500 flex-shrink-0`} />;
}

export function AttachmentUploader({
  label = 'Attachments',
  required = false,
  maxFiles = 30,
  maxSizeMb = 50,
  accept = 'image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv',
  folderPath = 'attachments',
  attachments = [],
  onAddAttachment,
  onDeleteAttachment,
  onUploadingChange,
  disabled = false,
  hint = 'Photos, videos (proof of work), PDFs or docs up to 50 MB each',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState('');
  const [uploadingList, setUploadingList] = useState([]); // [{ id, name, size, type, status, error }]
  const [previewMedia, setPreviewMedia] = useState(null); // { url, type, title }
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null); // { idx, att }
  const fileInputRef = useRef(null);
  const generatedId = useId();
  const inputId = `file_input_${generatedId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const currentTotal = (attachments?.length || 0) + uploadingList.length;
  const isLimitReached = currentTotal >= maxFiles;

  const handleFilesSelected = async (incomingList) => {
    setLocalError('');
    if (!incomingList || !incomingList.length || disabled) return;

    const filesToUpload = [];
    let oversizedCount = 0;
    let limitExceeded = false;

    for (let i = 0; i < incomingList.length; i++) {
      const file = incomingList[i];

      if ((attachments?.length || 0) + uploadingList.length + filesToUpload.length >= maxFiles) {
        limitExceeded = true;
        break;
      }

      if (file.size > maxSizeBytes) {
        oversizedCount++;
        continue;
      }

      filesToUpload.push(file);
    }

    if (oversizedCount > 0) {
      setLocalError(`Some files were skipped because they exceed the ${maxSizeMb} MB limit.`);
    } else if (limitExceeded) {
      setLocalError(`Maximum ${maxFiles} attachments allowed in total.`);
    }

    if (filesToUpload.length === 0) return;

    // Create uploading tracking items
    const newUploadingItems = filesToUpload.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
      status: 'uploading',
    }));

    setUploadingList(prev => {
      const next = [...prev, ...newUploadingItems];
      if (onUploadingChange) onUploadingChange(next.length > 0);
      return next;
    });

    // Upload each file immediately to Supabase Storage
    for (const item of newUploadingItems) {
      try {
        const uploadedAtt = await storageService.uploadAttachment(folderPath, item.file);
        if (uploadedAtt && onAddAttachment) {
          onAddAttachment(uploadedAtt);
        }
        setUploadingList(prev => {
          const next = prev.filter(u => u.id !== item.id);
          if (onUploadingChange) onUploadingChange(next.length > 0);
          return next;
        });
      } catch (err) {
        console.error(`Failed to upload ${item.name}:`, err);
        setLocalError(`Failed to upload ${item.name}: ${err.message || 'Network error'}`);
        setUploadingList(prev => {
          const next = prev.filter(u => u.id !== item.id);
          if (onUploadingChange) onUploadingChange(next.length > 0);
          return next;
        });
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (disabled || isLimitReached) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isLimitReached) return;
    const files = Array.from(e.dataTransfer.files || []);
    handleFilesSelected(files);
  };

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFilesSelected(files);
    }
    // Reset file input value so selecting the same file again works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewOrPreview = async (att) => {
    if (!att || !att.path) return;
    const cat = getFileCategory(att);

    try {
      setIsLoadingPreview(true);
      let url = att.path;
      if (!att.path.startsWith('data:') && !att.path.startsWith('http://') && !att.path.startsWith('https://')) {
        url = await storageService.getSignedUrl(att.path);
      }

      if (!url) {
        setLocalError('Could not generate download link for file.');
        return;
      }

      if (cat === 'image' || cat === 'video') {
        setPreviewMedia({
          url,
          type: cat,
          title: att.name || 'Attachment Preview',
        });
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error previewing attachment:', err);
      setLocalError('Failed to open file preview.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Label and Count Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
        <label className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
        </label>
        <span className="text-[11px] font-medium text-slate-400 flex-shrink-0">
          {maxFiles === 1 ? (
            <span className={currentTotal >= 1 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}>
              {currentTotal >= 1 ? '1 file attached' : `1 file max (${maxSizeMb} MB)`}
            </span>
          ) : (
            <>
              <span className={currentTotal >= maxFiles ? 'text-amber-600 font-bold' : 'text-slate-600 font-semibold'}>
                {currentTotal}
              </span>
              /{maxFiles} files (max {maxSizeMb} MB each)
            </>
          )}
        </span>
      </div>

      {/* Drag and Drop Zone / Mobile File Trigger */}
      {!disabled && !isLimitReached && (
        <label
          htmlFor={inputId}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-3.5 sm:p-4 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 text-center sm:text-left select-none ${
            isDragging
              ? 'border-pms-accent bg-blue-50/70 ring-4 ring-pms-accent/15'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 hover:border-pms-accent/70 active:bg-blue-50/30'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 text-pms-primary flex items-center justify-center flex-shrink-0 shadow-xs pointer-events-none">
            <UploadCloud className="w-5 h-5 text-pms-accent" />
          </div>

          <div className="flex-1 min-w-0 pointer-events-none">
            <div className="text-xs font-semibold text-slate-800">
              <span className="text-pms-accent hover:underline">Click to browse</span> or drag & drop {maxFiles === 1 ? 'file' : 'files'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {hint}
            </div>
          </div>

          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            multiple={maxFiles > 1}
            accept={accept}
            onChange={handleInputChange}
            className="sr-only"
            disabled={disabled}
          />
        </label>
      )}

      {/* Limit Reached Banner */}
      {isLimitReached && !disabled && (
        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
          <span>
            {maxFiles === 1
              ? '1 file attached. To upload a different file, remove or delete the current one first.'
              : `Maximum attachment limit reached (${maxFiles}/${maxFiles}). Delete an existing item to upload new ones.`}
          </span>
        </div>
      )}

      {/* Local Error message */}
      {localError && (
        <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span className="flex-1">{localError}</span>
          <button
            type="button"
            onClick={() => setLocalError('')}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment List & Uploading Items */}
      {currentTotal > 0 && (
        <div className="space-y-2 pt-1">
          {/* Active Uploading Files Banner/Cards */}
          {uploadingList.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pms-accent flex items-center gap-1.5 px-0.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Uploading to Storage ({uploadingList.length})...
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uploadingList.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg shadow-2xs animate-pulse"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Loader2 className="w-4 h-4 text-pms-accent animate-spin flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[10px] text-blue-600 font-medium">
                          Uploading {formatBytes(item.size)}...
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
                Attached Files ({attachments.length}/{maxFiles})
              </span>
              <div className="max-h-60 sm:max-h-72 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((att, idx) => {
                    const cat = getFileCategory(att);
                    return (
                      <div
                        key={att.path || idx}
                        className="flex items-center justify-between gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-all group"
                      >
                        {/* File details & interactive name */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg flex-shrink-0">
                            <FileTypeIcon category={cat} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleViewOrPreview(att)}
                              disabled={isLoadingPreview}
                              className="text-left font-semibold text-xs text-slate-800 hover:text-pms-accent truncate block max-w-full cursor-pointer transition-colors"
                              title={`Click to preview ${att.name || 'Attachment'}`}
                            >
                              {att.name || 'Attachment'}
                            </button>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {att.size ? <span>{formatBytes(att.size)}</span> : null}
                              {cat === 'video' && <span className="font-semibold text-indigo-600">Video Proof</span>}
                            </div>
                          </div>
                        </div>

                        {/* Actions: View button on the left of actions, separated by divider from isolated Delete button */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            disabled={isLoadingPreview}
                            onClick={() => handleViewOrPreview(att)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80 rounded-lg cursor-pointer transition-colors shadow-2xs"
                            title={cat === 'image' || cat === 'video' ? 'Preview media' : 'View / Download file'}
                          >
                            {cat === 'image' || cat === 'video' ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Preview</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                <span>View</span>
                              </>
                            )}
                          </button>

                          {onDeleteAttachment && !disabled && (
                            <>
                              <div className="h-4 w-px bg-slate-200 mx-0.5" />
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTarget({ idx, att })}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent rounded-lg cursor-pointer transition-all"
                                title="Delete attachment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-xl flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900">Delete Attachment?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove this file? This will remove it from the department task.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* File Detail Preview Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <FileTypeIcon category={getFileCategory(confirmDeleteTarget.att)} className="w-5 h-5" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {confirmDeleteTarget.att.name || 'Attachment'}
                </div>
                {confirmDeleteTarget.att.size ? (
                  <div className="text-[10px] text-slate-400">
                    {formatBytes(confirmDeleteTarget.att.size)}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { idx, att } = confirmDeleteTarget;
                  setConfirmDeleteTarget(null);
                  if (onDeleteAttachment) {
                    onDeleteAttachment(idx, att);
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Attachment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-slate-900 rounded-2xl max-w-2xl w-full p-4 overflow-hidden shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700 text-white">
              <span className="text-xs font-semibold truncate flex items-center gap-2">
                {previewMedia.type === 'video' ? <Film className="w-4 h-4 text-indigo-400" /> : <ImageIcon className="w-4 h-4 text-emerald-400" />}
                {previewMedia.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center bg-black/50 rounded-xl overflow-hidden max-h-[70vh]">
              {previewMedia.type === 'video' ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[65vh] w-full rounded-lg"
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.title}
                  className="max-h-[65vh] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

