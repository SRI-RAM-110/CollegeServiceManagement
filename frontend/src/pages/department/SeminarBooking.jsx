import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  Projector,
  AirVent,
  Volume2,
  Wifi,
  Send,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  CalendarRange,
  Repeat,
  Search,
  Eye,
  XCircle,
  MapPin,
  Building,
  RefreshCw,
} from 'lucide-react';
import { seminarApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { ServiceDateRangeViewer } from '../../components/common/ServiceDateRangeViewer';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { Modal } from '../../components/common/Modal';
import confetti from 'canvas-confetti';
import { getTodayStr, formatDateDisplay } from '../../utils/dateUtils';

const WEEKDAYS = [
  { key: 'MONDAY', label: 'Mon', fullLabel: 'Monday', dayIndex: 1 },
  { key: 'TUESDAY', label: 'Tue', fullLabel: 'Tuesday', dayIndex: 2 },
  { key: 'WEDNESDAY', label: 'Wed', fullLabel: 'Wednesday', dayIndex: 3 },
  { key: 'THURSDAY', label: 'Thu', fullLabel: 'Thursday', dayIndex: 4 },
  { key: 'FRIDAY', label: 'Fri', fullLabel: 'Friday', dayIndex: 5 },
  { key: 'SATURDAY', label: 'Sat', fullLabel: 'Saturday', dayIndex: 6 },
  { key: 'SUNDAY', label: 'Sun', fullLabel: 'Sunday', dayIndex: 0 },
];

const parseLocalDate = (str) => {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getOccurrenceDateDisplay = (dateStr) => {
  if (!dateStr) return { dateFormatted: '', dayOfWeek: '' };
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

export const SeminarBooking = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  // Navigation tab: 'booking' | 'my-requests'
  const [activeTab, setActiveTab] = useState('booking');

  const [halls, setHalls] = useState([]);
  const [selectedHallId, setSelectedHallId] = useState('SH-1');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [toDate, setToDate] = useState(getTodayStr());
  const [selectedReqModal, setSelectedReqModal] = useState(null);
  const [conflictModalData, setConflictModalData] = useState(null);

  // Booking Type: ONE_TIME | RECURRING | MULTI_DAY
  const [bookingType, setBookingType] = useState('ONE_TIME');
  const [recurrenceDays, setRecurrenceDays] = useState(['MONDAY']);

  // Availability & Conflicts
  const [availability, setAvailability] = useState(null);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [bulkConflictInfo, setBulkConflictInfo] = useState(null);
  const [checkingBulk, setCheckingBulk] = useState(false);

  // Form fields
  const [eventTitle, setEventTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedParticipants, setExpectedParticipants] = useState(100);
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('FORENOON');
  const [submitting, setSubmitting] = useState(false);

  // Pre-submission Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Calendar bookings across campus
  const [allBookings, setAllBookings] = useState([]);

  // My Requests state
  const [myRequests, setMyRequests] = useState([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [myStatusFilter, setMyStatusFilter] = useState('ALL');
  const [myHallFilter, setMyHallFilter] = useState('ALL');
  const [myTypeFilter, setMyTypeFilter] = useState('ALL');

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelScope, setCancelScope] = useState('THIS_OCCURRENCE');
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadAllBookings = async () => {
    try {
      const res = await seminarApi.getRequests();
      if (res.data) setAllBookings(res.data);
    } catch {
      // fallback
    }
  };

  const loadHalls = async () => {
    try {
      const res = await seminarApi.getHalls();
      if (res.data && res.data.length > 0) {
        setHalls(res.data);
        setSelectedHallId(res.data[0].hallId);
      }
    } catch {
      showToast('Failed to load seminar halls', 'error');
    }
  };

  const loadMyRequests = async () => {
    setLoadingMyRequests(true);
    try {
      const res = await seminarApi.getMyRequests();
      if (res.data) {
        setMyRequests(res.data);
      }
    } catch (err) {
      console.warn('Failed to load my seminar requests:', err);
    } finally {
      setLoadingMyRequests(false);
    }
  };

  const checkSingleAvailability = async (hallId, date) => {
    setLoadingAvail(true);
    try {
      const res = await seminarApi.getAvailability(hallId, date);
      if (res.data) {
        setAvailability(res.data);
      }
    } catch {
      showToast('Could not fetch slot availability', 'error');
    } finally {
      setLoadingAvail(false);
    }
  };

  useEffect(() => {
    loadHalls();
    loadAllBookings();
    loadMyRequests();
  }, [user?.userId]);

  useEffect(() => {
    if (selectedHallId && selectedDate) {
      checkSingleAvailability(selectedHallId, selectedDate);
    }
  }, [selectedHallId, selectedDate]);

  const currentHall = halls.find((h) => h.hallId === selectedHallId) || halls[0] || {};
  const isHallAvailable = !currentHall.status || currentHall.status.toLowerCase() === 'available';

  const isCapacityExceeded = useMemo(() => {
    if (!currentHall.capacity || !expectedParticipants) return false;
    return Number(expectedParticipants) > currentHall.capacity;
  }, [currentHall.capacity, expectedParticipants]);

  // Compute all target dates based on booking type
  const targetDates = useMemo(() => {
    if (bookingType === 'ONE_TIME') {
      if (!selectedDate) return [];
      return [selectedDate];
    } else if (bookingType === 'MULTI_DAY') {
      if (!selectedDate) return [];
      if (!toDate || toDate === selectedDate) return [selectedDate];
      if (toDate < selectedDate) return [];
      const list = [];
      let cur = parseLocalDate(selectedDate);
      const end = parseLocalDate(toDate);
      while (cur <= end) {
        list.push(formatLocalDate(cur));
        cur.setDate(cur.getDate() + 1);
      }
      return list;
    } else {
      // RECURRING
      if (!selectedDate || !toDate || toDate < selectedDate) return [];
      if (recurrenceDays.length === 0) return [];
      const targetDayIndices = recurrenceDays.map((k) => {
        const found = WEEKDAYS.find((w) => w.key === k);
        return found ? found.dayIndex : -1;
      });
      const list = [];
      let cur = parseLocalDate(selectedDate);
      const end = parseLocalDate(toDate);
      while (cur <= end) {
        if (targetDayIndices.includes(cur.getDay())) {
          list.push(formatLocalDate(cur));
        }
        cur.setDate(cur.getDate() + 1);
      }
      return list;
    }
  }, [bookingType, selectedDate, toDate, recurrenceDays]);

  // Bulk conflict check on target dates
  useEffect(() => {
    let isCancelled = false;
    if (!selectedHallId || !selectedSlot || targetDates.length === 0) {
      setBulkConflictInfo(null);
      return;
    }

    const runBulkCheck = async () => {
      setCheckingBulk(true);
      try {
        const res = await seminarApi.checkBulkAvailability({
          hallId: selectedHallId,
          slot: selectedSlot,
          dates: targetDates,
          bookingType: bookingType,
        });
        if (!isCancelled && res.data) {
          setBulkConflictInfo(res.data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('Bulk check failed:', err);
        }
      } finally {
        if (!isCancelled) setCheckingBulk(false);
      }
    };

    runBulkCheck();

    return () => {
      isCancelled = true;
    };
  }, [selectedHallId, selectedSlot, targetDates, bookingType]);

  const slotsStatus = availability?.slots || {
    FORENOON: 'AVAILABLE',
    AFTERNOON: 'AVAILABLE',
    FULL_DAY: 'AVAILABLE',
  };
  const activeBookings = availability?.bookings || [];

  const handleSlotSelect = (slotName) => {
    if (slotsStatus[slotName] === 'BOOKED') {
      showToast(`The ${slotName} slot is already booked for this date!`, 'warning');
      return;
    }
    setSelectedSlot(slotName);
  };

  const toggleRecurrenceDay = (dayKey) => {
    setRecurrenceDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleReset = () => {
    setEventTitle('');
    setPurpose('');
    setExpectedParticipants(100);
    setAdditionalRequirements('');
    setSelectedSlot('FORENOON');
    setSelectedDate(getTodayStr());
    setToDate(getTodayStr());
    setBookingType('ONE_TIME');
    setRecurrenceDays(['MONDAY']);
    setBulkConflictInfo(null);
  };

  // Pre-submission review check
  const handleOpenReview = (e) => {
    e.preventDefault();
    const today = getTodayStr();

    if (selectedDate < today) {
      showToast('Start date cannot be in the past', 'warning');
      return;
    }
    if (toDate && toDate < selectedDate) {
      showToast('End date must be on or after the start date', 'warning');
      return;
    }
    if (!isHallAvailable) {
      showToast(
        `Seminar Hall ${currentHall.name} is currently unavailable (${currentHall.status}).`,
        'error'
      );
      return;
    }
    if (isCapacityExceeded) {
      showToast(
        `Expected participants (${expectedParticipants}) exceed the hall capacity of ${currentHall.capacity}.`,
        'error'
      );
      return;
    }
    if (bookingType === 'RECURRING' && recurrenceDays.length === 0) {
      showToast('Please select at least one weekday for recurring bookings', 'warning');
      return;
    }
    if (targetDates.length === 0) {
      showToast('No booking occurrences found for the selected dates and pattern', 'warning');
      return;
    }
    if (bulkConflictInfo && bulkConflictInfo.conflictCount > 0) {
      showToast(
        `Cannot proceed: ${bulkConflictInfo.conflictCount} date(s) have slot conflicts.`,
        'error'
      );
      return;
    }
    if (!selectedSlot) {
      showToast('Please select a preferred slot', 'warning');
      return;
    }
    if (!eventTitle.trim()) {
      showToast('Please enter an event title', 'warning');
      return;
    }
    if (!purpose.trim()) {
      showToast('Please describe the purpose of the event', 'warning');
      return;
    }
    if (!expectedParticipants || Number(expectedParticipants) <= 0) {
      showToast('Expected participants must be at least 1', 'warning');
      return;
    }

    setShowReviewModal(true);
  };

  // Final confirmed submission
  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const effectiveType = bookingType;

      const payload = {
        bookingType: effectiveType,
        hallId: selectedHallId,
        date: selectedDate,
        startDate: selectedDate,
        endDate: bookingType === 'ONE_TIME' ? selectedDate : (toDate || selectedDate),
        slot: selectedSlot,
        eventTitle,
        purpose,
        expectedParticipants: Number(expectedParticipants),
        additionalRequirements,
        recurrenceDays: bookingType === 'RECURRING' ? recurrenceDays : null,
        recurrencePattern: bookingType === 'RECURRING' ? 'WEEKLY' : null,
      };

      const res = await seminarApi.createBooking(payload);

      if (res.success) {
        showToast(
          effectiveType === 'RECURRING' || effectiveType === 'MULTI_DAY'
            ? `Successfully submitted ${targetDates.length} booking occurrences for approval!`
            : 'Seminar hall booking request submitted successfully!',
          'success'
        );
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
        setShowReviewModal(false);
        handleReset();
        checkSingleAvailability(selectedHallId, selectedDate);
        loadAllBookings();
        loadMyRequests();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit booking request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchBookedSlots = async ({ fromDate, toDate }) => {
    const res = await seminarApi.getBookings({ fromDate, toDate });
    return res.data || [];
  };

  // Open Cancel Modal
  const handleOpenCancel = (req) => {
    setCancelItem(req);
    setCancelReason('');
    setCancelScope('THIS_OCCURRENCE');
    setCancelModalOpen(true);
  };

  // Submit Cancellation
  const handleSubmitCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Please enter a cancellation reason', 'warning');
      return;
    }

    const reqId = cancelItem?.bookingId || cancelItem?.id;
    setCancelLoading(true);
    try {
      const res = await seminarApi.cancelRequest(reqId, {
        reason: cancelReason.trim(),
        scope: cancelScope,
      });

      if (res.success || res.data) {
        const isPending = cancelItem.status === 'PENDING' || cancelItem.status === 'UNDER_REVIEW';
        showToast(
          isPending
            ? 'Seminar request cancelled successfully.'
            : 'Cancellation request submitted successfully.',
          'success'
        );
        setCancelModalOpen(false);
        setCancelItem(null);
        await loadMyRequests();
        loadAllBookings();
        if (selectedHallId && selectedDate) {
          checkSingleAvailability(selectedHallId, selectedDate);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel seminar request', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Filtered requests for "My Requests"
  const filteredMyRequests = useMemo(() => {
    return myRequests.filter((r) => {
      const q = mySearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (r.bookingId && r.bookingId.toLowerCase().includes(q)) ||
        (r.eventTitle && r.eventTitle.toLowerCase().includes(q)) ||
        (r.purpose && r.purpose.toLowerCase().includes(q)) ||
        (r.hallName && r.hallName.toLowerCase().includes(q)) ||
        (r.hallLocation && r.hallLocation.toLowerCase().includes(q));

      const matchStatus = myStatusFilter === 'ALL' || r.status === myStatusFilter;
      const matchHall = myHallFilter === 'ALL' || r.hallId === myHallFilter || r.hallName === myHallFilter;
      const matchType = myTypeFilter === 'ALL' || r.bookingType === myTypeFilter;

      return matchSearch && matchStatus && matchHall && matchType;
    });
  }, [myRequests, mySearchQuery, myStatusFilter, myHallFilter, myTypeFilter]);

  const myStats = useMemo(() => {
    return {
      total: myRequests.length,
      pending: myRequests.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length,
      approved: myRequests.filter((r) => r.status === 'APPROVED' || r.status === 'BOOKED').length,
      cancelled: myRequests.filter((r) => r.status === 'CANCELLED' || r.status === 'CANCELLATION_REQUESTED').length,
    };
  }, [myRequests]);

  // Render My Requests Section Component (Part B: Compact & Centered)
  const renderMyRequestsSection = () => (
    <div className="my-requests-compact-wrapper">
      <div className="card-panel">
        {/* Header and Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="card-title text-base font-bold text-white tracking-wide">
                MY REQUESTS
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {myRequests.length} Total
              </span>
            </div>
            <p className="card-subtitle text-[11px] text-slate-400 mt-0.5">
              Official department seminar reservations, approval status, and self-cancellation management.
            </p>
          </div>

          <button
            type="button"
            onClick={loadMyRequests}
            disabled={loadingMyRequests}
            className="btn btn-outline btn-sm text-xs py-1 px-2.5 self-start sm:self-auto flex items-center gap-1.5"
            title="Refresh my requests"
          >
            <RefreshCw size={12} className={loadingMyRequests ? 'animate-spin' : ''} />
            <span>{loadingMyRequests ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Summary Stat Cards */}
        <div className="stat-grid-4 mb-3">
          <StatCard
            icon={Building}
            value={myStats.total}
            subtitle="Total Seminar Requests"
            color="blue"
          />
          <StatCard
            icon={Clock}
            value={myStats.pending}
            subtitle="Pending Review"
            color="amber"
          />
          <StatCard
            icon={CheckCircle2}
            value={myStats.approved}
            subtitle="Approved Bookings"
            color="emerald"
          />
          <StatCard
            icon={XCircle}
            value={myStats.cancelled}
            subtitle="Cancelled / Requested"
            color="rose"
          />
        </div>

        {/* Filters Bar */}
        <div className="my-requests-filter-bar">
          <div className="search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search Request ID, event, hall, location..."
              value={mySearchQuery}
              onChange={(e) => setMySearchQuery(e.target.value)}
            />
          </div>

          <select
            value={myStatusFilter}
            onChange={(e) => setMyStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="CANCELLATION_REQUESTED">Cancellation Requested</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={myHallFilter}
            onChange={(e) => setMyHallFilter(e.target.value)}
          >
            <option value="ALL">All Halls</option>
            {halls.map((h) => (
              <option key={h.hallId} value={h.hallId}>
                {h.name}
              </option>
            ))}
          </select>

          <select
            value={myTypeFilter}
            onChange={(e) => setMyTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="ONE_TIME">One-Time</option>
            <option value="MULTI_DAY">Multi-Day</option>
            <option value="RECURRING">Recurring</option>
          </select>

          {(mySearchQuery || myStatusFilter !== 'ALL' || myHallFilter !== 'ALL' || myTypeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setMySearchQuery('');
                setMyStatusFilter('ALL');
                setMyHallFilter('ALL');
                setMyTypeFilter('ALL');
              }}
              className="filter-clear-btn"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Requests Display */}
        {loadingMyRequests && myRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-400" />
            Loading your seminar requests...
          </div>
        ) : filteredMyRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg max-w-[980px] mx-auto">
            No seminar hall requests found matching your filters.
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="custom-table-container seminar-requests-desktop-view">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '115px' }}>Request ID</th>
                    <th>Event & Purpose</th>
                    <th style={{ width: '130px' }}>Seminar Hall</th>
                    <th style={{ width: '95px' }}>Type & Series</th>
                    <th style={{ width: '120px' }}>Date & Slot</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Participants</th>
                    <th style={{ width: '95px' }}>Status</th>
                    <th style={{ width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMyRequests.map((r) => {
                    const isPending = r.status === 'PENDING' || r.status === 'UNDER_REVIEW';
                    const isApproved = r.status === 'APPROVED' || r.status === 'BOOKED';
                    const isCancelRequested = r.status === 'CANCELLATION_REQUESTED';

                    return (
                      <tr key={r.id || r.bookingId}>
                        <td className="font-mono text-xs font-semibold text-white whitespace-nowrap">
                          {r.bookingId || r.id}
                        </td>
                        <td>
                          <div className="font-semibold text-white text-xs">{r.eventTitle}</div>
                          {r.purpose && (
                            <div className="text-[11px] text-slate-400 max-w-[200px] truncate" title={r.purpose}>
                              {r.purpose}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="font-medium text-slate-200 text-xs">{r.hallName || r.hallId}</div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin size={10} className="text-slate-500" />
                            <span>{r.hallLocation || 'Campus'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {r.bookingType || 'ONE_TIME'}
                          </span>
                          {r.seriesId && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[100px]" title={r.seriesId}>
                              Series: {r.seriesId.substring(0, 8)}...
                            </div>
                          )}
                        </td>
                        <td className="table-cell-date text-xs whitespace-nowrap">
                          <div>
                            {r.startDate && r.endDate && r.startDate !== r.endDate
                              ? `${formatDateDisplay(r.startDate)} - ${formatDateDisplay(r.endDate)}`
                              : formatDateDisplay(r.date || r.startDate)}
                          </div>
                          <span
                            className="badge text-[10px] mt-1"
                            style={{
                              backgroundColor: 'rgba(77, 163, 255, 0.15)',
                              color: 'var(--arctic-blue)',
                              border: '1px solid rgba(77, 163, 255, 0.3)',
                            }}
                          >
                            {r.slot}
                          </span>
                        </td>
                        <td className="text-center font-medium text-slate-300 text-xs">
                          {r.expectedParticipants || '-'}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                          {isCancelRequested && (
                            <div className="text-[10px] font-medium text-amber-400 mt-1 flex items-center gap-1">
                              <Clock size={10} /> Cancellation Pending
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedReqModal(r)}
                              className="btn btn-outline btn-sm text-xs py-1 px-2 flex items-center gap-1 text-slate-300 hover:text-white whitespace-nowrap"
                              title="View full request details and PDF"
                            >
                              <Eye size={12} /> View
                            </button>

                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleOpenCancel(r)}
                                className="btn btn-outline btn-sm text-rose-400 hover:text-rose-300 border-rose-500/40 text-xs py-1 px-2 flex items-center gap-1 whitespace-nowrap"
                                title="Cancel Request"
                              >
                                <XCircle size={12} /> Cancel
                              </button>
                            )}

                            {isApproved && (
                              <button
                                type="button"
                                onClick={() => handleOpenCancel(r)}
                                className="btn btn-outline btn-sm text-amber-400 hover:text-amber-300 border-amber-500/40 text-xs py-1 px-2 flex items-center gap-1 whitespace-nowrap"
                                title="Request Cancellation from Coordinator"
                              >
                                <XCircle size={12} /> Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px: 360px, 390px, 430px, 480px, 600px) */}
            <div className="seminar-requests-mobile-view">
              {filteredMyRequests.map((r) => {
                const isPending = r.status === 'PENDING' || r.status === 'UNDER_REVIEW';
                const isApproved = r.status === 'APPROVED' || r.status === 'BOOKED';
                const isCancelRequested = r.status === 'CANCELLATION_REQUESTED';

                return (
                  <div
                    key={r.id || r.bookingId}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs"
                  >
                    {/* Card Header: Request ID + Status Badge */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <span className="font-mono font-bold text-white text-xs">
                        {r.bookingId || r.id}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>

                    {/* Event & Purpose */}
                    <div>
                      <h3 className="font-semibold text-white text-sm">{r.eventTitle}</h3>
                      {r.purpose && (
                        <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{r.purpose}</p>
                      )}
                    </div>

                    {/* Hall & Location */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Seminar Hall</span>
                        <span className="font-medium text-slate-200">{r.hallName || r.hallId}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Hall Location</span>
                        <span className="font-medium text-slate-300 flex items-center gap-1">
                          <MapPin size={10} className="text-slate-500" />
                          {r.hallLocation || 'Campus'}
                        </span>
                      </div>
                    </div>

                    {/* Date, Slot & Type */}
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Date / Range</span>
                        <span className="font-medium flex items-center gap-1">
                          <CalendarDays size={11} className="text-blue-400" />
                          {r.startDate && r.endDate && r.startDate !== r.endDate
                            ? `${formatDateDisplay(r.startDate)} - ${formatDateDisplay(r.endDate)}`
                            : formatDateDisplay(r.date || r.startDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Slot</span>
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <Clock size={11} />
                          {r.slot}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Booking Type</span>
                        <span className="badge text-[10px] bg-slate-800 text-slate-300">
                          {r.bookingType || 'ONE_TIME'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Participants</span>
                        <span className="text-slate-200 font-medium">
                          {r.expectedParticipants || '-'} Attendees
                        </span>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setSelectedReqModal(r)}
                        className="btn btn-outline btn-sm flex-1 text-xs py-1.5 flex items-center justify-center gap-1 text-slate-200"
                      >
                        <Eye size={13} /> View Details
                      </button>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleOpenCancel(r)}
                          className="btn btn-outline btn-sm flex-1 text-xs py-1.5 text-rose-400 border-rose-500/40 hover:bg-rose-500/10 flex items-center justify-center gap-1"
                        >
                          <XCircle size={13} /> Cancel Request
                        </button>
                      )}

                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => handleOpenCancel(r)}
                          className="btn btn-outline btn-sm flex-1 text-xs py-1.5 text-amber-400 border-amber-500/40 hover:bg-amber-500/10 flex items-center justify-center gap-1"
                        >
                          <XCircle size={13} /> Request Cancellation
                        </button>
                      )}

                      {isCancelRequested && (
                        <span className="px-2.5 py-1 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 text-[11px] font-medium text-center flex-1">
                          Cancellation Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="column-stack">
      {/* Banner */}
      <div className="welcome-banner">
        <div>
          <h1 className="page-banner-title">Seminar Hall Slot Booking</h1>
          <p className="page-banner-subtitle">
            Request single-day, multi-day, or recurring seminar hall reservations with live conflict checks.
          </p>
        </div>
        <div className="banner-tagline">
          Ideas Today<br />A Brighter Tomorrow
        </div>
      </div>

      {/* Date Range Booked Slots Viewer */}
      <ServiceDateRangeViewer
        title="View Booked Slots in Date Range"
        buttonLabel="Show Booked Slots"
        countLabel="Total Bookings"
        loadingMessage="Loading booked slots..."
        errorMessage="Unable to load booked slots. Please try again."
        emptyMessage="No booked slots found for the selected date range."
        onFetch={fetchBookedSlots}
        renderResults={(records) => (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Seminar Hall</th>
                <th>Slot</th>
                <th>Department</th>
                <th>Event / Purpose</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((b, idx) => (
                <tr key={b.id || b.bookingId || idx}>
                  <td className="table-cell-date">{formatDateDisplay(b.date)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.hallName}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: 'rgba(77, 163, 255, 0.15)',
                        color: 'var(--arctic-blue)',
                        border: '1px solid rgba(77, 163, 255, 0.3)',
                      }}
                    >
                      {b.slot}
                    </span>
                  </td>
                  <td>{b.department}</td>
                  <td>{b.eventTitle || b.purpose || '-'}</td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                  <td>
                    <button onClick={() => setSelectedReqModal(b)} className="action-view-btn">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      />

      {/* Navigation Tabs Bar */}
      <div className="tabs-container">
        <button
          type="button"
          onClick={() => setActiveTab('booking')}
          className={`btn tab-pill-btn ${activeTab === 'booking' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <CalendarDays size={16} /> Seminar Hall Booking
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('my-requests')}
          className={`btn tab-pill-btn ${activeTab === 'my-requests' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Clock size={16} /> My Requests ({myRequests.length})
        </button>
      </div>

      {activeTab === 'booking' ? (
        <>
          {/* 1. SELECT SEMINAR HALL — Compact & Full-Width */}
          <div className="card-panel seminar-hall-selection-panel">
            <span className="card-title seminar-hall-title">Select Seminar Hall</span>
            <div className="resource-grid seminar-hall-grid">
              {halls.map((hall) => {
                const isSelected = selectedHallId === hall.hallId;
                const isAvail = !hall.status || hall.status.toLowerCase() === 'available';
                return (
                  <div
                    key={hall.hallId}
                    onClick={() => setSelectedHallId(hall.hallId)}
                    className={`resource-card seminar-hall-card ${isSelected ? 'border-primary selected' : ''} cursor-pointer`}
                  >
                    <div className="resource-card-header">
                      <span className="resource-name">{hall.name}</span>
                      <StatusBadge status={isAvail ? 'AVAILABLE' : 'MAINTENANCE'} />
                    </div>

                    <div className="resource-details">
                      <div className="resource-detail-row">
                        <span className="detail-label">Hall ID</span>
                        <span className="detail-value">{hall.hallId}</span>
                      </div>
                      <div className="resource-detail-row">
                        <span className="detail-label">Location</span>
                        <span className="detail-value">{hall.location}</span>
                      </div>
                      <div className="resource-detail-row">
                        <span className="detail-label">Capacity</span>
                        <span className="detail-value">{hall.capacity} Seats</span>
                      </div>
                    </div>

                    {(hall.hasProjector || hall.hasAc || hall.hasAudioSystem || hall.hasWifi) && (
                      <div className="flex flex-wrap gap-1 mt-1.5 seminar-hall-amenities">
                        {hall.hasProjector && <span className="badge text-[10px]"><Projector size={10} /> Projector</span>}
                        {hall.hasAc && <span className="badge text-[10px]"><AirVent size={10} /> AC</span>}
                        {hall.hasAudioSystem && <span className="badge text-[10px]"><Volume2 size={10} /> Audio</span>}
                        {hall.hasWifi && <span className="badge text-[10px]"><Wifi size={10} /> Wi-Fi</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. BALANCED TWO-COLUMN WORKFLOW GRID: Left = Slot Availability & Schedule, Right = Submit Booking Form */}
          <div className="two-column-layout balanced">
            {/* Left Column: Slot Availability & Scheduling */}
            <div className="card-panel">
              {/* Booking Type Toggle Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
                <div>
                  <span className="card-title text-sm flex items-center gap-1.5 font-bold">
                    <CalendarRange size={16} color="var(--arctic-blue)" />
                    Slot Availability & Schedule
                  </span>
                  <p className="card-subtitle text-[11px] text-slate-400">
                    {currentHall.name} &bull; Capacity: {currentHall.capacity} Seats
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-700/60 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingType('ONE_TIME');
                      setToDate(selectedDate);
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
                      if (!toDate || toDate < selectedDate) setToDate(selectedDate);
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
                      if (!toDate || toDate < selectedDate) setToDate(selectedDate);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
                <div className="form-group">
                  <label className="form-label text-xs">
                    {bookingType === 'ONE_TIME' ? 'Event Date *' : 'Series Start Date *'}
                  </label>
                  <input
                    type="date"
                    min={getTodayStr()}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      if (bookingType === 'ONE_TIME') setToDate(e.target.value);
                    }}
                    className="w-full text-xs"
                    required
                  />
                </div>

                {bookingType !== 'ONE_TIME' && (
                  <div className="form-group">
                    <label className="form-label text-xs">
                      {bookingType === 'MULTI_DAY' ? 'End Date (Inclusive) *' : 'Series End Date *'}
                    </label>
                    <input
                      type="date"
                      min={selectedDate || getTodayStr()}
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full text-xs"
                      required
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

              {/* Slot Availability Selection Buttons */}
              <div className="my-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">
                    Slot Availability for {formatDateDisplay(selectedDate)}
                  </span>
                  <span className="text-[11px] text-blue-400 font-mono font-medium">Selected: {selectedSlot}</span>
                </div>

                {loadingAvail ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading slot status...</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {['FORENOON', 'AFTERNOON', 'FULL_DAY'].map((slotKey) => {
                      const isBooked = slotsStatus[slotKey] === 'BOOKED';
                      const isSelected = selectedSlot === slotKey;
                      return (
                        <div
                          key={slotKey}
                          onClick={() => handleSlotSelect(slotKey)}
                          className={`p-2.5 rounded-lg border text-center cursor-pointer transition ${isBooked
                              ? 'bg-rose-950/20 border-rose-800/40 text-rose-400 cursor-not-allowed opacity-60'
                              : isSelected
                                ? 'bg-blue-600/20 border-blue-500 text-white shadow'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                        >
                          <div className="font-semibold text-xs mb-0.5">{slotKey}</div>
                          <div className="text-[10px] text-slate-400 mb-1.5">
                            {slotKey === 'FORENOON'
                              ? '09:00 AM - 12:00 PM'
                              : slotKey === 'AFTERNOON'
                                ? '12:00 PM - 04:00 PM'
                                : '09:00 AM - 04:00 PM'}
                          </div>
                          <span
                            className={`badge text-[10px] ${isBooked ? 'bg-rose-900/60 text-rose-300' : 'bg-emerald-900/40 text-emerald-300'
                              }`}
                          >
                            {isBooked ? 'BOOKED' : 'AVAILABLE'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Target occurrences summary badge */}
              {targetDates.length > 0 && (
                <div className="my-2.5">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-300">
                      Occurrences: <strong className="text-white">{targetDates.length} date(s)</strong>
                    </span>
                    {checkingBulk ? (
                      <span className="text-blue-400">Checking slot availability...</span>
                    ) : bulkConflictInfo && bulkConflictInfo.conflictCount > 0 ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle size={13} />
                        {bulkConflictInfo.conflictCount} conflict(s) found
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} /> All occurrences available
                      </span>
                    )}
                  </div>

                  {/* Detailed Occurrence & Conflict List (if conflict or multi-day/recurring) */}
                  {((bulkConflictInfo && bulkConflictInfo.conflictCount > 0) || bookingType !== 'ONE_TIME') && (
                    <div className="occurrence-list-container mt-2 max-h-[220px] overflow-y-auto">
                      {(bulkConflictInfo?.occurrences || targetDates.map((d) => ({
                        date: d,
                        day: getOccurrenceDateDisplay(d).dayOfWeek,
                        hallId: currentHall.hallId,
                        hallName: currentHall.name,
                        hallLocation: currentHall.location,
                        slot: selectedSlot,
                        bookingType: bookingType,
                        status: checkingBulk ? 'CHECKING' : 'AVAILABLE',
                      }))).map((occ, idx) => {
                        const { dateFormatted, dayOfWeek } = getOccurrenceDateDisplay(occ.date);
                        const isConflict = occ.status === 'CONFLICT';
                        const isUnavailable = occ.status === 'UNAVAILABLE' || occ.isMaintenance;
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
                                <span className="occurrence-index-badge">Occurrence {idx + 1}</span>
                                <span className="occurrence-date-title">{dateFormatted || occ.date}</span>
                                <span className="occurrence-day-sub">({occ.day || dayOfWeek})</span>
                              </div>

                              <div>
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
                              </div>
                            </div>

                            <div className="occurrence-meta-grid">
                              <div className="occurrence-meta-item">
                                <span className="occurrence-meta-label">Seminar Hall</span>
                                <span className="occurrence-meta-value">{occ.hallName || currentHall.name}</span>
                              </div>
                              <div className="occurrence-meta-item">
                                <span className="occurrence-meta-label">Hall ID</span>
                                <span className="occurrence-meta-value font-mono">{occ.hallId || currentHall.hallId}</span>
                              </div>
                              <div className="occurrence-meta-item">
                                <span className="occurrence-meta-label">Location</span>
                                <span className="occurrence-meta-value">{occ.hallLocation || currentHall.location || 'Block 3 – Ground Floor'}</span>
                              </div>
                              <div className="occurrence-meta-item">
                                <span className="occurrence-meta-label">Slot</span>
                                <span className="occurrence-meta-value text-blue-400 font-semibold">{occ.slot || selectedSlot}</span>
                              </div>
                              <div className="occurrence-meta-item">
                                <span className="occurrence-meta-label">Booking Type</span>
                                <span className="occurrence-meta-value">{occ.bookingType || bookingType}</span>
                              </div>
                            </div>

                            {isConflict && (
                              <div className="occurrence-conflict-box">
                                <div className="occurrence-conflict-reason">
                                  <AlertTriangle size={13} className="flex-shrink-0" />
                                  <span>{occ.conflictReason || 'Conflict: This hall is already booked for the selected slot.'}</span>
                                </div>

                                {occ.conflictDetails && (
                                  <div className="occurrence-conflict-snippet">
                                    <div>
                                      <span className="text-slate-400 block text-[10px]">Conflicting Event:</span>
                                      <span className="font-semibold text-white">{occ.conflictDetails.eventTitle || 'Booked Event'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[10px]">Request ID:</span>
                                      <span className="font-mono text-slate-300">{occ.conflictDetails.requestId || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[10px]">Department:</span>
                                      <span className="text-slate-300">{occ.conflictDetails.department || '-'}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block text-[10px]">Status:</span>
                                      <span className="font-semibold text-rose-300">{occ.conflictDetails.status || '-'}</span>
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setConflictModalData({
                                    ...occ,
                                    dateFormatted: dateFormatted || occ.date,
                                    day: occ.day || dayOfWeek,
                                    hallName: occ.hallName || currentHall.name,
                                    hallId: occ.hallId || currentHall.hallId,
                                    hallLocation: occ.hallLocation || currentHall.location,
                                    slot: occ.slot || selectedSlot,
                                  })}
                                  className="btn-view-conflict"
                                >
                                  <Eye size={12} /> View Conflict Details
                                </button>
                              </div>
                            )}

                            {isUnavailable && (
                              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <AlertTriangle size={13} className="text-amber-400" />
                                  <span>{occ.conflictReason || `${currentHall.name} is currently under maintenance.`}</span>
                                </div>
                                <span className="badge text-[10px] bg-amber-900/60 text-amber-300 border border-amber-500/40">
                                  Under Maintenance
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Active Reservations */}
              {activeBookings.length > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Active Reservations on this Date:
                  </span>
                  <div className="space-y-1 text-xs">
                    {activeBookings.map((b, i) => (
                      <div key={i} className="flex justify-between items-center text-slate-400">
                        <span>{b.eventTitle} ({b.department})</span>
                        <span className="badge text-[10px] bg-slate-800 text-slate-300">{b.slot}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Booking Form */}
            <div className="card-panel">
              <span className="card-title">Submit Booking Request</span>
              <form onSubmit={handleOpenReview} className="form-column mt-3">
                <div className="form-group">
                  <label className="form-label text-xs">Event Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. National Symposium on Generative AI"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Purpose / Description *</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details of the event, guests, or program schedule..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="form-group">
                    <label className="form-label text-xs">Expected Participants *</label>
                    <input
                      type="number"
                      min={1}
                      max={currentHall.capacity || 500}
                      value={expectedParticipants}
                      onChange={(e) => setExpectedParticipants(e.target.value)}
                      required
                      className="w-full text-xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Hall capacity: {currentHall.capacity || 0} seats
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label text-xs">Selected Slot *</label>
                    <input
                      type="text"
                      readOnly
                      value={selectedSlot}
                      className="w-full text-xs bg-slate-900 border-slate-800 text-blue-400 font-semibold"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Additional Requirements</label>
                  <textarea
                    rows={2}
                    placeholder="Extra microphones, podium branding, livestreaming setup..."
                    value={additionalRequirements}
                    onChange={(e) => setAdditionalRequirements(e.target.value)}
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
                    disabled={submitting || !isHallAvailable || isCapacityExceeded}
                  >
                    <Send size={14} /> Review & Submit
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick Calendar */}
          <div className="card-panel">
            <QuickCalendar
              title="Seminar Hall Quick Calendar"
              selectedDate={selectedDate}
              onSelectDate={(newDate) => {
                setSelectedDate(newDate);
                setToDate(newDate);
              }}
              events={allBookings.map((b) => ({
                date: b.date,
                title: `${b.hallName || b.hallId}: ${b.eventTitle} (${b.slot})`,
                status: b.status,
                type: 'seminar',
              }))}
              showLegend={true}
              showEventsList={true}
            />
          </div>

          {/* MY REQUESTS SECTION (Also rendered on the Booking tab when scrolling down) */}
          <div id="my-requests-section" className="mt-8">
            {renderMyRequestsSection()}
          </div>
        </>
      ) : (
        /* MY REQUESTS DEDICATED FULL TAB VIEW */
        <div id="my-requests-section">
          {renderMyRequestsSection()}
        </div>
      )}

      {/* PRE-SUBMISSION CONFIRMATION REVIEW MODAL (Section 24) */}
      {showReviewModal && (
        <Modal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          title="Review Seminar Hall Booking Request"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/30">
              <h4 className="font-semibold text-sm text-white mb-1">
                SEMINAR HALL BOOKING SUMMARY
              </h4>
              <p className="text-[11px] text-slate-300">
                Please verify all reservation details before final submission to the administration.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-900 border border-slate-800">
              <div>
                <span className="text-slate-500 block">Booking Type</span>
                <span className="font-semibold text-blue-400">
                  {bookingType === 'RECURRING'
                    ? 'Recurring Event'
                    : targetDates.length > 1
                      ? 'Multi-Day Event'
                      : 'One-Time Event'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Seminar Hall</span>
                <span className="font-semibold text-white">{currentHall.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Time Slot</span>
                <span className="font-semibold text-emerald-400">{selectedSlot}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Date / Range</span>
                <span className="font-medium text-slate-200">
                  {targetDates.length === 1
                    ? formatDateDisplay(selectedDate)
                    : `${formatDateDisplay(selectedDate)} to ${formatDateDisplay(toDate)}`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Occurrences</span>
                <span className="font-bold text-amber-400">
                  {targetDates.length} session{targetDates.length === 1 ? '' : 's'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Participants</span>
                <span className="font-medium text-slate-200">
                  {expectedParticipants} / {currentHall.capacity} max
                </span>
              </div>
              {bookingType === 'RECURRING' && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-500 block">Recurring Pattern</span>
                  <span className="font-medium text-slate-200">
                    Weekly on {recurrenceDays.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div>
                <span className="text-slate-500 block font-semibold">Event Title</span>
                <span className="text-sm font-semibold text-white">{eventTitle}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Purpose</span>
                <p className="text-slate-300 mt-0.5">{purpose}</p>
              </div>
              {additionalRequirements && (
                <div>
                  <span className="text-slate-500 block">Additional Requirements</span>
                  <p className="text-slate-300 mt-0.5">{additionalRequirements}</p>
                </div>
              )}
            </div>

            {/* List of dates */}
            {targetDates.length > 1 && (
              <div>
                <span className="text-slate-400 block mb-1">
                  Dates Included in this Request ({targetDates.length}):
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[10px]">
                  {targetDates.map((d, i) => (
                    <span key={d} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      #{i + 1}: {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="btn btn-outline"
                disabled={submitting}
              >
                Back / Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="btn btn-primary"
                disabled={submitting}
              >
                <Send size={14} /> {submitting ? 'Submitting...' : 'Confirm & Submit Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCELLATION MODAL */}
      {cancelModalOpen && cancelItem && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => {
            if (!cancelLoading) {
              setCancelModalOpen(false);
              setCancelItem(null);
            }
          }}
          title={
            cancelItem.status === 'APPROVED' || cancelItem.status === 'BOOKED'
              ? 'Request Cancellation of Approved Booking'
              : 'Cancel Seminar Booking Request'
          }
        >
          <form onSubmit={handleSubmitCancel} className="space-y-4 text-xs text-slate-300">
            {/* Alert banner */}
            <div
              className={`p-3 rounded-lg border ${cancelItem.status === 'APPROVED' || cancelItem.status === 'BOOKED'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                <AlertTriangle size={16} />
                {cancelItem.status === 'APPROVED' || cancelItem.status === 'BOOKED'
                  ? 'Cancellation Requires Coordinator Review'
                  : 'Are you sure you want to cancel this seminar booking request?'}
              </div>
              <p className="text-[11px] opacity-90">
                {cancelItem.status === 'APPROVED' || cancelItem.status === 'BOOKED'
                  ? 'This booking is approved. Submitting this request will flag it for Seminar Coordinator review. The slot remains held until approved.'
                  : 'This request is currently pending. Cancelling will immediately release the slot and set status to CANCELLED.'}
              </p>
            </div>

            {/* Booking Details Card */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Request ID:</span>
                <span className="text-white font-bold">{cancelItem.bookingId || cancelItem.id}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-slate-400">Event:</span>
                <span className="text-white font-semibold">{cancelItem.eventTitle}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-slate-400">Hall:</span>
                <span className="text-white">
                  {cancelItem.hallName || cancelItem.hallId} ({cancelItem.hallLocation || 'Campus'})
                </span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-slate-400">Date & Slot:</span>
                <span className="text-white">
                  {formatDateDisplay(cancelItem.date || cancelItem.startDate)} ({cancelItem.slot})
                </span>
              </div>
              <div className="flex justify-between font-sans items-center">
                <span className="text-slate-400">Status:</span>
                <StatusBadge status={cancelItem.status} />
              </div>
            </div>

            {/* Scope selection for Recurring or Multi-Day bookings */}
            {(cancelItem.seriesId || cancelItem.bookingType === 'RECURRING' || cancelItem.bookingType === 'MULTI_DAY') && (
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <label className="font-semibold text-slate-200 block mb-2">
                  Cancellation Scope:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="cancelScope"
                      value="THIS_OCCURRENCE"
                      checked={cancelScope === 'THIS_OCCURRENCE'}
                      onChange={(e) => setCancelScope(e.target.value)}
                      className="text-blue-500 focus:ring-0"
                    />
                    <span>This Occurrence Only ({formatDateDisplay(cancelItem.date)})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="cancelScope"
                      value="THIS_AND_FUTURE"
                      checked={cancelScope === 'THIS_AND_FUTURE'}
                      onChange={(e) => setCancelScope(e.target.value)}
                      className="text-blue-500 focus:ring-0"
                    />
                    <span>This and Future Occurrences</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="radio"
                      name="cancelScope"
                      value="ENTIRE_SERIES"
                      checked={cancelScope === 'ENTIRE_SERIES'}
                      onChange={(e) => setCancelScope(e.target.value)}
                      className="text-blue-500 focus:ring-0"
                    />
                    <span>Entire Series (All occurrences)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Cancellation Reason */}
            <div>
              <label className="block font-semibold text-slate-200 mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please explain why this seminar hall booking is being cancelled..."
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelItem(null);
                }}
                className="btn btn-outline"
                disabled={cancelLoading}
              >
                Close
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${cancelItem.status === 'APPROVED' || cancelItem.status === 'BOOKED'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                  } text-white`}
                disabled={cancelLoading}
              >
                {cancelLoading
                  ? 'Processing...'
                  : cancelItem.status === 'APPROVED' || cancelItem.status === 'BOOKED'
                    ? 'Submit Cancellation Request'
                    : 'Confirm & Cancel Request'}
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
            service: 'Seminar Hall',
            serviceCategory: 'SEMINAR',
          }}
        />
      )}

      {/* CONFLICT DETAILS MODAL (Part A8) */}
      {conflictModalData && (
        <Modal
          isOpen={!!conflictModalData}
          onClose={() => setConflictModalData(null)}
          title="Conflict Details"
        >
          <div className="space-y-4 text-xs text-slate-300">
            {/* Alert Header */}
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
              <span>Slot Unavailable: Conflicting Booking Detected</span>
            </div>

            {/* Occurrence Context */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Date & Day</span>
                <span className="text-slate-200 font-semibold">{conflictModalData.dateFormatted || conflictModalData.date}</span>
                <span className="text-slate-400 text-[11px] block">({conflictModalData.day})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Requested Slot</span>
                <span className="text-blue-400 font-bold">{conflictModalData.slot}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Seminar Hall</span>
                <span className="text-white font-medium">{conflictModalData.hallName} ({conflictModalData.hallId})</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Location</span>
                <span className="text-slate-300">{conflictModalData.hallLocation || 'Campus'}</span>
              </div>
            </div>

            {/* Conflict Reason */}
            <div className="p-3 rounded-lg bg-slate-950 border border-rose-500/30">
              <span className="text-[10px] text-rose-400 uppercase tracking-wider block font-semibold mb-1">
                Conflict Reason
              </span>
              <p className="text-sm font-semibold text-rose-200">
                {conflictModalData.conflictReason || 'This hall is already booked for the selected slot.'}
              </p>
            </div>

            {/* Existing Booking Details */}
            {conflictModalData.conflictDetails ? (
              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold border-b border-slate-800 pb-1.5">
                  Existing Reservation Details
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Event Title</span>
                    <span className="text-white font-semibold text-xs">{conflictModalData.conflictDetails.eventTitle || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Request ID</span>
                    <span className="font-mono text-blue-400 font-semibold">{conflictModalData.conflictDetails.requestId || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Department</span>
                    <span className="text-slate-200 font-medium">{conflictModalData.conflictDetails.department || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Current Status</span>
                    <StatusBadge status={conflictModalData.conflictDetails.status} />
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Occupied Slot</span>
                    <span className="badge text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {conflictModalData.conflictDetails.slot || conflictModalData.slot}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Booking Type</span>
                    <span className="text-slate-300">{conflictModalData.conflictDetails.bookingType || 'ONE_TIME'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                This occurrence conflicts with an existing booking. Detailed reservation information is restricted by system policy.
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConflictModalData(null)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SeminarBooking;
