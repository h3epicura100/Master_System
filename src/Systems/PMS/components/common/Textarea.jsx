import React, { forwardRef } from 'react';

export const Textarea = forwardRef(({
  label,
  error,
  required,
  optional,
  hint,
  helperText,
  rows = 3,
  className = '',
  ...props
}, ref) => {
  const displayHint = hint || helperText;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1">
            {label} {required && <span className="text-red-500 font-bold">*</span>}
          </span>
          {optional && (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              Optional
            </span>
          )}
        </label>
      )}

      <textarea
        ref={ref}
        rows={rows}
        className={`w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 shadow-sm resize-y focus:outline-none hover:border-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
            : 'focus:border-pms-accent focus:ring-4 focus:ring-pms-accent/15'
        } ${className}`}
        {...props}
      />

      {displayHint && !error && <span className="text-[11px] text-slate-400">{displayHint}</span>}
      {error && (
        <span className="text-xs font-medium text-red-600 flex items-center gap-1 mt-0.5">
          <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
          {error}
        </span>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
