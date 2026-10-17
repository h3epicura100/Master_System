import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const Input = forwardRef(({
  label,
  type = 'text',
  error,
  required,
  optional,
  hint,
  helperText,
  mono = false,
  className = '',
  icon: IconComponent,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
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
      
      <div className="relative flex items-center w-full">
        {IconComponent && (
          <div className="absolute left-3 pointer-events-none text-slate-400">
            <IconComponent className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          className={`w-full bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 shadow-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
            IconComponent ? 'pl-9' : 'pl-3.5'
          } ${
            isPassword ? 'pr-10' : 'pr-3.5'
          } py-2.5 ${
            mono ? 'font-mono' : ''
          } ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
              : 'border-slate-200 hover:border-slate-300 focus:border-pms-accent focus:ring-4 focus:ring-pms-accent/15'
          } ${className}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(prev => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors rounded cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-slate-600" />
            ) : (
              <Eye className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}
      </div>

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

Input.displayName = 'Input';

