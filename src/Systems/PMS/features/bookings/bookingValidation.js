import { z } from 'zod';

export const scheduleItemSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, 'Session date is required'),
  timeLabel: z.string().min(1, 'Time / Session label is required'),
  guestCount: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: 'Guest count is required', invalid_type_error: 'Guest count must be a valid number' })
      .min(1, 'Guest count must be at least 1')
  ),

  sortOrder: z.number().optional(),
});

export const bookingSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerMobile: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === '' || val.replace(/\D/g, '').length >= 10,
      { message: 'Customer mobile must be at least 10 digits' }
    ),
  altNumber: z.string().optional(),
  functionType: z.string().min(1, 'Function type is required'),
  eventStartDate: z.string().min(1, 'Event start date is required'),
  eventEndDate: z.string().min(1, 'Event end date is required'),
  venueName: z.string().min(1, 'Venue name is required'),
  referenceName: z.string().optional(),
  referenceNumber: z.string().optional(),
  remarks: z.string().optional(),
  eventSchedule: z.array(scheduleItemSchema).min(1, 'At least one schedule session is required'),
}).refine(
  (data) => !data.eventStartDate || !data.eventEndDate || data.eventEndDate >= data.eventStartDate,
  {
    message: 'Event end date cannot be earlier than start date',
    path: ['eventEndDate'],
  }
).refine(
  (data) => {
    if (!data.eventStartDate || !data.eventSchedule) return true;
    return data.eventSchedule.every((s) => {
      if (!s.date) return true;
      if (s.date < data.eventStartDate) return false;
      if (data.eventEndDate && s.date > data.eventEndDate) return false;
      return true;
    });
  },
  {
    message: 'Session dates must be within the Event Start and End Date range',
    path: ['eventSchedule'],
  }
);
