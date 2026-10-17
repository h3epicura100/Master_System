import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Wand2, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const QUICK_PROMPTS = [
  { label: '✨ Add Live Chaat & Italian', prompt: 'Please add "Gems of H3 Chaat" with 4 types of puchka waters and a Live Italiano Woodfired Pizza & Pasta station.' },
  { label: '👥 Add Staff Meals Grid', prompt: 'Add staff meal breakdown: Day 1: 40 B, 50 L, 40 Hi-Tea, 60 Dinner. Day 2: 50 B, 60 L, 60 Hi-Tea, 80 Dinner.' },
  { label: '⚡ Add Catering Power & Rules', prompt: 'Add standard rules: 10% guest increment manageable, 125 KVA DG Power mandatory, No outside staff food at our counters.' },
  { label: '🍹 Add Welcome Drinks Bar', prompt: 'Add fresh tender coconut water, spiced jamun shots, gondhoraj shikanji, and liquid nitrogen paan mojito.' }
];

export function MenuChatbotInput({ onSendMessage, isLoading, disabled }) {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds 15 MB limit. Please select a smaller file.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target.result;
      const base64 = typeof result === 'string' ? result.split(',')[1] : '';
      setAttachment({
        file,
        name: file.name,
        mimeType: file.type || (file.name.endsWith('.csv') ? 'text/csv' : file.name.endsWith('.txt') ? 'text/plain' : 'application/octet-stream'),
        size: file.size,
        base64,
        previewUrl: file.type.startsWith('image/') ? result : null,
      });
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // allow selecting same file again
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading || disabled) return;

    onSendMessage(input.trim(), attachment);
    setInput('');
    setAttachment(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickPrompt = (promptText) => {
    onSendMessage(promptText, null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3 space-y-2">
      {/* Quick Prompts Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
          <Wand2 className="w-3 h-3 text-blue-500" />
          Quick:
        </span>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading || disabled}
            onClick={() => handleQuickPrompt(qp.prompt)}
            className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-700 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-xl text-xs animate-in fade-in duration-150">
          {attachment.previewUrl ? (
            <img
              src={attachment.previewUrl}
              alt={attachment.name}
              className="w-10 h-10 object-cover rounded-lg border border-blue-200 shrink-0 bg-white"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{attachment.name}</p>
            <p className="text-[11px] text-slate-500">{formatFileSize(attachment.size)} • Ready to send</p>
          </div>
          <button
            type="button"
            onClick={handleRemoveAttachment}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,text/plain,text/csv,.txt,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-50 border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-xl p-2 transition-all">
        {/* Attachment Button */}
        <button
          type="button"
          disabled={isLoading || disabled}
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
          title="Attach image, menu photo, PDF, or text file (Max 15MB)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachment ? "Add instructions for this attachment (optional)..." : "Describe event, paste WhatsApp plan, or attach menu photo/PDF..."}
          rows={1}
          disabled={isLoading || disabled}
          className="w-full bg-transparent resize-none border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 max-h-36 leading-relaxed py-1 px-1"
        />

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="submit"
            disabled={(!input.trim() && !attachment) || isLoading || disabled}
            className="p-2 bg-pms-primary hover:bg-pms-primary-hover disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg shadow-sm transition-all flex items-center justify-center"
            title="Send (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Press <kbd className="bg-slate-100 px-1 py-0.5 rounded border text-[10px]">Enter</kbd> to send, <kbd className="bg-slate-100 px-1 py-0.5 rounded border text-[10px]">Shift+Enter</kbd> for new line</span>
        <span className="hidden sm:inline text-slate-400">Attach photos, PDFs, or TXT (up to 15MB)</span>
      </div>
    </div>
  );
}
