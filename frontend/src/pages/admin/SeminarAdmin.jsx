import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Clock, 
  Calendar as CalendarIcon, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  RefreshCw,
  Layers,
  MapPin,
  Check,
  X,
  FileText,
  AlertTriangle,
  Repeat,
  RotateCcw,
  CalendarRange,
  ShieldCheck,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import QuickCalendar from '../../components/calendar/QuickCalendar';
import Modal from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { seminarApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayStr, formatDateDisplay } from '../../utils/dateUtils';

export default function SeminarAdmin() {
  const [searchParams] = useSearchParams();
  const { addToast } = useNotifications();
  const { user, isSeminarCoordinator, isAOAdmin } = useAuth();
  const assignedHallIds = user?.assignedHallIds || [];
  const isCoordinatorOnly = isSeminarCoordinator && !isAOAdmin;

  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, cancellationRequested: 0, rescheduleRequested: 0 });
  const [requests, setRequests] = useState([]);
  const [halls, setHalls] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);
  const [hallFilter, setHallFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Modal & Action states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [docModalRequest, setDocModalRequest] = useState(null);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectActionType, setRejectActionType] = useState('BOOKING'); // 'BOOKING' | 'CANCELLATION' | 'RESCHEDULE'
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isHallAssignedToUser = (h) => {
    if (!isCoordinatorOnly) return true;
    if (!assignedHallIds || assignedHallIds.length === 0) return false;
    return (
      assignedHallIds.includes(h.id) ||
      assignedHallIds.includes(h.hallId) ||
      assignedHallIds.includes(h.name) ||
      assignedHallIds.some((a) => a?.toLowerCase() === h.hallId?.toLowerCase()) ||
      assignedHallIds.some((a) => a?.toLowerCase() === h.name?.toLowerCase()) ||
      ((assignedHallIds.includes('TECH-HUB') || assignedHallIds.includes('Tech Hub') || assignedHallIds.includes('SH-5')) &&
        (h.hallId === 'TECH-HUB' || h.hallId === 'SH-5' || h.name === 'Tech Hub'))
    );
  };

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [hallsRes, reqsRes] = await Promise.all([
        seminarApi.getHalls(isCoordinatorOnly),
        seminarApi.getRequests(),
      ]);

      const hallList = hallsRes.data || [];
      const reqList = reqsRes.data || [];

      setHalls(hallList);
      setRequests(reqList);

      // Compute statistics directly from real data
      const total = reqList.length;
      const pending = reqList.filter(r => r.status === 'PENDING').length;
      const approved = reqList.filter(r => r.status === 'APPROVED' || r.status === 'BOOKED').length;
      const rejected = reqList.filter(r => r.status === 'REJECTED').length;
      const cancellationRequested = reqList.filter(r => r.status === 'CANCELLATION_REQUESTED').length;
      const rescheduleRequested = reqList.filter(r => r.status === 'RESCHEDULE_REQUESTED').length;

      setStats({ total, pending, approved, rejected, cancellationRequested, rescheduleRequested });
    } catch (err) {
      addToast(err.message || 'Failed to load seminar data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    try {
      setActionLoading(true);
      await seminarApi.approve(id);
      addToast('Seminar booking approved successfully! Slot is now confirmed.', 'success');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (id, type = 'BOOKING') => {
    setRejectId(id);
    setRejectActionType(type);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectId) return;
    try {
      setActionLoading(true);
      if (rejectActionType === 'BOOKING') {
        await seminarApi.reject(rejectId, rejectReason);
        addToast('Seminar booking rejected.', 'info');
      } else if (rejectActionType === 'CANCELLATION') {
        await seminarApi.rejectCancellation(rejectId, rejectReason);
        addToast('Cancellation request rejected. Booking remains confirmed.', 'info');
      } else if (rejectActionType === 'RESCHEDULE') {
        await seminarApi.rejectReschedule(rejectId, rejectReason);
        addToast('Reschedule request rejected. Original booking remains active.', 'info');
      }
      setRejectModalOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error processing request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveCancellation = async (id) => {
    try {
      setActionLoading(true);
      await seminarApi.approveCancellation(id);
      addToast('Cancellation approved. Booking has been marked CANCELLED.', 'success');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving cancellation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveReschedule = async (id) => {
    try {
      setActionLoading(true);
      await seminarApi.approveReschedule(id);
      addToast('Reschedule approved! New slot booking confirmed.', 'success');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving reschedule', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (hallId, newStatus) => {
    try {
      setActionLoading(true);
      await seminarApi.updateHallStatus(hallId, newStatus);
      addToast(`Updated ${hallId} status to ${newStatus}`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to update hall status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      (req.eventTitle?.toLowerCase() || '').includes(q) ||
      (req.department?.toLowerCase() || '').includes(q) ||
      (req.requestId?.toLowerCase() || req.bookingId?.toLowerCase() || '').includes(q) ||
      (req.hallName?.toLowerCase() || '').includes(q) ||
      (req.seriesId?.toLowerCase() || '').includes(q) ||
      (req.purpose?.toLowerCase() || '').includes(q) ||
      (req.requestedBy?.toLowerCase() || '').includes(q) ||
      (req.facultyCoordinator?.toLowerCase() || '').includes(q) ||
      (req.requesterUserId?.toLowerCase() || '').includes(q);

    const matchesHall = hallFilter === 'ALL' || req.hallName === hallFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const reqDate = req.date || req.bookingDate;
    const matchesDate = !dateFilter || reqDate === dateFilter;

    return matchesSearch && matchesHall && matchesStatus && matchesDate;
  });

  // Calculate slot status for selected date
  const getSlotStatus = (hallName, slotType) => {
    const blockingStatuses = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'BOOKED', 'CANCELLATION_REQUESTED', 'RESCHEDULE_REQUESTED'];
    const activeReqs = requests.filter(r => 
      r.hallName === hallName && 
      (r.date === selectedDate || r.bookingDate === selectedDate) && 
      blockingStatuses.includes(r.status?.toUpperCase())
    );

    const hasFullDay = activeReqs.find(r => (r.slot === 'FULL_DAY' || r.slotType === 'FULL_DAY'));
    if (hasFullDay) {
      return (hasFullDay.status === 'APPROVED' || hasFullDay.status === 'BOOKED' || hasFullDay.status === 'CANCELLATION_REQUESTED' || hasFullDay.status === 'RESCHEDULE_REQUESTED') ? 'BOOKED' : 'PENDING';
    }

    const exactMatch = activeReqs.find(r => (r.slot === slotType || r.slotType === slotType));
    if (exactMatch) {
      return (exactMatch.status === 'APPROVED' || exactMatch.status === 'BOOKED' || exactMatch.status === 'CANCELLATION_REQUESTED' || exactMatch.status === 'RESCHEDULE_REQUESTED') ? 'BOOKED' : 'PENDING';
    }

    if (slotType === 'FULL_DAY') {
      const anyPartial = activeReqs.find(r => (r.slot === 'FORENOON' || r.slot === 'AFTERNOON' || r.slotType === 'FORENOON' || r.slotType === 'AFTERNOON'));
      if (anyPartial) {
        return (anyPartial.status === 'APPROVED' || anyPartial.status === 'BOOKED' || anyPartial.status === 'CANCELLATION_REQUESTED' || anyPartial.status === 'RESCHEDULE_REQUESTED') ? 'BOOKED' : 'PENDING';
      }
    }

    return 'AVAILABLE';
  };

  // Upcoming bookings
  const todayStr = getTodayStr();
  const upcomingBookings = requests
    .filter(r => (r.status === 'APPROVED' || r.status === 'BOOKED') && ((r.date || r.bookingDate) >= todayStr))
    .sort((a, b) => (a.date || a.bookingDate || '').localeCompare(b.date || b.bookingDate || ''))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isCoordinatorOnly ? 'Seminar Coordinator Portal' : 'Seminar Hall Management'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isCoordinatorOnly ? `Coordinator: ${user?.userId || user?.name || ''}` : 'Admin Portal'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isCoordinatorOnly 
              ? `Manage assigned halls (${assignedHallIds.join(', ') || 'None'}), review booking requests, cancellations, and reschedules.`
              : 'Manage hall requests, series occurrences, cancellation/reschedule workflows, and slot availability.'}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-sm border border-slate-700/60 transition"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* My Assigned Halls Section (Section 35) */}
      {isCoordinatorOnly && (
        <div className="card-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-semibold text-white">My Assigned Halls</h2>
            </div>
            <span className="text-xs text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30 font-medium">
              {halls.filter(isHallAssignedToUser).length} Assigned Hall(s)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {halls.filter(isHallAssignedToUser).map((hall) => (
              <div key={hall.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{hall.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {hall.location || `${hall.block}, ${hall.floor}`}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                    Cap: {hall.capacity}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <div className="flex flex-wrap gap-1">
                    {(hall.facilities || []).slice(0, 3).map((f, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {f}
                      </span>
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    hall.status === 'Available' || !hall.status
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {hall.status || 'Available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={Building2}
          color="blue"
          trend="All submissions"
        />
        <StatCard
          title="Pending Approval"
          value={stats.pending}
          icon={Clock}
          color="amber"
          trend="Awaiting review"
        />
        <StatCard
          title="Active Bookings"
          value={stats.approved}
          icon={CheckCircle}
          color="emerald"
          trend="Confirmed reservations"
        />
        <StatCard
          title="Action Requests"
          value={stats.cancellationRequested + stats.rescheduleRequested}
          icon={AlertTriangle}
          color="rose"
          trend={`${stats.cancellationRequested} cancel, ${stats.rescheduleRequested} resched`}
        />
      </div>

      {/* Middle Grid: Hall Overview & Availability + Quick Calendar & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Hall & Slot Availability (2 cols) */}
        <div className="lg:col-span-2 card-panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Hall & Slot Availability
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Authoritative real-time status for the selected date</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-900 border border-slate-700/70 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {halls.map((hall) => {
              const forenoonStatus = getSlotStatus(hall.name, 'FORENOON');
              const afternoonStatus = getSlotStatus(hall.name, 'AFTERNOON');
              const fullDayStatus = getSlotStatus(hall.name, 'FULL_DAY');

              return (
                <div 
                  key={hall.id || hall.name} 
                  className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{hall.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {hall.location || `${hall.block}, ${hall.floor}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isAOAdmin ? (
                        <select
                          value={hall.status || 'Available'}
                          onChange={(e) => handleStatusChange(hall.id, e.target.value)}
                          className="text-[10px] font-bold bg-slate-950 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500"
                          title="Super Admin: Update Hall Status"
                        >
                          <option value="Available">Available</option>
                          <option value="MAINTENANCE">Maintenance</option>
                          <option value="Disabled">Disabled</option>
                        </select>
                      ) : (
                        hall.status && hall.status !== 'Available' && (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                            {hall.status}
                          </span>
                        )
                      )}
                      <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                        Cap: {hall.capacity}
                      </span>
                    </div>
                  </div>

                  {/* Slots list */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Forenoon</span>
                      <span className="text-[9px] text-slate-500 block mb-1">09 AM - 12 PM</span>
                      <StatusBadge status={forenoonStatus} />
                    </div>
                    <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Afternoon</span>
                      <span className="text-[9px] text-slate-500 block mb-1">12 PM - 04 PM</span>
                      <StatusBadge status={afternoonStatus} />
                    </div>
                    <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Full Day</span>
                      <span className="text-[9px] text-slate-500 block mb-1">09 AM - 04 PM</span>
                      <StatusBadge status={fullDayStatus} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Quick Calendar & Upcoming Bookings */}
        <div className="space-y-6">
          <QuickCalendar 
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
            events={requests.map(r => ({
              id: r.id || r.bookingId,
              title: `${r.department ? r.department + ': ' : ''}${r.hallName || 'Hall'} - ${r.eventTitle || 'Booking'}`,
              date: r.date || r.bookingDate,
              status: r.status,
              department: r.department,
              type: 'seminar'
            }))}
          />

          {/* Upcoming Bookings mini list */}
          <div className="card-panel p-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              Upcoming Bookings
            </h2>
            {upcomingBookings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No upcoming bookings scheduled.</p>
            ) : (
              <div className="space-y-2">
                {upcomingBookings.map((b) => (
                  <div key={b.id || b.bookingId} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{b.eventTitle}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="text-blue-400 font-medium">{b.hallName}</span>
                        <span>•</span>
                        <span>{b.date || b.bookingDate}</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {b.slot || b.slotType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Seminar Hall Requests Table */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Seminar Hall Requests</h2>
            <p className="text-xs text-slate-400">Review, approve, reschedule, or cancel booking applications</p>
          </div>

          {/* Filter Bar (Section 26) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search event, dept, id, series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-filter-input pl-8 w-44 sm:w-56"
              />
            </div>

            <select
              value={hallFilter}
              onChange={(e) => setHallFilter(e.target.value)}
              className="admin-filter-input"
            >
              <option value="ALL">All Halls</option>
              {halls.map((h, idx) => (
                <option key={`${h.name}-${h.id || idx}`} value={h.name}>{h.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-filter-input"
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

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="admin-filter-input"
            />

            {(searchQuery || hallFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setHallFilter('ALL');
                  setStatusFilter('ALL');
                  setDateFilter('');
                }}
                className="btn btn-secondary btn-sm"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Requests Table */}
        <div className="custom-table-container">
          <table className="custom-table w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4">Request / Series</th>
                <th className="py-3 px-4">Event Title</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Hall & Location</th>
                <th className="py-3 px-4">Date & Slot</th>
                <th className="py-3 px-4">Type / Occ</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No seminar requests found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const reqId = req.bookingId || req.requestId || req.id;
                  const isRecurring = Boolean(req.isRecurring || req.bookingType === 'RECURRING' || req.seriesId);
                  const isMulti = req.bookingType === 'MULTI_DAY';

                  return (
                    <tr key={req.id || req.bookingId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-medium text-slate-200">{reqId}</div>
                        {req.seriesId && (
                          <div className="text-[10px] text-blue-400 font-mono flex items-center gap-1 mt-0.5">
                            <Repeat size={10} /> {req.seriesId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-[170px] truncate">
                        {req.eventTitle}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {req.department}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-blue-400 font-medium">{req.hallName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-slate-500" />
                          <span>{req.hallLocation || req.location || 'NEC Campus'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{formatDateDisplay(req.date || req.bookingDate)}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase">{req.slot || req.slotType}</div>
                      </td>
                      <td className="py-3 px-4">
                        {isRecurring ? (
                          <div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              Recurring
                            </span>
                            {req.occurrenceIndex && req.totalOccurrences && (
                              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                {req.occurrenceIndex} of {req.totalOccurrences}
                              </div>
                            )}
                          </div>
                        ) : isMulti ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            Multi-Day
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">One-Time</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="btn btn-secondary btn-sm p-1.5"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* PENDING ACTIONS */}
                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(req.id || req.bookingId)}
                                disabled={actionLoading}
                                className="btn btn-success btn-sm flex items-center gap-1"
                                title="Approve Booking (with fresh conflict check)"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleOpenReject(req.id || req.bookingId, 'BOOKING')}
                                disabled={actionLoading}
                                className="btn btn-danger btn-sm flex items-center gap-1"
                                title="Reject Booking"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* CANCELLATION REQUESTED ACTIONS (Section 14) */}
                          {req.status === 'CANCELLATION_REQUESTED' && (
                            <>
                              <button
                                onClick={() => handleApproveCancellation(req.id || req.bookingId)}
                                disabled={actionLoading}
                                className="btn btn-danger btn-sm flex items-center gap-1"
                                title="Approve Cancellation Request"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve Cancel</span>
                              </button>
                              <button
                                onClick={() => handleOpenReject(req.id || req.bookingId, 'CANCELLATION')}
                                disabled={actionLoading}
                                className="btn btn-secondary btn-sm flex items-center gap-1"
                                title="Reject Cancellation Request"
                              >
                                <X className="w-3 h-3" />
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {/* RESCHEDULE REQUESTED ACTIONS (Section 18) */}
                          {req.status === 'RESCHEDULE_REQUESTED' && (
                            <>
                              <button
                                onClick={() => handleApproveReschedule(req.id || req.bookingId)}
                                disabled={actionLoading}
                                className="btn btn-primary btn-sm flex items-center gap-1"
                                title="Approve Reschedule (Revalidates availability)"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve Resched</span>
                              </button>
                              <button
                                onClick={() => handleOpenReject(req.id || req.bookingId, 'RESCHEDULE')}
                                disabled={actionLoading}
                                className="btn btn-secondary btn-sm flex items-center gap-1"
                                title="Reject Reschedule Request"
                              >
                                <X className="w-3 h-3" />
                                <span>Decline</span>
                              </button>
                            </>
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

      {/* Details Modal */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title="Seminar Hall Request Details"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-xs text-slate-500 block">Request ID</span>
                <span className="font-mono font-medium text-white">{selectedRequest.bookingId || selectedRequest.requestId}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Status</span>
                <StatusBadge status={selectedRequest.status} />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Department</span>
                <span className="font-medium text-white">{selectedRequest.department}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Submitted By</span>
                <span className="text-slate-300">{selectedRequest.requestedBy || selectedRequest.submittedByName || selectedRequest.userId}</span>
              </div>
            </div>

            {/* Recurring Series Info (Section 27) */}
            {(selectedRequest.seriesId || selectedRequest.isRecurring || selectedRequest.bookingType === 'RECURRING') && (
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/30 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-300 flex items-center gap-1">
                    <Repeat size={13} /> Recurring Booking Series
                  </span>
                  {selectedRequest.occurrenceIndex && selectedRequest.totalOccurrences && (
                    <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-200 border border-blue-400/40 font-mono font-bold">
                      Occurrence: {selectedRequest.occurrenceIndex} of {selectedRequest.totalOccurrences}
                    </span>
                  )}
                </div>
                <div className="font-mono text-slate-300">Series ID: {selectedRequest.seriesId || 'N/A'}</div>
                {selectedRequest.startDate && selectedRequest.endDate && (
                  <div className="text-slate-400">
                    Series Period: {formatDateDisplay(selectedRequest.startDate)} to {formatDateDisplay(selectedRequest.endDate)}
                  </div>
                )}
                {selectedRequest.recurrenceDays && selectedRequest.recurrenceDays.length > 0 && (
                  <div className="text-slate-400">
                    Repeats: {selectedRequest.recurrenceDays.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* CANCELLATION REQUEST DETAILS (Section 15, 16) */}
            {selectedRequest.status === 'CANCELLATION_REQUESTED' && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                  <AlertTriangle size={15} /> Cancellation Request Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Requested By:</span>
                    <span>{selectedRequest.cancellationRequestedBy || 'Department Requester'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scope:</span>
                    <span className="font-bold text-amber-300">
                      {selectedRequest.cancellationScope === 'ENTIRE_SERIES'
                        ? 'Entire recurring series'
                        : selectedRequest.cancellationScope === 'THIS_AND_FUTURE'
                        ? 'This and all future occurrences'
                        : 'This occurrence only'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block">Reason for Cancellation:</span>
                  <p className="mt-0.5 p-2 rounded bg-slate-900 border border-rose-500/20 text-slate-200">
                    {selectedRequest.cancellationReason || 'No reason provided.'}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-500/20">
                  <button
                    onClick={() => handleOpenReject(selectedRequest.id || selectedRequest.bookingId, 'CANCELLATION')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                  >
                    Decline Cancellation
                  </button>
                  <button
                    onClick={() => handleApproveCancellation(selectedRequest.id || selectedRequest.bookingId)}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition shadow"
                  >
                    Approve & Cancel Booking
                  </button>
                </div>
              </div>
            )}

            {/* RESCHEDULE REQUEST DETAILS (Section 17, 18, 19) */}
            {selectedRequest.status === 'RESCHEDULE_REQUESTED' && (
              <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/40 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-blue-300 font-semibold">
                  <Clock size={15} /> Reschedule Request Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Target Hall:</span>
                    <span className="font-semibold text-emerald-400">{selectedRequest.rescheduledHallName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Target Date & Slot:</span>
                    <span className="font-semibold text-white">
                      {formatDateDisplay(selectedRequest.rescheduledDate)} ({selectedRequest.rescheduledSlot})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scope:</span>
                    <span className="font-bold text-amber-300">
                      {selectedRequest.rescheduleScope === 'THIS_AND_FUTURE'
                        ? 'This and future occurrences'
                        : 'This occurrence only'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Requested By:</span>
                    <span>{selectedRequest.rescheduleRequestedBy || 'Department Requester'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block">Reason for Rescheduling:</span>
                  <p className="mt-0.5 p-2 rounded bg-slate-900 border border-blue-500/20 text-slate-200">
                    {selectedRequest.rescheduleReason || 'No reason provided.'}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-500/20">
                  <button
                    onClick={() => handleOpenReject(selectedRequest.id || selectedRequest.bookingId, 'RESCHEDULE')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                  >
                    Decline Reschedule
                  </button>
                  <button
                    onClick={() => handleApproveReschedule(selectedRequest.id || selectedRequest.bookingId)}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow"
                  >
                    Approve Reschedule & Confirm Slot
                  </button>
                </div>
              </div>
            )}

            {/* Normal Event Details */}
            <div className="space-y-2">
              <div>
                <span className="text-xs text-slate-500 block">Event Title</span>
                <span className="text-base font-semibold text-white">{selectedRequest.eventTitle}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Purpose</span>
                <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800/80">
                  {selectedRequest.purpose || 'No additional purpose stated.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Hall & Location</span>
                <span className="font-semibold text-blue-400">{selectedRequest.hallName}</span>
                {(selectedRequest.hallLocation || selectedRequest.location) && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">{selectedRequest.hallLocation || selectedRequest.location}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Booking Date</span>
                <span className="font-semibold text-white">{formatDateDisplay(selectedRequest.date || selectedRequest.bookingDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Slot</span>
                <span className="font-semibold text-emerald-400 uppercase">{selectedRequest.slot || selectedRequest.slotType}</span>
              </div>
              <div>
                <span className="text-slate-500 block mt-2">Participants</span>
                <span className="font-medium text-slate-200">{selectedRequest.expectedParticipants || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block mt-2">Requirements</span>
                <span className="font-medium text-slate-200">
                  {selectedRequest.additionalRequirements || selectedRequest.requirements?.join(', ') || 'Standard equipment'}
                </span>
              </div>
            </div>

            {/* PENDING APPROVE / REJECT FOOTER */}
            {selectedRequest.status === 'PENDING' && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleOpenReject(selectedRequest.id || selectedRequest.bookingId, 'BOOKING')}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-medium transition"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.id || selectedRequest.bookingId)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md"
                >
                  Approve & Confirm Slot
                </button>
              </div>
            )}

            {(selectedRequest.status === 'APPROVED' || selectedRequest.status === 'BOOKED') && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    const req = selectedRequest;
                    setSelectedRequest(null);
                    setDocModalRequest(req);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  id="btn-view-official-doc-seminar"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Official Document & PDF</span>
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Reason Confirmation Modal */}
      {rejectModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setRejectModalOpen(false)}
          title={
            rejectActionType === 'BOOKING'
              ? 'Reject Seminar Request'
              : rejectActionType === 'CANCELLATION'
              ? 'Decline Cancellation Request'
              : 'Decline Reschedule Request'
          }
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400 text-xs">
              {rejectActionType === 'BOOKING'
                ? 'Please specify the reason for declining this seminar hall request. The department will receive this feedback.'
                : rejectActionType === 'CANCELLATION'
                ? 'Please specify why the cancellation request is being declined. The original reservation will remain confirmed.'
                : 'Please specify why the reschedule request is being declined. The original reservation will remain active.'}
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Reason *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter feedback or administrative remarks..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition shadow-md"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Request Details Modal with PDF Preview & Download */}
      {docModalRequest && (
        <RequestDetailsModal
          isOpen={!!docModalRequest}
          onClose={() => setDocModalRequest(null)}
          request={docModalRequest}
        />
      )}
    </div>
  );
}
