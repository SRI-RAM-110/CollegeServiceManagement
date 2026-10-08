import React, { useState, useEffect, useMemo } from 'react';
import {
  Coffee,
  Utensils,
  Plus,
  Minus,
  Trash2,
  Send,
  RotateCcw,
  Info,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  CalendarDays,
  CalendarRange,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import { mealsApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { Modal } from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { ServiceDateRangeViewer } from '../../components/common/ServiceDateRangeViewer';
import confetti from 'canvas-confetti';
import { getTodayStr } from '../../utils/dateUtils';

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
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatLocalDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getOccurrenceDateDisplay = (dateStr) => {
  if (!dateStr) return { dateFormatted: '-', dayOfWeek: '' };
  try {
    const d = parseLocalDate(dateStr);
    const dateFormatted = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
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

const MEAL_CATEGORIES = [
  {
    type: 'Breakfast',
    subtitle: 'Idli, Dosa, Upma, Poha, etc.',
    defaultTime: '08:30 AM',
  },
  {
    type: 'Lunch',
    subtitle: 'Veg / Non-Veg Meals',
    defaultTime: '01:00 PM',
  },
  {
    type: 'Dinner',
    subtitle: 'Veg / Non-Veg Meals',
    defaultTime: '08:00 PM',
  },
  {
    type: 'Snacks',
    subtitle: 'Samosa, Cutlet, Biscuits, etc.',
    isRefreshment: true,
  },
  {
    type: 'Tea / Coffee',
    subtitle: 'Tea, Coffee, Green Tea, etc.',
    isRefreshment: true,
  },
];

export const SnacksMeals = () => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [totalGuests, setTotalGuests] = useState(25);
  const [selectedReqModal, setSelectedReqModal] = useState(null);
  const [calendarDate, setCalendarDate] = useState(getTodayStr());

  // Service time for Snacks / Tea & Coffee: FORENOON or AFTERNOON
  const [serviceTime, setServiceTime] = useState('');

  // Selected meal items: map of { [mealType]: { guestCount, preferredTime } }
  const [selectedMeals, setSelectedMeals] = useState({
    Lunch: { guestCount: 25, preferredTime: '01:00 PM' },
  });

  // Form states - clean defaults, department-aware venue
  const [eventTitle, setEventTitle] = useState('');
  const [date, setDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [bookingType, setBookingType] = useState('ONE_TIME'); // ONE_TIME, MULTI_DAY, RECURRING
  const [recurrenceDays, setRecurrenceDays] = useState(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
  const [excludedDates, setExcludedDates] = useState([]);
  const [bulkConflictInfo, setBulkConflictInfo] = useState(null);
  const [checkingBulk, setCheckingBulk] = useState(false);

  const [venue, setVenue] = useState(user?.department ? `${user.department} Conference Hall` : '');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.department && !venue) {
      setVenue(`${user.department} Conference Hall`);
    }
  }, [user]);

  useEffect(() => {
    loadRequests();
  }, [user?.userId]);

  const loadRequests = async () => {
    try {
      const res = await mealsApi.getRequests();
      if (res.data) setRequests(res.data);
    } catch (e) {
      showToast('Failed to load meal requests', 'error');
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
      if (date) list = [date];
    } else if (bookingType === 'MULTI_DAY') {
      if (date) {
        if (!endDate || endDate === date) {
          list = [date];
        } else if (endDate > date) {
          let cur = parseLocalDate(date);
          const end = parseLocalDate(endDate);
          while (cur <= end) {
            list.push(formatLocalDate(cur));
            cur.setDate(cur.getDate() + 1);
          }
        }
      }
    } else {
      // RECURRING
      if (date && endDate && endDate >= date && recurrenceDays.length > 0) {
        const targetDayIndices = recurrenceDays.map((k) => {
          const found = WEEKDAYS.find((w) => w.key === k);
          return found ? found.dayIndex : -1;
        });
        let cur = parseLocalDate(date);
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
  }, [bookingType, date, endDate, recurrenceDays, excludedDates]);

  const handleRemoveDate = (dateToRemove) => {
    setExcludedDates((prev) => [...prev, dateToRemove]);
  };

  // Live availability check on target dates
  useEffect(() => {
    let isCancelled = false;
    if (targetDates.length === 0) {
      setBulkConflictInfo(null);
      return;
    }

    const runBulkCheck = async () => {
      setCheckingBulk(true);
      try {
        const res = await mealsApi.checkBulkAvailability({
          dates: targetDates,
          bookingType,
          venue,
          mealTypes: Object.keys(selectedMeals),
        });
        if (!isCancelled && res.data) {
          setBulkConflictInfo(res.data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Could not check meals bulk availability:', err);
        }
      } finally {
        if (!isCancelled) setCheckingBulk(false);
      }
    };

    runBulkCheck();
    return () => {
      isCancelled = true;
    };
  }, [targetDates, bookingType, venue]);

  const handleToggleMeal = (cat) => {
    setSelectedMeals((prev) => {
      const next = { ...prev };
      if (next[cat.type]) {
        delete next[cat.type];
      } else {
        const defaultGuest = Number(totalGuests) > 0 ? Number(totalGuests) : 25;
        const prefTime = cat.isRefreshment ? (serviceTime || '') : cat.defaultTime;
        next[cat.type] = { guestCount: defaultGuest, preferredTime: prefTime };
      }
      return next;
    });
  };

  const handleServiceTimeChange = (val) => {
    setServiceTime(val);
    setSelectedMeals((prev) => {
      const next = { ...prev };
      if (next['Snacks']) next['Snacks'] = { ...next['Snacks'], preferredTime: val };
      if (next['Tea / Coffee']) next['Tea / Coffee'] = { ...next['Tea / Coffee'], preferredTime: val };
      return next;
    });
  };

  const handleTotalGuestsChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setTotalGuests('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setTotalGuests(num);
      setSelectedMeals((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          next[k] = { ...next[k], guestCount: num > 0 ? num : 1 };
        });
        return next;
      });
    }
  };

  const handleUpdateGuestCount = (mealType, delta) => {
    setSelectedMeals((prev) => {
      if (!prev[mealType]) return prev;
      const newCount = Math.max(1, prev[mealType].guestCount + delta);
      return {
        ...prev,
        [mealType]: { ...prev[mealType], guestCount: newCount },
      };
    });
  };

  const handleRemoveMeal = (mealType) => {
    setSelectedMeals((prev) => {
      const next = { ...prev };
      delete next[mealType];
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedMeals({});
  };

  const handleReset = () => {
    setEventTitle('');
    setVenue(user?.department ? `${user.department} Conference Hall` : '');
    setDate(getTodayStr());
    setEndDate(getTodayStr());
    setBookingType('ONE_TIME');
    setRecurrenceDays(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
    setExcludedDates([]);
    setBulkConflictInfo(null);
    setCalendarDate(getTodayStr());
    setTotalGuests(25);
    setSpecialRequirements('');
    setAdditionalNotes('');
    setServiceTime('');
    setSelectedMeals({
      Lunch: { guestCount: 25, preferredTime: '01:00 PM' },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = getTodayStr();
    if (date < today) {
      showToast('Event date cannot be in the past', 'warning');
      return;
    }

    if (targetDates.length === 0) {
      showToast('Please select at least one valid date for this meal request', 'warning');
      return;
    }

    const guestsNum = Number(totalGuests);
    if (!guestsNum || isNaN(guestsNum) || guestsNum <= 0 || !Number.isInteger(guestsNum)) {
      showToast('Please enter a valid guest count (must be an integer greater than 0)', 'warning');
      return;
    }

    const mealTypesList = Object.keys(selectedMeals);
    if (mealTypesList.length === 0) {
      showToast('Please select at least one meal category', 'warning');
      return;
    }
    for (const type of mealTypesList) {
      const count = Number(selectedMeals[type]?.guestCount);
      if (!count || count <= 0) {
        showToast(`Please enter a valid guest count for ${type}`, 'warning');
        return;
      }
    }
    if (!eventTitle.trim()) {
      showToast('Please enter the event / purpose', 'warning');
      return;
    }
    if (!venue.trim()) {
      showToast('Please enter the venue / location', 'warning');
      return;
    }

    const hasRefreshments = !!(selectedMeals['Snacks'] || selectedMeals['Tea / Coffee']);
    if (hasRefreshments && (!serviceTime || (serviceTime !== 'FORENOON' && serviceTime !== 'AFTERNOON'))) {
      showToast('Please select FORENOON or AFTERNOON for Snacks / Tea / Coffee.', 'warning');
      return;
    }

    const mealItems = mealTypesList.map((type) => {
      const isRef = type === 'Snacks' || type === 'Tea / Coffee';
      return {
        mealType: type,
        guestCount: selectedMeals[type].guestCount,
        preferredTime: isRef ? serviceTime : selectedMeals[type].preferredTime,
        description: `${type} arrangement for ${selectedMeals[type].guestCount} guests`,
      };
    });

    setSubmitting(true);
    try {
      const res = await mealsApi.createRequest({
        eventTitle,
        date: targetDates[0] || date,
        startDate: targetDates[0] || date,
        endDate: targetDates[targetDates.length - 1] || endDate || date,
        dates: targetDates,
        bookingType,
        recurrenceDays: bookingType === 'RECURRING' ? recurrenceDays : null,
        recurrencePattern: bookingType === 'RECURRING' ? 'WEEKLY' : null,
        venue,
        totalGuests: guestsNum,
        mealTypes: mealTypesList,
        serviceTime: hasRefreshments ? serviceTime : null,
        mealItems,
        specialRequirements,
        additionalNotes,
      });

      if (res.success) {
        showToast('Snacks & Meals request submitted successfully!', 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        handleReset();
        loadRequests();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit meals request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const hasRefreshments = !!(selectedMeals['Snacks'] || selectedMeals['Tea / Coffee']);

  // Maximum guests across selected meals
  const maxGuests = Object.values(selectedMeals).reduce(
    (max, item) => Math.max(max, item.guestCount),
    0
  );

  const fetchMealsRequests = async ({ fromDate, toDate }) => {
    const res = await mealsApi.getRequests({ fromDate, toDate });
    return res.data || [];
  };

  return (
    <div className="page-stack">
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-glow" />
        <div>
          <h1 className="page-banner-title">
            Snacks & Meals Request
          </h1>
          <p className="page-banner-subtitle">
            Request breakfast, lunch, dinner, snacks or tea/coffee for your departmental guests and events.
          </p>
        </div>
        <div className="banner-tagline">
          “Good Hospitality<br />Stronger Connections”
        </div>
      </div>

      {/* Date Range Meals Requests Viewer */}
      <ServiceDateRangeViewer
        title="View Meals Requests in Date Range"
        buttonLabel="Show Requests"
        countLabel="Total Requests"
        loadingMessage="Loading meals requests..."
        errorMessage="Unable to load meals requests. Please try again."
        emptyMessage="No meals requests found for the selected date range."
        onFetch={fetchMealsRequests}
        renderResults={(records) => (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Request ID</th>
                <th>Department</th>
                <th>Meal Type</th>
                <th>Guest Count</th>
                <th>Preferred / Service Time</th>
                <th>Venue</th>
                <th>Purpose / Event</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((m, idx) => {
                const mealTypesStr = Array.isArray(m.mealTypes)
                  ? m.mealTypes.join(', ')
                  : (m.mealType || '-');

                return (
                  <tr key={m.id || m.requestId || idx}>
                    <td className="table-cell-date">
                      {m.dates && m.dates.length > 1 ? (
                        <div>
                          <div>{formatDateDisplay(m.startDate || m.dates[0])} → {formatDateDisplay(m.endDate || m.dates[m.dates.length - 1])}</div>
                          <div style={{ fontSize: '10px', color: 'var(--arctic-blue)', fontFamily: 'monospace' }}>
                            {m.occurrenceIndex ? `(#${m.occurrenceIndex}/${m.totalOccurrences || m.dates.length}) ` : ''}{m.dates.length} Dates
                          </div>
                        </div>
                      ) : (
                        formatDateDisplay(m.date)
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.requestId}</td>
                    <td>{m.department}</td>
                    <td>
                      <span style={{ color: 'var(--arctic-blue)', fontWeight: 600 }}>{mealTypesStr}</span>
                      {m.serviceTime && (
                        <div style={{ fontSize: '10px', color: 'var(--amber-color, #fbbf24)', fontWeight: 600 }}>
                          Service: {m.serviceTime}
                        </div>
                      )}
                    </td>
                    <td>{m.totalGuests || m.guestCount || 1} Guests</td>
                    <td>{m.serviceTime ? `Service: ${m.serviceTime}` : (m.preferredTime || '-')}</td>
                    <td>{m.venue || '-'}</td>
                    <td>{m.eventTitle || m.purpose || '-'}</td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      />

      {/* 4 Stat Cards */}
      <div className="stat-grid-4">
        <StatCard
          icon={Calendar}
          value={requests.length}
          subtitle="Total Requests"
          color="blue"
        />
        <StatCard
          icon={Clock}
          value={pendingCount}
          subtitle="Pending Approval"
          color="amber"
        />
        <StatCard
          icon={CheckCircle}
          value={approvedCount}
          subtitle="Approved This Month"
          color="emerald"
        />
        <StatCard
          icon={XCircle}
          value={rejectedCount}
          subtitle="Rejected"
          color="rose"
        />
      </div>

      {/* Unified Snacks & Meals Request Container */}
      <div className="card-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
          <div>
            <span className="card-title text-base font-bold flex items-center gap-2">
              <Utensils size={18} color="var(--arctic-blue)" />
              Snacks & Meals Request
            </span>
            <p className="card-subtitle text-xs text-slate-400 mt-0.5">
              Select required meal categories, configure guest counts, and submit hospitality request.
            </p>
          </div>
        </div>

        <div className="two-column-layout balanced">
          {/* Left Column: Meal Category Selection & Configured Items */}
          <div className="column-stack">
            <div>
              <span className="text-xs font-semibold text-slate-200 block mb-1.5">
                Select Meal Types *
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MEAL_CATEGORIES.map((cat) => {
                  const isSelected = !!selectedMeals[cat.type];
                  return (
                    <div
                      key={cat.type}
                      onClick={() => handleToggleMeal(cat)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Utensils size={14} className={isSelected ? 'text-blue-400' : 'text-slate-400'} />
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isSelected ? '✓' : '+'}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-white">{cat.type}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {cat.isRefreshment
                          ? (serviceTime ? `Service: ${serviceTime}` : 'Service: FORENOON / AFTERNOON')
                          : cat.defaultTime}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Service Time Selector for Snacks & Tea / Coffee */}
              {hasRefreshments && (
                <div
                  className="mt-2.5 p-2.5 rounded-lg border"
                  style={{
                    background: 'var(--bg-surface-elevated, rgba(15, 23, 42, 0.6))',
                    borderColor: 'var(--arctic-blue, #0284c7)'
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Clock size={13} className="text-sky-400" />
                      Refreshments Service Time *
                    </label>
                    <span className="text-[10px] text-amber-400 font-medium">
                      Applies to Snacks &amp; Tea / Coffee
                    </span>
                  </div>
                  <select
                    value={serviceTime}
                    onChange={(e) => handleServiceTimeChange(e.target.value)}
                    className="w-full text-xs"
                    style={{
                      height: '36px',
                      background: 'var(--input-bg, #0b1329)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm, 6px)',
                      padding: '0 8px',
                    }}
                    required
                  >
                    <option value="">Select Service Time (FORENOON / AFTERNOON)...</option>
                    <option value="FORENOON">FORENOON</option>
                    <option value="AFTERNOON">AFTERNOON</option>
                  </select>
                </div>
              )}
            </div>

            {/* Selected Meal Items List */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-800">
                <span className="font-semibold text-slate-200">Configured Meal Items</span>
                {Object.keys(selectedMeals).length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="view-all-link text-xs text-rose-400 hover:text-rose-300"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="selected-meals-list">
                {Object.keys(selectedMeals).length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-xs">
                    No meal categories selected yet. Click meal types above.
                  </div>
                ) : (
                  Object.keys(selectedMeals).map((mealType) => (
                    <div
                      key={mealType}
                      className="selected-meal-row p-2 mb-1.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <div className="selected-meal-name font-semibold text-white text-xs">
                          {mealType}
                        </div>
                        <div className="selected-meal-time text-[10px] text-slate-400">
                          {(mealType === 'Snacks' || mealType === 'Tea / Coffee')
                            ? (serviceTime ? `Service: ${serviceTime}` : 'Service: FORENOON / AFTERNOON (Required)')
                            : `Time: ${selectedMeals[mealType].preferredTime}`}
                        </div>
                      </div>

                      <div className="cart-qty-controls flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateGuestCount(mealType, -5)}
                          className="cart-qty-btn"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="cart-qty-number text-xs font-semibold px-1 text-slate-200">
                          {selectedMeals[mealType].guestCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateGuestCount(mealType, 5)}
                          className="cart-qty-btn"
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMeal(mealType)}
                          className="cart-remove-btn text-rose-400 ml-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {Object.keys(selectedMeals).length > 0 && (
                  <div className="selected-meals-total flex justify-between items-center pt-2 mt-2 border-t border-slate-800 font-semibold text-xs">
                    <span className="text-slate-400">
                      Total Guests (Max)
                    </span>
                    <span className="text-white font-bold">
                      {maxGuests} Guests
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Request Details Form */}
          <div className="column-stack">
            <form onSubmit={handleSubmit} className="form-column">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="form-group">
                  <label className="form-label text-xs">Event / Purpose *</label>
                  <input
                    type="text"
                    placeholder="e.g. Department Meeting, Workshop"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>

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
                      if (!endDate || endDate < date) setEndDate(date);
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
                      if (!endDate || endDate < date) setEndDate(date);
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
                    {bookingType === 'ONE_TIME' ? 'Date *' : 'Series Start Date *'}
                  </label>
                  <input
                    type="date"
                    min={getTodayStr()}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
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
                      min={date || getTodayStr()}
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

              {/* Occurrences Preview */}
              {targetDates.length > 0 && bookingType !== 'ONE_TIME' && (
                <div className="space-y-1.5">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-300">
                      Occurrences Preview: <strong className="text-white">{targetDates.length} date(s)</strong>
                    </span>
                    {checkingBulk ? (
                      <span className="text-blue-400 flex items-center gap-1">
                        <RefreshCw size={12} className="animate-spin" /> Checking dates...
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} /> ✓ Ready for Submission
                      </span>
                    )}
                  </div>

                  <div className="occurrence-list-container max-h-[160px] overflow-y-auto space-y-1.5">
                    {targetDates.map((d, idx) => {
                      const { dateFormatted, dayOfWeek } = getOccurrenceDateDisplay(d);
                      return (
                        <div
                          key={`${d}-${idx}`}
                          className="occurrence-card occurrence-card-available"
                        >
                          <div className="occurrence-card-header">
                            <div className="occurrence-title-group">
                              <span className="occurrence-index-badge">Day {idx + 1}</span>
                              <span className="occurrence-date-title">{dateFormatted || d}</span>
                              <span className="occurrence-day-sub">({dayOfWeek})</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="occurrence-status-badge occurrence-badge-available">
                                Selected
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDate(d)}
                                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition"
                                title={`Remove ${d}`}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="form-group">
                  <label className="form-label text-xs">Venue / Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. Conference Hall"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Default Guest Count *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 25"
                    value={totalGuests}
                    onChange={handleTotalGuestsChange}
                    required
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-xs">Special Requirements</label>
                <textarea
                  rows="2"
                  placeholder="Vegetarian option required. No onion/garlic, VIP arrangements, etc."
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
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
                  disabled={submitting || Object.keys(selectedMeals).length === 0}
                >
                  <Send size={14} /> {submitting ? 'Sending...' : 'Send Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Auxiliary 2-Column Row: Guidelines & Quick Calendar */}
      <div className="two-column-layout balanced">
        <div className="column-stack">
          {/* Guidelines */}
          <div className="guidelines-card">
            <div className="guidelines-header">
              <Info size={18} className="text-arctic-blue" />
              <span className="guidelines-title">Guidelines</span>
            </div>
            <ul className="guidelines-list">
              <li>Requests must be submitted at least 2 working days in advance.</li>
              <li>Food arrangements are subject to admin approval.</li>
              <li>Please provide accurate number of guests.</li>
              <li>Mention any special dietary requirements.</li>
              <li>For urgent requests, contact the administration office.</li>
            </ul>
          </div>
        </div>

        <div className="column-stack">
          {/* Quick Calendar */}
          <QuickCalendar
            selectedDate={calendarDate}
            onSelectDate={(newDate) => setCalendarDate(newDate)}
            events={requests.map((r) => ({
              id: r.id || r.requestId,
              date: r.date,
              title: `${r.eventTitle} (${r.totalGuests || r.mealItems?.[0]?.guestCount || 25} guests)`,
              status: r.status,
              department: r.department,
            }))}
            showLegend={true}
            showEventsList={true}
          />
        </div>
      </div>



      {/* Recent Meal Requests Section */}
      <div className="card-panel">
        <div className="card-header">
          <span className="card-title">Recent Meal Requests</span>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Request ID</th>
                <th>Event / Purpose</th>
                <th>Venue</th>
                <th>Guests</th>
                <th>Meal Types</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty-cell">
                    No meal requests submitted yet.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id || r.requestId}>
                    <td className="table-cell-date">
                      {r.dates && r.dates.length > 1 ? (
                        <div>
                          <div>{formatDateDisplay(r.startDate || r.dates[0])} → {formatDateDisplay(r.endDate || r.dates[r.dates.length - 1])}</div>
                          <div style={{ fontSize: '10px', color: 'var(--arctic-blue)', fontFamily: 'monospace' }}>
                            {r.occurrenceIndex ? `(#${r.occurrenceIndex}/${r.totalOccurrences || r.dates.length}) ` : ''}{r.dates.length} Dates
                          </div>
                        </div>
                      ) : (
                        formatDateDisplay(r.date || r.createdAt)
                      )}
                    </td>
                    <td className="font-mono text-arctic-blue">{r.requestId}</td>
                    <td className="table-cell-title font-semibold">{r.eventTitle}</td>
                    <td>{r.venue}</td>
                    <td className="table-cell-guests font-bold">
                      {r.totalGuests || (r.mealItems && r.mealItems[0]?.guestCount) || '-'}
                    </td>
                    <td>
                      <div className="meal-chips-group">
                        {(r.mealTypes || []).map((mt) => (
                          <span
                            key={mt}
                            className="meal-chip"
                          >
                            {mt}
                          </span>
                        ))}
                      </div>
                      {r.serviceTime && (
                        <div style={{ fontSize: '10px', color: 'var(--amber-color, #fbbf24)', fontWeight: 600, marginTop: '2px' }}>
                          Service: {r.serviceTime}
                        </div>
                      )}
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
            service: 'Snacks & Meals',
            serviceCategory: 'MEALS',
          }}
        />
      )}
    </div>
  );
};

export default SnacksMeals;
