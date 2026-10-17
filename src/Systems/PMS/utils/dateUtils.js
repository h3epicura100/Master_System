import { format, parseISO, isValid } from 'date-fns';

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateDisplay(dateString) {
  if (!dateString) return '—';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, 'dd MMM yyyy');
  } catch (e) {
    return dateString;
  }
}

export function formatShortDateDisplay(dateString) {
  if (!dateString) return '—';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, 'dd MMM');
  } catch (e) {
    return dateString;
  }
}

export function formatDateRangeDisplay(startDate, endDate) {
  if (!startDate && !endDate) return '—';
  if (!startDate) return formatDateDisplay(endDate);
  if (!endDate || startDate === endDate) return formatDateDisplay(startDate);
  
  return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
}

export function formatDateTimeDisplay(dateString) {
  if (!dateString) return '—';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return dateString;
    return format(date, 'dd MMM yyyy, hh:mm a');
  } catch (e) {
    return dateString;
  }
}

export function formatTimeDisplay(dateString) {
  if (!dateString) return '—';
  try {
    const date = typeof dateString === 'string' && dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
    if (!isValid(date)) return dateString;
    return format(date, 'hh:mm a');
  } catch (e) {
    return dateString;
  }
}


