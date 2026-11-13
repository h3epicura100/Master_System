import React from 'react';
import { CheckCircle2, Ruler } from 'lucide-react';
import { TAG_SIZES, CUSTOM_SIZE_ID } from './tagSizes';

const UNITS = ['mm', 'cm', 'in'];

const inputClass =
  'w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0a4a87]/30 focus:border-[#0a4a87]';

function SizeButton({ selected, onClick, icon, title, subtitle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors ${
        selected ? 'border-[#0a4a87] bg-[#0a4a87]/5' : 'border-slate-200 hover:border-slate-300'
      } ${className}`}
    >
      <span className="flex items-center gap-1.5">
        {selected ? <CheckCircle2 className="w-3.5 h-3.5 text-[#0a4a87] shrink-0" /> : icon}
        <span className={`text-sm font-medium ${selected ? 'text-[#0a4a87]' : 'text-slate-700'}`}>{title}</span>
      </span>
      {subtitle && <span className="text-xs text-slate-400 mt-0.5">{subtitle}</span>}
    </button>
  );
}

/**
 * Picks the page-level default size. New dishes follow it, and any dish that
 * is set to "Default" in the list below changes with it.
 *
 * `showCustomFields` is controlled by the page because the custom width/height
 * is shared: it is needed when Custom is the default AND when any individual
 * dish picks Custom while the default is a preset.
 */
export function SizeSelector({ sizeId, onSizeChange, custom, onCustomChange, isCustomValid, showCustomFields }) {
  const isCustomSelected = sizeId === CUSTOM_SIZE_ID;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <label className="text-sm font-medium text-slate-700 block">Default Tag Size</label>
      <p className="text-xs text-slate-400 mt-0.5 mb-3">
        Used for every dish unless you pick a different size for it in the list below.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {TAG_SIZES.map((s) => (
          <SizeButton
            key={s.id}
            selected={sizeId === s.id}
            onClick={() => onSizeChange(s.id)}
            title={s.label}
            subtitle={s.sublabel}
          />
        ))}

        <SizeButton
          selected={isCustomSelected}
          onClick={() => onSizeChange(CUSTOM_SIZE_ID)}
          icon={<Ruler className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          title="Custom Size"
          subtitle="Enter your own width × height"
          className="col-span-2"
        />
      </div>

      {showCustomFields && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Width</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={custom.width}
              onChange={(e) => onCustomChange({ ...custom, width: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Height</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={custom.height}
              onChange={(e) => onCustomChange({ ...custom, height: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Unit</label>
            <select
              value={custom.unit}
              onChange={(e) => onCustomChange({ ...custom, unit: e.target.value })}
              className={inputClass}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          {!isCustomValid && (
            <p className="col-span-3 text-xs text-red-500 mt-0.5">Enter a width and height greater than 0.</p>
          )}
        </div>
      )}
    </div>
  );
}
