import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Check,
  Eye,
  Building,
  MapPin,
  User,
  Phone,
  MessageSquare,
  FileText,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { electricalIssueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { formatDateDisplay } from '../../utils/dateUtils';
import '../../styles/electrician-dashboard.css';

export default function ElectricianDashboard() {
  const { user } = useAuth();
  const { addToast } = useNotifications();

  // Primary Data State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Consequential Action Modals
  const [activeTicket, setActiveTicket] = useState(null);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Form Inputs for Actions
  const [remarksText, setRemarksText] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [rejectionText, setRejectionText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Fetch Assigned Tickets from Backend
  const fetchAssignedTickets = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setFetchError(null);

      const res = await electricalIssueApi.getAssignedRequests();
      if (res?.success && Array.isArray(res.data)) {
        setTickets(res.data);
      } else if (res?.data?.success && Array.isArray(res.data.data)) {
        setTickets(res.data.data);
      } else if (Array.isArray(res?.data)) {
        setTickets(res.data);
      } else if (Array.isArray(res)) {
        setTickets(res);
      } else {
        setTickets([]);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to load assigned electrical issues.';
      setFetchError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAssignedTickets();
  }, [fetchAssignedTickets]);

  // Summary Metrics Computation
  const stats = useMemo(() => {
    const total = tickets.length;
    const pendingAcceptance = tickets.filter(
      (t) => t.status === 'ASSIGNED' || t.status === 'REOPENED'
    ).length;
    const inProgress = tickets.filter(
      (t) => t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED'
    ).length;
    const completed = tickets.filter((t) => t.status === 'COMPLETED').length;

    return { total, pendingAcceptance, inProgress, completed };
  }, [tickets]);

  // Filtered & Searched Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (ticket.status !== statusFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = ticket.requestId?.toLowerCase().includes(q);
        const matchesBuilding = ticket.buildingName?.toLowerCase().includes(q);
        const matchesRoom = ticket.roomNumber?.toLowerCase().includes(q);
        const matchesLocation = ticket.specificLocation?.toLowerCase().includes(q);
        const matchesCategory = ticket.issueCategory?.toLowerCase().includes(q);
        const matchesDesc = ticket.description?.toLowerCase().includes(q);
        const matchesReporter = ticket.reportedByName?.toLowerCase().includes(q);

        return (
          matchesId ||
          matchesBuilding ||
          matchesRoom ||
          matchesLocation ||
          matchesCategory ||
          matchesDesc ||
          matchesReporter
        );
      }

      return true;
    });
  }, [tickets, statusFilter, searchQuery]);

  // Action Triggers
  const openAcceptModal = (ticket) => {
    setActiveTicket(ticket);
    setActionError('');
    setAcceptModalOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!activeTicket) return;
    setActionLoading(true);
    setActionError('');
    try {
      const id = activeTicket.id || activeTicket._id || activeTicket.requestId;
      const res = await electricalIssueApi.acceptRequest(id);
      const isSuccess = res?.success === true || res?.data?.success === true;
      if (isSuccess) {
        addToast(`Issue ${activeTicket.requestId} accepted successfully.`, 'success');
        setAcceptModalOpen(false);
        setActiveTicket(null);
        await fetchAssignedTickets(true);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to accept ticket');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openStartModal = (ticket) => {
    setActiveTicket(ticket);
    setActionError('');
    setStartModalOpen(true);
  };

  const handleConfirmStart = async () => {
    if (!activeTicket) return;
    setActionLoading(true);
    setActionError('');
    try {
      const id = activeTicket.id || activeTicket._id || activeTicket.requestId;
      const res = await electricalIssueApi.startRepair(id);
      const isSuccess = res?.success === true || res?.data?.success === true;
      if (isSuccess) {
        addToast(`Repair work commenced for ${activeTicket.requestId}.`, 'success');
        setStartModalOpen(false);
        setActiveTicket(null);
        await fetchAssignedTickets(true);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to start repair');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRemarksModal = (ticket) => {
    setActiveTicket(ticket);
    setRemarksText(ticket.workRemarks || '');
    setActionError('');
    setRemarksModalOpen(true);
  };

  const handleSaveRemarks = async () => {
    if (!activeTicket) return;
    if (!remarksText.trim()) {
      setActionError('Remarks cannot be empty.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const id = activeTicket.id || activeTicket._id || activeTicket.requestId;
      const res = await electricalIssueApi.updateRemarks(id, remarksText.trim());
      const isSuccess = res?.success === true || res?.data?.success === true;
      if (isSuccess) {
        addToast('Work remarks updated successfully.', 'success');
        setRemarksModalOpen(false);
        setActiveTicket(null);
        await fetchAssignedTickets(true);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to update remarks');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openCompleteModal = (ticket) => {
    setActiveTicket(ticket);
    setResolutionText('');
    setActionError('');
    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!activeTicket) return;
    if (!resolutionText.trim() || resolutionText.trim().length < 5) {
      setActionError('Resolution remarks are required (minimum 5 characters).');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const id = activeTicket.id || activeTicket._id || activeTicket.requestId;
      const res = await electricalIssueApi.completeRequest(id, resolutionText.trim());
      const isSuccess = res?.success === true || res?.data?.success === true;
      if (isSuccess) {
        addToast(`Issue ${activeTicket.requestId} marked completed.`, 'success');
        setCompleteModalOpen(false);
        setActiveTicket(null);
        await fetchAssignedTickets(true);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to complete ticket');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (ticket) => {
    setActiveTicket(ticket);
    setRejectionText('');
    setActionError('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!activeTicket) return;
    if (!rejectionText.trim() || rejectionText.trim().length < 5) {
      setActionError('A valid rejection reason is mandatory (minimum 5 characters).');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const id = activeTicket.id || activeTicket._id || activeTicket.requestId;
      const res = await electricalIssueApi.rejectRequest(id, rejectionText.trim());
      const isSuccess = res?.success === true || res?.data?.success === true;
      if (isSuccess) {
        addToast(`Issue ${activeTicket.requestId} rejected.`, 'success');
        setRejectModalOpen(false);
        setActiveTicket(null);
        await fetchAssignedTickets(true);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to reject ticket');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
    setDetailModalOpen(true);
  };

  // Helper Renderer for Priority
  const renderPriorityBadge = (priority) => {
    const p = (priority || 'LOW').toUpperCase();
    let badgeClass = 'elec-priority-low';
    if (p === 'EMERGENCY') badgeClass = 'elec-priority-emergency';
    else if (p === 'HIGH') badgeClass = 'elec-priority-high';
    else if (p === 'MEDIUM') badgeClass = 'elec-priority-medium';

    return (
      <span className={`elec-priority-badge ${badgeClass}`}>
        <AlertTriangle size={12} />
        {p}
      </span>
    );
  };

  // Helper Renderer for Status
  const renderStatusBadge = (status) => {
    const s = (status || 'ASSIGNED').toUpperCase();
    let badgeClass = 'elec-status-assigned';
    if (s === 'ACCEPTED') badgeClass = 'elec-status-accepted';
    else if (s === 'IN_PROGRESS') badgeClass = 'elec-status-in_progress';
    else if (s === 'COMPLETED') badgeClass = 'elec-status-completed';
    else if (s === 'REJECTED') badgeClass = 'elec-status-rejected';
    else if (s === 'REOPENED') badgeClass = 'elec-status-reopened';

    return (
      <span className={`elec-status-badge ${badgeClass}`}>
        {s === 'IN_PROGRESS' ? 'IN PROGRESS' : s}
      </span>
    );
  };

  return (
    <div className="elec-container">
      {/* Page Header */}
      <div className="elec-header">
        <div className="elec-header-info">
          <div className="elec-header-title-row">
            <h1 className="elec-title">
              <Zap size={28} className="text-amber-400" />
              Campus Electrical Dashboard
            </h1>
            <span className="elec-role-badge">
              <User size={13} />
              {user?.name || 'Electrician'}
            </span>
          </div>
          <p className="elec-subtitle">
            Manage, service, and resolve campus-wide electrical breakdown and maintenance tickets.
          </p>
        </div>

        <div className="elec-header-actions">
          <button
            onClick={() => fetchAssignedTickets(true)}
            disabled={refreshing || loading}
            className="elec-refresh-btn"
            title="Refresh tickets"
          >
            <RefreshCw size={16} className={refreshing ? 'spin-animation' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="elec-stats-grid">
        <StatCard
          icon={Layers}
          title="Total Assigned"
          value={stats.total}
          subtitle="All lifetime tickets assigned"
          color="blue"
        />
        <StatCard
          icon={Clock}
          title="Pending Acceptance"
          value={stats.pendingAcceptance}
          subtitle="Assigned & Reopened tickets"
          color="purple"
        />
        <StatCard
          icon={Zap}
          title="In Progress"
          value={stats.inProgress}
          subtitle="Active repair work underway"
          color="amber"
        />
        <StatCard
          icon={CheckCircle2}
          title="Completed"
          value={stats.completed}
          subtitle="Successfully resolved tickets"
          color="emerald"
        />
      </div>

      {/* Search and Filter Controls */}
      <div className="elec-controls-card">
        <div className="elec-search-wrapper">
          <Search size={18} className="elec-search-icon" />
          <input
            type="text"
            placeholder="Search by ID, building, room, issue, or reporter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="elec-search-input"
          />
        </div>

        <div className="elec-filter-tabs">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'ASSIGNED', label: 'Assigned' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`elec-filter-btn ${statusFilter === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area: Loading, Error, Empty, or Tickets List */}
      {loading ? (
        <div className="elec-state-card">
          <div className="elec-state-icon bg-blue-500/10 text-blue-400">
            <RefreshCw size={28} className="spin-animation" />
          </div>
          <h3 className="elec-state-title">Loading Assigned Tickets...</h3>
          <p className="elec-state-desc">Fetching electrical maintenance work orders from server.</p>
        </div>
      ) : fetchError ? (
        <div className="elec-state-card">
          <div className="elec-state-icon bg-red-500/10 text-red-400">
            <AlertCircle size={28} />
          </div>
          <h3 className="elec-state-title">Failed to Load Tickets</h3>
          <p className="elec-state-desc">{fetchError}</p>
          <button onClick={() => fetchAssignedTickets()} className="btn-action-primary">
            Retry
          </button>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="elec-state-card">
          <div className="elec-state-icon bg-slate-800 text-slate-400">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="elec-state-title">No Electrical Issues Found</h3>
          <p className="elec-state-desc">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No tickets match your search filters.'
              : 'You have no tickets currently assigned in this category.'}
          </p>
        </div>
      ) : (
        <div className="elec-tickets-grid">
          {filteredTickets.map((ticket) => {
            const isAssignedOrReopened = ticket.status === 'ASSIGNED' || ticket.status === 'REOPENED';
            const isAccepted = ticket.status === 'ACCEPTED';
            const isInProgress = ticket.status === 'IN_PROGRESS';
            const isCompleted = ticket.status === 'COMPLETED';

            return (
              <div key={ticket.id || ticket.requestId} className="elec-ticket-card">
                {/* Header: ID, Priority, Status, Date */}
                <div className="elec-ticket-header">
                  <div className="elec-ticket-id-row">
                    <span className="elec-ticket-id">{ticket.requestId}</span>
                    {renderPriorityBadge(ticket.priority)}
                    {renderStatusBadge(ticket.status)}
                  </div>
                  <div className="elec-ticket-date">
                    <Clock size={13} />
                    {ticket.createdAt ? formatDateDisplay(ticket.createdAt) : '-'}
                  </div>
                </div>

                {/* Body: Location, Category, Description */}
                <div className="elec-ticket-body">
                  <div className="elec-location-row">
                    <Building size={16} className="text-sky-400" />
                    <span>{ticket.buildingName}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">{ticket.floor}</span>
                    {ticket.roomNumber && (
                      <>
                        <span className="text-slate-500">•</span>
                        <span className="text-amber-400 font-mono text-sm">Room {ticket.roomNumber}</span>
                      </>
                    )}
                  </div>

                  <div className="elec-category-tag">
                    <Zap size={13} className="text-amber-400" />
                    <span>{ticket.issueCategory}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">{ticket.specificLocation}</span>
                  </div>

                  <p className="elec-description-text">{ticket.description}</p>

                  {/* Previous Work Remarks if any */}
                  {ticket.workRemarks && (
                    <div className="elec-remarks-box">
                      <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Remarks:</strong> {ticket.workRemarks}
                      </span>
                    </div>
                  )}

                  {/* Resolution remarks if completed */}
                  {ticket.resolutionRemarks && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm flex items-start gap-2">
                      <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Resolution:</strong> {ticket.resolutionRemarks}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer: Reporter details & Actions */}
                <div className="elec-ticket-footer">
                  <div className="elec-reporter-info">
                    <User size={14} />
                    <span>
                      Reported by: <strong>{ticket.reportedByName || 'Technician'}</strong>
                      {ticket.reportedByDepartment ? ` (${ticket.reportedByDepartment})` : ''}
                    </span>
                    {ticket.reportedByPhone && (
                      <span className="text-slate-400 flex items-center gap-1 ml-2">
                        <Phone size={12} />
                        {ticket.reportedByPhone}
                      </span>
                    )}
                  </div>

                  <div className="elec-action-buttons">
                    <button
                      onClick={() => openTicketDetails(ticket)}
                      className="btn-action-secondary"
                      title="View complete ticket timeline"
                    >
                      <Eye size={14} />
                      Details
                    </button>

                    {/* Consequential action buttons conditioned on strict status */}
                    {isAssignedOrReopened && (
                      <>
                        <button
                          onClick={() => openAcceptModal(ticket)}
                          className="btn-action-primary"
                        >
                          <Check size={14} />
                          Accept Ticket
                        </button>
                        <button
                          onClick={() => openRejectModal(ticket)}
                          className="btn-action-danger"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <>
                        <button
                          onClick={() => openStartModal(ticket)}
                          className="btn-action-primary"
                        >
                          <Play size={14} />
                          Start Repair
                        </button>
                        <button
                          onClick={() => openRemarksModal(ticket)}
                          className="btn-action-secondary"
                        >
                          <MessageSquare size={14} />
                          Remarks
                        </button>
                        <button
                          onClick={() => openRejectModal(ticket)}
                          className="btn-action-danger"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </>
                    )}

                    {isInProgress && (
                      <>
                        <button
                          onClick={() => openCompleteModal(ticket)}
                          className="btn-action-success"
                        >
                          <CheckCircle2 size={14} />
                          Complete Repair
                        </button>
                        <button
                          onClick={() => openRemarksModal(ticket)}
                          className="btn-action-warning"
                        >
                          <MessageSquare size={14} />
                          Update Remarks
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TICKET DETAILS MODAL                                             */}
      {/* ========================================================================= */}
      {selectedTicket && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Ticket Details — ${selectedTicket.requestId}`}
          maxWidth="680px"
        >
          <div className="elec-modal-content">
            <div className="elec-meta-grid">
              <div>
                <span className="elec-modal-label">Location</span>
                <p className="elec-modal-val font-semibold">
                  {selectedTicket.buildingName}, {selectedTicket.floor}
                  {selectedTicket.roomNumber ? ` (Room ${selectedTicket.roomNumber})` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-1">{selectedTicket.specificLocation}</p>
              </div>

              <div>
                <span className="elec-modal-label">Category & Priority</span>
                <div className="flex items-center gap-2 mt-1">
                  {renderPriorityBadge(selectedTicket.priority)}
                  {renderStatusBadge(selectedTicket.status)}
                </div>
                <p className="text-xs text-slate-300 mt-1 font-medium">{selectedTicket.issueCategory}</p>
              </div>

              <div>
                <span className="elec-modal-label">Reported By</span>
                <p className="elec-modal-val">{selectedTicket.reportedByName || 'Technician'}</p>
                <p className="text-xs text-slate-400">
                  {selectedTicket.reportedByDepartment} • {selectedTicket.reportedByPhone || 'No phone'}
                </p>
              </div>

              <div>
                <span className="elec-modal-label">Timeline Details</span>
                <p className="text-xs text-slate-300">
                  Created: {selectedTicket.createdAt ? formatDateDisplay(selectedTicket.createdAt) : '-'}
                </p>
                {selectedTicket.acceptedAt && (
                  <p className="text-xs text-purple-300">
                    Accepted: {formatDateDisplay(selectedTicket.acceptedAt)}
                  </p>
                )}
                {selectedTicket.startedAt && (
                  <p className="text-xs text-amber-300">
                    Started: {formatDateDisplay(selectedTicket.startedAt)}
                  </p>
                )}
                {selectedTicket.completedAt && (
                  <p className="text-xs text-emerald-300">
                    Completed: {formatDateDisplay(selectedTicket.completedAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="elec-modal-section">
              <span className="elec-modal-label">Issue Description</span>
              <p className="elec-description-text">{selectedTicket.description}</p>
            </div>

            {selectedTicket.photoUrl && (
              <div className="elec-modal-section">
                <span className="elec-modal-label">Attached Photo</span>
                <div className="mt-1 max-w-sm rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                  <img
                    src={selectedTicket.photoUrl}
                    alt="Electrical Issue Evidence"
                    className="w-full h-auto object-cover max-h-60"
                  />
                </div>
              </div>
            )}

            {selectedTicket.workRemarks && (
              <div className="elec-modal-section">
                <span className="elec-modal-label">Latest Work Remarks</span>
                <p className="elec-remarks-box">{selectedTicket.workRemarks}</p>
              </div>
            )}

            {selectedTicket.resolutionRemarks && (
              <div className="elec-modal-section">
                <span className="elec-modal-label">Final Resolution Remarks</span>
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm">
                  {selectedTicket.resolutionRemarks}
                </div>
              </div>
            )}

            {selectedTicket.rejectionReason && (
              <div className="elec-modal-section">
                <span className="elec-modal-label">Rejection Reason</span>
                <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  {selectedTicket.rejectionReason}
                </div>
              </div>
            )}

            {/* Audit Status History Timeline */}
            <div className="elec-modal-section">
              <span className="elec-modal-label">Lifecycle Audit History</span>
              {selectedTicket.statusHistory && selectedTicket.statusHistory.length > 0 ? (
                <div className="elec-timeline-list mt-2">
                  {selectedTicket.statusHistory.map((item, idx) => (
                    <div key={idx} className="elec-timeline-item">
                      <div className="flex items-center justify-between">
                        <span className="elec-timeline-status">{item.status}</span>
                        <span className="elec-timeline-meta">
                          {item.timestamp ? formatDateDisplay(item.timestamp) : ''}
                        </span>
                      </div>
                      <p className="elec-timeline-comment">{item.comments || item.comment || '-'}</p>
                      <span className="text-[11px] text-slate-500">
                        Actor: {item.updatedBy || item.actor || 'System'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No timeline entries recorded.</p>
              )}
            </div>

            <div className="elec-modal-footer">
              <button onClick={() => setDetailModalOpen(false)} className="btn-action-secondary">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM ACCEPT TICKET                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={acceptModalOpen}
        onClose={() => !actionLoading && setAcceptModalOpen(false)}
        title="Acknowledge & Accept Ticket"
      >
        <div className="elec-modal-content">
          <p className="text-slate-300 text-sm leading-relaxed">
            Are you sure you want to accept ticket <strong>{activeTicket?.requestId}</strong> for repair?
            This will mark the ticket as <strong>ACCEPTED</strong> and notify the reporting technician that you
            have scheduled inspection.
          </p>

          {actionError && (
            <div className="elec-error-banner">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          <div className="elec-modal-footer">
            <button
              onClick={() => setAcceptModalOpen(false)}
              disabled={actionLoading}
              className="btn-action-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAccept}
              disabled={actionLoading}
              className="btn-action-primary"
            >
              {actionLoading ? 'Accepting...' : 'Yes, Accept Ticket'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIRM START REPAIR                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={startModalOpen}
        onClose={() => !actionLoading && setStartModalOpen(false)}
        title="Start On-Site Repair Work"
      >
        <div className="elec-modal-content">
          <p className="text-slate-300 text-sm leading-relaxed">
            Begin repair work on <strong>{activeTicket?.requestId}</strong> at {activeTicket?.buildingName} (
            {activeTicket?.specificLocation})? This will transition status to <strong>IN PROGRESS</strong>.
          </p>

          {actionError && (
            <div className="elec-error-banner">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          <div className="elec-modal-footer">
            <button
              onClick={() => setStartModalOpen(false)}
              disabled={actionLoading}
              className="btn-action-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmStart}
              disabled={actionLoading}
              className="btn-action-primary"
            >
              {actionLoading ? 'Starting...' : 'Commence Repair'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: UPDATE WORK REMARKS                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={remarksModalOpen}
        onClose={() => !actionLoading && setRemarksModalOpen(false)}
        title="Update Work Progress Remarks"
      >
        <div className="elec-modal-content">
          <p className="text-xs text-slate-400">
            Document interim progress or parts inspection notes for <strong>{activeTicket?.requestId}</strong>.
          </p>

          <textarea
            className="elec-modal-textarea"
            placeholder="e.g. Disconnected main breaker, replacing thermal wiring harness..."
            value={remarksText}
            onChange={(e) => {
              setRemarksText(e.target.value);
              if (actionError) setActionError('');
            }}
            maxLength={2000}
            disabled={actionLoading}
          />
          <span className="elec-char-count">{remarksText.length} / 2000</span>

          {actionError && (
            <div className="elec-error-banner">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          <div className="elec-modal-footer">
            <button
              onClick={() => setRemarksModalOpen(false)}
              disabled={actionLoading}
              className="btn-action-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRemarks}
              disabled={actionLoading}
              className="btn-action-primary"
            >
              {actionLoading ? 'Saving...' : 'Save Remarks'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: COMPLETE REPAIR WORK                                             */}
      {/* ========================================================================= */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => !actionLoading && setCompleteModalOpen(false)}
        title="Complete Electrical Issue Ticket"
      >
        <div className="elec-modal-content">
          <p className="text-xs text-slate-400">
            Provide comprehensive resolution remarks before closing ticket <strong>{activeTicket?.requestId}</strong>.
            This information will be displayed to the reporting technician and logged permanently in the college service registry.
          </p>

          <textarea
            className="elec-modal-textarea"
            placeholder="Describe the fix implemented (e.g. Replaced faulty 15A socket, tightened grounding busbar, load tested with projector)..."
            value={resolutionText}
            onChange={(e) => {
              setResolutionText(e.target.value);
              if (actionError) setActionError('');
            }}
            maxLength={2000}
            disabled={actionLoading}
            rows={4}
          />
          <div className="flex justify-between items-center text-xs mt-1">
            <span className={resolutionText.trim().length < 5 ? "text-amber-400 font-medium" : "text-emerald-400 font-medium"}>
              {resolutionText.trim().length < 5 ? 'Minimum 5 characters required' : '✓ Character requirement met'}
            </span>
            <span className="elec-char-count">{resolutionText.length} / 2000</span>
          </div>

          {actionError && (
            <div className="elec-error-banner">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          <div className="elec-modal-footer">
            <button
              onClick={() => setCompleteModalOpen(false)}
              disabled={actionLoading}
              className="btn-action-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmComplete}
              disabled={actionLoading}
              className="btn-action-success"
            >
              {actionLoading ? 'Completing...' : 'Mark as Completed'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: REJECT TICKET                                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => !actionLoading && setRejectModalOpen(false)}
        title="Reject Electrical Issue Ticket"
      >
        <div className="elec-modal-content">
          <p className="text-xs text-slate-400">
            Specify the reason for rejecting ticket <strong>{activeTicket?.requestId}</strong> (e.g. duplicate submission,
            non-electrical item, already resolved). The reporter will be notified.
          </p>

          <textarea
            className="elec-modal-textarea"
            placeholder="Reason for rejection..."
            value={rejectionText}
            onChange={(e) => {
              setRejectionText(e.target.value);
              if (actionError) setActionError('');
            }}
            maxLength={1000}
            disabled={actionLoading}
            rows={3}
          />
          <div className="flex justify-between items-center text-xs mt-1">
            <span className={rejectionText.trim().length < 5 ? "text-amber-400 font-medium" : "text-emerald-400 font-medium"}>
              {rejectionText.trim().length < 5 ? 'Minimum 5 characters required' : '✓ Character requirement met'}
            </span>
            <span className="elec-char-count">{rejectionText.length} / 1000</span>
          </div>

          {actionError && (
            <div className="elec-error-banner">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          <div className="elec-modal-footer">
            <button
              onClick={() => setRejectModalOpen(false)}
              disabled={actionLoading}
              className="btn-action-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReject}
              disabled={actionLoading}
              className="btn-action-danger"
            >
              {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

