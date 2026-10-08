import React, { useState, useEffect, useMemo } from 'react';
import {
  Bus,
  Clock,
  MapPin,
  Calendar,
  Users,
  Send,
  RotateCcw,
  Info,
  Phone,
  CheckCircle,
  Truck,
  Eye,
  CalendarDays,
  CalendarRange,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import { transportApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { Modal } from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { ServiceDateRangeViewer } from '../../components/common/ServiceDateRangeViewer';
import confetti from 'canvas-confetti';
import { getTodayStr, getTomorrowStr } from '../../utils/dateUtils';

const WEEKDAYS = [
  { key: 'MONDAY', label: 'Mon', fullLabel: 'Monday', dayIndex: 1 },
  { key: 'TUESDAY', label: 'Tue', fullLabel: 'Tuesday', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'Wed', fullLabel: 'Wednesday', dayIndex: 3 },
  { key: 'THURSDAY', label: 'Thu', fullLabel: 'Thursday', dayIndex: 4 },
  { key: 'FRIDAY', label: 'Fri', fullLabel: 'Friday', dayIndex: 5 },
  { key: 'SATURDAY', label: 'Sat', fullLabel: 'Saturday', dayIndex: 6 },
  { key: 'SUNDAY', label: 'Sun', fullLabel: 'Sunday', dayIndex: 0 },
];

const parseLocalDate = (dateStr) => {
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const formatLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getOccurrenceDateDisplay = (dateStr) => {
  try {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
    const dateFormatted = d.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
    return { dateFormatted, dayOfWeek };
  } catch {
    return { dateFormatted: dateStr, dayOfWeek: '' };
  }
};

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') return dateVal.substring(0, 10);
  if (Array.isArray(dateVal)) {
    const [y, m, d] = dateVal;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(dateVal).substring(0, 10);
};

export const Transport = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [vehicles, setVehicles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedReqModal, setSelectedReqModal] = useState(null);

  // Form states
  const [tripType, setTripType] = useState('College Bus');
  const [tripDate, setTripDate] = useState(getTomorrowStr());
  const [roundTrip, setRoundTrip] = useState(true);
  const [pickupLocation, setPickupLocation] = useState('Narasaraopet Engineering College');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [departureTime, setDepartureTime] = useState('09:00 AM');
  const [returnTime, setReturnTime] = useState('05:00 PM');
  const [expectedPassengers, setExpectedPassengers] = useState(40);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Booking Type: ONE_TIME | MULTI_DAY | RECURRING
  const [bookingType, setBookingType] = useState('ONE_TIME');
  const [endDate, setEndDate] = useState(getTomorrowStr());
  const [recurrenceDays, setRecurrenceDays] = useState(['MONDAY']);
  const [excludedDates, setExcludedDates] = useState([]);
  const [bulkConflictInfo, setBulkConflictInfo] = useState(null);
  const [checkingBulk, setCheckingBulk] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.userId]);

  useEffect(() => {
    loadVehiclesAndTrips(tripDate);
  }, [tripDate]);

  const loadData = async () => {
    try {
      const [vRes, rRes, tRes] = await Promise.all([
        transportApi.getVehicles(tripDate),
        transportApi.getRequests(),
        transportApi.getTrips(tripDate),
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (rRes.data) setRequests(rRes.data);
      if (tRes.data) setTrips(tRes.data);
    } catch (e) {
      showToast('Failed to load transport fleet data', 'error');
    }
  };

  const loadVehiclesAndTrips = async (date) => {
    try {
      const [vRes, tRes] = await Promise.all([
        transportApi.getVehicles(date),
        transportApi.getTrips(date),
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (tRes.data) setTrips(tRes.data);
    } catch (e) {
      console.error('Error refreshing vehicles and trips for date:', e);
    }
  };

  const toggleRecurrenceDay = (dayKey) => {
    setRecurrenceDays((prev) => {
      if (prev.includes(dayKey)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayKey);
      } else {
        return [...prev, dayKey];
      }
    });
  };

  // Compute all target dates based on booking type
  const targetDates = useMemo(() => {
    let list = [];
    if (bookingType === 'ONE_TIME') {
      if (tripDate) list = [tripDate];
    } else if (bookingType === 'MULTI_DAY') {
      if (tripDate) {
        if (!endDate || endDate === tripDate) {
          list = [tripDate];
        } else if (endDate > tripDate) {
          let cur = parseLocalDate(tripDate);
          const end = parseLocalDate(endDate);
          while (cur <= end) {
            list.push(formatLocalDate(cur));
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
    } else {
      // RECURRING
      if (tripDate && endDate && endDate >= tripDate && recurrenceDays.length > 0) {
        const targetDayIndices = recurrenceDays.map((k) => {
          const found = WEEKDAYS.find((w) => w.key === k);
          return found ? found.dayIndex : -1;
        });
        let cur = parseLocalDate(tripDate);
        const end = parseLocalDate(endDate);
        while (cur <= end) {
          if (targetDayIndices.includes(cur.getDay())) {
            list.push(formatLocalDate(cur));
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    return list.filter((d) => !excludedDates.includes(d));
  }, [bookingType, tripDate, endDate, recurrenceDays, excludedDates]);

  const handleRemoveDate = (dateToRemove) => {
    setExcludedDates((prev) => [...prev, dateToRemove]);
  };

  // Live bulk availability check on target dates
  useEffect(() => {
    let isCancelled = false;
    if (!tripType || targetDates.length === 0) {
      setBulkConflictInfo(null);
      return;
    }

    const runBulkCheck = async () => {
      setCheckingBulk(true);
      try {
        const res = await transportApi.checkBulkAvailability({
          tripType,
          dates: targetDates,
          departureTime,
          returnTime,
          bookingType,
        });
        if (!isCancelled && res.data) {
          setBulkConflictInfo(res.data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Bulk transport check failed:', err);
        }
      } finally {
        if (!isCancelled) setCheckingBulk(false);
      }
    };

    runBulkCheck();

    return () => {
      isCancelled = true;
    };
  }, [tripType, targetDates, departureTime, returnTime, bookingType]);

  const availableVehiclesCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedThisMonthCount = requests.filter((r) => r.status === 'APPROVED').length;

  const handleReset = () => {
    setTripType('College Bus');
    setBookingType('ONE_TIME');
    setTripDate(getTomorrowStr());
    setEndDate(getTomorrowStr());
    setRecurrenceDays(['MONDAY']);
    setExcludedDates([]);
    setBulkConflictInfo(null);
    setDestination('');
    setPurpose('');
    setExpectedPassengers(40);
    setAdditionalNotes('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = getTodayStr();
    if (tripDate < today) {
      showToast('Trip date cannot be in the past', 'warning');
      return;
    }
    if (targetDates.length === 0) {
      showToast('Please select at least one valid date for transport', 'warning');
      return;
    }
    if (bulkConflictInfo && bulkConflictInfo.conflictCount > 0) {
      showToast(`Cannot submit: ${bulkConflictInfo.conflictCount} conflict(s) detected for selected dates.`, 'error');
      return;
    }
    if (!destination.trim()) {
      showToast('Please enter the destination', 'warning');
      return;
    }
    if (!purpose.trim()) {
      showToast('Please specify the trip purpose', 'warning');
      return;
    }
    if (!expectedPassengers || Number(expectedPassengers) <= 0) {
      showToast('Expected passengers must be at least 1', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await transportApi.createRequest({
        tripType,
        tripDate: targetDates[0] || tripDate,
        roundTrip,
        pickupLocation,
        destination,
        purpose,
        departureTime,
        returnTime,
        expectedPassengers: Number(expectedPassengers),
        additionalNotes,
        bookingType,
        startDate: targetDates[0] || tripDate,
        endDate: targetDates[targetDates.length - 1] || tripDate,
        dates: targetDates,
        recurrenceDays: bookingType === 'RECURRING' ? recurrenceDays : [],
      });

      if (res.success) {
        showToast('Transport request submitted successfully!', 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        handleReset();
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit transport request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTransportRequests = async ({ fromDate, toDate }) => {
    const res = await transportApi.getRequests({ fromDate, toDate });
    return res.data || [];
  };

  return (
    <div className="page-stack">
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-glow" />
        <div>
          <h1 className="page-banner-title">
            Transport Service
          </h1>
          <p className="page-banner-subtitle">
            Request college transport for departmental activities, field visits, and official trips.
          </p>
        </div>
        <div className="banner-tagline">
          “Safe Journey<br />Stronger Together”
        </div>
      </div>

      {/* Date Range Transport Requests Viewer */}
      <ServiceDateRangeViewer
        title="View Transport Requests in Date Range"
        buttonLabel="Show Requests"
        countLabel="Total Requests"
        loadingMessage="Loading transport requests..."
        errorMessage="Unable to load transport requests. Please try again."
        emptyMessage="No transport requests found for the selected date range."
        onFetch={fetchTransportRequests}
        renderResults={(records) => (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Request ID</th>
                <th>Department</th>
                <th>Departure</th>
                <th>Destination</th>
                <th>Pickup Location</th>
                <th>Time</th>
                <th>Passengers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((t, idx) => (
                <tr key={t.id || t.requestId || idx}>
                  <td className="table-cell-date">
                    {t.dates && t.dates.length > 1
                      ? `${t.dates.length} Dates (${formatDateDisplay(t.dates[0])} - ${formatDateDisplay(t.dates[t.dates.length - 1])})`
                      : formatDateDisplay(t.tripDate)}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.requestId}</td>
                  <td>{t.department}</td>
                  <td>{t.pickupLocation || 'Campus'}</td>
                  <td style={{ fontWeight: 600 }}>{t.destination}</td>
                  <td>{t.pickupLocation || '-'}</td>
                  <td>{t.departureTime || '-'}</td>
                  <td style={{ color: 'var(--arctic-blue)', fontWeight: 600 }}>
                    {t.expectedPassengers || 1}
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      />

      {/* Stat Cards Row */}
      <div className="stat-grid-4">
        <StatCard
          icon={Bus}
          title=""
          value={requests.length}
          subtitle="Total Transport Requests"
          color="blue"
        />
        <StatCard
          icon={Clock}
          title=""
          value={pendingRequestsCount}
          subtitle="Pending Review"
          color="amber"
        />
        <StatCard
          icon={CheckCircle}
          title=""
          value={approvedThisMonthCount}
          subtitle="Approved Trips"
          color="emerald"
        />
        <StatCard
          icon={Truck}
          title=""
          value={availableVehiclesCount}
          subtitle="Available Vehicles"
          color="cyan"
        />
      </div>

      {/* Unified Transport Request Container */}
      <div className="card-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
          <div>
            <span className="card-title text-base font-bold flex items-center gap-2">
              <Bus size={18} color="var(--arctic-blue)" />
              Transport Request
            </span>
            <p className="card-subtitle text-xs text-slate-400 mt-0.5">
              Select a vehicle type, choose travel date, and submit trip booking details.
            </p>
          </div>
        </div>

        <div className="two-column-layout balanced">
          {/* Left Column: Vehicle & Date Selection + Fleet Availability */}
          <div className="column-stack">
            <div className="form-group">
              <label className="form-label text-xs">Trip Type *</label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
                className="w-full text-xs"
              >
                <option value="College Bus">College Bus (50 Seater)</option>
                <option value="Mini Bus">Mini Bus (25/32 Seater)</option>
                <option value="Tempo Traveller">Tempo Traveller (12/17 Seater)</option>
                <option value="Innova">Innova (7 Seater)</option>
              </select>
            </div>

            {/* Booking Type Toggle Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Booking Type</span>
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setBookingType('ONE_TIME');
                    setExcludedDates([]);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${bookingType === 'ONE_TIME'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <CalendarDays size={13} /> One-Time
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingType('MULTI_DAY');
                    setExcludedDates([]);
                    if (!endDate || endDate < tripDate) setEndDate(tripDate);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${bookingType === 'MULTI_DAY'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <CalendarRange size={13} /> Multi-Day
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingType('RECURRING');
                    setExcludedDates([]);
                    if (!endDate || endDate < tripDate) setEndDate(tripDate);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition ${bookingType === 'RECURRING'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <Repeat size={13} /> Recurring
                </button>
              </div>
            </div>

            {/* Date Pickers based on Booking Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="form-group">
                <label className="form-label text-xs">
                  {bookingType === 'ONE_TIME' ? 'Trip Date *' : 'Series Start Date *'}
                </label>
                <input
                  type="date"
                  value={tripDate}
                  min={getTodayStr()}
                  onChange={(e) => {
                    setTripDate(e.target.value);
                    if (bookingType === 'ONE_TIME') setEndDate(e.target.value);
                  }}
                  required
                  className="w-full text-xs"
                />
              </div>

              {bookingType !== 'ONE_TIME' && (
                <div className="form-group">
                  <label className="form-label text-xs">
                    {bookingType === 'MULTI_DAY' ? 'Series End Date (Inclusive) *' : 'Series End Date *'}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={tripDate || getTodayStr()}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>
              )}

              {bookingType === 'RECURRING' && (
                <div className="form-group sm:col-span-2">
                  <label className="form-label text-xs mb-1.5">Repeat On Weekdays *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((w) => {
                      const isSel = recurrenceDays.includes(w.key);
                      return (
                        <button
                          key={w.key}
                          type="button"
                          onClick={() => toggleRecurrenceDay(w.key)}
                          className={`px-2.5 py-1 text-xs rounded-md border font-medium transition ${isSel
                            ? 'bg-blue-600 border-blue-500 text-white shadow'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                        >
                          {w.fullLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Dates List with Removal Capability */}
            {targetDates.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-300 font-medium">
                    Selected Dates: <strong className="text-white">{targetDates.length} date(s)</strong>
                  </span>
                  {excludedDates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExcludedDates([])}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      Reset removed ({excludedDates.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto p-1 bg-slate-950/40 rounded border border-slate-800/60">
                  {targetDates.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] border border-slate-700"
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(d)}
                        className="text-slate-400 hover:text-rose-400 transition"
                        title={`Remove ${d}`}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Availability / Conflict Status & Occurrence Cards Preview */}
            {targetDates.length > 0 && (
              <div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300">
                    Occurrences: <strong className="text-white">{targetDates.length} date(s)</strong>
                  </span>
                  {checkingBulk ? (
                    <span className="text-blue-400 flex items-center gap-1">
                      <RefreshCw size={12} className="animate-spin" /> Checking fleet availability...
                    </span>
                  ) : bulkConflictInfo && bulkConflictInfo.conflictCount > 0 ? (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} />
                      ⚠ Conflict Found ({bulkConflictInfo.conflictCount} conflict(s))
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} /> ✓ Available
                    </span>
                  )}
                </div>

                {((bulkConflictInfo && bulkConflictInfo.conflictCount > 0) || bookingType !== 'ONE_TIME') && (
                  <div className="occurrence-list-container mt-2 max-h-[190px] overflow-y-auto">
                    {(bulkConflictInfo?.occurrences || targetDates.map((d) => ({
                      date: d,
                      day: getOccurrenceDateDisplay(d).dayOfWeek,
                      tripType: tripType,
                      status: checkingBulk ? 'CHECKING' : 'AVAILABLE',
                    }))).map((occ, idx) => {
                      const { dateFormatted, dayOfWeek } = getOccurrenceDateDisplay(occ.date);
                      const isConflict = occ.status === 'CONFLICT';
                      const isUnavailable = occ.status === 'UNAVAILABLE';
                      const isChecking = occ.status === 'CHECKING' || checkingBulk;

                      return (
                        <div
                          key={`${occ.date}-${idx}`}
                          className={`occurrence-card ${isConflict
                            ? 'occurrence-card-conflict'
                            : isUnavailable
                              ? 'occurrence-card-unavailable'
                              : 'occurrence-card-available'
                            }`}
                        >
                          <div className="occurrence-card-header">
                            <div className="occurrence-title-group">
                              <span className="occurrence-index-badge">Trip {idx + 1}</span>
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
                                onClick={() => handleRemoveDate(occ.date)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                                title="Remove this date"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                          {isConflict && occ.conflictReason && (
                            <div className="text-[11px] text-rose-400 mt-1">
                              {occ.conflictReason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="checkbox-row my-1">
              <input
                type="checkbox"
                id="roundTripCheck"
                checked={roundTrip}
                onChange={(e) => setRoundTrip(e.target.checked)}
              />
              <label htmlFor="roundTripCheck" className="checkbox-label text-xs">
                Round Trip (Return on same day)
              </label>
            </div>

            {/* Available Vehicles for Selected Date */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-800">
                <span className="font-semibold text-slate-200">Fleet Availability on {tripDate}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {vehicles.length} Fleet
                </span>
              </div>
              <div className="vehicle-list">
                {vehicles.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-xs">
                    No vehicles registered.
                  </div>
                ) : (
                  vehicles.map((v) => (
                    <div
                      key={v.vehicleId || v.id}
                      className="vehicle-item-row"
                    >
                      <div className="vehicle-item-info">
                        <div
                          className={`vehicle-icon-box ${v.status === 'AVAILABLE' ? 'available' : 'unavailable'}`}
                        >
                          <Bus size={18} className={v.status === 'AVAILABLE' ? 'text-arctic-blue' : 'text-danger'} />
                        </div>
                        <div>
                          <div className="vehicle-name text-xs">
                            {v.name}
                          </div>
                          <div className="vehicle-meta text-[10px]">
                            {v.registrationNumber} · {v.capacity} Seats
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={v.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Trip Details Form */}
          <div className="column-stack">
            <form onSubmit={handleSubmit} className="form-column">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="form-group">
                  <label className="form-label text-xs">Pickup Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. Narasaraopet Engineering College"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Destination *</label>
                  <input
                    type="text"
                    placeholder="e.g. Vijayawada"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="form-group">
                  <label className="form-label text-xs">Departure Time *</label>
                  <select
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full text-xs"
                  >
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Return Time</label>
                  <select
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full text-xs"
                  >
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                    <option value="08:00 PM">08:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="form-group">
                  <label className="form-label text-xs">Expected Passengers *</label>
                  <input
                    type="number"
                    value={expectedPassengers}
                    onChange={(e) => setExpectedPassengers(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Purpose of Trip *</label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Visit, Workshop"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-xs">Additional Notes</label>
                <textarea
                  rows="2"
                  placeholder="Any special requirements (e.g. extra stop, luggage, etc.)"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              <div className="form-actions-row mt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-outline btn-flex-1 text-xs"
                  disabled={submitting}
                >
                  <RotateCcw size={14} /> Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-flex-2 text-xs"
                  disabled={submitting}
                >
                  <Send size={14} /> {submitting ? 'Sending...' : 'Send Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Auxiliary Row: Guidelines */}
      <div className="two-column-layout balanced">
        <div className="column-stack">
          {/* Transport Guidelines */}
          <div className="guidelines-card">
            <div className="guidelines-header">
              <Info size={18} className="text-arctic-blue" />
              <span className="guidelines-title">Transport Guidelines</span>
            </div>
            <ul className="guidelines-list">
              <li>Submit requests at least 2 working days in advance.</li>
              <li>Transport is subject to availability and admin approval.</li>
              <li>Please provide accurate travel details and passenger counts.</li>
              <li>For long trips, mention halt points and return schedule if any.</li>
              <li>In case of changes, inform the admin office immediately.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Trips & Calendar */}
        <div className="column-stack">

          {/* Trips on Selected Date */}
          <div className="card-panel">
            <div className="card-header">
              <span className="card-title">
                <Clock size={18} className="text-arctic-blue" /> Trips on {tripDate}
              </span>
              <span className="badge-trip-count">
                {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}
              </span>
            </div>

            <div className="trips-scroll-list">
              {trips.length === 0 ? (
                <div className="table-empty-cell">
                  No trips scheduled for {tripDate}.
                </div>
              ) : (
                trips.map((t) => (
                  <div
                    key={t.id || t.requestId}
                    className="trip-item-card"
                  >
                    <div className="trip-item-details">
                      <div>
                        <span className="trip-item-time">
                          {t.departureTime || '09:00 AM'}
                        </span>
                        <span className="trip-item-dest">
                          {t.destination}
                        </span>
                      </div>
                      <div className="trip-item-sub">
                        {t.department} · {t.vehicleName || t.tripType} {t.purpose ? `· ${t.purpose}` : ''}
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Calendar */}
          <QuickCalendar
            selectedDate={tripDate}
            onSelectDate={(newDate) => setTripDate(newDate)}
            events={[
              ...requests.map((r) => ({
                id: r.id || r.requestId,
                date: r.tripDate,
                title: `${r.tripType} to ${r.destination}`,
                status: r.status,
                department: r.department,
              })),
              ...trips.map((t) => ({
                id: 'trip-' + (t.id || t.requestId),
                date: t.tripDate,
                title: `${t.vehicleName || t.tripType} - ${t.destination}`,
                status: t.status,
                department: t.department,
              })),
            ]}
          />

          {/* Need Assistance Card */}
          <div className="assistance-card">
            <div className="assistance-icon-box">
              <Phone size={20} className="text-arctic-blue" />
            </div>
            <div>
              <div className="assistance-title">Need Assistance?</div>
              <div className="assistance-sub">Contact Transport Office</div>
              <div className="assistance-phone">
                +91 86394 12345
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transport Requests Section */}
      <div className="card-panel">
        <div className="card-header">
          <span className="card-title">Recent Transport Requests</span>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Trip Type</th>
                <th>Destination</th>
                <th>Timing</th>
                <th>Passengers</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty-cell">
                    No transport requests submitted yet.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id || r.requestId}>
                    <td className="table-cell-date">
                      {r.dates && r.dates.length > 1
                        ? `${r.dates.length} Dates (${formatDateDisplay(r.dates[0])} - ${formatDateDisplay(r.dates[r.dates.length - 1])})`
                        : formatDateDisplay(r.tripDate || r.createdAt)}
                    </td>
                    <td>{r.tripType}</td>
                    <td className="table-cell-dest">{r.destination}</td>
                    <td>
                      {r.departureTime} {r.returnTime ? `- ${r.returnTime}` : ''}
                    </td>
                    <td>{r.expectedPassengers}</td>
                    <td className="table-cell-purpose-truncate">
                      {r.purpose}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedReqModal(r)}
                        className="action-view-btn"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Official Request Details Modal with PDF Preview & Download */}
      {selectedReqModal && (
        <RequestDetailsModal
          isOpen={!!selectedReqModal}
          onClose={() => setSelectedReqModal(null)}
          request={{
            ...selectedReqModal,
            service: 'Transport',
            serviceCategory: 'TRANSPORT',
          }}
        />
      )}
    </div>
  );
};

export default Transport;
