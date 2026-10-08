import React, { useState, useEffect, useMemo } from 'react';
import {
  BedDouble,
  Users,
  Wifi,
  Tv,
  AirVent,
  Bath,
  RotateCcw,
  Send,
  Info,
  Home,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  Wrench,
  MapPin,
  Clock,
  RefreshCw,
  CalendarDays,
  CalendarRange,
  Repeat,
  X,
} from 'lucide-react';
import { accommodationApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { ServiceDateRangeViewer } from '../../components/common/ServiceDateRangeViewer';
import confetti from 'canvas-confetti';
import { getTodayStr, getDateOffsetStr } from '../../utils/dateUtils';

const WEEKDAYS = [
  { key: 'MONDAY', label: 'Mon', fullLabel: 'Monday', dayIndex: 1 },
  { key: 'TUESDAY', label: 'Tue', fullLabel: 'Tuesday', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'Wed', fullLabel: 'Wednesday', dayIndex: 3 },
  { key: 'THURSDAY', label: 'Thu', fullLabel: 'Thursday', dayIndex: 4 },
  { key: 'FRIDAY', label: 'Fri', fullLabel: 'Friday', dayIndex: 5 },
  { key: 'SATURDAY', label: 'Sat', fullLabel: 'Saturday', dayIndex: 6 },
  { key: 'SUNDAY', label: 'Sun', fullLabel: 'Sunday', dayIndex: 0 },
];

const computeTargetDates = (bookingType, checkInDate, checkOutDate, recurrenceDays, excludedDates = []) => {
  let list = [];
  if (bookingType === 'ONE_TIME') {
    if (checkInDate) list = [checkInDate];
  } else if (bookingType === 'MULTI_DAY') {
    if (checkInDate) {
      if (!checkOutDate || checkOutDate === checkInDate) {
        list = [checkInDate];
      } else if (checkOutDate > checkInDate) {
        let cur = parseLocalDate(checkInDate);
        const end = parseLocalDate(checkOutDate);
        while (cur <= end) {
          list.push(formatLocalDate(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
  } else {
    // RECURRING
    if (checkInDate && checkOutDate && checkOutDate >= checkInDate && recurrenceDays?.length > 0) {
      const targetDayIndices = recurrenceDays.map((k) => {
        const found = WEEKDAYS.find((w) => w.key === k);
        return found ? found.dayIndex : -1;
      });
      let cur = parseLocalDate(checkInDate);
      const end = parseLocalDate(checkOutDate);
      while (cur <= end) {
        if (targetDayIndices.includes(cur.getDay())) {
          list.push(formatLocalDate(cur));
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  }
  return list.filter((d) => !(excludedDates || []).includes(d));
};

const HostelSectionConfig = ({
  hostelName,
  sectionTitle,
  badgeColor,
  rooms,
  state,
  setState,
  targetDates,
  bulkConflictInfo,
  checkingBulk,
  onRemoveDate,
  onToggleRecurrenceDay,
}) => {
  const selectedRoomObj = rooms.find((r) => r.roomId === state.roomId) || rooms[0];
  const isRoomInMaintenance =
    selectedRoomObj?.status === 'Maintenance' ||
    selectedRoomObj?.status === 'Unavailable' ||
    selectedRoomObj?.isUnderMaintenance;

  const handleSelectRoom = (room) => {
    setState((prev) => ({
      ...prev,
      hostel: room.hostel,
      roomType: room.roomType,
      roomId: room.roomId,
    }));
  };

  return (
    <div className="hostel-section-block p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 mb-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Home size={16} className={badgeColor === 'blue' ? 'text-blue-400' : 'text-purple-400'} />
          <h3 className="text-sm font-bold tracking-wide uppercase text-white">{sectionTitle}</h3>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            badgeColor === 'blue'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
          }`}
        >
          {hostelName}
        </span>
      </div>

      <div className="two-column-layout balanced">
        {/* Left Column: Room Selection, Details & Availability */}
        <div className="column-stack">
          {/* Room Dropdown */}
          <div className="form-group">
            <label className="form-label text-xs">Select Room ({hostelName}) *</label>
            <select
              value={state.roomId}
              onChange={(e) => {
                const selected = rooms.find((r) => r.roomId === e.target.value);
                if (selected) handleSelectRoom(selected);
              }}
              className="w-full text-xs"
            >
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>
                  {r.roomId} — {r.roomType} (Capacity: {r.capacity || 2})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Room Details */}
          {selectedRoomObj && (
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hostel & Type:</span>
                <span className="font-semibold text-white">
                  {selectedRoomObj.hostel} — {selectedRoomObj.roomType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Room Code:</span>
                <span className="font-mono text-arctic-blue font-semibold">{selectedRoomObj.roomId}</span>
              </div>

              {selectedRoomObj.location && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Location:</span>
                  <span className="text-slate-300">{selectedRoomObj.location}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Room Status:</span>
                <StatusBadge
                  status={isRoomInMaintenance ? 'MAINTENANCE' : selectedRoomObj.available ? 'AVAILABLE' : 'PENDING'}
                />
              </div>
              {selectedRoomObj.amenities && selectedRoomObj.amenities.length > 0 && (
                <div className="pt-1.5 border-t border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] mb-1">Amenities:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedRoomObj.amenities.map((a) => (
                      <span key={a} className="amenity-chip">✓ {a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Booking Type Toggle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-300">Booking Type</span>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setState((prev) => ({ ...prev, bookingType: 'ONE_TIME', excludedDates: [] }));
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                  state.bookingType === 'ONE_TIME'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDays size={13} /> One-Time
              </button>
              <button
                type="button"
                onClick={() => {
                  setState((prev) => ({
                    ...prev,
                    bookingType: 'MULTI_DAY',
                    excludedDates: [],
                    checkOutDate:
                      !prev.checkOutDate || prev.checkOutDate < prev.checkInDate
                        ? prev.checkInDate
                        : prev.checkOutDate,
                  }));
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                  state.bookingType === 'MULTI_DAY'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarRange size={13} /> Multi-Day
              </button>
              <button
                type="button"
                onClick={() => {
                  setState((prev) => ({
                    ...prev,
                    bookingType: 'RECURRING',
                    excludedDates: [],
                    checkOutDate:
                      !prev.checkOutDate || prev.checkOutDate < prev.checkInDate
                        ? prev.checkInDate
                        : prev.checkOutDate,
                  }));
                }}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${
                  state.bookingType === 'RECURRING'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Repeat size={13} /> Recurring
              </button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="form-group">
              <label className="form-label text-xs">
                {state.bookingType === 'ONE_TIME' ? 'Check-in Date *' : 'Series Start Date *'}
              </label>
              <input
                type="date"
                value={state.checkInDate}
                min={getTodayStr()}
                onChange={(e) => {
                  const val = e.target.value;
                  setState((prev) => ({
                    ...prev,
                    checkInDate: val,
                    checkOutDate:
                      prev.bookingType === 'ONE_TIME' && (!prev.checkOutDate || prev.checkOutDate <= val)
                        ? val
                        : prev.checkOutDate,
                  }));
                }}
                required
                className="w-full text-xs"
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs">
                {state.bookingType === 'ONE_TIME'
                  ? 'Check-out Date *'
                  : state.bookingType === 'MULTI_DAY'
                    ? 'Series End Date (Inclusive) *'
                    : 'Series End Date *'}
              </label>
              <input
                type="date"
                value={state.checkOutDate}
                min={state.checkInDate || getTodayStr()}
                onChange={(e) => setState((prev) => ({ ...prev, checkOutDate: e.target.value }))}
                required
                className="w-full text-xs"
              />
            </div>

            {state.bookingType === 'RECURRING' && (
              <div className="form-group sm:col-span-2">
                <label className="form-label text-xs mb-1.5">Repeat On Weekdays *</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((w) => {
                    const isSel = (state.recurrenceDays || []).includes(w.key);
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => onToggleRecurrenceDay(w.key)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                          isSel
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Occurrences & Conflicts */}
          {targetDates.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">
                  Requested Days ({targetDates.length} total)
                </span>
                {bulkConflictInfo?.conflictCount > 0 ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle size={13} /> {bulkConflictInfo.conflictCount} Conflict(s)
                  </span>
                ) : checkingBulk ? (
                  <span className="text-blue-400 flex items-center gap-1">
                    <RefreshCw size={12} className="animate-spin" /> Verifying...
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> ✓ Available
                  </span>
                )}
              </div>

              {((bulkConflictInfo && bulkConflictInfo.conflictCount > 0) || state.bookingType !== 'ONE_TIME') && (
                <div className="occurrence-list-container max-h-[170px] overflow-y-auto">
                  {(bulkConflictInfo?.occurrences ||
                    targetDates.map((d) => ({
                      date: d,
                      day: getOccurrenceDateDisplay(d).dayOfWeek,
                      status: checkingBulk ? 'CHECKING' : 'AVAILABLE',
                    }))
                  ).map((occ, idx) => {
                    const { dateFormatted, dayOfWeek } = getOccurrenceDateDisplay(occ.date);
                    const isConflict = occ.status === 'CONFLICT';
                    const isUnavailable = occ.status === 'UNAVAILABLE' || occ.isMaintenance;
                    const isChecking = occ.status === 'CHECKING' || checkingBulk;

                    return (
                      <div
                        key={`${occ.date}-${idx}`}
                        className={`occurrence-card ${
                          isConflict
                            ? 'occurrence-card-conflict'
                            : isUnavailable
                              ? 'occurrence-card-unavailable'
                              : 'occurrence-card-available'
                        }`}
                      >
                        <div className="occurrence-card-header">
                          <div className="occurrence-title-group">
                            <span className="occurrence-index-badge">Stay {idx + 1}</span>
                            <span className="occurrence-date-title">{dateFormatted || occ.date}</span>
                            <span className="occurrence-day-sub">({occ.day || dayOfWeek})</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isChecking ? (
                              <span className="text-blue-400 text-xs font-semibold flex items-center gap-1">
                                <RefreshCw size={12} className="animate-spin" /> Checking...
                              </span>
                            ) : isConflict ? (
                              <span className="occurrence-status-badge occurrence-status-conflict">
                                <AlertTriangle size={12} /> ⚠ CONFLICT
                              </span>
                            ) : isUnavailable ? (
                              <span className="occurrence-status-badge occurrence-status-unavailable">
                                <AlertTriangle size={12} /> ⚠ UNAVAILABLE
                              </span>
                            ) : (
                              <span className="occurrence-status-badge occurrence-status-available">
                                <CheckCircle2 size={12} /> ✓ AVAILABLE
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => onRemoveDate(occ.date)}
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                              title="Remove this date"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        {isConflict && occ.conflictReason && (
                          <div className="text-[11px] text-rose-400 mt-1">{occ.conflictReason}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Request Fields */}
        <div className="column-stack">
          <div className="form-column">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label text-xs">Number of Guests *</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={state.guestsCount}
                  onChange={(e) => setState((prev) => ({ ...prev, guestsCount: e.target.value }))}
                  placeholder="Enter guest count (1-50)"
                  required
                  className="w-full text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Min: 1 | Max: 50 (Room capacity: {selectedRoomObj?.capacity || 2})
                </span>
              </div>

              <div className="form-group">
                <label className="form-label text-xs">Guest / Faculty Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ramesh (External Guest)"
                  value={state.facultyOrGuestName}
                  onChange={(e) => setState((prev) => ({ ...prev, facultyOrGuestName: e.target.value }))}
                  className="w-full text-xs"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label text-xs">Purpose of Visit *</label>
              <textarea
                rows="2"
                placeholder="e.g. Guest Lecture, Workshop, Interview"
                value={state.purpose}
                onChange={(e) => setState((prev) => ({ ...prev, purpose: e.target.value }))}
                required
                className="w-full text-xs"
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs">Additional Notes</label>
              <textarea
                rows="2"
                placeholder="Any special requirements..."
                value={state.additionalNotes}
                onChange={(e) => setState((prev) => ({ ...prev, additionalNotes: e.target.value }))}
                className="w-full text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Accommodation = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [rooms, setRooms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'my-requests'
  const [selectedReqModal, setSelectedReqModal] = useState(null);

  // Hostel Selection Mode: 'BOYS' | 'GIRLS' | 'BOTH'
  const [hostelSelectionMode, setHostelSelectionMode] = useState('BOYS');

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Boys Hostel State
  const [boysState, setBoysState] = useState({
    hostel: 'Boys Hostel',
    roomType: 'AC Room',
    roomId: 'BH-AC-1',
    checkInDate: getTodayStr(),
    checkOutDate: getDateOffsetStr(2),
    guestsCount: 1,
    facultyOrGuestName: '',
    purpose: '',
    additionalNotes: '',
    bookingType: 'ONE_TIME',
    recurrenceDays: ['MONDAY'],
    excludedDates: [],
  });
  const [boysBulkConflictInfo, setBoysBulkConflictInfo] = useState(null);
  const [boysCheckingBulk, setBoysCheckingBulk] = useState(false);

  // Girls Hostel State
  const [girlsState, setGirlsState] = useState({
    hostel: 'Girls Hostel',
    roomType: 'AC Room',
    roomId: 'GH-AC-1',
    checkInDate: getTodayStr(),
    checkOutDate: getDateOffsetStr(2),
    guestsCount: 1,
    facultyOrGuestName: '',
    purpose: '',
    additionalNotes: '',
    bookingType: 'ONE_TIME',
    recurrenceDays: ['MONDAY'],
    excludedDates: [],
  });
  const [girlsBulkConflictInfo, setGirlsBulkConflictInfo] = useState(null);
  const [girlsCheckingBulk, setGirlsCheckingBulk] = useState(false);

  // Filter states for My Requests tab
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [myStatusFilter, setMyStatusFilter] = useState('ALL');
  const [myHostelFilter, setMyHostelFilter] = useState('ALL');
  const [myTypeFilter, setMyTypeFilter] = useState('ALL');

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [targetHostel, setTargetHostel] = useState('Girls Hostel');
  const [targetRoomType, setTargetRoomType] = useState('AC Room');
  const [targetRoomId, setTargetRoomId] = useState('GH-AC-1');
  const [targetCheckIn, setTargetCheckIn] = useState(getTodayStr());
  const [targetCheckOut, setTargetCheckOut] = useState(getDateOffsetStr(2));
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.userId]);

  const loadData = async () => {
    try {
      const [roomsRes, reqsRes] = await Promise.all([
        accommodationApi.getRooms(),
        accommodationApi.getRequests(),
      ]);
      if (roomsRes.data) {
        setRooms(roomsRes.data);
        const boys = roomsRes.data.filter((r) => r.hostel?.includes('Boys'));
        const girls = roomsRes.data.filter((r) => r.hostel?.includes('Girls'));
        if (boys.length > 0) {
          setBoysState((prev) => ({
            ...prev,
            roomId: boys.some((r) => r.roomId === prev.roomId) ? prev.roomId : boys[0].roomId,
            roomType: boys[0].roomType || 'AC Room',
          }));
        }
        if (girls.length > 0) {
          setGirlsState((prev) => ({
            ...prev,
            roomId: girls.some((r) => r.roomId === prev.roomId) ? prev.roomId : girls[0].roomId,
            roomType: girls[0].roomType || 'AC Room',
          }));
        }
      }
      if (reqsRes.data) setRequests(reqsRes.data);
    } catch (e) {
      showToast('Failed to load accommodation data', 'error');
    }
  };

  const boysRooms = useMemo(() => rooms.filter((r) => r.hostel?.includes('Boys')), [rooms]);
  const girlsRooms = useMemo(() => rooms.filter((r) => r.hostel?.includes('Girls')), [rooms]);

  // Target dates computation
  const boysTargetDates = useMemo(
    () =>
      computeTargetDates(
        boysState.bookingType,
        boysState.checkInDate,
        boysState.checkOutDate,
        boysState.recurrenceDays,
        boysState.excludedDates
      ),
    [boysState.bookingType, boysState.checkInDate, boysState.checkOutDate, boysState.recurrenceDays, boysState.excludedDates]
  );

  const girlsTargetDates = useMemo(
    () =>
      computeTargetDates(
        girlsState.bookingType,
        girlsState.checkInDate,
        girlsState.checkOutDate,
        girlsState.recurrenceDays,
        girlsState.excludedDates
      ),
    [girlsState.bookingType, girlsState.checkInDate, girlsState.checkOutDate, girlsState.recurrenceDays, girlsState.excludedDates]
  );

  // Recurrence toggle handlers
  const toggleBoysRecurrenceDay = (dayKey) => {
    setBoysState((prev) => {
      const cur = prev.recurrenceDays || [];
      if (cur.includes(dayKey)) {
        if (cur.length === 1) return prev;
        return { ...prev, recurrenceDays: cur.filter((d) => d !== dayKey) };
      }
      return { ...prev, recurrenceDays: [...cur, dayKey] };
    });
  };

  const toggleGirlsRecurrenceDay = (dayKey) => {
    setGirlsState((prev) => {
      const cur = prev.recurrenceDays || [];
      if (cur.includes(dayKey)) {
        if (cur.length === 1) return prev;
        return { ...prev, recurrenceDays: cur.filter((d) => d !== dayKey) };
      }
      return { ...prev, recurrenceDays: [...cur, dayKey] };
    });
  };

  // Remove date handlers
  const handleRemoveBoysDate = (d) => {
    setBoysState((prev) => ({ ...prev, excludedDates: [...(prev.excludedDates || []), d] }));
  };

  const handleRemoveGirlsDate = (d) => {
    setGirlsState((prev) => ({ ...prev, excludedDates: [...(prev.excludedDates || []), d] }));
  };

  // Live bulk availability for Boys
  useEffect(() => {
    let cancelled = false;
    if (!boysState.roomId || boysTargetDates.length === 0) {
      setBoysBulkConflictInfo(null);
      return;
    }
    const run = async () => {
      setBoysCheckingBulk(true);
      try {
        const res = await accommodationApi.checkBulkAvailability({
          roomId: boysState.roomId,
          dates: boysTargetDates,
          bookingType: boysState.bookingType,
        });
        if (!cancelled && res.data) setBoysBulkConflictInfo(res.data);
      } catch (err) {
        if (!cancelled) console.warn('Boys bulk check error', err);
      } finally {
        if (!cancelled) setBoysCheckingBulk(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [boysState.roomId, boysTargetDates, boysState.bookingType]);

  // Live bulk availability for Girls
  useEffect(() => {
    let cancelled = false;
    if (!girlsState.roomId || girlsTargetDates.length === 0) {
      setGirlsBulkConflictInfo(null);
      return;
    }
    const run = async () => {
      setGirlsCheckingBulk(true);
      try {
        const res = await accommodationApi.checkBulkAvailability({
          roomId: girlsState.roomId,
          dates: girlsTargetDates,
          bookingType: girlsState.bookingType,
        });
        if (!cancelled && res.data) setGirlsBulkConflictInfo(res.data);
      } catch (err) {
        if (!cancelled) console.warn('Girls bulk check error', err);
      } finally {
        if (!cancelled) setGirlsCheckingBulk(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [girlsState.roomId, girlsTargetDates, girlsState.bookingType]);

  const handleResetAll = () => {
    const today = getTodayStr();
    const plusTwo = getDateOffsetStr(2);
    setBoysState({
      hostel: 'Boys Hostel',
      roomType: 'AC Room',
      roomId: boysRooms[0]?.roomId || 'BH-AC-1',
      checkInDate: today,
      checkOutDate: plusTwo,
      guestsCount: 1,
      facultyOrGuestName: '',
      purpose: '',
      additionalNotes: '',
      bookingType: 'ONE_TIME',
      recurrenceDays: ['MONDAY'],
      excludedDates: [],
    });
    setGirlsState({
      hostel: 'Girls Hostel',
      roomType: 'AC Room',
      roomId: girlsRooms[0]?.roomId || 'GH-AC-1',
      checkInDate: today,
      checkOutDate: plusTwo,
      guestsCount: 1,
      facultyOrGuestName: '',
      purpose: '',
      additionalNotes: '',
      bookingType: 'ONE_TIME',
      recurrenceDays: ['MONDAY'],
      excludedDates: [],
    });
    setBoysBulkConflictInfo(null);
    setGirlsBulkConflictInfo(null);
  };

  const validateHostel = (hostelKey, state, targetDates, conflictInfo, roomList) => {
    const title = hostelKey === 'BOYS' ? 'Boys Hostel' : 'Girls Hostel';
    const today = getTodayStr();
    if (state.checkInDate < today) {
      showToast(`${title}: Check-in date cannot be in the past`, 'warning');
      return false;
    }
    if (state.bookingType === 'ONE_TIME' && state.checkInDate === state.checkOutDate) {
      showToast(`${title}: Same-day check-in and check-out is not allowed. Check-out must be at least the next day.`, 'warning');
      return false;
    }
    if (state.checkOutDate < state.checkInDate) {
      showToast(`${title}: Check-out date cannot be earlier than check-in date`, 'warning');
      return false;
    }
    if (targetDates.length === 0) {
      showToast(`${title}: Please select at least one valid date for accommodation`, 'warning');
      return false;
    }
    if (conflictInfo && conflictInfo.conflictCount > 0) {
      showToast(`${title}: Cannot submit: ${conflictInfo.conflictCount} conflict(s) detected.`, 'error');
      return false;
    }
    const count = Number(state.guestsCount);
    if (!state.guestsCount || isNaN(count) || count < 1) {
      showToast(`${title}: Number of guests must be at least 1`, 'warning');
      return false;
    }
    if (count > 50) {
      showToast(`${title}: Number of guests cannot exceed 50`, 'warning');
      return false;
    }
    const roomObj = roomList.find((r) => r.roomId === state.roomId);
    if (roomObj?.status === 'Maintenance' || roomObj?.status === 'Unavailable' || roomObj?.isUnderMaintenance) {
      showToast(`${title}: Room ${state.roomId} is currently under maintenance. Please select another room.`, 'error');
      return false;
    }
    if (!state.purpose.trim()) {
      showToast(`${title}: Please specify the purpose of visit`, 'warning');
      return false;
    }
    return true;
  };

  // Step 8: Trigger Preview Modal before final submission
  const handleReviewRequest = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (hostelSelectionMode === 'BOYS' || hostelSelectionMode === 'BOTH') {
      if (!validateHostel('BOYS', boysState, boysTargetDates, boysBulkConflictInfo, boysRooms)) return;
    }
    if (hostelSelectionMode === 'GIRLS' || hostelSelectionMode === 'BOTH') {
      if (!validateHostel('GIRLS', girlsState, girlsTargetDates, girlsBulkConflictInfo, girlsRooms)) return;
    }
    setPreviewModalOpen(true);
  };

  // Final submission from Preview Modal
  const handleSubmitFinal = async () => {
    setSubmitting(true);
    try {
      const buildPayload = (s, dates) => ({
        facultyOrGuestName: s.facultyOrGuestName.trim() || 'Visiting Guest',
        hostel: s.hostel,
        roomType: s.roomType,
        roomId: s.roomId,
        checkInDate: dates[0] || s.checkInDate,
        checkOutDate: dates.length > 1 ? dates[dates.length - 1] : s.checkOutDate,
        guestsCount: Number(s.guestsCount),
        purpose: s.purpose.trim(),
        additionalNotes: s.additionalNotes.trim(),
        bookingType: s.bookingType,
        startDate: dates[0] || s.checkInDate,
        endDate: dates[dates.length - 1] || s.checkOutDate,
        dates: dates,
        recurrenceDays: s.bookingType === 'RECURRING' ? s.recurrenceDays : [],
      });

      if (hostelSelectionMode === 'BOTH') {
        const boysPayload = buildPayload(boysState, boysTargetDates);
        const girlsPayload = buildPayload(girlsState, girlsTargetDates);
        const res = await accommodationApi.createDualRequest({
          boysRequest: boysPayload,
          girlsRequest: girlsPayload,
          selectionMode: 'BOTH',
        });
        if (res.success || res.data) {
          showToast('Accommodation requests submitted successfully for both hostels! Awaiting AO Admin approval.', 'success');
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          setPreviewModalOpen(false);
          handleResetAll();
          await loadData();
        }
      } else {
        const activeState = hostelSelectionMode === 'BOYS' ? boysState : girlsState;
        const activeDates = hostelSelectionMode === 'BOYS' ? boysTargetDates : girlsTargetDates;
        const payload = {
          ...buildPayload(activeState, activeDates),
          selectionMode: hostelSelectionMode,
        };
        const res = await accommodationApi.createRequest(payload);
        if (res.success || res.data) {
          showToast(`Accommodation request submitted successfully for ${activeState.hostel}! Awaiting AO Admin approval.`, 'success');
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          setPreviewModalOpen(false);
          handleResetAll();
          await loadData();
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit accommodation request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancel = (req) => {
    setCancelItem(req);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  // Submit Cancellation
  const handleSubmitCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Please enter a cancellation reason', 'warning');
      return;
    }

    const reqId = cancelItem?.id || cancelItem?.requestId;
    setCancelLoading(true);
    try {
      const res = await accommodationApi.cancelRequest(reqId, {
        reason: cancelReason.trim(),
      });
      if (res.success) {
        const isPending = cancelItem.status === 'PENDING';
        showToast(
          isPending
            ? 'Booking cancelled immediately.'
            : 'Cancellation request submitted for admin review.',
          'success'
        );
        setCancelModalOpen(false);
        setCancelItem(null);
        await loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to process cancellation', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (req) => {
    setRescheduleItem(req);
    setTargetHostel(req.hostel || 'Girls Hostel');
    setTargetRoomType(req.roomType || 'AC Room');
    setTargetRoomId(req.roomId || (req.hostel?.includes('Girls') ? 'GH-AC-1' : 'BH-AC-1'));
    setTargetCheckIn(req.checkInDate || getTodayStr());
    setTargetCheckOut(req.checkOutDate || getDateOffsetStr(2));
    setRescheduleReason('');
    setRescheduleModalOpen(true);
  };

  // Submit Reschedule
  const handleSubmitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleReason.trim()) {
      showToast('Please enter a reason for rescheduling', 'warning');
      return;
    }
    const today = getTodayStr();
    if (targetCheckIn < today) {
      showToast('New check-in date cannot be in the past', 'warning');
      return;
    }
    if (targetCheckIn === targetCheckOut) {
      showToast('Same-day check-in/out is not allowed for reschedule.', 'warning');
      return;
    }
    if (targetCheckOut < targetCheckIn) {
      showToast('New check-out date cannot be earlier than check-in', 'warning');
      return;
    }

    const reqId = rescheduleItem?.id || rescheduleItem?.requestId;
    setRescheduleLoading(true);
    try {
      const res = await accommodationApi.rescheduleRequest(reqId, {
        newRoomId: targetRoomId,
        newCheckInDate: targetCheckIn,
        newCheckOutDate: targetCheckOut,
        reason: rescheduleReason.trim(),
      });
      if (res.success) {
        showToast(
          'Reschedule request submitted. Awaiting administrator review.',
          'success'
        );
        setRescheduleModalOpen(false);
        setRescheduleItem(null);
        await loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit reschedule request', 'error');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const fetchAccommodationBookings = async ({ fromDate, toDate }) => {
    const res = await accommodationApi.getRequests({ fromDate, toDate });
    return res.data || [];
  };

  // Filtered requests for "My Accommodation Requests" tab
  const filteredMyRequests = requests.filter((r) => {
    const q = mySearchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (r.requestId && r.requestId.toLowerCase().includes(q)) ||
      (r.facultyOrGuestName && r.facultyOrGuestName.toLowerCase().includes(q)) ||
      (r.purpose && r.purpose.toLowerCase().includes(q)) ||
      (r.hostel && r.hostel.toLowerCase().includes(q));

    const matchStatus = myStatusFilter === 'ALL' || r.status === myStatusFilter;
    const matchHostel = myHostelFilter === 'ALL' || r.hostel === myHostelFilter;
    const matchType = myTypeFilter === 'ALL' || r.roomType === myTypeFilter;

    return matchSearch && matchStatus && matchHostel && matchType;
  });

  return (
    <div className="page-stack">
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-glow" />
        <div>
          <h1 className="page-banner-title">Guest Room Accommodation</h1>
          <p className="page-banner-subtitle">
            Request guest rooms for visiting faculty, speakers, or external guests.
          </p>
        </div>
        <div className="banner-tagline">“Comfort to Collaborate”</div>
      </div>

      {/* Date Range Bookings Viewer */}
      <ServiceDateRangeViewer
        title="View Accommodation Bookings in Date Range"
        buttonLabel="Show Bookings"
        countLabel="Total Bookings"
        loadingMessage="Loading accommodation bookings..."
        errorMessage="Unable to load accommodation bookings. Please try again."
        emptyMessage="No accommodation bookings found for the selected date range."
        onFetch={fetchAccommodationBookings}
        renderResults={(records) => (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Check-in Date</th>
                <th>Check-out Date</th>
                <th>Hostel</th>
                <th>Room / Type</th>
                <th>Department</th>
                <th>Applicant / Guest</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((a, idx) => (
                <tr key={a.id || a.requestId || idx}>
                  <td className="table-cell-date">{formatDateDisplay(a.checkInDate)}</td>
                  <td className="table-cell-date">{formatDateDisplay(a.checkOutDate)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.hostel}</td>
                  <td>{a.roomType || a.roomId || '-'}</td>
                  <td>{a.department}</td>
                  <td>{a.facultyOrGuestName || a.requestedBy || '-'}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      />

      {/* Tabs */}
      <div className="tabs-container">
        <button
          onClick={() => setActiveTab('available')}
          className={`btn tab-pill-btn ${activeTab === 'available' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <BedDouble size={16} /> Available Rooms & Booking
        </button>
        <button
          onClick={() => setActiveTab('my-requests')}
          className={`btn tab-pill-btn ${activeTab === 'my-requests' ? 'btn-primary' : 'btn-secondary'}`}
        >
          My Accommodation Requests ({requests.length})
        </button>
      </div>

      {activeTab === 'available' ? (
        <div className="column-stack">
          {/* UNIFIED ACCOMMODATION REQUEST CONTAINER WITH HOSTEL SELECTION */}
          <div className="card-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
              <div>
                <span className="card-title text-base font-bold flex items-center gap-2">
                  <BedDouble size={18} color="var(--arctic-blue)" />
                  Accommodation Request
                </span>
                <p className="card-subtitle text-xs text-slate-400 mt-0.5">
                  Select hostel type, configure guest rooms, check date availability, and review before final submission.
                </p>
              </div>
            </div>

            {/* HOSTEL SELECTION CONTROLS */}
            <div className="mb-5 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <label className="text-xs font-semibold text-slate-200 block mb-2">
                Hostel Selection * (Select one or both)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setHostelSelectionMode('BOYS')}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    hostelSelectionMode === 'BOYS'
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="hostelSelect"
                    checked={hostelSelectionMode === 'BOYS'}
                    onChange={() => setHostelSelectionMode('BOYS')}
                    className="mt-0.5 text-blue-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Home size={14} className="text-blue-400" /> Boys Hostel
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Configure and request Boys Hostel rooms only
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setHostelSelectionMode('GIRLS')}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    hostelSelectionMode === 'GIRLS'
                      ? 'bg-purple-600/15 border-purple-500 text-white shadow-sm'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="hostelSelect"
                    checked={hostelSelectionMode === 'GIRLS'}
                    onChange={() => setHostelSelectionMode('GIRLS')}
                    className="mt-0.5 text-purple-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Home size={14} className="text-purple-400" /> Girls Hostel
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Configure and request Girls Hostel rooms only
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setHostelSelectionMode('BOTH')}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    hostelSelectionMode === 'BOTH'
                      ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="hostelSelect"
                    checked={hostelSelectionMode === 'BOTH'}
                    onChange={() => setHostelSelectionMode('BOTH')}
                    className="mt-0.5 text-emerald-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users size={14} className="text-emerald-400" /> Both Boys & Girls Hostel
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Configure separate requests for both hostels
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* SECTIONS RENDERING */}
            {(hostelSelectionMode === 'BOYS' || hostelSelectionMode === 'BOTH') && (
              <HostelSectionConfig
                hostelName="Boys Hostel"
                sectionTitle="BOYS HOSTEL"
                badgeColor="blue"
                rooms={boysRooms}
                state={boysState}
                setState={setBoysState}
                targetDates={boysTargetDates}
                bulkConflictInfo={boysBulkConflictInfo}
                checkingBulk={boysCheckingBulk}
                onRemoveDate={handleRemoveBoysDate}
                onToggleRecurrenceDay={toggleBoysRecurrenceDay}
              />
            )}

            {(hostelSelectionMode === 'GIRLS' || hostelSelectionMode === 'BOTH') && (
              <HostelSectionConfig
                hostelName="Girls Hostel"
                sectionTitle="GIRLS HOSTEL"
                badgeColor="purple"
                rooms={girlsRooms}
                state={girlsState}
                setState={setGirlsState}
                targetDates={girlsTargetDates}
                bulkConflictInfo={girlsBulkConflictInfo}
                checkingBulk={girlsCheckingBulk}
                onRemoveDate={handleRemoveGirlsDate}
                onToggleRecurrenceDay={toggleGirlsRecurrenceDay}
              />
            )}

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetAll}
                className="btn btn-outline text-xs flex items-center gap-1.5 w-full sm:w-auto"
                disabled={submitting}
              >
                <RotateCcw size={14} /> Reset Form
              </button>
              <button
                type="button"
                onClick={handleReviewRequest}
                className="btn btn-primary text-xs flex items-center gap-1.5 w-full sm:w-auto"
                disabled={submitting}
              >
                <Send size={14} /> Review & Submit Request
              </button>
            </div>
          </div>

          {/* Auxiliary 2-Column Row: Guidelines & Quick Calendar */}
          <div className="two-column-layout balanced mt-6">
            <div className="column-stack">
              {/* Guidelines Box */}
              <div className="guidelines-card">
                <div className="guidelines-header">
                  <Info size={16} className="text-arctic-blue" />
                  <span className="guidelines-title text-xs">Accommodation Guidelines</span>
                </div>
                <ul className="guidelines-list text-xs">
                  <li>Rooms are available strictly for official college guest visits and invited speakers.</li>
                  <li>Same-day check-in/out is not supported. Multi-day stays allowed.</li>
                  <li>Requests must be submitted within room capacity limits.</li>
                  <li>Approved requests can be rescheduled or cancelled upon review.</li>
                </ul>
                <div className="guidelines-footer">
                  <Home size={14} className="text-emerald" />
                  <span className="guidelines-tagline text-xs">“Comfort to Collaborate”</span>
                </div>
              </div>
            </div>

            <div className="column-stack">
              {/* Quick Calendar */}
              <QuickCalendar
                title="Accommodation Quick Calendar"
                selectedDate={boysState.checkInDate || girlsState.checkInDate}
                onSelectDate={(newDate) => {
                  const off = getDateOffsetStr(1, newDate);
                  setBoysState((p) => ({ ...p, checkInDate: newDate, checkOutDate: off }));
                  setGirlsState((p) => ({ ...p, checkInDate: newDate, checkOutDate: off }));
                }}
                events={requests.map((r) => ({
                  id: r.id || r.requestId,
                  date: r.checkInDate,
                  title: `${r.hostel} - ${r.roomType} (${r.guestsCount} guests)`,
                  status: r.status,
                  department: r.department,
                }))}
                showLegend={true}
                showEventsList={true}
              />
            </div>
          </div>

          {/* Full-width Recent Accommodation Requests Table */}
          <div className="recent-card-panel">
            <div className="card-header">
              <span className="card-title">Recent Accommodation Requests</span>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Hostel</th>
                    <th>Room</th>
                    <th>Dates</th>
                    <th>Guests</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="table-empty-cell">
                        No accommodation requests yet.
                      </td>
                    </tr>
                  ) : (
                    requests.slice(0, 5).map((r) => {
                      const canCancel = r.status === 'PENDING' || r.status === 'PENDING_AO_APPROVAL' || r.status === 'AO_APPROVED' || r.status === 'APPROVED' || r.status === 'BOOKED';
                      const canReschedule =
                        r.status === 'APPROVED' || r.status === 'BOOKED';

                      return (
                        <tr key={r.id || r.requestId}>
                          <td className="font-mono text-xs font-semibold text-slate-200"><div>{r.requestId || '-'}</div>{r.parentRequestId && (<span className="text-[10px] text-blue-400 font-normal block">Parent: {r.parentRequestId}</span>)}</td>
                          <td>{r.hostel}</td>
                          <td>{r.roomType || r.roomId}</td>
                          <td className="table-cell-date text-xs">
                            {r.dates && r.dates.length > 1
                              ? `${r.dates.length} Dates (${formatDateDisplay(r.dates[0])} - ${formatDateDisplay(r.dates[r.dates.length - 1])})`
                              : `${formatDateDisplay(r.checkInDate)} → ${formatDateDisplay(r.checkOutDate)}`}
                          </td>
                          <td>{r.guestsCount}</td>
                          <td>
                            <StatusBadge status={r.status} />
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedReqModal(r)}
                                className="action-view-btn"
                                title="View Details & PDF"
                              >
                                <Eye size={12} /> View
                              </button>
                              {canCancel && (
                                <button
                                  onClick={() => handleOpenCancel(r)}
                                  className="btn btn-outline btn-sm text-rose-400 hover:text-rose-300 border-rose-500/40 text-[11px] py-0.5 px-1.5"
                                  title="Cancel"
                                >
                                  <XCircle size={12} />
                                </button>
                              )}
                              {canReschedule && (
                                <button
                                  onClick={() => handleOpenReschedule(r)}
                                  className="btn btn-outline btn-sm text-blue-400 hover:text-blue-300 border-blue-500/40 text-[11px] py-0.5 px-1.5"
                                  title="Reschedule"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* My Accommodation Requests Full List Tab */
        <div className="card-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="card-title">My Accommodation Requests</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {requests.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                View status, download official PDF approval docs, cancel or reschedule requests.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="btn btn-outline btn-sm text-xs py-1 px-2.5 self-start md:self-auto flex items-center gap-1.5"
              title="Refresh requests"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          {/* 4 Stat Cards */}
          <div className="stat-grid-4 mb-4">
            <StatCard
              icon={BedDouble}
              value={requests.length}
              subtitle="Total Requests"
              color="blue"
            />
            <StatCard
              icon={Clock}
              value={requests.filter((r) => r.status === 'PENDING').length}
              subtitle="Pending Review"
              color="amber"
            />
            <StatCard
              icon={CheckCircle2}
              value={requests.filter((r) => r.status === 'APPROVED' || r.status === 'BOOKED').length}
              subtitle="Approved Bookings"
              color="emerald"
            />
            <StatCard
              icon={XCircle}
              value={requests.filter((r) => r.status === 'CANCELLED' || r.status === 'CANCELLATION_REQUESTED' || r.status === 'REJECTED').length}
              subtitle="Cancelled / Rejected"
              color="rose"
            />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ID, guest, purpose..."
                value={mySearchQuery}
                onChange={(e) => setMySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500"
              />
            </div>

            <select
              value={myStatusFilter}
              onChange={(e) => setMyStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING_AO_APPROVAL">Pending AO Approval</option>
              <option value="AO_APPROVED">AO Approved (Waiting Hostel Admin)</option>
              <option value="AO_REJECTED">AO Rejected</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="CANCELLATION_REQUESTED">Cancel Requested</option>
              <option value="RESCHEDULE_REQUESTED">Reschedule Requested</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={myHostelFilter}
              onChange={(e) => setMyHostelFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="ALL">All Hostels</option>
              <option value="Girls Hostel">Girls Hostel</option>
              <option value="Boys Hostel">Boys Hostel</option>
            </select>

            <select
              value={myTypeFilter}
              onChange={(e) => setMyTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="ALL">All Room Types</option>
              <option value="AC Room">AC Room</option>
              <option value="Non-AC Room">Non-AC Room</option>
            </select>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Hostel</th>
                  <th>Room Type</th>
                  <th>Dates</th>
                  <th>Guests</th>
                  <th>Guest / Faculty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMyRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="table-empty-cell py-8 text-center text-slate-500">
                      No accommodation requests found.
                    </td>
                  </tr>
                ) : (
                  filteredMyRequests.map((r) => {
                    const canCancel = r.status === 'PENDING' || r.status === 'PENDING_AO_APPROVAL' || r.status === 'AO_APPROVED' || r.status === 'APPROVED' || r.status === 'BOOKED';
                    const canReschedule =
                      r.status === 'APPROVED' || r.status === 'BOOKED';

                    return (
                      <tr key={r.id || r.requestId}>
                        <td className="font-mono text-xs font-semibold text-slate-200"><div>{r.requestId}</div>{r.parentRequestId && (<span className="text-[10px] text-blue-400 font-normal block">Parent: {r.parentRequestId}</span>)}</td>
                        <td className="font-medium text-slate-200">{r.hostel}</td>
                        <td>{r.roomType}</td>
                        <td className="table-cell-date text-xs">
                          {r.dates && r.dates.length > 1
                            ? `${r.dates.length} Dates (${formatDateDisplay(r.dates[0])} - ${formatDateDisplay(r.dates[r.dates.length - 1])})`
                            : `${formatDateDisplay(r.checkInDate)} → ${formatDateDisplay(r.checkOutDate)}`}
                        </td>
                        <td>{r.guestsCount}</td>
                        <td className="text-slate-300 text-xs">
                          {r.facultyOrGuestName || 'Guest'}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedReqModal(r)}
                              className="btn btn-outline btn-sm text-xs py-1 px-2.5 flex items-center gap-1"
                              title="View Document & PDF"
                            >
                              <Eye size={12} /> View
                            </button>
                            {canCancel && (
                              <button
                                onClick={() => handleOpenCancel(r)}
                                className="btn btn-outline btn-sm text-rose-400 hover:text-rose-300 border-rose-500/40 text-xs py-1 px-2.5 flex items-center gap-1"
                                title="Cancel"
                              >
                                <XCircle size={12} /> Cancel
                              </button>
                            )}
                            {canReschedule && (
                              <button
                                onClick={() => handleOpenReschedule(r)}
                                className="btn btn-outline btn-sm text-blue-400 hover:text-blue-300 border-blue-500/40 text-xs py-1 px-2.5 flex items-center gap-1"
                                title="Reschedule"
                              >
                                <RotateCcw size={12} /> Reschedule
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && cancelItem && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Accommodation Booking"
        >
          <form onSubmit={handleSubmitCancel} className="space-y-4 text-sm text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Request ID:</span>
                <span className="font-mono text-white">{cancelItem.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Room:</span>
                <span className="text-white">{cancelItem.hostel} - {cancelItem.roomType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dates:</span>
                <span className="text-white">
                  {cancelItem.dates && cancelItem.dates.length > 1
                    ? `${cancelItem.dates.length} Dates (${formatDateDisplay(cancelItem.dates[0])} - ${formatDateDisplay(cancelItem.dates[cancelItem.dates.length - 1])})`
                    : `${formatDateDisplay(cancelItem.checkInDate)} → ${formatDateDisplay(cancelItem.checkOutDate)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <StatusBadge status={cancelItem.status} />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {cancelItem.status === 'PENDING'
                ? 'This booking is currently pending review and will be cancelled immediately.'
                : 'This booking is approved. Submitting this request will flag it for Accommodation Administrator review.'}
            </p>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please state why this accommodation is no longer required..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={cancelLoading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOpen && rescheduleItem && (
        <Modal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          title="Reschedule Accommodation Booking"
        >
          <form onSubmit={handleSubmitReschedule} className="space-y-4 text-sm text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Original Request:</span>
                <span className="font-mono text-white">{rescheduleItem.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Room:</span>
                <span className="text-white">{rescheduleItem.hostel} - {rescheduleItem.roomType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Dates:</span>
                <span className="text-white">
                  {formatDateDisplay(rescheduleItem.checkInDate)} → {formatDateDisplay(rescheduleItem.checkOutDate)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Hostel</label>
                <select
                  value={targetHostel}
                  onChange={(e) => {
                    const h = e.target.value;
                    setTargetHostel(h);
                    const prefix = h.includes('Girls') ? 'GH' : 'BH';
                    const suffix = targetRoomType.includes('Non-AC') ? 'NAC-1' : 'AC-1';
                    setTargetRoomId(`${prefix}-${suffix}`);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="Girls Hostel">Girls Hostel</option>
                  <option value="Boys Hostel">Boys Hostel</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Room Type</label>
                <select
                  value={targetRoomType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setTargetRoomType(t);
                    const prefix = targetHostel.includes('Girls') ? 'GH' : 'BH';
                    const suffix = t.includes('Non-AC') ? 'NAC-1' : 'AC-1';
                    setTargetRoomId(`${prefix}-${suffix}`);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="AC Room">AC Room</option>
                  <option value="Non-AC Room">Non-AC Room</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">New Check-in Date *</label>
                <input
                  type="date"
                  value={targetCheckIn}
                  min={getTodayStr()}
                  onChange={(e) => setTargetCheckIn(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">New Check-out Date *</label>
                <input
                  type="date"
                  value={targetCheckOut}
                  min={targetCheckIn || getTodayStr()}
                  onChange={(e) => setTargetCheckOut(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Reason for Rescheduling *
              </label>
              <textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Reason for changing dates or room type..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={rescheduleLoading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md"
              >
                {rescheduleLoading ? 'Submitting...' : 'Submit Reschedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Enhanced Official Request Details Modal with PDF Preview & Download */}
      {selectedReqModal && (
        <RequestDetailsModal
          isOpen={!!selectedReqModal}
          onClose={() => setSelectedReqModal(null)}
          request={{
            ...selectedReqModal,
            service: 'Accommodation',
            serviceCategory: 'ACCOMMODATION',
          }}
        />
      )}

      {/* SECTION 8: AO PREVIEW MODAL */}
      {previewModalOpen && (
        <Modal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title="Accommodation Request Preview"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Requester:</span>
                <span className="font-semibold text-white">{user?.name || user?.userId || 'Faculty / Staff'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-white">{user?.department || 'Department'}</span>
              </div>
            </div>

            {(hostelSelectionMode === 'BOYS' || hostelSelectionMode === 'BOTH') && (
              <div className="p-3.5 rounded-lg bg-blue-950/20 border border-blue-900/40 space-y-2">
                <div className="pb-1.5 border-b border-blue-900/40 text-blue-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <Home size={14} /> BOYS HOSTEL
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room:</span>
                    <span className="font-semibold text-white font-mono">{boysState.roomId} ({boysState.roomType})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-in:</span>
                    <span className="text-white">{boysTargetDates[0] || boysState.checkInDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-out:</span>
                    <span className="text-white">
                      {boysTargetDates.length > 1
                        ? boysTargetDates[boysTargetDates.length - 1]
                        : boysState.checkOutDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guests:</span>
                    <span className="text-white font-semibold">{boysState.guestsCount}</span>
                  </div>
                  {boysState.facultyOrGuestName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Guest / Faculty:</span>
                      <span className="text-white">{boysState.facultyOrGuestName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Purpose:</span>
                    <span className="text-white">{boysState.purpose}</span>
                  </div>
                  {boysState.additionalNotes && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Notes:</span>
                      <span className="text-slate-300">{boysState.additionalNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(hostelSelectionMode === 'GIRLS' || hostelSelectionMode === 'BOTH') && (
              <div className="p-3.5 rounded-lg bg-purple-950/20 border border-purple-900/40 space-y-2">
                <div className="pb-1.5 border-b border-purple-900/40 text-purple-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                  <Home size={14} /> GIRLS HOSTEL
                </div>
                <div className="space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Room:</span>
                    <span className="font-semibold text-white font-mono">{girlsState.roomId} ({girlsState.roomType})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-in:</span>
                    <span className="text-white">{girlsTargetDates[0] || girlsState.checkInDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-out:</span>
                    <span className="text-white">
                      {girlsTargetDates.length > 1
                        ? girlsTargetDates[girlsTargetDates.length - 1]
                        : girlsState.checkOutDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guests:</span>
                    <span className="text-white font-semibold">{girlsState.guestsCount}</span>
                  </div>
                  {girlsState.facultyOrGuestName && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Guest / Faculty:</span>
                      <span className="text-white">{girlsState.facultyOrGuestName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Purpose:</span>
                    <span className="text-white">{girlsState.purpose}</span>
                  </div>
                  {girlsState.additionalNotes && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Notes:</span>
                      <span className="text-slate-300">{girlsState.additionalNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="btn btn-outline text-xs px-3 py-1.5"
                disabled={submitting}
              >
                [ Back & Edit ]
              </button>
              <button
                type="button"
                onClick={handleSubmitFinal}
                className="btn btn-primary text-xs px-4 py-1.5"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : '[ Submit Request ]'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Accommodation;
