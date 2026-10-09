import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Home, 
  Clock, 
  Calendar as CalendarIcon, 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  RefreshCw,
  DoorOpen,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  X,
  Building,
  FileText,
  AlertTriangle,
  RotateCcw,
  Wrench,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import QuickCalendar from '../../components/calendar/QuickCalendar';
import Modal from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { accommodationApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayStr, formatDateDisplay } from '../../utils/dateUtils';

export default function AccommodationAdmin() {
  const { user } = useAuth();
  const isAoAdmin = user?.role === 'AO_ADMIN' || user?.role === 'CREATOR' || user?.roles?.includes('AO_ADMIN') || user?.roles?.includes('CREATOR');
  const [searchParams] = useSearchParams();
  const { addToast } = useNotifications();
  const [stats, setStats] = useState({
    total: 0,
    pendingAo: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancellationRequested: 0,
    rescheduleRequested: 0,
  });
  const [requests, setRequests] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [hostelFilter, setHostelFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Modals & Action States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [docModalRequest, setDocModalRequest] = useState(null);
  
  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Reject Cancellation Modal
  const [rejectCancelModalOpen, setRejectCancelModalOpen] = useState(false);
  const [rejectCancelId, setRejectCancelId] = useState(null);
  const [rejectCancelReason, setRejectCancelReason] = useState('');

  // Reject Reschedule Modal
  const [rejectRescheduleModalOpen, setRejectRescheduleModalOpen] = useState(false);
  const [rejectRescheduleId, setRejectRescheduleId] = useState(null);
  const [rejectRescheduleReason, setRejectRescheduleReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [roomsRes, reqsRes] = await Promise.all([
        accommodationApi.getRooms(),
        accommodationApi.getRequests(),
      ]);

      const roomList = roomsRes.data || [];
      const reqList = reqsRes.data || [];

      setRooms(roomList);
      setRequests(reqList);

      const total = reqList.length;
      const pendingAo = reqList.filter((r) => r.status === 'PENDING_AO_APPROVAL').length;
      const pending = reqList.filter((r) => r.status === 'PENDING' || r.status === 'AO_APPROVED' || (r.status && r.status.startsWith('FORWARDED_TO_'))).length;
      const approved = reqList.filter((r) => r.status === 'APPROVED' || r.status === 'BOOKED').length;
      const rejected = reqList.filter((r) => r.status === 'REJECTED' || r.status === 'AO_REJECTED').length;
      const cancellationRequested = reqList.filter((r) => r.status === 'CANCELLATION_REQUESTED').length;
      const rescheduleRequested = reqList.filter((r) => r.status === 'RESCHEDULE_REQUESTED').length;

      setStats({
        total,
        pendingAo,
        pending,
        approved,
        rejected,
        cancellationRequested,
        rescheduleRequested,
      });
    } catch (err) {
      addToast(err.message || 'Failed to load accommodation data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Level 1 Option A: AO Admin Direct Approval
  const handleAoDirectApprove = async (id) => {
    try {
      setActionLoading(true);
      await accommodationApi.aoDirectApprove(id);
      addToast('Accommodation request directly approved by AO Admin!', 'success');
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error directly approving request at AO level', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Level 1 Option B: AO Admin Forward to Hostel Admin
  const handleAoForward = async (id, hostel) => {
    try {
      setActionLoading(true);
      await accommodationApi.aoForward(id);
      const targetAdmin = hostel === 'Boys Hostel' ? 'Boys Hostel Admin' : 'Girls Hostel Admin';
      addToast(`Accommodation request forwarded to ${targetAdmin}!`, 'success');
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error forwarding request to hostel admin', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Backwards-compatible AO Approve
  const handleAoApprove = async (id) => {
    const target = requests.find((r) => r.id === id || r.requestId === id);
    return handleAoForward(id, target?.hostel);
  };

  // Level 2: Respective Hostel Admin Approval (fresh conflict recheck performed on backend)
  const handleApprove = async (id) => {
    try {
      setActionLoading(true);
      await accommodationApi.approve(id);
      addToast('Accommodation request approved successfully by Hostel Admin!', 'success');
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving request: Room conflict detected', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Request
  const handleOpenReject = (id) => {
    setRejectId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      addToast('Please provide a reason for rejection', 'warning');
      return;
    }
    try {
      setActionLoading(true);
      const targetReq = requests.find((r) => r.id === rejectId || r.requestId === rejectId);
      if (targetReq && (targetReq.status === 'PENDING_AO_APPROVAL' || isAoAdmin)) {
        await accommodationApi.aoReject(rejectId, rejectReason.trim());
      } else {
        await accommodationApi.reject(rejectId, rejectReason.trim());
      }
      addToast('Accommodation request rejected.', 'info');
      setRejectModalOpen(false);
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error rejecting request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Cancellation
  const handleApproveCancellation = async (id) => {
    try {
      setActionLoading(true);
      await accommodationApi.approveCancellation(id);
      addToast('Cancellation request approved. Room is now released.', 'success');
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving cancellation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Cancellation
  const handleOpenRejectCancel = (id) => {
    setRejectCancelId(id);
    setRejectCancelReason('');
    setRejectCancelModalOpen(true);
  };

  const handleConfirmRejectCancel = async () => {
    if (!rejectCancelId) return;
    try {
      setActionLoading(true);
      await accommodationApi.rejectCancellation(rejectCancelId, rejectCancelReason.trim());
      addToast('Cancellation request declined. Booking remains APPROVED.', 'info');
      setRejectCancelModalOpen(false);
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error rejecting cancellation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Reschedule
  const handleApproveReschedule = async (id) => {
    try {
      setActionLoading(true);
      await accommodationApi.approveReschedule(id);
      addToast('Reschedule request approved! Booking updated with new room & dates.', 'success');
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving reschedule: Room conflict or unavailable', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Reschedule
  const handleOpenRejectReschedule = (id) => {
    setRejectRescheduleId(id);
    setRejectRescheduleReason('');
    setRejectRescheduleModalOpen(true);
  };

  const handleConfirmRejectReschedule = async () => {
    if (!rejectRescheduleId) return;
    try {
      setActionLoading(true);
      await accommodationApi.rejectReschedule(rejectRescheduleId, rejectRescheduleReason.trim());
      addToast('Reschedule request declined. Original booking preserved as APPROVED.', 'info');
      setRejectRescheduleModalOpen(false);
      setSelectedRequest(null);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error rejecting reschedule', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Room status toggle (Maintenance / Available)
  const handleToggleRoomStatus = async (roomId, currentStatus) => {
    const newStatus = currentStatus === 'Maintenance' ? 'Available' : 'Maintenance';
    try {
      setActionLoading(true);
      await accommodationApi.updateRoomStatus(roomId, newStatus);
      addToast(`Room ${roomId} status changed to ${newStatus}`, 'success');
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to update room status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const todayStr = getTodayStr();
  const todayCheckIns = requests.filter(
    (r) => (r.status === 'APPROVED' || r.status === 'BOOKED') && r.checkInDate === todayStr
  );
  const todayCheckOuts = requests.filter(
    (r) => (r.status === 'APPROVED' || r.status === 'BOOKED') && r.checkOutDate === todayStr
  );

  const filteredRequests = requests.filter((req) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (req.department?.toLowerCase() || '').includes(q) ||
      (req.requestId?.toLowerCase() || '').includes(q) ||
      (req.facultyOrGuestName?.toLowerCase() || '').includes(q) ||
      (req.purpose?.toLowerCase() || '').includes(q) ||
      (req.hostel?.toLowerCase() || '').includes(q) ||
      (req.roomId?.toLowerCase() || '').includes(q) ||
      (req.requestedBy?.toLowerCase() || '').includes(q) ||
      (req.requesterUserId?.toLowerCase() || '').includes(q);

    const matchesHostel = hostelFilter === 'ALL' || req.hostel === hostelFilter;
    const matchesType = typeFilter === 'ALL' || req.roomType?.includes(typeFilter);
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchesSearch && matchesHostel && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Accommodation Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Admin Portal
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Hostel room allocations, occupancy tracking, cancellation & reschedule approvals.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-sm border border-slate-700/60 transition"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={Home}
          color="blue"
          trend="All submissions"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={Clock}
          color="amber"
          trend="Requires action"
        />
        <StatCard
          title="Approved Stays"
          value={stats.approved}
          icon={CheckCircle}
          color="emerald"
          trend="Active confirmed"
        />
        <StatCard
          title="Cancel Requested"
          value={stats.cancellationRequested}
          icon={XCircle}
          color="rose"
          trend="Pending cancellation"
        />
        <StatCard
          title="Reschedule Requested"
          value={stats.rescheduleRequested}
          icon={RotateCcw}
          color="cyan"
          trend="Pending reschedule"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="slate"
          trend="Declined"
        />
      </div>

      {/* Room Status & Check-ins Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Room Availability Cards & Checkin summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Room Availability */}
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <DoorOpen className="w-4 h-4 text-emerald-400" />
                  Room Availability & Status Management
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hostel room inventory, real-time maintenance toggle, and room capacity
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map((room) => {
                const isMaint = room.status === 'Maintenance' || room.status === 'Unavailable';
                return (
                  <div
                    key={room.id || room.roomId}
                    className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{room.roomId}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              room.roomType?.includes('AC') && !room.roomType?.includes('Non-AC')
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {room.roomType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-500" />
                          {room.hostel}
                        </p>
                        {room.location && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {room.location}
                          </p>
                        )}
                      </div>
                      <StatusBadge
                        status={isMaint ? 'MAINTENANCE' : room.available ? 'AVAILABLE' : 'PENDING'}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                      <span>Capacity: {room.capacity} Guests</span>
                      <button
                        onClick={() => handleToggleRoomStatus(room.roomId, room.status)}
                        disabled={actionLoading}
                        className={`btn btn-sm flex items-center gap-1 ${
                          isMaint ? 'btn-success' : 'btn-warning'
                        }`}
                        title={isMaint ? 'Mark room as Available' : 'Put room under Maintenance'}
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{isMaint ? 'Set Available' : 'Set Maintenance'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Check-ins & Check-outs Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-panel p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/60">
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Today's Check-ins ({todayCheckIns.length})
                </h3>
              </div>
              {todayCheckIns.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No guests checking in today.</p>
              ) : (
                <div className="space-y-2">
                  {todayCheckIns.map((ci) => (
                    <div
                      key={ci.id}
                      className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-white block">{ci.department}</span>
                        <span className="text-slate-400 text-[11px]">
                          {ci.hostel} • {ci.roomType}
                        </span>
                      </div>
                      <span className="font-semibold text-emerald-400">
                        {ci.guestsCount || ci.numberOfGuests || 1} Guests
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-panel p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/60">
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Today's Check-outs ({todayCheckOuts.length})
                </h3>
              </div>
              {todayCheckOuts.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No guests checking out today.</p>
              ) : (
                <div className="space-y-2">
                  {todayCheckOuts.map((co) => (
                    <div
                      key={co.id}
                      className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-white block">{co.department}</span>
                        <span className="text-slate-400 text-[11px]">
                          {co.hostel} • {co.roomType}
                        </span>
                      </div>
                      <span className="font-semibold text-amber-400">
                        {co.guestsCount || co.numberOfGuests || 1} Guests
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Quick Calendar */}
        <div className="space-y-6">
          <QuickCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={requests.map((r) => ({
              id: r.id,
              title: `${r.department}: ${r.guestsCount || 1} guests (${r.roomType || 'Room'})`,
              date: r.checkInDate,
              status: r.status,
              department: r.department,
              type: 'accommodation',
            }))}
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Accommodation Requests Queue</h2>
            <p className="text-xs text-slate-400">
              Review guest bookings, adjudicate pending requests, and manage cancellations & reschedules
            </p>
          </div>

          {/* Filter Bar */}
          <div className="admin-filter-bar flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search dept, guest, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-filter-input pl-8 w-48"
              />
            </div>

            <select
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              className="admin-filter-input"
            >
              <option value="ALL">All Hostels</option>
              <option value="Girls Hostel">Girls Hostel</option>
              <option value="Boys Hostel">Boys Hostel</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="admin-filter-input"
            >
              <option value="ALL">All Types</option>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-filter-input"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING_AO_APPROVAL">Pending AO Approval</option>
              <option value="FORWARDED_TO_BOYS_ADMIN">Forwarded to Boys Hostel Admin</option>
              <option value="FORWARDED_TO_GIRLS_ADMIN">Forwarded to Girls Hostel Admin</option>
              <option value="AO_APPROVED">AO Approved (Waiting Hostel Admin)</option>
              <option value="APPROVED">Approved</option>
              <option value="AO_REJECTED">AO Rejected</option>
              <option value="PENDING">Pending (Legacy)</option>
              <option value="CANCELLATION_REQUESTED">Cancel Requested</option>
              <option value="RESCHEDULE_REQUESTED">Reschedule Requested</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="custom-table-container">
          <table className="custom-table w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Hostel</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Guests</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    No accommodation requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-300">
                      <div>{req.requestId}</div>
                      {req.parentRequestId && (
                        <span className="text-[10px] text-blue-400 font-normal block">
                          Parent: {req.parentRequestId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold px-2 py-0.5 rounded text-[11px] inline-block ${
                        req.hostel === 'Boys Hostel'
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          : 'bg-pink-500/15 text-pink-300 border border-pink-500/30'
                      }`}>
                        {req.hostel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-medium">
                      {req.facultyOrGuestName || req.requestedBy || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {req.department}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{req.roomId}</div>
                      <div className="text-[10px] text-emerald-400">{req.roomType || ''}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="whitespace-nowrap font-mono text-[11px]">
                        {formatDateDisplay(req.checkInDate)} → {formatDateDisplay(req.checkOutDate)}
                      </div>
                      {req.dates && req.dates.length > 1 && (
                        <span className="text-[10px] text-indigo-400 block">{req.dates.length} Dates</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {req.guestsCount || req.numberOfGuests || 1}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="btn btn-secondary btn-sm p-1.5"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Level 1 AO Approval Actions: Direct Approve / Forward / Reject */}
                        {(req.status === 'PENDING_AO_APPROVAL' || req.status === 'PENDING') && isAoAdmin && (
                          <>
                            <button
                              onClick={() => handleAoDirectApprove(req.id)}
                              disabled={actionLoading}
                              className="btn btn-success btn-sm flex items-center gap-1"
                              title="Direct Approve (No Hostel Admin approval needed)"
                            >
                              <Check className="w-3 h-3" />
                              <span>Direct Approve</span>
                            </button>
                            <button
                              onClick={() => handleAoForward(req.id, req.hostel)}
                              disabled={actionLoading}
                              className="btn btn-primary btn-sm flex items-center gap-1"
                              title={`Forward to ${req.hostel === 'Boys Hostel' ? 'Boys Hostel Admin' : 'Girls Hostel Admin'}`}
                            >
                              <ArrowRight className="w-3 h-3" />
                              <span>{req.hostel === 'Boys Hostel' ? 'Forward to Boys Hostel Admin' : 'Forward to Girls Hostel Admin'}</span>
                            </button>
                            <button
                              onClick={() => handleOpenReject(req.id)}
                              disabled={actionLoading}
                              className="btn btn-danger btn-sm flex items-center gap-1"
                              title="Reject (AO Level)"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {/* Level 2 Hostel Admin Approval Actions: Approve / Reject */}
                        {(req.status === 'FORWARDED_TO_BOYS_ADMIN' || req.status === 'FORWARDED_TO_GIRLS_ADMIN' || req.status === 'AO_APPROVED' || (req.status === 'PENDING' && !isAoAdmin)) && !isAoAdmin && (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoading}
                              className="btn btn-success btn-sm flex items-center gap-1"
                              title="Approve Booking (Hostel Admin)"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleOpenReject(req.id)}
                              disabled={actionLoading}
                              className="btn btn-danger btn-sm flex items-center gap-1"
                              title="Reject Booking (Hostel Admin)"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {/* CANCELLATION_REQUESTED Actions: Approve Cancel / Reject Cancel */}
                        {req.status === 'CANCELLATION_REQUESTED' && (
                          <>
                            <button
                              onClick={() => handleApproveCancellation(req.id)}
                              disabled={actionLoading}
                              className="btn btn-danger btn-sm flex items-center gap-1"
                              title="Confirm Cancellation"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve Cancel</span>
                            </button>
                            <button
                              onClick={() => handleOpenRejectCancel(req.id)}
                              disabled={actionLoading}
                              className="btn btn-secondary btn-sm flex items-center gap-1"
                              title="Decline Cancellation"
                            >
                              <X className="w-3 h-3" />
                              <span>Decline Cancel</span>
                            </button>
                          </>
                        )}

                        {/* RESCHEDULE_REQUESTED Actions: Approve Reschedule / Reject Reschedule */}
                        {req.status === 'RESCHEDULE_REQUESTED' && (
                          <>
                            <button
                              onClick={() => handleApproveReschedule(req.id)}
                              disabled={actionLoading}
                              className="btn btn-primary btn-sm flex items-center gap-1"
                              title="Confirm Reschedule"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve Resched</span>
                            </button>
                            <button
                              onClick={() => handleOpenRejectReschedule(req.id)}
                              disabled={actionLoading}
                              className="btn btn-secondary btn-sm flex items-center gap-1"
                              title="Decline Reschedule"
                            >
                              <X className="w-3 h-3" />
                              <span>Decline Resched</span>
                            </button>
                          </>
                        )}

                        {/* APPROVED: View Official PDF Document */}
                        {(req.status === 'APPROVED' || req.status === 'BOOKED') && (
                          <button
                            onClick={() => {
                              setDocModalRequest({
                                ...req,
                                service: 'Accommodation',
                                serviceCategory: 'ACCOMMODATION',
                              });
                            }}
                            className="p-1.5 rounded hover:bg-slate-800 text-blue-400 hover:text-blue-300 transition"
                            title="Official PDF Document"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
          title="Accommodation Request Details"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-xs text-slate-500 block">Request ID</span>
                <span className="font-mono font-medium text-white">{selectedRequest.requestId}</span>
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
                <span className="text-xs text-slate-500 block">Number of Guests</span>
                <span className="font-medium text-emerald-400">
                  {selectedRequest.guestsCount || selectedRequest.numberOfGuests}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Hostel Block</span>
                <span className="font-semibold text-white">{selectedRequest.hostel}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Room Type & ID</span>
                <span className="font-semibold text-emerald-400">
                  {selectedRequest.roomType} ({selectedRequest.roomId})
                </span>
              </div>
              <div className="mt-2">
                <span className="text-slate-500 block">Check-in Date</span>
                <span className="font-semibold text-white">
                  {formatDateDisplay(selectedRequest.checkInDate)}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-slate-500 block">Check-out Date</span>
                <span className="font-semibold text-white">
                  {formatDateDisplay(selectedRequest.checkOutDate)}
                </span>
              </div>
            </div>

            {/* If Reschedule was requested */}
            {selectedRequest.status === 'RESCHEDULE_REQUESTED' && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs space-y-1">
                <span className="font-semibold text-blue-300 block">Target Rescheduled Values:</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Room:</span>
                  <span className="text-white">{selectedRequest.rescheduledRoomId || selectedRequest.roomId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Dates:</span>
                  <span className="text-white">
                    {formatDateDisplay(selectedRequest.rescheduledCheckInDate)} →{' '}
                    {formatDateDisplay(selectedRequest.rescheduledCheckOutDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reason:</span>
                  <span className="text-blue-200">{selectedRequest.rescheduleReason}</span>
                </div>
              </div>
            )}

            {/* If Cancellation was requested */}
            {selectedRequest.status === 'CANCELLATION_REQUESTED' && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                <span className="font-semibold text-rose-300 block">Cancellation Request:</span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reason:</span>
                  <span className="text-rose-200">{selectedRequest.cancellationReason}</span>
                </div>
              </div>
            )}

            <div>
              <span className="text-xs text-slate-500 block mb-1">Purpose / Guest Details</span>
              <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 text-xs">
                {selectedRequest.purpose || 'No additional purpose specified.'}
              </p>
            </div>

            {selectedRequest.additionalNotes && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Additional Notes</span>
                <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 text-xs">
                  {selectedRequest.additionalNotes}
                </p>
              </div>
            )}

            {/* Action Bar inside details modal */}
            {(selectedRequest.status === 'PENDING_AO_APPROVAL' || selectedRequest.status === 'PENDING') && isAoAdmin && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 flex-wrap">
                <button
                  onClick={() => handleOpenReject(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-medium transition"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => handleAoForward(selectedRequest.id, selectedRequest.hostel)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-md flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{selectedRequest.hostel === 'Boys Hostel' ? 'Forward to Boys Hostel Admin' : 'Forward to Girls Hostel Admin'}</span>
                </button>
                <button
                  onClick={() => handleAoDirectApprove(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Direct Approve</span>
                </button>
              </div>
            )}

            {(selectedRequest.status === 'FORWARDED_TO_BOYS_ADMIN' || selectedRequest.status === 'FORWARDED_TO_GIRLS_ADMIN' || selectedRequest.status === 'AO_APPROVED' || (selectedRequest.status === 'PENDING' && !isAoAdmin)) && !isAoAdmin && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleOpenReject(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-medium transition"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve Room Allocation</span>
                </button>
              </div>
            )}

            {selectedRequest.status === 'CANCELLATION_REQUESTED' && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleOpenRejectCancel(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition"
                >
                  Decline Cancellation
                </button>
                <button
                  onClick={() => handleApproveCancellation(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition shadow-md"
                >
                  Confirm Cancellation
                </button>
              </div>
            )}

            {selectedRequest.status === 'RESCHEDULE_REQUESTED' && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleOpenRejectReschedule(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition"
                >
                  Decline Reschedule
                </button>
                <button
                  onClick={() => handleApproveReschedule(selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-md"
                >
                  Approve Reschedule
                </button>
              </div>
            )}

            {(selectedRequest.status === 'APPROVED' || selectedRequest.status === 'BOOKED') && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    const req = selectedRequest;
                    setSelectedRequest(null);
                    setDocModalRequest({
                      ...req,
                      service: 'Accommodation',
                      serviceCategory: 'ACCOMMODATION',
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  id="btn-view-official-doc-acc"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Official Document & PDF</span>
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Accommodation Request"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400 text-xs">
              Please provide an official reason for declining this accommodation request.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Reason for Rejection *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Room reserved for external guests..."
                rows={3}
                required
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
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Cancellation Modal */}
      {rejectCancelModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setRejectCancelModalOpen(false)}
          title="Decline Cancellation Request"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400 text-xs">
              Provide a note for declining this cancellation (the booking will stay APPROVED).
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Note / Reason</label>
              <textarea
                value={rejectCancelReason}
                onChange={(e) => setRejectCancelReason(e.target.value)}
                placeholder="e.g. Cancellation window expired..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectCancelModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectCancel}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium shadow-md"
              >
                Decline Cancellation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Reschedule Modal */}
      {rejectRescheduleModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setRejectRescheduleModalOpen(false)}
          title="Decline Reschedule Request"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400 text-xs">
              Provide a reason for declining this reschedule (the original booking remains active).
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Reason</label>
              <textarea
                value={rejectRescheduleReason}
                onChange={(e) => setRejectRescheduleReason(e.target.value)}
                placeholder="e.g. Target dates cannot be accommodated..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectRescheduleModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectReschedule}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium shadow-md"
              >
                Decline Reschedule
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
