/**
 * Reusable Date Utilities for Narasaraopeta Engineering College FSMS
 * Enforces local timezone handling (no UTC 1-day shifting) and YYYY-MM-DD formats.
 */

export const formatYMD = (year, monthIndex, day) => {
  const y = year;
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getTodayStr = () => {
  const now = new Date();
  return formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
};

export const getTomorrowStr = () => {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return formatYMD(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
};

export const getDateOffsetStr = (offsetDays = 0) => {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  return formatYMD(target.getFullYear(), target.getMonth(), target.getDate());
};

export const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') {
    // If it's full ISO string like "2026-09-24T10:00:00", take first 10 chars
    return dateVal.substring(0, 10);
  }
  if (Array.isArray(dateVal)) {
    const [y, m, d] = dateVal;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (dateVal instanceof Date) {
    return formatYMD(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
  }
  return String(dateVal).substring(0, 10);
};

export const getSlotTimes = (slot) => {
  switch (slot?.toUpperCase()?.trim()) {
    case 'FORENOON':
      return { start: '09:00', end: '12:00', startHour: 9, startMinute: 0 };
    case 'AFTERNOON':
      return { start: '12:00', end: '16:00', startHour: 12, startMinute: 0 };
    case 'FULL_DAY':
      return { start: '09:00', end: '16:00', startHour: 9, startMinute: 0 };
    default:
      return null;
  }
};

export const isSlotPassedForDate = (dateStr, slot, now = new Date()) => {
  if (!dateStr) return false;
  const todayStr = formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
  if (dateStr < todayStr) return true;
  if (dateStr === todayStr) {
    const slotTimes = getSlotTimes(slot);
    if (!slotTimes) return false;
    const slotStartTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      slotTimes.startHour,
      slotTimes.startMinute,
      0,
      0
    );
    return now >= slotStartTime;
  }
  return false;
};

export const validateSeminarBookingOccurrences = (targetDates, slot, now = new Date()) => {
  if (!slot) {
    return 'Please select a preferred slot';
  }
  if (!targetDates || targetDates.length === 0) {
    return 'No booking occurrences found for the selected dates and pattern';
  }
  const todayStr = formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
  for (const d of targetDates) {
    if (d < todayStr) {
      return targetDates.length > 1
        ? `Occurrence on ${d}: This booking date has already passed. Please select a future date and time.`
        : 'This booking time has already passed. Please select a future date and time.';
    }
    if (isSlotPassedForDate(d, slot, now)) {
      return targetDates.length > 1
        ? `Occurrence on ${d} (${slot}): This booking time has already passed. Please select a future date and time.`
        : 'This booking time has already passed. Please select a future date and time.';
    }
  }
  return null;
};

export const WEEKDAYS = [
  { key: 'MONDAY', label: 'Mon', fullLabel: 'Monday', dayIndex: 1 },
  { key: 'TUESDAY', label: 'Tue', fullLabel: 'Tuesday', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'Wed', fullLabel: 'Wednesday', dayIndex: 3 },
  { key: 'THURSDAY', label: 'Thu', fullLabel: 'Thursday', dayIndex: 4 },
  { key: 'FRIDAY', label: 'Fri', fullLabel: 'Friday', dayIndex: 5 },
  { key: 'SATURDAY', label: 'Sat', fullLabel: 'Saturday', dayIndex: 6 },
  { key: 'SUNDAY', label: 'Sun', fullLabel: 'Sunday', dayIndex: 0 },
];

export const validateRecurringDateRange = (startDateStr, endDateStr, recurrenceDays) => {
  if (!startDateStr || !endDateStr) {
    return {
      isValid: false,
      errorType: 'INCOMPLETE_RANGE',
      message: 'Both series start date and end date are required for recurring bookings.',
      targetDates: [],
      missingWeekdays: [],
    };
  }

  if (endDateStr < startDateStr) {
    return {
      isValid: false,
      errorType: 'INVALID_RANGE',
      message: `End date (${endDateStr}) cannot be earlier than start date (${startDateStr}).`,
      targetDates: [],
      missingWeekdays: [],
    };
  }

  if (!recurrenceDays || recurrenceDays.length === 0) {
    return {
      isValid: false,
      errorType: 'NO_WEEKDAYS',
      message: 'Please select at least one weekday for recurring bookings.',
      targetDates: [],
      missingWeekdays: [],
    };
  }

  // Parse YYYY-MM-DD components directly to avoid timezone shifts
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) {
    return {
      isValid: false,
      errorType: 'MALFORMED_DATE',
      message: 'Invalid date format. Expected YYYY-MM-DD.',
      targetDates: [],
      missingWeekdays: [],
    };
  }

  // Midday 12:00:00 handles month/year/leap year boundaries with 0 DST risk
  let cur = new Date(sy, sm - 1, sd, 12, 0, 0);
  const end = new Date(ey, em - 1, ed, 12, 0, 0);

  const targetDayIndices = new Set();
  const keyToWeekday = new Map();
  for (const k of recurrenceDays) {
    const found = WEEKDAYS.find((w) => w.key === k);
    if (found) {
      targetDayIndices.add(found.dayIndex);
      keyToWeekday.set(k, found);
    }
  }

  const occurringDayIndices = new Set();
  const occurrences = [];

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    if (targetDayIndices.has(dayOfWeek)) {
      occurrences.push(formatYMD(cur.getFullYear(), cur.getMonth(), cur.getDate()));
      occurringDayIndices.add(dayOfWeek);
    }
    cur.setDate(cur.getDate() + 1);
  }

  // Identify any selected weekday with no occurrence in the range
  const missingWeekdays = [];
  for (const k of recurrenceDays) {
    const found = keyToWeekday.get(k);
    if (found && !occurringDayIndices.has(found.dayIndex)) {
      missingWeekdays.push(found.fullLabel);
    }
  }

  if (missingWeekdays.length > 0) {
    return {
      isValid: false,
      errorType: 'MISSING_WEEKDAYS',
      message: `The selected weekday(s) [${missingWeekdays.join(', ')}] do not occur within the date range (${startDateStr} to ${endDateStr}). Please extend the date range or adjust your weekday selection.`,
      targetDates: occurrences,
      missingWeekdays,
    };
  }

  if (occurrences.length === 0) {
    return {
      isValid: false,
      errorType: 'NO_OCCURRENCES',
      message: `No dates match the selected weekdays between ${startDateStr} and ${endDateStr}.`,
      targetDates: [],
      missingWeekdays,
    };
  }

  // Verify no occurrence falls outside the range
  for (const d of occurrences) {
    if (d < startDateStr || d > endDateStr) {
      return {
        isValid: false,
        errorType: 'OUT_OF_RANGE',
        message: `Occurrence date (${d}) falls outside the allowed date range (${startDateStr} to ${endDateStr}).`,
        targetDates: occurrences,
        missingWeekdays: [],
      };
    }
  }

  return {
    isValid: true,
    errorType: null,
    message: null,
    targetDates: occurrences,
    missingWeekdays: [],
  };
};

