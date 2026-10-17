import React, { useState } from 'react';
import { Bot, User, Copy, Check, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';

export function ChatBubble({ message }) {
  const isBot = message.role === 'model' || message.role === 'assistant';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple formatter for bullets and bold text
  const formatContent = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 3 / bold title
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-pms-text text-sm mt-3 mb-1">
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-bold text-pms-text text-base mt-4 mb-1">
            {trimmed.replace('## ', '')}
          </h3>
        );
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[-*•]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-sm my-0.5 leading-relaxed">
            {renderBoldSpan(bulletText)}
          </li>
        );
      }

      // Empty line
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Regular paragraph
      return (
        <p key={idx} className="text-sm my-1 leading-relaxed">
          {renderBoldSpan(line)}
        </p>
      );
    });
  };

  // Helper to replace **bold** with <strong>
  const renderBoldSpan = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`flex gap-3 my-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
          isBot
            ? 'bg-gradient-to-br from-blue-700 to-blue-900 text-white ring-2 ring-blue-200'
            : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white'
        }`}
      >
        {isBot ? <Sparkles className="w-4 h-4 text-amber-300" /> : <User className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
        isBot
          ? 'bg-white border border-slate-200 text-slate-800'
          : 'bg-pms-primary text-white'
      }`}>
        {/* Header (Bot name) */}
        {isBot && (
          <div className="flex items-center justify-between gap-2 mb-1 border-b border-slate-100 pb-1">
            <span className="text-xs font-bold text-pms-primary flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
              H3 Menu AI Assistant
            </span>
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity p-0.5 rounded"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* User Attachment Preview */}
        {!isBot && message.attachment && (
          <div className="mb-2.5 rounded-xl overflow-hidden">
            {message.attachment.previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-white/20 bg-black/10">
                <img
                  src={message.attachment.previewUrl}
                  alt={message.attachment.name || 'Attached image'}
                  className="max-h-48 w-auto max-w-full rounded-lg object-contain mx-auto"
                />
                <div className="px-2 py-1 bg-black/30 text-[11px] text-white/90 truncate">
                  {message.attachment.name}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-white/15 border border-white/25 px-3 py-2 rounded-xl text-xs text-white">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{message.attachment.name}</p>
                  {message.attachment.size ? (
                    <p className="text-[10px] text-blue-200">{formatFileSize(message.attachment.size)}</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`text-sm ${isBot ? 'text-slate-700' : 'text-white'}`}>
          {formatContent(message.text)}
        </div>

        {/* Timestamp & metadata */}
        <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${
          isBot ? 'text-slate-400' : 'text-blue-200'
        }`}>
          {message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
