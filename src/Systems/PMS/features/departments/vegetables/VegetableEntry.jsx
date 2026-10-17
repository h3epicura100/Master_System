import React from 'react';
import { Textarea } from '../../../components/common/Textarea';
import { Button } from '../../../components/common/Button';
import { AttachmentUploader } from '../../../components/common/AttachmentUploader';
import { storageService } from '../../../services/storageService';
import { Trash2, Leaf, Clock, CheckCircle2 } from 'lucide-react';

export function VegetableEntry({ entry, index, bookingId, initialPaths = [], onChange, onRemove }) {
  const handleFieldChange = (field, value) => {
    onChange(index, { ...entry, [field]: value });
  };

  const vegType = entry.vegType || 'Normal';
  const source = entry.source || 'Local';
  const status = entry.status || 'Pending';
  const folderPath = bookingId ? `vegetables/${bookingId}/${entry.id || `item_${index}`}` : 'vegetables';

  const attachments = Array.isArray(entry.attachments)
    ? entry.attachments
    : (entry.keptAttachments || (entry.attachment ? [entry.attachment] : []));

  const handleAddAttachment = (newAtt) => {
    if (!newAtt) return;
    onChange(index, {
      ...entry,
      attachments: [...attachments, newAtt],
    });
  };

  const handleDeleteAttachment = async (idx, att) => {
    if (!att) return;
    const isInitial = initialPaths.includes(att.path);
    const currDeleted = entry.deletedPaths || [];
    let nextDeleted = currDeleted;

    if (isInitial) {
      if (att.path) {
        nextDeleted = [...currDeleted, att.path];
      }
    } else {
      if (att.path) {
        await storageService.deleteAttachment(att.path);
      }
    }

    onChange(index, {
      ...entry,
      attachments: attachments.filter((_, i) => i !== idx),
      deletedPaths: nextDeleted,
    });
  };

  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 sm:p-4.5 space-y-3.5 sm:space-y-4 shadow-2xs relative transition-all border-l-4 border-l-pms-accent hover:border-slate-300">
      {/* Entry Card Header */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 sm:pb-3">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="bg-blue-100 text-pms-primary font-bold text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg flex items-center gap-1.5 flex-shrink-0">
            <Leaf className="w-3.5 h-3.5" />
            <span>Item #{index + 1}</span>
          </span>
          <span className="text-xs font-bold text-slate-800 truncate">
            {vegType} Vegetable {vegType === 'English' ? `(${source})` : ''}
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Remove Item</span>
        </Button>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Veg Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Vegetable Type <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-white p-1 border border-slate-200 rounded-xl shadow-2xs">
            {['Normal', 'English'].map((t) => {
              const isSelected = vegType === t;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => handleFieldChange('vegType', t)}
                  className={`py-1.5 sm:py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-pms-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Source Selector (If English) */}
        {vegType === 'English' ? (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Source Location <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-white p-1 border border-slate-200 rounded-xl shadow-2xs">
              {['Local', 'Outstation'].map((s) => {
                const isSelected = source === s;
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => handleFieldChange('source', s)}
                    className={`py-1.5 sm:py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-pms-accent text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 3. Status Selector */}
        <div className={`space-y-1.5 ${vegType === 'Normal' ? 'sm:col-span-1' : 'sm:col-span-2'}`}>
          <label className="text-xs font-semibold text-slate-700 block">
            Status <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-white p-1 border border-slate-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => handleFieldChange('status', 'Pending')}
              className={`py-1.5 sm:py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                status === 'Pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 opacity-80" />
              <span>Pending</span>
            </button>

            <button
              type="button"
              onClick={() => handleFieldChange('status', 'Complete')}
              className={`py-1.5 sm:py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                status === 'Complete'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 opacity-80" />
              <span>Complete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Remarks Field */}
      <Textarea
        label="Remarks"
        required={status === 'Pending'}
        optional={status === 'Complete'}
        placeholder="Vegetable specifications, weight/quantity or supplier instructions..."
        value={entry.remarks || ''}
        onChange={(e) => handleFieldChange('remarks', e.target.value)}
      />

      {/* Attachment Proof Field (when Complete) */}
      {status === 'Complete' && (
        <div className="pt-2 border-t border-slate-200/80">
          <AttachmentUploader
            label="Attachment Proof (Photos / Videos / Receipt)"
            folderPath={folderPath}
            required={true}
            maxFiles={30}
            maxSizeMb={50}
            attachments={attachments}
            onAddAttachment={handleAddAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            hint="Upload purchase proof, photo, or video (up to 50 MB each, max 30 files)"
          />
        </div>
      )}
    </div>
  );
}
