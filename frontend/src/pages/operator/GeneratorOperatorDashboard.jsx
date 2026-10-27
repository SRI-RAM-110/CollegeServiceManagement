import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Zap, RefreshCw, Calendar, Clock, MapPin, Building2 } from 'lucide-react';
import { seminarApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { formatDateDisplay, getSlotTimes } from '../../utils/dateUtils';

/**
 * Format a time string like "09:00", "09:00 AM", or "14:30" to a readable 12-hour format ("09:00 AM").
 */
function formatTimeDisplay(timeStr, fallbackSlot, isEnd = false) {
  if (timeStr && timeStr.trim()) {
    const clean = timeStr.trim();
    if (/AM|PM/i.test(clean)) return clean;
    const match = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    return clean;
  }
  const slotTimes = getSlotTimes(fallbackSlot);
  if (slotTimes) {
    return isEnd ? formatTimeDisplay(slotTimes.end) : formatTimeDisplay(slotTimes.start);
  }
  return '-';
}

/**
 * Simple, read-only Generator Operator Dashboard.
 * Displays approved seminar events with event name, department, hall & location, date, start time, and end time.
 */
export default function GeneratorOperatorDashboard() {
  const { addToast } = useNotifications();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = useCallback(async (isCancelledCheck = () => false) => {
    try {
      setRefreshing(true);
      const res = await seminarApi.getGeneratorSchedule();
      if (!isCancelledCheck()) {
        if (res?.data && Array.isArray(res.data)) {
          setBookings(res.data);
        } else {
          setBookings([]);
        }
      }
    } catch (err) {
      if (!isCancelledCheck()) {
        addToast(err.message || 'Failed to fetch generator schedule.', 'error');
      }
    } finally {
      if (!isCancelledCheck()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [addToast]);

  useEffect(() => {
    let cancelled = false;
    fetchSchedule(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchSchedule]);

  /**
   * Expand multi-day and recurring bookings into discrete occurrences without duplicates,
   * sorted chronologically by event date and start time.
   */
  const events = useMemo(() => {
    const list = [];

    bookings.forEach((b) => {
      const hallName = b.hallName || b.hallId || 'Seminar Hall';
      const hallLocation = b.hallLocation || '';

      // 1. Recurring with occurrences array
      if (b.isRecurring && Array.isArray(b.occurrences) && b.occurrences.length > 0) {
        b.occurrences.forEach((occ, idx) => {
          if (!occ?.date) return;
          list.push({
            id: `${b.bookingId || b.id}_occ_${occ.date}_${idx}`,
            eventTitle: b.eventTitle || 'Untitled Event',
            department: b.department || 'General',
            hallName,
            hallLocation,
            eventDate: occ.date,
            startTime: formatTimeDisplay(occ.startTime || b.startTime, occ.slot || b.slot, false),
            endTime: formatTimeDisplay(occ.endTime || b.endTime, occ.slot || b.slot, true),
            rawStartTime: occ.startTime || b.startTime || '',
          });
        });
        return;
      }

      // 2. Recurring with dates array
      if (b.isRecurring && Array.isArray(b.dates) && b.dates.length > 0) {
        b.dates.forEach((d, idx) => {
          if (!d) return;
          list.push({
            id: `${b.bookingId || b.id}_rec_${d}_${idx}`,
            eventTitle: b.eventTitle || 'Untitled Event',
            department: b.department || 'General',
            hallName,
            hallLocation,
            eventDate: d,
            startTime: formatTimeDisplay(b.startTime, b.slot, false),
            endTime: formatTimeDisplay(b.endTime, b.slot, true),
            rawStartTime: b.startTime || '',
          });
        });
        return;
      }

      // 3. Multi-day with dates array
      if (Array.isArray(b.dates) && b.dates.length > 1) {
        b.dates.forEach((d, idx) => {
          if (!d) return;
          list.push({
            id: `${b.bookingId || b.id}_date_${d}_${idx}`,
            eventTitle: b.eventTitle || 'Untitled Event',
            department: b.department || 'General',
            hallName,
            hallLocation,
            eventDate: d,
            startTime: formatTimeDisplay(b.startTime, b.slot, false),
            endTime: formatTimeDisplay(b.endTime, b.slot, true),
            rawStartTime: b.startTime || '',
          });
        });
        return;
      }

      // 4. Multi-day date span (startDate to endDate)
      if (b.startDate && b.endDate && b.startDate !== b.endDate) {
        try {
          const start = new Date(b.startDate + 'T00:00:00');
          const end = new Date(b.endDate + 'T00:00:00');
          if (!isNaN(start) && !isNaN(end) && start <= end) {
            let cur = new Date(start);
            let dayIndex = 1;
            while (cur <= end) {
              const y = cur.getFullYear();
              const m = String(cur.getMonth() + 1).padStart(2, '0');
              const d = String(cur.getDate()).padStart(2, '0');
              const curStr = `${y}-${m}-${d}`;

              list.push({
                id: `${b.bookingId || b.id}_span_${curStr}_${dayIndex}`,
                eventTitle: b.eventTitle || 'Untitled Event',
                department: b.department || 'General',
                hallName,
                hallLocation,
                eventDate: curStr,
                startTime: formatTimeDisplay(b.startTime, b.slot, false),
                endTime: formatTimeDisplay(b.endTime, b.slot, true),
                rawStartTime: b.startTime || '',
              });

              cur.setDate(cur.getDate() + 1);
              dayIndex++;
            }
            return;
          }
        } catch {
          // Fall through to single date
        }
      }

      // 5. Single-day event
      const singleDate = b.date || b.startDate || (Array.isArray(b.dates) ? b.dates[0] : null);
      if (singleDate) {
        list.push({
          id: `${b.bookingId || b.id}_single_${singleDate}`,
          eventTitle: b.eventTitle || 'Untitled Event',
          department: b.department || 'General',
          hallName,
          hallLocation,
          eventDate: singleDate,
          startTime: formatTimeDisplay(b.startTime, b.slot, false),
          endTime: formatTimeDisplay(b.endTime, b.slot, true),
          rawStartTime: b.startTime || '',
        });
      }
    });

    // Sort strictly by event date and start time
    return list.sort((a, b) => {
      if (a.eventDate !== b.eventDate) {
        return a.eventDate.localeCompare(b.eventDate);
      }
      return (a.rawStartTime || '').localeCompare(b.rawStartTime || '');
    });
  }, [bookings]);

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Generator Schedule
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                OPERATOR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Approved seminar hall bookings and schedules.
            </p>
          </div>
        </div>

        <button
          onClick={fetchSchedule}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Events Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-7 h-7 mx-auto animate-spin text-amber-400" />
            <p className="text-xs">Loading approved seminar schedule...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-slate-600" />
            <h3 className="font-semibold text-slate-300 text-sm">No approved events found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no approved or confirmed seminar bookings scheduled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Event Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Seminar Hall & Location</th>
                  <th className="py-3.5 px-4">Event Date</th>
                  <th className="py-3.5 px-4">Start Time</th>
                  <th className="py-3.5 px-4">End Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {events.map((ev) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-slate-800/40 transition duration-150 text-slate-200"
                  >
                    {/* 1. Event Name */}
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {ev.eventTitle}
                    </td>

                    {/* 2. Department */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {ev.department}
                      </span>
                    </td>

                    {/* 3. Seminar Hall and Location */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{ev.hallName}</span>
                        </div>
                        {ev.hallLocation && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{ev.hallLocation}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 4. Event Date */}
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{formatDateDisplay(ev.eventDate)}</span>
                      </div>
                    </td>

                    {/* 5. Start Time */}
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{ev.startTime}</span>
                      </div>
                    </td>

                    {/* 6. End Time */}
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{ev.endTime}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
