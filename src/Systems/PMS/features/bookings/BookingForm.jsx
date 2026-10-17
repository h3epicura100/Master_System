import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingSchema } from './bookingValidation';
import { masterService } from '../masters/masterService';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Textarea } from '../../components/common/Textarea';
import { Button } from '../../components/common/Button';
import { EventTimeCombobox } from '../../components/common/EventTimeCombobox';
import { todayStr } from '../../utils/dateUtils';
import { User, Calendar, Share2, Plus, Trash2, Users, AlertCircle } from 'lucide-react';

const DEFAULT_FUNCTION_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Engagement', 'Anniversary', 'Other'];

export function BookingForm({ initialValues, onSubmit, onCancel, isSubmitting }) {
  // Query dynamic master options
  const { data: functionTypes = DEFAULT_FUNCTION_TYPES } = useQuery({
    queryKey: ['master_function_types'],
    queryFn: async () => {
      const res = await masterService.getFunctionTypes();
      return res.map(x => x.name);
    },
  });

  const defaultStartDate = initialValues?.eventStartDate || initialValues?.eventDate || '';
  const defaultEndDate = initialValues?.eventEndDate || initialValues?.eventDate || defaultStartDate || '';

  // Initial schedule items fallback
  const initialSchedule = (initialValues?.eventSchedule && initialValues.eventSchedule.length > 0)
    ? initialValues.eventSchedule.map((s, idx) => ({
        id: s.id || String(idx),
        date: s.date || defaultStartDate || '',
        timeLabel: s.timeLabel || '',
        guestCount: s.guestCount ?? '',
        sortOrder: s.sortOrder ?? idx,
      }))
    : [
        {
          date: defaultStartDate || '',
          timeLabel: initialValues?.eventStart || '',
          guestCount: initialValues?.guestCount ?? '',
          sortOrder: 0,
        },
      ];

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customerName: initialValues?.customerName || '',
      customerMobile: initialValues?.customerMobile || '',
      altNumber: initialValues?.altNumber || '',
      functionType: initialValues?.functionType || functionTypes[0] || 'Wedding',
      eventStartDate: defaultStartDate,
      eventEndDate: defaultEndDate,
      venueName: initialValues?.venueName || '',
      referenceName: initialValues?.referenceName || '',
      referenceNumber: initialValues?.referenceNumber || '',
      remarks: initialValues?.remarks || '',
      eventSchedule: initialSchedule,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'eventSchedule',
  });

  const watchStartDate = watch('eventStartDate');
  const watchEndDate = watch('eventEndDate');
  const watchSchedule = watch('eventSchedule') || [];

  // When start date changes and end date is empty or was previously synced, update end date & sessions
  const handleStartDateChange = (e) => {
    const val = e.target.value;
    const prevStart = watchStartDate;
    setValue('eventStartDate', val, { shouldValidate: true });
    
    let newEnd = watchEndDate;
    if (!watchEndDate || watchEndDate < val) {
      newEnd = val;
      setValue('eventEndDate', val, { shouldValidate: true });
    }

    // Auto-update schedule session dates if empty, equal to old start date, or out of range
    const currentSchedule = watchSchedule || [];
    currentSchedule.forEach((row, idx) => {
      if (!row.date || row.date === prevStart || row.date < val || (newEnd && row.date > newEnd)) {
        setValue(`eventSchedule.${idx}.date`, val, { shouldValidate: true });
      }
    });
  };

  // When end date changes, ensure session dates do not exceed new end date
  const handleEndDateChange = (e) => {
    const val = e.target.value;
    setValue('eventEndDate', val, { shouldValidate: true });

    const currentSchedule = watchSchedule || [];
    currentSchedule.forEach((row, idx) => {
      if (row.date && val && row.date > val) {
        setValue(`eventSchedule.${idx}.date`, val, { shouldValidate: true });
      }
    });
  };

  // Compute live total pax across all sessions
  const totalPax = watchSchedule.reduce((sum, row) => {
    const count = Number(row?.guestCount) || 0;
    return sum + (count > 0 ? count : 0);
  }, 0);

  const handleAddRow = () => {
    const lastRow = watchSchedule[watchSchedule.length - 1];
    let defaultDate = watchStartDate || '';
    if (lastRow?.date) {
      if ((!watchStartDate || lastRow.date >= watchStartDate) && (!watchEndDate || lastRow.date <= watchEndDate)) {
        defaultDate = lastRow.date;
      }
    }
    append({
      date: defaultDate,
      timeLabel: '',
      guestCount: '',
      sortOrder: watchSchedule.length,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* 1. Meta Block */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Input
          label="Booking ID"
          value={initialValues?.id || `H3MS-${new Date().getFullYear()}-AUTO`}
          disabled
          mono
        />
        <Input
          label="Assign Date"
          value={initialValues?.createdAt || todayStr()}
          disabled
        />
      </div>

      {/* 2. Customer Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pms-primary border-b border-slate-100 pb-1.5">
          <User className="w-4 h-4 text-pms-accent" />
          <span>Customer Contact</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Input
            label="Customer Name"
            required
            placeholder="e.g. Rahul Sharma"
            {...register('customerName')}
            error={errors.customerName?.message}
          />

          <Input
            label="Customer Mobile"
            optional
            placeholder="9876543210"
            {...register('customerMobile')}
            error={errors.customerMobile?.message}
          />

          <Input
            label="Alternate Number"
            optional
            placeholder="Secondary mobile"
            {...register('altNumber')}
          />
        </div>
      </div>

      {/* 3. Event Parameters & Schedule Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pms-primary border-b border-slate-100 pb-1.5">
          <Calendar className="w-4 h-4 text-pms-accent" />
          <span>Event Dates & Master Details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Select
            label="Function Type"
            required
            options={functionTypes}
            {...register('functionType')}
            error={errors.functionType?.message}
          />

          <Input
            label="Event Start Date"
            type="date"
            required
            value={watchStartDate}
            onChange={handleStartDateChange}
            error={errors.eventStartDate?.message}
          />

          <Input
            label="Event End Date"
            type="date"
            required
            min={watchStartDate}
            value={watchEndDate}
            onChange={handleEndDateChange}
            error={errors.eventEndDate?.message}
          />

          <div className="sm:col-span-2 lg:col-span-3">
            <Input
              label="Venue Name"
              required
              placeholder="e.g. Hotel Grand Regency / Royal Palms Banquet"
              {...register('venueName')}
              error={errors.venueName?.message}
            />
          </div>
        </div>

        {/* 4. Interactive Schedule Builder */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Event Schedule & Sessions
              </span>
              <span className="text-[11px] text-slate-400 block">
                Specify meal sessions & guest count for each day
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddRow}
              className="w-full sm:w-auto gap-1 text-xs justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Session</span>
            </Button>
          </div>

          {errors.eventSchedule?.root?.message && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errors.eventSchedule.root.message}</span>
            </div>
          )}

          {/* DESKTOP VIEW: Clean Table Format (Hidden on Mobile) */}
          <div className="hidden md:block border border-slate-200 rounded-xl bg-white shadow-xs">
            <div className="overflow-x-visible">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 rounded-t-xl">
                    <th className="py-2.5 px-3 w-[28%] rounded-tl-xl">Session Date *</th>
                    <th className="py-2.5 px-3 w-[44%]">Time / Session Label *</th>
                    <th className="py-2.5 px-3 w-[18%] text-right">Guest Count *</th>
                    <th className="py-2.5 px-2 w-[10%] text-center rounded-tr-xl"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => {
                    const rowError = errors.eventSchedule?.[index];

                    return (
                      <tr key={field.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 align-top">
                          <input
                            type="date"
                            min={watchStartDate}
                            max={watchEndDate}
                            value={watch(`eventSchedule.${index}.date`) || ''}
                            onChange={(e) =>
                              setValue(`eventSchedule.${index}.date`, e.target.value, { shouldValidate: true })
                            }
                            className={`w-full bg-white border rounded-lg text-xs px-2.5 py-1.5 focus:outline-none transition-colors ${
                              rowError?.date
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-slate-200 focus:border-pms-accent'
                            }`}
                          />
                          {rowError?.date && (
                            <span className="text-[10px] text-red-500 block mt-0.5">
                              {rowError.date.message}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <EventTimeCombobox
                            value={watch(`eventSchedule.${index}.timeLabel`) || ''}
                            onChange={(val) =>
                              setValue(`eventSchedule.${index}.timeLabel`, val, { shouldValidate: true })
                            }
                            placeholder="e.g. Lunch / SANGEET Dinner"
                            error={rowError?.timeLabel?.message}
                            className="text-xs py-1.5 rounded-lg"
                          />
                        </td>
                        <td className="py-2 px-3 align-top">
                          <input
                            type="number"
                            min="1"
                            placeholder="Guests"
                            value={watch(`eventSchedule.${index}.guestCount`) ?? ''}
                            onChange={(e) =>
                              setValue(
                                `eventSchedule.${index}.guestCount`,
                                e.target.value === '' ? '' : Number(e.target.value),
                                { shouldValidate: true }
                              )
                            }
                            className={`w-full bg-white border rounded-lg text-xs px-2.5 py-1.5 font-mono text-right focus:outline-none transition-colors ${
                              rowError?.guestCount
                                ? 'border-red-400 focus:border-red-500'
                                : 'border-slate-200 focus:border-pms-accent'
                            }`}
                          />
                          {rowError?.guestCount && (
                            <span className="text-[10px] text-red-500 block mt-0.5">
                              {rowError.guestCount.message}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center align-top">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            title={fields.length === 1 ? 'Minimum 1 session required' : 'Remove session'}
                            className="p-1.5 text-slate-400 hover:text-red-500 disabled:text-slate-200 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200 font-bold text-xs text-slate-800">
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px] text-slate-500">
                      Total Guest Count:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-pms-primary">
                      {totalPax.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW: Card Format (Zero Horizontal Overflow, 100% Responsive) */}
          <div className="space-y-3 md:hidden">
            {fields.map((field, index) => {
              const rowError = errors.eventSchedule?.[index];

              return (
                <div
                  key={field.id}
                  className="bg-slate-50/90 border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-pms-primary flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </span>
                      <span>Session {index + 1}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      title={fields.length === 1 ? 'Minimum 1 session required' : 'Remove session'}
                      className="p-1 text-slate-400 hover:text-red-500 disabled:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        min={watchStartDate}
                        max={watchEndDate}
                        value={watch(`eventSchedule.${index}.date`) || ''}
                        onChange={(e) =>
                          setValue(`eventSchedule.${index}.date`, e.target.value, { shouldValidate: true })
                        }
                        className={`w-full bg-white border rounded-lg text-xs px-2 py-1.5 focus:outline-none transition-colors ${
                          rowError?.date ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-pms-accent'
                        }`}
                      />
                      {rowError?.date && (
                        <span className="text-[10px] text-red-500 block mt-0.5">{rowError.date.message}</span>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                        Guest Count <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Guests"
                        value={watch(`eventSchedule.${index}.guestCount`) ?? ''}
                        onChange={(e) =>
                          setValue(
                            `eventSchedule.${index}.guestCount`,
                            e.target.value === '' ? '' : Number(e.target.value),
                            { shouldValidate: true }
                          )
                        }
                        className={`w-full bg-white border rounded-lg text-xs px-2 py-1.5 font-mono text-right focus:outline-none transition-colors ${
                          rowError?.guestCount ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-pms-accent'
                        }`}
                      />
                      {rowError?.guestCount && (
                        <span className="text-[10px] text-red-500 block mt-0.5">{rowError.guestCount.message}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Time / Session Label <span className="text-red-500">*</span>
                    </label>
                    <EventTimeCombobox
                      value={watch(`eventSchedule.${index}.timeLabel`) || ''}
                      onChange={(val) =>
                        setValue(`eventSchedule.${index}.timeLabel`, val, { shouldValidate: true })
                      }
                      placeholder="e.g. Lunch / SANGEET Dinner"
                      error={rowError?.timeLabel?.message}
                      className="text-xs py-1.5 rounded-lg"
                    />
                  </div>
                </div>
              );
            })}

            {/* Mobile Total Pax Banner */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Total Guest Count:
              </span>
              <span className="font-mono font-bold text-base text-pms-primary">
                {totalPax.toLocaleString()}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 5. Reference & Notes Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pms-primary border-b border-slate-100 pb-1.5">
          <Share2 className="w-4 h-4 text-pms-accent" />
          <span>Reference & Remarks</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Input
            label="Reference Name"
            optional
            placeholder="Referrer name"
            {...register('referenceName')}
          />

          <Input
            label="Reference Number"
            optional
            placeholder="Referrer phone"
            {...register('referenceNumber')}
          />

          <div className="sm:col-span-2">
            <Textarea
              label="Remarks"
              optional
              placeholder="Special instructions, venue guidelines, or menu preferences..."
              {...register('remarks')}
            />
          </div>
        </div>
      </div>

      {/* Form Action Footer */}
      <div className="pt-4 sm:pt-5 border-t border-slate-200 flex items-center justify-end gap-3 mt-6">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving Booking...' : 'Save Booking'}
        </Button>
      </div>
    </form>
  );
}
