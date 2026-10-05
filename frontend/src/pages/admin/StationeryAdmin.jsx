import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  PackageCheck, 
  Eye, 
  RefreshCw, 
  Search, 
  Check, 
  X,
  Package,
  Layers,
  Send,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import QuickCalendar from '../../components/calendar/QuickCalendar';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { stationeryApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
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

export default function StationeryAdmin() {
  const [searchParams] = useSearchParams();
  const { addToast } = useNotifications();
  const [stats, setStats] = useState({ total: 0, pending: 0, ready: 0, collected: 0, approved: 0 });
  const [requests, setRequests] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(getTodayStr());

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Modals & Actions
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [docModalRequest, setDocModalRequest] = useState(null);
  const [adminCommentInput, setAdminCommentInput] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [reqsRes, itemsRes] = await Promise.all([
        stationeryApi.getRequests(),
        stationeryApi.getItems().catch(() => ({ data: [] })),
      ]);
      const reqList = reqsRes.data || [];
      setRequests(reqList);
      if (itemsRes?.data) setItems(itemsRes.data);

      const total = reqList.length;
      const pending = reqList.filter(r => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length;
      const approved = reqList.filter(r => r.status === 'APPROVED').length;
      const ready = reqList.filter(r => r.status === 'READY_FOR_COLLECTION').length;
      const collected = reqList.filter(r => r.status === 'COLLECTED').length;

      setStats({ total, pending, approved, ready, collected });
    } catch (err) {
      addToast(err.message || 'Failed to load stationery requests', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenProcessModal = (req) => {
    setSelectedRequest(req);
    setAdminCommentInput(req.adminComments || '');
  };

  const handleUnderReview = async (id) => {
    try {
      setActionLoading(true);
      await stationeryApi.markReview(id, adminCommentInput);
      addToast('Request status marked as UNDER REVIEW', 'info');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error updating request status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(true);
      await stationeryApi.approve(id, adminCommentInput);
      addToast('Stationery request approved successfully!', 'success');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async (id) => {
    try {
      setActionLoading(true);
      await stationeryApi.markReady(id, adminCommentInput);
      addToast('Stationery marked READY FOR COLLECTION', 'success');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error marking ready for collection', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCollected = async (id) => {
    try {
      setActionLoading(true);
      await stationeryApi.markCollected(id, adminCommentInput);
      addToast('Stationery marked as COLLECTED', 'success');
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error marking request as collected', 'error');
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
      await stationeryApi.reject(rejectId, rejectReason);
      addToast('Stationery request rejected.', 'info');
      setRejectModalOpen(false);
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error rejecting request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    const itemsList = req.itemsRequested || req.items || [];
    const itemNames = itemsList.map(i => (i.name || i.itemName || '')).join(' ').toLowerCase();
    const matchesSearch = 
      !q ||
      (req.department?.toLowerCase() || '').includes(q) ||
      (req.requestId?.toLowerCase() || '').includes(q) ||
      (req.purpose?.toLowerCase() || '').includes(q) ||
      (req.additionalNotes?.toLowerCase() || '').includes(q) ||
      (req.requestedBy?.toLowerCase() || '').includes(q) ||
      (req.requesterUserId?.toLowerCase() || '').includes(q) ||
      itemNames.includes(q);

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    const reqDate = formatDateDisplay(req.createdAt);
    const matchesDate = !dateFilter || reqDate === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getItemsSummary = (req) => {
    const items = req.itemsRequested || req.items || [];
    if (!items.length) return 'No items';
    return items.map(i => `${i.name || i.itemName} × ${i.quantity}`).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Stationery Requests</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Admin Portal
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review department stationery requests, approve requirements, and advance collection status.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-sm border border-slate-700/60 transition"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Requests"
          value={stats.total}
          icon={FileText}
          color="blue"
          trend="All submitted"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={Clock}
          color="amber"
          trend="Awaiting review"
        />
        <StatCard
          title="Ready for Collection"
          value={stats.ready}
          icon={PackageCheck}
          color="cyan"
          trend="Packed & ready"
        />
        <StatCard
          title="Completed / Collected"
          value={stats.collected}
          icon={CheckCircle}
          color="emerald"
          trend="Dispatched to depts"
        />
      </div>
      {/* Campus Calendar & Requisitions Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="card-panel p-5">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Stationery Request Workflow
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Departments submit requirements for academic and administrative operations. Admins review requisitions, authorize fulfillment, mark supplies ready for pickup, and record collection upon handover.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Pending/Review:</span>
                <span className="font-bold text-amber-400 font-mono text-sm">{stats.pending}</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Approved:</span>
                <span className="font-bold text-indigo-400 font-mono text-sm">{stats.approved}</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Ready:</span>
                <span className="font-bold text-sky-400 font-mono text-sm">{stats.ready}</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Collected:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{stats.collected}</span>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="card-panel p-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <PackageCheck className="w-3.5 h-3.5 text-sky-400" />
                Campus Cataloged Stationery ({items.length} items)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {items.slice(0, 8).map((it) => (
                  <div key={it.itemId || it.id} className="p-2 rounded bg-slate-900/50 border border-slate-800/80 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <div className="truncate">
                      <span className="font-medium text-slate-200 block truncate">{it.name}</span>
                      <span className="text-[10px] text-slate-500">{it.unit || 'Standard'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <QuickCalendar
            selectedDate={selectedCalendarDate}
            onSelectDate={(newDate) => setSelectedCalendarDate(newDate)}
            events={requests.map((r) => ({
              id: r.id || r.requestId,
              date: formatDateDisplay(r.createdAt),
              title: `${r.department} - ${r.purpose || 'Stationery'}`,
              status: r.status,
              department: r.department,
            }))}
          />
        </div>
      </div>

      {/* Requests Management Table */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Department Stationery Requests</h2>
            <p className="text-xs text-slate-400">Review submitted requirements and process approval lifecycle</p>
          </div>

          {/* Filter Bar */}
          <div className="admin-filter-bar flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ID, dept, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-filter-input pl-8 w-44"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-filter-input"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="READY_FOR_COLLECTION">Ready for Collection</option>
              <option value="COLLECTED">Collected</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="admin-filter-input"
              title="Filter by submitted date"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="btn btn-secondary btn-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="custom-table-container">
          <table className="custom-table w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Requested Items</th>
                <th className="py-3 px-4">Purpose / Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No stationery requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const itemsList = req.itemsRequested || req.items || [];
                  const totalUnits = itemsList.reduce((sum, i) => sum + (i.quantity || 0), 0);

                  return (
                    <tr key={req.id || req.requestId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {req.requestId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {req.department}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {formatDateDisplay(req.createdAt)}
                      </td>
                      <td className="py-3 px-4 max-w-[260px]">
                        <div className="truncate text-slate-200 font-medium">
                          {getItemsSummary(req)}
                        </div>
                        <div className="text-[10px] text-indigo-400 mt-0.5">
                          {totalUnits} items requested ({itemsList.length} unique)
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[160px] truncate">
                        {req.purpose || req.additionalNotes || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenProcessModal(req)}
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                            title="View & Process Request"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Process</span>
                          </button>

                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(req.requestId || req.id)}
                                disabled={actionLoading}
                                className="btn btn-success btn-sm flex items-center gap-1"
                                title="Approve Request"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleOpenReject(req.requestId || req.id)}
                                disabled={actionLoading}
                                className="btn btn-danger btn-sm flex items-center gap-1"
                                title="Reject Request"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {req.status === 'UNDER_REVIEW' && (
                            <button
                              onClick={() => handleApprove(req.requestId || req.id)}
                              disabled={actionLoading}
                              className="btn btn-success btn-sm flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                          )}

                          {req.status === 'APPROVED' && (
                            <button
                              onClick={() => handleMarkReady(req.requestId || req.id)}
                              disabled={actionLoading}
                              className="btn btn-primary btn-sm flex items-center gap-1"
                              title="Mark Ready for Collection"
                            >
                              <Package className="w-3 h-3" />
                              <span>Ready</span>
                            </button>
                          )}

                          {req.status === 'READY_FOR_COLLECTION' && (
                            <button
                              onClick={() => handleMarkCollected(req.requestId || req.id)}
                              disabled={actionLoading}
                              className="btn btn-success btn-sm flex items-center gap-1"
                              title="Mark as Collected"
                            >
                              <Check className="w-3 h-3" />
                              <span>Collected</span>
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

      {/* Details & Process Modal */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title="Process Stationery Request"
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
                <span className="text-xs text-slate-500 block">Submitted Date</span>
                <span className="text-slate-300">{formatDateDisplay(selectedRequest.createdAt)}</span>
              </div>
            </div>

            {/* Requested Items & Quantities */}
            <div>
              <span className="text-xs font-semibold text-white block mb-2">Requested Items & Quantities</span>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Item Name</th>
                      <th className="py-2 px-3">Unit</th>
                      <th className="py-2 px-3 text-right">Requested Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {(selectedRequest.itemsRequested || selectedRequest.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-white font-medium">{it.name || it.itemName}</td>
                        <td className="py-2 px-3 text-slate-400">{it.unit || 'units'}</td>
                        <td className="py-2 px-3 text-right font-mono text-indigo-400 font-bold">{it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-1">Purpose</span>
              <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 text-xs">
                {selectedRequest.purpose || 'Departmental Use'}
              </p>
            </div>

            {selectedRequest.additionalNotes && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Other Requirements / Notes</span>
                <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 text-xs">
                  {selectedRequest.additionalNotes}
                </p>
              </div>
            )}

            {selectedRequest.rejectionReason && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-900/60 text-xs">
                <span className="text-rose-400 font-semibold block mb-0.5">Rejection Reason:</span>
                <p className="text-slate-300">{selectedRequest.rejectionReason}</p>
              </div>
            )}

            {/* Admin Comments Field */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Admin Comments / Instructions</label>
              <textarea
                value={adminCommentInput}
                onChange={(e) => setAdminCommentInput(e.target.value)}
                placeholder="e.g. Items prepared in Store Room 102; ready for collection tomorrow."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-800">
              {selectedRequest.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleOpenReject(selectedRequest.requestId || selectedRequest.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-medium transition"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => handleUnderReview(selectedRequest.requestId || selectedRequest.id)}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition"
                  >
                    Mark Under Review
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest.requestId || selectedRequest.id)}
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md"
                  >
                    Approve Request
                  </button>
                </>
              )}

              {selectedRequest.status === 'UNDER_REVIEW' && (
                <>
                  <button
                    onClick={() => handleOpenReject(selectedRequest.requestId || selectedRequest.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-medium transition"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest.requestId || selectedRequest.id)}
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md"
                  >
                    Approve Request
                  </button>
                </>
              )}

              {selectedRequest.status === 'APPROVED' && (
                <button
                  onClick={() => handleMarkReady(selectedRequest.requestId || selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition shadow-md flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Mark Ready for Collection</span>
                </button>
              )}

              {selectedRequest.status === 'READY_FOR_COLLECTION' && (
                <button
                  onClick={() => handleMarkCollected(selectedRequest.requestId || selectedRequest.id)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark as Collected</span>
                </button>
              )}

              {(selectedRequest.status === 'APPROVED' || selectedRequest.status === 'READY_FOR_COLLECTION' || selectedRequest.status === 'COLLECTED') && (
                <button
                  onClick={() => {
                    const req = selectedRequest;
                    setSelectedRequest(null);
                    setDocModalRequest(req);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  id="btn-view-official-doc-sta"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Official Document & PDF</span>
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Stationery Request"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400 text-xs">
              Please provide a reason for declining this department stationery request.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Special order item currently unavailable; please consult administrative office."
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
