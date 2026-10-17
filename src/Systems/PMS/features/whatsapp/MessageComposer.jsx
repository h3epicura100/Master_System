import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function MessageComposer({ onSendMessage, disabled = false, sending = false }) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Generate preview for image attachments
  useEffect(() => {
    if (attachment && attachment.type.startsWith('image/')) {
      const url = URL.createObjectURL(attachment);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [attachment]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g. 30MB)
    if (file.size > 30 * 1024 * 1024) {
      toast.error(`File "${file.name}" exceeds 30 MB size limit.`);
      return;
    }

    setAttachment(file);
    e.target.value = '';
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setPreviewUrl(null);
  };

  const handleSubmit = () => {
    if ((!text.trim() && !attachment) || disabled || sending) return;
    const msg = text.trim();
    const currentAttachment = attachment;

    setText('');
    setAttachment(null);
    setPreviewUrl(null);

    onSendMessage({
      text: msg,
      file: currentAttachment,
    });
  };

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const canSend = (text.trim().length > 0 || Boolean(attachment)) && !disabled && !sending;

  return (
    <div className="p-3 bg-white border-t border-slate-200 shadow-xs">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
      />

      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-10 h-10 object-cover rounded-lg border border-emerald-300 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-300">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {attachment.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {formatFileSize(attachment.size)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemoveAttachment}
            disabled={disabled || sending}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2 max-w-full">
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          className={`p-2.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
            attachment
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
          title="Attach document or image"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input Container */}
        <div className="flex-1 relative bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-pms-primary focus-within:ring-2 focus-within:ring-pms-primary/20 focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachment ? 'Add a caption (optional)...' : 'Type a WhatsApp message...'}
            disabled={disabled || sending}
            className="w-full px-3.5 py-2.5 text-sm bg-transparent resize-none border-0 focus:outline-none focus:ring-0 max-h-36 placeholder:text-slate-400 text-slate-800"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className={`p-2.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
            canSend
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:scale-105 active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
          title="Send message (Enter)"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5 translate-x-0.5" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mt-1 px-1.5 text-[11px] text-slate-400">
        <span className="hidden sm:inline">
          Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">Shift + Enter</kbd> for new line
        </span>
        <span className="sm:hidden text-[10px] text-slate-400">Direct WhatsApp</span>
        {text.length > 0 && <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">{text.length} chars</span>}
      </div>
    </div>
  );
}

