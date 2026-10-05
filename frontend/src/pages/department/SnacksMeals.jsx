import React, { useState, useEffect } from 'react';
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
        date,
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
                    <td className="table-cell-date">{formatDateDisplay(m.date)}</td>
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

                <div className="form-group">
                  <label className="form-label text-xs">Date *</label>
                  <input
                    type="date"
                    min={getTodayStr()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>
              </div>

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
                    <td className="table-cell-date">{formatDateDisplay(r.date || r.createdAt)}</td>
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
