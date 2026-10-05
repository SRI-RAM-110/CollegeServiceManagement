import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Utensils, 
  Clock, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  RefreshCw,
  Coffee,
  Check,
  X,
  MapPin,
  FileText
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import QuickCalendar from '../../components/calendar/QuickCalendar';
import Modal from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { mealsApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { getTodayStr } from '../../utils/dateUtils';

export default function MealsAdmin() {
  const { addToast } = useNotifications();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [requests, setRequests] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

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
      const res = await mealsApi.getRequests();
      const reqList = res.data || [];

      setRequests(reqList);

      const total = reqList.length;
      const pending = reqList.filter(r => r.status === 'PENDING').length;
      const approved = reqList.filter(r => r.status === 'APPROVED').length;
      const rejected = reqList.filter(r => r.status === 'REJECTED').length;
      setStats({ total, pending, approved, rejected });
    } catch (err) {
      addToast(err.message || 'Failed to load meal requests', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    try {
      setActionLoading(true);
      await mealsApi.approve(id);
      addToast('Meal catering request approved successfully!', 'success');
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
      await mealsApi.reject(rejectId, rejectReason);
      addToast('Meal request rejected.', 'info');
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
  const todayMeals = requests.filter(r => r.status === 'APPROVED' && r.eventDate === todayStr);

  // Compute today's guest counts across the 5 categories
  const computeTodayCount = (categoryKey) => {
    let count = 0;
    todayMeals.forEach(req => {
      if (req.mealTypes && req.mealTypes.includes(categoryKey)) {
        if (req.guestCounts && req.guestCounts[categoryKey]) {
          count += req.guestCounts[categoryKey];
        } else if (req.totalGuests) {
          count += req.totalGuests;
        }
      }
    });
    return count;
  };

  const todayCounts = {
    breakfast: computeTodayCount('BREAKFAST'),
    lunch: computeTodayCount('LUNCH'),
    dinner: computeTodayCount('DINNER'),
    snacks: computeTodayCount('SNACKS'),
    teaCoffee: computeTodayCount('TEA_COFFEE')
  };

  const filteredRequests = requests.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      (req.eventName?.toLowerCase() || '').includes(q) ||
      (req.department?.toLowerCase() || '').includes(q) ||
      (req.venue?.toLowerCase() || '').includes(q) ||
      (req.requestId?.toLowerCase() || '').includes(q) ||
      (req.purpose?.toLowerCase() || '').includes(q) ||
      (req.requestedBy?.toLowerCase() || '').includes(q);

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesDate = !dateFilter || req.eventDate === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Snacks & Meals Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Admin Portal
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Institutional guest hospitality, banquet arrangements, and pantry catering orders.
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={Utensils}
          color="blue"
          trend="All submissions"
        />
        <StatCard
          title="Pending Approval"
          value={stats.pending}
          icon={Clock}
          color="amber"
          trend="Needs kitchen prep"
        />
        <StatCard
          title="Approved Catering"
          value={stats.approved}
          icon={CheckCircle}
          color="emerald"
          trend="Confirmed meal plans"
        />
        <StatCard
          title="Rejected Requests"
          value={stats.rejected}
          icon={XCircle}
          color="rose"
          trend="Declined"
        />
      </div>

      {/* Categories Breakdown & Quick Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: 5 Category Breakdown Cards & Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-sky-400" />
                  Today's Catering Headcount
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Aggregated guest counts for today's active services</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                Date: <strong className="text-white">{todayStr}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-3 text-center shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Breakfast</span>
                <span className="text-lg font-bold font-mono text-amber-400 block my-1">
                  {todayCounts.breakfast}
                </span>
                <span className="text-[10px] text-slate-500">guests</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-3 text-center shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Lunch</span>
                <span className="text-lg font-bold font-mono text-emerald-400 block my-1">
                  {todayCounts.lunch}
                </span>
                <span className="text-[10px] text-slate-500">guests</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-3 text-center shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Dinner</span>
                <span className="text-lg font-bold font-mono text-blue-400 block my-1">
                  {todayCounts.dinner}
                </span>
                <span className="text-[10px] text-slate-500">guests</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-3 text-center shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Snacks</span>
                <span className="text-lg font-bold font-mono text-sky-400 block my-1">
                  {todayCounts.snacks}
                </span>
                <span className="text-[10px] text-slate-500">guests</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-3 text-center shadow-sm col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tea / Coffee</span>
                <span className="text-lg font-bold font-mono text-blue-400 block my-1">
                  {todayCounts.teaCoffee}
                </span>
                <span className="text-[10px] text-slate-500">servings</span>
              </div>
            </div>
          </div>

          {/* Today's Meals Timeline */}
          <div className="card-panel p-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5 text-blue-400" />
              Today's Meal Orders ({todayMeals.length})
            </h3>
            {todayMeals.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">No meal requests scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {todayMeals.map(meal => (
                  <div key={meal.id} className="p-3 rounded bg-slate-900/60 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white block">{meal.eventName || 'Department Guest Catering'}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="text-sky-400 font-medium">{meal.department}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {meal.venue}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {meal.mealTypes?.map(mt => (
                        <span key={mt} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {mt.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Calendar */}
        <div className="space-y-6">
          <QuickCalendar 
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            events={requests.map(r => ({
              id: r.id,
              title: `${r.department}: ${r.eventName || r.eventTitle || 'Catering'} at ${r.venue || 'Campus'} (${r.totalGuests || r.guests || 20} guests)`,
              date: r.eventDate || r.date,
              status: r.status,
              department: r.department,
              type: 'meals'
            }))}
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Guest Meal & Catering Requests</h2>
            <p className="text-xs text-slate-400">Review combined event meal packages and dietary specifications</p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search event, dept, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-filter-input pl-8 w-48"
              />
            </div>

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

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="admin-filter-input"
            />
          </div>
        </div>

        {/* Table */}
        <div className="custom-table-container">
          <table className="custom-table w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Event & Dept</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Event Date</th>
                <th className="py-3 px-4">Selected Meals & Quantities</th>
                <th className="py-3 px-4">Dietary Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No meal requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-medium text-slate-300">
                      {req.requestId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white max-w-[170px] truncate">{req.eventName || req.eventTitle || 'Guest Food Arrangement'}</div>
                      <div className="text-[10px] text-slate-400">{req.department}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {req.venue}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {req.eventDate || req.date}
                    </td>
                    <td className="py-3 px-4 max-w-[220px]">
                      <div className="text-[11px] font-bold text-amber-400 font-mono mb-1">
                        Guests: {req.totalGuests || (req.mealItems && req.mealItems[0]?.guestCount) || (req.guestCounts ? Object.values(req.guestCounts)[0] : 20)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {req.mealTypes?.map(mt => (
                          <span key={mt} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {mt.replace('_', ' ')}
                            {req.guestCounts && req.guestCounts[mt] ? ` (${req.guestCounts[mt]})` : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[140px] truncate">
                      {req.dietaryRequirements || 'Standard'}
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
          title="Guest Meal Arrangement Details"
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
                <span className="text-xs text-slate-500 block">Event Date</span>
                <span className="font-medium text-white">{selectedRequest.eventDate || selectedRequest.date}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-500 block">Event / Purpose</span>
              <span className="text-base font-semibold text-white">{selectedRequest.eventName || selectedRequest.eventTitle || 'Institutional Hospitality'}</span>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Venue: <strong className="text-slate-200">{selectedRequest.venue}</strong>
              </p>
            </div>

            {/* Meal Items and Individual Counts */}
            <div>
              <span className="text-xs font-semibold text-white block mb-2">Selected Meal Packages & Headcounts</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedRequest.mealTypes?.map((mt) => {
                  const qty = selectedRequest.guestCounts?.[mt] || selectedRequest.totalGuests || 'N/A';
                  const time = selectedRequest.mealTimes?.[mt] || '';
                  return (
                    <div key={mt} className="p-2.5 rounded bg-slate-900/70 border border-slate-800 text-xs">
                      <span className="font-semibold text-white block uppercase text-[11px]">{mt.replace('_', ' ')}</span>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-slate-400">Headcount:</span>
                        <strong className="text-blue-400 font-mono">{qty}</strong>
                      </div>
                      {time && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Time: {time}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedRequest.dietaryRequirements && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Dietary Requirements</span>
                <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 text-xs">
                  {selectedRequest.dietaryRequirements}
                </p>
              </div>
            )}

            {selectedRequest.specialRequirements && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Special Requirements / Menu Notes</span>
                <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 text-xs">
                  {selectedRequest.specialRequirements}
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
                  Approve Catering Plan
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
                  id="btn-view-official-doc-meals"
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
          title="Reject Meal Request"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400 text-xs">
              Please provide a reason for declining this meal arrangement request.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Canteen kitchen fully booked for college annual day..."
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
