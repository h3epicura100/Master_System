import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { masterService } from '../../features/masters/masterService';
import { ChevronDown, Check } from 'lucide-react';

const DEFAULT_EVENT_TIME_OPTIONS = [
  'Lunch',
  'Dinner',
  'Breakfast',
  'Brunch',
  'High Tea',
  'Evening Snacks',
  'Late Night',
  'All Day',
];

export function EventTimeCombobox({
  label,
  value = '',
  onChange,
  options: propOptions,
  placeholder = 'Select or type session...',
  error,
  required,
  optional,
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const { data: dbOptions } = useQuery({
    queryKey: ['master_event_times_combobox'],
    queryFn: async () => {
      const res = await masterService.getEventTimes();
      return (Array.isArray(res) ? res : [])
        .map(x => (typeof x === 'string' ? x : x?.name || ''))
        .filter(name => name && name !== 'Custom');
    },
    enabled: !propOptions,
  });

  const rawOptions = propOptions || dbOptions || DEFAULT_EVENT_TIME_OPTIONS;
  const timeOptions = (Array.isArray(rawOptions) ? rawOptions : [])
    .map(opt => (typeof opt === 'string' ? opt : opt?.name || opt?.label || ''))
    .filter(Boolean);

  const safeValue = typeof value === 'string' ? value : String(value || '');

  // Filter options based on typed value
  const filteredOptions = safeValue
    ? timeOptions.filter(opt => typeof opt === 'string' && opt.toLowerCase().includes(safeValue.toLowerCase()))
    : timeOptions;

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (opt) => {
    onChange(opt);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={containerRef}>
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
        <input
          ref={inputRef}
          type="text"
          value={safeValue}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 shadow-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed pl-3 pr-8 py-2 ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
              : 'border-slate-200 hover:border-slate-300 focus:border-pms-accent focus:ring-4 focus:ring-pms-accent/15'
          } ${className}`}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }
          }}
          className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-pms-accent' : ''}`} />
        </button>
      </div>

      {/* Custom Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, optIdx) => {
              const isSelected = safeValue.trim().toLowerCase() === opt.toLowerCase();
              return (
                <button
                  key={`${opt}-${optIdx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSelectOption(opt);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-pms-primary font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-pms-primary" />}
                </button>
              );
            })
          ) : (
            <div className="px-3.5 py-2.5 text-xs text-slate-500">
              <span>Using custom: </span>
              <span className="font-semibold text-slate-800">"{safeValue}"</span>
            </div>
          )}

          {/* Quick Preset Hint Footer if user typed something custom */}
          {safeValue && !timeOptions.some(opt => opt.toLowerCase() === safeValue.toLowerCase()) && filteredOptions.length > 0 && (
            <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1 text-[10px] text-slate-400 italic">
              Press Enter or click away to keep custom text
            </div>
          )}
        </div>
      )}

      {error && (
        <span className="text-xs font-medium text-red-600 flex items-center gap-1 mt-0.5">
          <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
          {error}
        </span>
      )}
    </div>
  );
}
