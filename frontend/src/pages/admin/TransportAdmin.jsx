import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Truck, 
  Clock, 
  Calendar as CalendarIcon, 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  RefreshCw,
  Navigation,
  MapPin,
  Check,
  X,
  AlertTriangle,
  Car,
  FileText
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import QuickCalendar from '../../components/calendar/QuickCalendar';
import Modal from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { transportApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { getTodayStr } from '../../utils/dateUtils';

export default function TransportAdmin() {
  const [searchParams] = useSearchParams();
  const { addToast } = useNotifications();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);
  const [tripTypeFilter, setTripTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Action states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [docModalRequest, setDocModalRequest] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [vehRes, reqsRes] = await Promise.all([
        transportApi.getVehicles(),
        transportApi.getRequests(),
      ]);

      const vehList = vehRes.data || [];
      const reqList = reqsRes.data || [];

      setVehicles(vehList);
      setRequests(reqList);

      const total = reqList.length;
      const pending = reqList.filter(r => r.status === 'PENDING').length;
      const approved = reqList.filter(r => r.status === 'APPROVED').length;
      const rejected = reqList.filter(r => r.status === 'REJECTED').length;
      setStats({ total, pending, approved, rejected });
    } catch (err) {
      addToast(err.message || 'Failed to load transport data', 'error');
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
      await transportApi.approve(id);
      addToast('Transport trip approved successfully! Vehicle assigned.', 'success');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (id) => {
    setRejectId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectId) return;
    try {
      setActionLoading(true);
      await transportApi.reject(rejectId, rejectReason);
      addToast('Transport request rejected.', 'info');
      setRejectModalOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error rejecting request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrips = requests.filter(r => r.status === 'APPROVED' && r.tripDate === todayStr);

  const filteredRequests = requests.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      (req.department?.toLowerCase() || '').includes(q) ||
      (req.requestId?.toLowerCase() || '').includes(q) ||
      (req.destination?.toLowerCase() || '').includes(q) ||
      (req.pickupLocation?.toLowerCase() || '').includes(q) ||
      (req.purpose?.toLowerCase() || '').includes(q) ||
      (req.requestedBy?.toLowerCase() || '').includes(q) ||
      (req.requesterUserId?.toLowerCase() || '').includes(q);

    const matchesType = tripTypeFilter === 'ALL' || req.tripType === tripTypeFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Transport Fleet & Trips</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Admin Portal
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Vehicle status management, travel schedules, and campus transport allocations.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-sm border border-slate-700/60 transition"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={Truck}
          color="blue"
          trend="All bookings"
        />
        <StatCard
          title="Pending Approval"
          value={stats.pending}
          icon={Clock}
          color="amber"
          trend="Awaiting dispatch"
        />
        <StatCard
          title="Approved Trips"
          value={stats.approved}
          icon={CheckCircle}
          color="emerald"
          trend="Scheduled / Completed"
        />
        <StatCard
          title="Rejected Trips"
          value={stats.rejected}
          icon={XCircle}
          color="rose"
          trend="Declined"
        />
      </div>

      {/* Vehicles Fleet & Today's Trips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Vehicles Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-400" />
                  Vehicle Fleet Status
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time status of college buses, vans, and staff cars</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {vehicles.map((v) => (
                <div key={v.id || v.registrationNumber} className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{v.type}</h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{v.registrationNumber}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      v.status === 'AVAILABLE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : v.status === 'ON_TRIP'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {v.status ? v.status.replace('_', ' ') : 'AVAILABLE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Capacity: <strong className="text-slate-200">{v.capacity} Seats</strong>
                    </span>
                    {v.driverName && (
                      <span className="text-[11px] text-slate-400">
                        Driver: {v.driverName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Trips */}
          <div className="card-panel p-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              Today's Scheduled Trips ({todayTrips.length})
            </h3>
            {todayTrips.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No transport trips scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {todayTrips.map(trip => (
                  <div key={trip.id} className="p-3 rounded bg-slate-900/60 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white block">{trip.department}</span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{trip.pickupLocation}</span>
                        <span>→</span>
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span>{trip.destination}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300 font-medium">Dep: {trip.departureTime}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {trip.expectedPassengers} Pax
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Calendar */}
        <div className="space-y-6">
          <QuickCalendar 
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={requests.map(r => ({
              id: r.id,
              title: `${r.department}: ${r.pickupLocation || 'Pickup'} to ${r.destination || 'Destination'} (${r.vehicleName || 'Vehicle'})`,
              date: r.tripDate,
              status: r.status,
              department: r.department,
              type: 'transport'
            }))}
          />
        </div>
      </div>

      {/* Transport Requests Table */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Transport Service Requests</h2>
            <p className="text-xs text-slate-400">Review trip routes, passenger sizes, and vehicle dispatches</p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search route, dept, id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-filter-input pl-8 w-48"
              />
            </div>

            <select
              value={tripTypeFilter}
              onChange={(e) => setTripTypeFilter(e.target.value)}
              className="admin-filter-input"
            >
              <option value="ALL">All Trip Types</option>
              <option value="ROUND_TRIP">Round Trip</option>
              <option value="ONE_WAY">One Way</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-filter-input"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
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
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Trip Date</th>
                <th className="py-3 px-4">Timings</th>
                <th className="py-3 px-4">Passengers</th>
                <th className="py-3 px-4">Trip Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    No transport requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-300">
                      {req.requestId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {req.department}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{req.pickupLocation}</div>
                      <div className="text-[10px] text-amber-400">→ {req.destination}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {req.tripDate}
                    </td>
                    <td className="py-3 px-4">
                      <div>Dep: {req.departureTime}</div>
                      {req.returnTime && <div className="text-[10px] text-slate-400">Ret: {req.returnTime}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {req.expectedPassengers} Pax
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold text-slate-300 uppercase px-2 py-0.5 rounded bg-slate-800">
                        {req.tripType?.replace('_', ' ')}
                      </span>
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

                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={actionLoading}
                              className="btn btn-success btn-sm flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleOpenReject(req.id)}
                              disabled={actionLoading}
                              className="btn btn-danger btn-sm flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
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
          title="Transport Request Details"
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
                <span className="text-xs text-slate-500 block">Passengers</span>
                <span className="font-medium text-amber-400">{selectedRequest.expectedPassengers} Passengers</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Trip Type</span>
                <span className="font-semibold text-white uppercase">{selectedRequest.tripType?.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-white">{selectedRequest.tripDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Route</span>
                <span className="font-semibold text-amber-400">{selectedRequest.pickupLocation} → {selectedRequest.destination}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Departure Time</span>
                <span className="font-semibold text-white">{selectedRequest.departureTime}</span>
              </div>
              {selectedRequest.returnTime && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Return Time</span>
                  <span className="font-semibold text-white">{selectedRequest.returnTime}</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-1">Purpose of Trip</span>
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

            {selectedRequest.status === 'PENDING' && (
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
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md"
                >
                  Approve & Dispatch
                </button>
              </div>
            )}

            {selectedRequest.status === 'APPROVED' && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    const req = selectedRequest;
                    setSelectedRequest(null);
                    setDocModalRequest(req);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  id="btn-view-official-doc-transport"
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
          title="Reject Transport Request"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400 text-xs">
              Please provide a reason for declining this transport request.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. All buses are reserved for semester examination routes..."
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
                Confirm Rejection
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
