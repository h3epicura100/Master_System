import React, { useLayoutEffect, useRef } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { TAG_SIZES, CUSTOM_SIZE_ID, DEFAULT_SIZE_CHOICE } from './tagSizes';

const fieldClass =
  'w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder:text-slate-300 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0a4a87]/30 focus:border-[#0a4a87]';

const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-400';

/**
 * A textarea that grows to show all of its text (up to maxHeight, then it
 * scrolls), so nothing is hidden behind a tiny scrolling box.
 *
 * `singleLine` keeps the value on one logical line (Enter is blocked and pasted
 * line breaks become spaces) while still wrapping visually, so a long dish
 * name is fully visible instead of being clipped by a one-line input.
 */
function AutoGrowTextarea({ value, onChange, singleLine = false, maxHeight = 176, rows = 2, className = '', ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const fit = () => {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [value, maxHeight]);

  const handleChange = (e) => {
    if (!singleLine) return onChange(e);
    const cleaned = e.target.value.replace(/\s*[\r\n]+\s*/g, ' ');
    return onChange({ target: { value: cleaned } });
  };

  const handleKeyDown = (e) => {
    if (singleLine && e.key === 'Enter') e.preventDefault();
  };

  return (
    <textarea
      ref={ref}
      value={value}
      rows={rows}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={`${className} resize-none`}
      {...rest}
    />
  );
}

function DishRow({ dish, index, defaultSize, customSize, autoFocus, onChange, onRemove }) {
  const hasTitle = dish.title.trim().length > 0;

  const sizeLabel = (size, fallback) => (size ? `${size.label} · ${size.sublabel}` : fallback);

  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-[#0a4a87]/10 text-[#0a4a87] text-xs font-semibold flex items-center justify-center"
          aria-hidden="true"
        >
          {index + 1}
        </span>

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={labelClass}>Dish name</span>
              <button
                type="button"
                onClick={() => onRemove(dish.id)}
                aria-label={`Remove dish ${index + 1}`}
                title="Remove this dish"
                className="-my-1 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <AutoGrowTextarea
              singleLine
              rows={1}
              maxHeight={96}
              autoFocus={autoFocus}
              value={dish.title}
              onChange={(e) => onChange(dish.id, { title: e.target.value })}
              placeholder="e.g. PANI PURI"
              className={`${fieldClass} font-medium`}
            />
            {!hasTitle && (
              <p className="mt-1 text-[11px] text-amber-600">Needs a dish name — this tag is skipped until it has one.</p>
            )}
          </div>

          <div>
            <span className={`${labelClass} block mb-1`}>
              Description <span className="normal-case font-normal tracking-normal text-slate-400">(optional, one item per line)</span>
            </span>
            <AutoGrowTextarea
              value={dish.description}
              onChange={(e) => onChange(dish.id, { description: e.target.value })}
              placeholder="Shown below the line on the tag"
              className={fieldClass}
            />
          </div>

          <div>
            <span className={`${labelClass} block mb-1`}>Tag size</span>
            <select
              value={dish.sizeId}
              onChange={(e) => onChange(dish.id, { sizeId: e.target.value })}
              title={
                dish.sizeId === DEFAULT_SIZE_CHOICE
                  ? sizeLabel(defaultSize, 'Set a valid custom size')
                  : dish.sizeId === CUSTOM_SIZE_ID
                    ? sizeLabel(customSize, 'Set a valid custom size')
                    : undefined
              }
              className={`${fieldClass} text-[13px]`}
            >
              <option value={DEFAULT_SIZE_CHOICE}>
                Default · {defaultSize ? `${defaultSize.label} (${defaultSize.sublabel})` : 'set a valid custom size'}
              </option>
              {TAG_SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.sublabel})
                </option>
              ))}
              <option value={CUSTOM_SIZE_ID}>
                Custom · {customSize ? customSize.sublabel : 'set a valid custom size'}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDishButton({ onAdd, label }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-[#0a4a87] border border-dashed border-[#0a4a87]/40 hover:border-[#0a4a87] hover:bg-[#0a4a87]/5 rounded-xl py-2.5 transition-colors"
    >
      <Plus className="w-4 h-4" /> {label}
    </button>
  );
}

export function DishList({ dishes, defaultSize, customSize, focusDishId, onChange, onRemove, onAdd, onClear }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Dishes <span className="text-slate-400 font-normal">({dishes.length})</span>
          </label>
          <p className="text-xs text-slate-400 mt-0.5">Each dish prints as its own tag. Edit any text or pick a size per dish.</p>
        </div>
        {dishes.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded-md shrink-0"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {dishes.length === 0 ? (
        <div className="space-y-3">
          <div className="text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg py-6 px-4">
            No dishes yet. Use Smart Paste above, or add a dish manually.
          </div>
          <AddDishButton onAdd={onAdd} label="Add a dish" />
        </div>
      ) : (
        <div className="space-y-3">
          {dishes.map((dish, index) => (
            <DishRow
              key={dish.id}
              dish={dish}
              index={index}
              defaultSize={defaultSize}
              customSize={customSize}
              autoFocus={dish.id === focusDishId}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
          <AddDishButton onAdd={onAdd} label="Add another dish" />
        </div>
      )}
    </div>
  );
}
