/**
 * Reusable Date Utilities for Narasaraopet Engineering College FSMS
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
