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
    defaultTime: '04:30 PM',
  },
  {
    type: 'Tea / Coffee',
    subtitle: 'Tea, Coffee, Green Tea, etc.',
    defaultTime: '11:00 AM',
  },
];

export const SnacksMeals = () => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [totalGuests, setTotalGuests] = useState(25);
  const [selectedReqModal, setSelectedReqModal] = useState(null);
  const [calendarDate, setCalendarDate] = useState(getTodayStr());

  // Selected meal items: map of { [mealType]: { guestCount, preferredTime } }
  const [selectedMeals, setSelectedMeals] = useState({
    Lunch: { guestCount: 25, preferredTime: '01:00 PM' },
    Snacks: { guestCount: 25, preferredTime: '04:30 PM' },
    'Tea / Coffee': { guestCount: 25, preferredTime: '11:00 AM' },
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
        next[cat.type] = { guestCount: defaultGuest, preferredTime: cat.defaultTime };
      }
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

    const mealItems = mealTypesList.map((type) => ({
      mealType: type,
      guestCount: selectedMeals[type].guestCount,
      preferredTime: selectedMeals[type].preferredTime,
      description: `${type} arrangement for ${selectedMeals[type].guestCount} guests`,
    }));

    setSubmitting(true);
    try {
      const res = await mealsApi.createRequest({
        eventTitle,
        date,
        venue,
        totalGuests: guestsNum,
        mealTypes: mealTypesList,
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
                <th>Preferred Time</th>
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
                    <td style={{ color: 'var(--arctic-blue)', fontWeight: 600 }}>{mealTypesStr}</td>
                    <td>{m.totalGuests || m.guestCount || 1} Guests</td>
                    <td>{m.preferredTime || '-'}</td>
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

      {/* Select Meal Types Card matching design system */}
      <div className="card-panel">
        <div className="card-header">
          <div>
            <span className="card-title">Select Meal Types</span>
            <p className="card-subtitle">
              You can select multiple options as per your requirement.
            </p>
          </div>
        </div>

        <div className="meal-types-grid">
          {MEAL_CATEGORIES.map((cat) => {
            const isSelected = !!selectedMeals[cat.type];
            return (
              <div
                key={cat.type}
                onClick={() => handleToggleMeal(cat)}
                className={`meal-type-card ${isSelected ? 'selected' : ''}`}
              >
                {/* Checkbox badge */}
                <div
                  className={`meal-checkbox-badge ${isSelected ? 'selected' : ''}`}
                >
                  {isSelected ? '✓' : ''}
                </div>

                <div className="meal-icon-box">
                  <Utensils size={20} className="text-arctic-blue" />
                </div>

                <div className="meal-type-title">
                  {cat.type}
                </div>
                <div className="meal-type-subtitle">
                  {cat.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form & Selected Items Columns */}
      <div className="two-column-layout balanced">
        {/* Left Column: Request Details Form */}
        <div className="card-panel">
          <div className="card-header">
            <div>
              <span className="card-title">Request Details</span>
              <p className="card-subtitle">
                Fill in the event details for meal arrangement.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-column">
            <div className="responsive-form-grid-2">
              <div className="form-group-sm">
                <label className="form-label">
                  Event / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Department Meeting"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-sm">
                <label className="form-label">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="responsive-form-grid-2">
              <div className="form-group-sm">
                <label className="form-label">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSE Department Conference Hall"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />
              </div>

              <div className="form-group-sm">
                <label className="form-label">
                  Number of Guests *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 25"
                  value={totalGuests}
                  onChange={handleTotalGuestsChange}
                  required
                />
              </div>
            </div>

            {/* Meal Time Checkboxes */}
            <div className="form-group-sm">
              <label className="form-label">
                Meal Time(s) *
              </label>
              <div className="meal-times-checkbox-group">
                {MEAL_CATEGORIES.map((cat) => (
                  <label
                    key={cat.type}
                    className="checkbox-label"
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedMeals[cat.type]}
                      onChange={() => handleToggleMeal(cat)}
                    />
                    {cat.type}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group-sm">
              <label className="form-label">
                Special Requirements
              </label>
              <textarea
                rows="3"
                placeholder="Vegetarian option required. No onion/garlic, VIP arrangements, etc."
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
              />
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-outline btn-flex-1"
                disabled={submitting}
              >
                <RotateCcw size={16} /> Reset
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-flex-2"
                disabled={submitting}
              >
                <Send size={16} /> {submitting ? 'Sending...' : 'Send Request to Admin'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Selected Meal Items & Recent Table */}
        <div className="column-stack">
          {/* Selected Meal Items List */}
          <div className="card-panel">
            <div className="card-header">
              <span className="card-title">Selected Meal Items</span>
              {Object.keys(selectedMeals).length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="view-all-link"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="selected-meals-list">
              {Object.keys(selectedMeals).length === 0 ? (
                <div className="cart-empty-state">
                  No meal categories selected yet.
                </div>
              ) : (
                Object.keys(selectedMeals).map((mealType) => (
                  <div
                    key={mealType}
                    className="selected-meal-row"
                  >
                    <div>
                      <div className="selected-meal-name">
                        {mealType}
                      </div>
                      <div className="selected-meal-time">
                        Preferred Time: {selectedMeals[mealType].preferredTime}
                      </div>
                    </div>

                    <div className="cart-qty-controls">
                      <button
                        type="button"
                        onClick={() => handleUpdateGuestCount(mealType, -5)}
                        className="cart-qty-btn"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="cart-qty-number">
                        {selectedMeals[mealType].guestCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateGuestCount(mealType, 5)}
                        className="cart-qty-btn"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMeal(mealType)}
                        className="cart-remove-btn"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {Object.keys(selectedMeals).length > 0 && (
                <div className="selected-meals-total">
                  <span className="selected-meals-total-label">
                    Total Guests
                  </span>
                  <span className="selected-meals-total-value">
                    {maxGuests}
                  </span>
                </div>
              )}
            </div>
          </div>

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
