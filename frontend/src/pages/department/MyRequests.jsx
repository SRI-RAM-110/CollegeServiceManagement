import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { COLLEGE_LOGO } from '../../constants/branding';
import {
  ListOrdered,
  Search,
  Filter,
  Eye,
  Calendar,
  Building,
  BedDouble,
  Bus,
  FileText,
  Coffee,
  XCircle,
  RotateCcw,
  Repeat,
  AlertTriangle,
  Send,
  Clock,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { requestsApi, seminarApi, accommodationApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { Modal } from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { getTodayStr, getDateOffsetStr, formatDateDisplay } from '../../utils/dateUtils';

const SERVICE_TABS = [
  'All',
  'Seminar Hall',
  'Accommodation',
  'Transport',
  'Stationery',
  'Snacks & Meals',
];

export const MyRequests = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [searchParams] = useSearchParams();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Filters
  const [selectedService, setSelectedService] = useState(searchParams.get('service') || 'All');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'ALL');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedReqModal, setSelectedReqModal] = useState(null);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelRequestItem, setCancelRequestItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelScope, setCancelScope] = useState('THIS_OCCURRENCE');
  const [actionLoading, setActionLoading] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleRequestItem, setRescheduleRequestItem] = useState(null);
  const [rescheduleHallId, setRescheduleHallId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState(getTodayStr());
  const [rescheduleSlot, setRescheduleSlot] = useState('FORENOON');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleScope, setRescheduleScope] = useState('THIS_OCCURRENCE');
  const [halls, setHalls] = useState([]);

  // Accommodation Reschedule fields
  const [rescheduleHostel, setRescheduleHostel] = useState('Girls Hostel');
  const [rescheduleRoomType, setRescheduleRoomType] = useState('AC Room');
  const [rescheduleRoomId, setRescheduleRoomId] = useState('GH-AC-1');
  const [rescheduleCheckInDate, setRescheduleCheckInDate] = useState(getTodayStr());
  const [rescheduleCheckOutDate, setRescheduleCheckOutDate] = useState(getDateOffsetStr(2));

  const loadRequests = async (overrideSearch = null) => {
    setLoading(true);
    try {
      const activeSearch = overrideSearch !== null ? overrideSearch : searchQuery;
      const res = await requestsApi.getMyRequests({
        service: selectedService === 'All' ? null : selectedService,
        status: selectedStatus === 'ALL' ? null : selectedStatus,
        search: activeSearch.trim() || null,
      });
      if (res.data) {
        setRequests(res.data);
      }
    } catch (e) {
      showToast('Failed to load departmental requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
    if (selectedService !== 'All' && r.service !== selectedService) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const id = (r.requestId || r.id || '').toLowerCase();
    const details = (r.details || '').toLowerCase();
    const service = (r.service || '').toLowerCase();
    const status = (r.status || '').toLowerCase();
    const requestedBy = (r.requestedBy || '').toLowerCase();
    const department = (r.department || '').toLowerCase();
    const requesterUserId = (r.requesterUserId || '').toLowerCase();
    return (
      id.includes(q) ||
      details.includes(q) ||
      service.includes(q) ||
      status.includes(q) ||
      requestedBy.includes(q) ||
      requesterUserId.includes(q) ||
      department.includes(q)
    );
  });

  const loadHalls = async () => {
    try {
      const res = await seminarApi.getHalls();
      if (res.data) {
        setHalls(res.data);
      }
    } catch (err) {
      console.warn('Could not load halls for reschedule modal:', err);
    }
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
      loadRequests(q);
    }
    const s = searchParams.get('service');
    if (s && SERVICE_TABS.includes(s)) {
      setSelectedService(s);
    }
    const st = searchParams.get('status');
    if (st) {
      setSelectedStatus(st);
    }
  }, [searchParams]);

  useEffect(() => {
    loadRequests();
  }, [selectedService, selectedStatus, user?.userId]);

  useEffect(() => {
    loadHalls();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadRequests();
  };

  // Open Cancel Modal
  const handleOpenCancel = (r) => {
    setCancelRequestItem(r);
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

    const reqId = cancelRequestItem?.requestId || cancelRequestItem?.id;
    const isAccommodation = cancelRequestItem?.service === 'Accommodation';
    setActionLoading(true);
    try {
      const res = isAccommodation
        ? await accommodationApi.cancelRequest(reqId, { reason: cancelReason.trim() })
        : await seminarApi.cancelRequest(reqId, {
            reason: cancelReason,
            scope: cancelScope,
          });
      if (res.success) {
        const isPending = cancelRequestItem.status === 'PENDING' || cancelRequestItem.status === 'UNDER_REVIEW';
        showToast(
          isPending
            ? 'Booking cancelled successfully.'
            : 'Cancellation request submitted to administrator for approval.',
          'success'
        );
        setCancelModalOpen(false);
        setCancelRequestItem(null);
        loadRequests();
      }
    } catch (err) {
      showToast(err.message || 'Failed to process cancellation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (r) => {
    setRescheduleRequestItem(r);
    const raw = r.rawObject || {};
    if (r.service === 'Accommodation') {
      setRescheduleHostel(raw.hostel || 'Girls Hostel');
      setRescheduleRoomType(raw.roomType || 'AC Room');
      setRescheduleRoomId(raw.roomId || (raw.hostel?.includes('Girls') ? 'GH-AC-1' : 'BH-AC-1'));
      setRescheduleCheckInDate(raw.checkInDate || getTodayStr());
      setRescheduleCheckOutDate(raw.checkOutDate || getDateOffsetStr(2));
      setRescheduleReason('');
      setRescheduleModalOpen(true);
      return;
    }
    setRescheduleHallId(raw.hallId || (halls[0]?.hallId || 'SH-1'));
    setRescheduleDate(raw.date || getTodayStr());
    setRescheduleSlot(raw.slot || 'FORENOON');
    setRescheduleReason('');
    setRescheduleScope('THIS_OCCURRENCE');
    setRescheduleModalOpen(true);
  };

  // Submit Reschedule
  const handleSubmitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleReason.trim()) {
      showToast('Please enter a reason for rescheduling', 'warning');
      return;
    }

    const reqId = rescheduleRequestItem?.requestId || rescheduleRequestItem?.id;
    setActionLoading(true);
    try {
      if (rescheduleRequestItem?.service === 'Accommodation') {
        const today = getTodayStr();
        if (rescheduleCheckInDate < today) {
          showToast('New check-in date cannot be in the past', 'warning');
          setActionLoading(false);
          return;
        }
        if (rescheduleCheckInDate === rescheduleCheckOutDate) {
          showToast('Same-day check-in and check-out is not allowed.', 'warning');
          setActionLoading(false);
          return;
        }
        if (rescheduleCheckOutDate < rescheduleCheckInDate) {
          showToast('New check-out date cannot be earlier than check-in date', 'warning');
          setActionLoading(false);
          return;
        }

        const res = await accommodationApi.rescheduleRequest(reqId, {
          newRoomId: rescheduleRoomId,
          newCheckInDate: rescheduleCheckInDate,
          newCheckOutDate: rescheduleCheckOutDate,
          reason: rescheduleReason.trim(),
        });
        if (res.success) {
          showToast(
            'Reschedule request submitted successfully. Awaiting administrator review.',
            'success'
          );
          setRescheduleModalOpen(false);
          setRescheduleRequestItem(null);
          loadRequests();
        }
        return;
      }

      if (rescheduleDate < getTodayStr()) {
        showToast('Target date cannot be in the past', 'warning');
        setActionLoading(false);
        return;
      }

      const res = await seminarApi.rescheduleRequest(reqId, {
        newHallId: rescheduleHallId,
        newDate: rescheduleDate,
        newSlot: rescheduleSlot,
        reason: rescheduleReason,
        scope: rescheduleScope,
      });
      if (res.success) {
        showToast(
          'Reschedule request submitted successfully. Awaiting administrator review.',
          'success'
        );
        setRescheduleModalOpen(false);
        setRescheduleRequestItem(null);
        loadRequests();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit reschedule request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedTargetHall = halls.find((h) => h.hallId === rescheduleHallId) || halls[0];
  const targetHallCapacity = selectedTargetHall?.capacity || 999;
  const rawItem = rescheduleRequestItem?.rawObject || {};
  const isRescheduleCapacityExceeded = rawItem.expectedParticipants && rawItem.expectedParticipants > targetHallCapacity;

  return (
    <div className="column-stack">
      {/* Banner */}
      <div className="welcome-banner">
        <div>
          <h1 className="page-banner-title">My Department Requests</h1>
          <p className="page-banner-subtitle">
            Track status, request cancellations, reschedule approved reservations, and view official documents.
          </p>
        </div>
        <div className="banner-tagline">Real-time Institutional Workflow</div>
      </div>

      {/* Service Tabs */}
      <div className="tabs-container">
        {SERVICE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedService(tab)}
            className={`btn tab-pill-btn ${selectedService === tab ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="two-column-layout">
        {/* Left Column: Requests Table Card */}
        <div className="card-panel">
          {/* Header with Count and Refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="card-title">Department Requisitions</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {requests.length} Total
              </span>
            </div>

            <button
              type="button"
              onClick={() => loadRequests()}
              disabled={loading}
              className="btn btn-outline btn-sm text-xs py-1 px-2.5 self-start sm:self-auto flex items-center gap-1.5"
              title="Refresh requests"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* 4 Stat Cards */}
          <div className="stat-grid-4 mb-4">
            <StatCard
              icon={ListOrdered}
              value={requests.length}
              subtitle="Total Requests"
              color="blue"
            />
            <StatCard
              icon={Clock}
              value={requests.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length}
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

          {/* Search & Filter Bar */}
          <div className="filter-toolbar">
            <form onSubmit={handleSearchSubmit} className="filter-search-form">
              <Search size={16} className="filter-search-icon" />
              <input
                type="text"
                placeholder="Search by ID, details, service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-search-input"
              />
            </form>

            <div className="filter-group">
              <span className="filter-label">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="CANCELLATION_REQUESTED">Cancellation Requested</option>
                <option value="RESCHEDULE_REQUESTED">Reschedule Requested</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Custom Table */}
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Date</th>
                  <th>Service & Type</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="table-empty-cell">
                      <div className="empty-state-branded">
                        <img
                          src={COLLEGE_LOGO}
                          alt="NEC Logo"
                          className="empty-state-logo pulse-subtle"
                          style={{ objectFit: 'contain' }}
                        />
                        <span>Loading institutional requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-empty-cell">
                      <div className="empty-state-branded">
                        <img
                          src={COLLEGE_LOGO}
                          alt="NEC Logo"
                          className="empty-state-logo"
                          style={{ objectFit: 'contain' }}
                        />
                        <span>No requests found matching the current search & filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => {
                    const isSeminar = r.service === 'Seminar Hall';
                    const raw = r.rawObject || {};
                    const isRecurring = Boolean(raw.isRecurring || raw.bookingType === 'RECURRING' || raw.seriesId);
                    const isMulti = raw.bookingType === 'MULTI_DAY';

                    // Allowed action permissions (Section 25)
                    const isAccommodation = r.service === 'Accommodation';
                    const canCancel =
                      (isSeminar || isAccommodation) &&
                      (r.status === 'PENDING' ||
                        r.status === 'UNDER_REVIEW' ||
                        r.status === 'APPROVED' ||
                        r.status === 'BOOKED');

                    const canReschedule =
                      (isSeminar || isAccommodation) &&
                      (r.status === 'APPROVED' || r.status === 'BOOKED');

                    return (
                      <tr key={r.id || r.requestId}>
                        <td className="table-cell-service font-mono">
                          <div>{r.requestId}</div>
                          {raw.seriesId && (
                            <div className="text-[10px] text-blue-400 font-mono flex items-center gap-1 mt-0.5">
                              <Repeat size={10} /> {raw.seriesId}
                            </div>
                          )}
                        </td>
                        <td className="table-cell-date">{formatDateDisplay(r.date)}</td>
                        <td>
                          <div>
                            <span className="service-badge-inline">
                              {r.service === 'Seminar Hall' && <Building size={14} color="var(--arctic-blue)" />}
                              {r.service === 'Accommodation' && <BedDouble size={14} color="var(--success)" />}
                              {r.service === 'Transport' && <Bus size={14} color="var(--warning)" />}
                              {r.service === 'Stationery' && <FileText size={14} color="#bfa4f5" />}
                              {r.service === 'Snacks & Meals' && <Coffee size={14} color="var(--danger)" />}
                              {r.service}
                            </span>
                            {isRecurring ? (
                              <div className="mt-0.5 flex items-center gap-1">
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                  Recurring
                                </span>
                                {raw.occurrenceIndex && raw.totalOccurrences && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    #{raw.occurrenceIndex}/{raw.totalOccurrences}
                                  </span>
                                )}
                              </div>
                            ) : isMulti ? (
                              <div className="mt-0.5">
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                  Multi-Day
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="table-cell-desc">
                          <div className="font-medium text-slate-200">{r.details}</div>
                          {isSeminar && (raw.hallLocation || raw.location) && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} className="text-slate-500" />
                              <span>{raw.hallLocation || raw.location}</span>
                            </div>
                          )}
                          {raw.cancellationReason && (
                            <div className="text-[11px] text-rose-300 mt-0.5">
                              Cancel note: {raw.cancellationReason}
                            </div>
                          )}
                          {raw.rescheduleReason && (
                            <div className="text-[11px] text-blue-300 mt-0.5">
                              Resched note: {raw.rescheduleReason}
                            </div>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedReqModal(r)}
                              className="btn btn-outline table-action-btn"
                              title="View Document & Audit Trail"
                            >
                              <Eye size={13} /> View
                            </button>

                            {canCancel && (
                              <button
                                onClick={() => handleOpenCancel(r)}
                                className="btn btn-outline table-action-btn text-rose-400 hover:text-rose-300 border-rose-500/40"
                                title="Cancel Reservation"
                              >
                                <XCircle size={13} /> Cancel
                              </button>
                            )}

                            {canReschedule && (
                              <button
                                onClick={() => handleOpenReschedule(r)}
                                className="btn btn-outline table-action-btn text-blue-400 hover:text-blue-300 border-blue-500/40"
                                title="Request Reschedule"
                              >
                                <RotateCcw size={13} /> Reschedule
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

        {/* Right Column: Quick Calendar */}
        <div className="column-stack">
          <QuickCalendar
            selectedDate={selectedDate}
            onSelectDate={(newDate) => {
              setSelectedDate(newDate);
              setSearchQuery(newDate);
            }}
            events={requests.map((r) => ({
              id: r.id || r.requestId,
              date: r.date,
              title: `${r.service}: ${r.details}`,
              status: r.status,
              department: r.department,
            }))}
          />
        </div>
      </div>

      {/* CANCELLATION MODAL (Section 15, 16) */}
      {cancelModalOpen && cancelRequestItem && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Seminar Booking"
        >
          <form onSubmit={handleSubmitCancel} className="space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Request ID:</span>
                <span className="font-mono font-semibold text-white">{cancelRequestItem.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Slot:</span>
                <span className="text-slate-200">
                  {formatDateDisplay(cancelRequestItem.date)} ({cancelRequestItem.rawObject?.slot || '—'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Seminar Hall:</span>
                <span className="text-blue-400 font-semibold">{cancelRequestItem.rawObject?.hallName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <StatusBadge status={cancelRequestItem.status} />
              </div>
            </div>

            {/* Recurring Scope Selection (Section 16) */}
            {(cancelRequestItem.rawObject?.seriesId || cancelRequestItem.rawObject?.isRecurring) && (
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 space-y-2">
                <span className="font-semibold text-blue-300 block">
                  Recurring Cancellation Scope *
                </span>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="cancelScope"
                      value="THIS_OCCURRENCE"
                      checked={cancelScope === 'THIS_OCCURRENCE'}
                      onChange={(e) => setCancelScope(e.target.value)}
                    />
                    <span>This occurrence only ({formatDateDisplay(cancelRequestItem.date)})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="cancelScope"
                      value="THIS_AND_FUTURE"
                      checked={cancelScope === 'THIS_AND_FUTURE'}
                      onChange={(e) => setCancelScope(e.target.value)}
                    />
                    <span>This and all future occurrences</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="cancelScope"
                      value="ENTIRE_SERIES"
                      checked={cancelScope === 'ENTIRE_SERIES'}
                      onChange={(e) => setCancelScope(e.target.value)}
                    />
                    <span>Entire recurring series ({cancelRequestItem.rawObject?.seriesId})</span>
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="form-label font-semibold text-slate-200 block mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please state why this booking is being cancelled..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="btn btn-outline"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary bg-rose-600 hover:bg-rose-500 border-none"
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'Submitting...'
                  : cancelRequestItem.status === 'PENDING' || cancelRequestItem.status === 'UNDER_REVIEW'
                  ? 'Confirm Direct Cancellation'
                  : 'Submit Cancellation Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESCHEDULE MODAL (Section 17, 18, 19, 20) */}
      {rescheduleModalOpen && rescheduleRequestItem && (
        <Modal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          title={
            rescheduleRequestItem.service === 'Accommodation'
              ? 'Reschedule Approved Accommodation'
              : 'Reschedule Approved Seminar Booking'
          }
        >
          <form onSubmit={handleSubmitReschedule} className="space-y-4 text-xs text-slate-300">
            {/* Original Booking Overview */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                Current Confirmed Reservation
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Booking ID:</span>
                <span className="font-mono font-semibold text-white">{rescheduleRequestItem.requestId}</span>
              </div>
              {rescheduleRequestItem.service === 'Accommodation' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Room:</span>
                    <span className="text-slate-200">
                      {rawItem.hostel} • {rawItem.roomType} ({rawItem.roomId})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Dates:</span>
                    <span className="text-slate-200">
                      {formatDateDisplay(rawItem.checkInDate || rescheduleRequestItem.date)} → {formatDateDisplay(rawItem.checkOutDate)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Hall & Slot:</span>
                    <span className="text-slate-200">
                      {rawItem.hallName} • {rawItem.slot}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Date:</span>
                    <span className="text-slate-200">{formatDateDisplay(rescheduleRequestItem.date)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Target Reschedule Inputs */}
            {rescheduleRequestItem.service === 'Accommodation' ? (
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 space-y-3">
                <span className="text-xs font-semibold text-blue-300 block">
                  Target Accommodation Details
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label block mb-1">Target Hostel *</label>
                    <select
                      value={rescheduleHostel}
                      onChange={(e) => {
                        const h = e.target.value;
                        setRescheduleHostel(h);
                        const prefix = h.includes('Girls') ? 'GH' : 'BH';
                        const suffix = rescheduleRoomType.includes('Non-AC') ? 'NAC-1' : 'AC-1';
                        setRescheduleRoomId(`${prefix}-${suffix}`);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    >
                      <option value="Girls Hostel">Girls Hostel</option>
                      <option value="Boys Hostel">Boys Hostel</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label block mb-1">Target Room Type *</label>
                    <select
                      value={rescheduleRoomType}
                      onChange={(e) => {
                        const t = e.target.value;
                        setRescheduleRoomType(t);
                        const prefix = rescheduleHostel.includes('Girls') ? 'GH' : 'BH';
                        const suffix = t.includes('Non-AC') ? 'NAC-1' : 'AC-1';
                        setRescheduleRoomId(`${prefix}-${suffix}`);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    >
                      <option value="AC Room">AC Room</option>
                      <option value="Non-AC Room">Non-AC Room</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label block mb-1">New Check-in Date *</label>
                    <input
                      type="date"
                      min={getTodayStr()}
                      value={rescheduleCheckInDate}
                      onChange={(e) => setRescheduleCheckInDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="form-label block mb-1">New Check-out Date *</label>
                    <input
                      type="date"
                      min={rescheduleCheckInDate || getTodayStr()}
                      value={rescheduleCheckOutDate}
                      onChange={(e) => setRescheduleCheckOutDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 space-y-3">
                <span className="text-xs font-semibold text-blue-300 block">
                  Target Schedule Details
                </span>

                <div>
                  <label className="form-label block mb-1">Target Seminar Hall *</label>
                  <select
                    value={rescheduleHallId}
                    onChange={(e) => setRescheduleHallId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  >
                    {halls.map((h) => (
                      <option key={h.hallId} value={h.hallId}>
                        {h.name} (Capacity: {h.capacity} {h.status && h.status !== 'Available' ? `• ${h.status}` : ''})
                      </option>
                    ))}
                  </select>
                  {isRescheduleCapacityExceeded && (
                    <p className="text-xs text-rose-400 mt-1 font-semibold">
                      Warning: Expected participants ({rawItem.expectedParticipants}) exceed target hall capacity ({targetHallCapacity}).
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="form-label block mb-1">New Date *</label>
                    <input
                      type="date"
                      min={getTodayStr()}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="form-label block mb-1">New Slot *</label>
                    <select
                      value={rescheduleSlot}
                      onChange={(e) => setRescheduleSlot(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    >
                      <option value="FORENOON">Forenoon (09:00 AM - 12:00 PM)</option>
                      <option value="AFTERNOON">Afternoon (12:00 PM - 04:00 PM)</option>
                      <option value="FULL_DAY">Full Day (09:00 AM - 04:00 PM)</option>
                    </select>
                  </div>
                </div>

                {/* Recurring Scope (Section 20) */}
                {(rawItem.seriesId || rawItem.isRecurring) && (
                  <div>
                    <span className="form-label block mb-1 text-slate-300">Reschedule Scope *</span>
                    <div className="space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="rescheduleScope"
                          value="THIS_OCCURRENCE"
                          checked={rescheduleScope === 'THIS_OCCURRENCE'}
                          onChange={(e) => setRescheduleScope(e.target.value)}
                        />
                        <span>This occurrence only</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="rescheduleScope"
                          value="THIS_AND_FUTURE"
                          checked={rescheduleScope === 'THIS_AND_FUTURE'}
                          onChange={(e) => setRescheduleScope(e.target.value)}
                        />
                        <span>This and future occurrences</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="form-label font-semibold text-slate-200 block mb-1">
                Reason for Rescheduling *
              </label>
              <textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="State why the event date, hall, or slot needs to be changed..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="btn btn-outline"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={actionLoading || isRescheduleCapacityExceeded}
              >
                <Send size={14} /> {actionLoading ? 'Submitting...' : 'Submit Reschedule Request'}
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
          request={selectedReqModal}
        />
      )}
    </div>
  );
};

export default MyRequests;
