import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Search,
  Filter,
  RefreshCw,
  Eye,
  UserCheck,
  RotateCcw,
  Ban,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  User,
  Building2,
  Phone,
  ShieldAlert,
  Sparkles,
  Sliders,
  Calendar,
  ChevronRight,
  Layers,
  AlertCircle,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { electricalIssueApi, adminUserApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import '../../styles/ao-electrical-management.css';

const PRIORITY_STYLES = {
  LOW: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' },
  MEDIUM: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  HIGH: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  EMERGENCY: { bg: 'bg-rose-500/25', text: 'text-rose-300', border: 'border-rose-500/50 animate-pulse' },
};

const STATUS_STYLES = {
  UNASSIGNED: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40', label: 'Unassigned' },
  ASSIGNED: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', label: 'Assigned' },
  ACCEPTED: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30', label: 'Accepted' },
  IN_PROGRESS: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', label: 'In Progress' },
  REJECTED: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30', label: 'Rejected' },
  COMPLETED: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Completed' },
  REOPENED: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', label: 'Reopened' },
  CANCELLED: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Cancelled' },
};

export default function AOElectricalIssuesManagement() {
  const { addToast } = useNotifications();
  const { user, isAOAdmin } = useAuth();

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active Electricians list dynamically loaded from user management API
  const [electricians, setElectricians] = useState([]);
  const [electriciansLoading, setElectriciansLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [electricianFilter, setElectricianFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH

  // Modals & Action States
  const [detailModalIssue, setDetailModalIssue] = useState(null);

  // Assign / Reassign Modal
  const [assignModalIssue, setAssignModalIssue] = useState(null);
  const [selectedElectricianId, setSelectedElectricianId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Status Override Modal
  const [overrideModalIssue, setOverrideModalIssue] = useState(null);
  const [overrideTargetStatus, setOverrideTargetStatus] = useState('COMPLETED');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  // Cancel Issue Modal
  const [cancelModalIssue, setCancelModalIssue] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // 1. Fetch all electrical requests from backend
  const fetchAllIssues = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await electricalIssueApi.getAllRequests();
      const list = Array.isArray(res) ? res : res?.data && Array.isArray(res.data) ? res.data : [];
      setIssues(list);
    } catch (err) {
      console.error('Error fetching electrical issues:', err);
      addToast(err?.message || 'Failed to fetch electrical issues', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Fetch available active electricians from User Management API
  const fetchElectricians = async () => {
    setElectriciansLoading(true);
    try {
      const res = await adminUserApi.getUsers({ role: 'ELECTRICIAN', status: 'ACTIVE' });
      const rawList = Array.isArray(res) ? res : res?.data && Array.isArray(res.data) ? res.data : [];
      // Safe filter: active users with ELECTRICIAN role
      const validElectricians = rawList.filter(
        (u) => u.active !== false && Array.isArray(u.roles) && u.roles.includes('ELECTRICIAN')
      );
      setElectricians(validElectricians);
    } catch (err) {
      console.error('Error fetching electricians list:', err);
    } finally {
      setElectriciansLoading(false);
    }
  };

  useEffect(() => {
    fetchAllIssues();
    fetchElectricians();
  }, []);

  // Compute unique buildings list from data
  const availableBuildings = useMemo(() => {
    const set = new Set();
    issues.forEach((i) => {
      if (i.buildingName && i.buildingName.trim()) {
        set.add(i.buildingName.trim());
      }
    });
    return Array.from(set).sort();
  }, [issues]);

  // Compute unique categories list from data
  const availableCategories = useMemo(() => {
    const set = new Set();
    issues.forEach((i) => {
      if (i.issueCategory && i.issueCategory.trim()) {
        set.add(i.issueCategory.trim());
      }
    });
    return Array.from(set).sort();
  }, [issues]);

  // Summary KPI Metrics
  const kpiStats = useMemo(() => {
    const total = issues.length;
    const unassigned = issues.filter(
      (i) => !i.assignedElectricianId || i.status === 'UNASSIGNED' || i.status === 'PENDING'
    ).length;
    const assigned = issues.filter((i) => ['ASSIGNED', 'ACCEPTED'].includes(i.status)).length;
    const inProgress = issues.filter((i) => ['IN_PROGRESS', 'REOPENED'].includes(i.status)).length;
    const completed = issues.filter((i) => i.status === 'COMPLETED').length;
    const emergency = issues.filter((i) => i.priority === 'EMERGENCY').length;

    return { total, unassigned, assigned, inProgress, completed, emergency };
  }, [issues]);

  // Filtered Issues calculation
  const filteredIssues = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return issues.filter((issue) => {
      // 1. Status Filter
      if (statusFilter === 'UNASSIGNED') {
        const isUnassigned = !issue.assignedElectricianId || issue.status === 'UNASSIGNED';
        if (!isUnassigned) return false;
      } else if (statusFilter !== 'ALL' && issue.status !== statusFilter) {
        return false;
      }

      // 2. Priority Filter
      if (priorityFilter !== 'ALL' && issue.priority !== priorityFilter) {
        return false;
      }

      // 3. Building Filter
      if (buildingFilter !== 'ALL' && issue.buildingName !== buildingFilter) {
        return false;
      }

      // 4. Category Filter
      if (categoryFilter !== 'ALL' && issue.issueCategory !== categoryFilter) {
        return false;
      }

      // 5. Electrician Filter
      if (electricianFilter === 'UNASSIGNED') {
        if (issue.assignedElectricianId) return false;
      } else if (electricianFilter !== 'ALL') {
        if (issue.assignedElectricianId !== electricianFilter && issue.assignedElectricianName !== electricianFilter) {
          return false;
        }
      }

      // 6. Date Range Filter
      if (dateFilter !== 'ALL') {
        const reportedDate = issue.reportedAt || issue.createdAt;
        if (!reportedDate) return false;
        const dt = new Date(reportedDate);
        if (dateFilter === 'TODAY') {
          if (dt.toISOString().slice(0, 10) !== todayStr) return false;
        } else if (dateFilter === 'WEEK') {
          const diffDays = (now.getTime() - dt.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (dateFilter === 'MONTH') {
          const diffDays = (now.getTime() - dt.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }

      // 7. Search Query (Request ID, building, room, reporter, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = issue.requestId?.toLowerCase().includes(q);
        const matchBuilding = issue.buildingName?.toLowerCase().includes(q);
        const matchRoom = issue.roomNumber?.toLowerCase().includes(q);
        const matchReporter = issue.reportedByName?.toLowerCase().includes(q);
        const matchDept = issue.reportedByDepartment?.toLowerCase().includes(q);
        const matchDesc = issue.description?.toLowerCase().includes(q);
        const matchSpot = issue.specificLocation?.toLowerCase().includes(q);
        const matchElec = issue.assignedElectricianName?.toLowerCase().includes(q);

        if (
          !matchId &&
          !matchBuilding &&
          !matchRoom &&
          !matchReporter &&
          !matchDept &&
          !matchDesc &&
          !matchSpot &&
          !matchElec
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    issues,
    statusFilter,
    priorityFilter,
    buildingFilter,
    categoryFilter,
    electricianFilter,
    dateFilter,
    searchQuery,
  ]);

  // Open Reassign Modal
  const handleOpenAssign = (issue) => {
    setAssignModalIssue(issue);
    setSelectedElectricianId(issue.assignedElectricianId || (electricians[0]?.userId || ''));
    setAssignRemarks('');
    setAssignError('');
  };

  // Submit Reassignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignModalIssue) return;
    if (!selectedElectricianId) {
      setAssignError('Please select an active electrician');
      return;
    }

    setAssignSubmitting(true);
    setAssignError('');

    try {
      await electricalIssueApi.reassignElectrician(
        assignModalIssue.id,
        selectedElectricianId,
        assignRemarks.trim() || undefined
      );
      const chosenElectrician = electricians.find((e) => e.userId === selectedElectricianId);
      addToast(
        `Ticket ${assignModalIssue.requestId} assigned to ${chosenElectrician?.name || selectedElectricianId}`,
        'success'
      );
      setAssignModalIssue(null);
      fetchAllIssues();
    } catch (err) {
      console.error('Reassignment error:', err);
      setAssignError(err?.message || 'Failed to reassign electrician');
      addToast(err?.message || 'Failed to reassign electrician', 'error');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Open Override Modal
  const handleOpenOverride = (issue) => {
    setOverrideModalIssue(issue);
    setOverrideTargetStatus(issue.status === 'COMPLETED' ? 'REOPENED' : 'COMPLETED');
    setOverrideReason('');
    setOverrideError('');
  };

  // Submit Status Override
  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideModalIssue) return;
    if (!overrideReason || overrideReason.trim().length < 5) {
      setOverrideError('An audit reason of at least 5 characters is required for status override');
      return;
    }

    setOverrideSubmitting(true);
    setOverrideError('');

    try {
      await electricalIssueApi.overrideStatus(
        overrideModalIssue.id,
        overrideTargetStatus,
        overrideReason.trim()
      );
      addToast(
        `Status for ${overrideModalIssue.requestId} administratively overridden to ${overrideTargetStatus}`,
        'success'
      );
      setOverrideModalIssue(null);
      fetchAllIssues();
    } catch (err) {
      console.error('Status override error:', err);
      setOverrideError(err?.message || 'Failed to override status');
      addToast(err?.message || 'Failed to override status', 'error');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancel = (issue) => {
    setCancelModalIssue(issue);
    setCancelReason('');
    setCancelError('');
  };

  // Submit Cancellation
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelModalIssue) return;
    if (!cancelReason || cancelReason.trim().length < 5) {
      setCancelError('Cancellation reason of at least 5 characters is required');
      return;
    }

    setCancelSubmitting(true);
    setCancelError('');

    try {
      await electricalIssueApi.cancelRequest(cancelModalIssue.id, cancelReason.trim());
      addToast(`Ticket ${cancelModalIssue.requestId} cancelled successfully`, 'info');
      setCancelModalIssue(null);
      fetchAllIssues();
    } catch (err) {
      console.error('Cancellation error:', err);
      setCancelError(err?.message || 'Failed to cancel issue');
      addToast(err?.message || 'Failed to cancel issue', 'error');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Strict role check: AO_ADMIN required
  if (!isAOAdmin) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3 bg-slate-900/60 rounded-xl border border-slate-800">
        <ShieldAlert className="w-10 h-10 mx-auto text-amber-500" />
        <h3 className="text-base font-bold text-white">Administrative Access Required</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Campus Electrical Issue Governance is restricted to authorized AO Admin accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="ao-elec-container">
      {/* Section Header */}
      <div className="ao-elec-header p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/30 border border-amber-500/20 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Campus Electrical Issue Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AO ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Universal monitoring, ticket allocation, electrician reassignment, and administrative audit governance across all college facilities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => fetchAllIssues(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (6 Cards) */}
      <div className="ao-elec-stat-grid">
        <StatCard
          title="Total Issues"
          value={kpiStats.total}
          subtitle="All recorded tickets"
          icon={Layers}
          color="blue"
        />
        <StatCard
          title="Unassigned"
          value={kpiStats.unassigned}
          subtitle="Requires allocation"
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title="Assigned"
          value={kpiStats.assigned}
          subtitle="Dispatched to tech"
          icon={UserCheck}
          color="indigo"
        />
        <StatCard
          title="In Progress"
          value={kpiStats.inProgress}
          subtitle="Repair under way"
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Completed"
          value={kpiStats.completed}
          subtitle="Successfully repaired"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Emergency Priority"
          value={kpiStats.emergency}
          subtitle="Immediate hazard cases"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="ao-elec-filter-card">
        {/* Top Search & Filter Dropdowns Grid */}
        <div className="ao-elec-filter-grid">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Request ID, building, room, reporter, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ao-elec-filter-input pl-8"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="ao-elec-filter-select"
          >
            <option value="ALL">All Priorities</option>
            <option value="EMERGENCY">Emergency Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Building Filter */}
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="ao-elec-filter-select"
          >
            <option value="ALL">All Buildings</option>
            {availableBuildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="ao-elec-filter-select"
          >
            <option value="ALL">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Assigned Electrician Filter */}
          <select
            value={electricianFilter}
            onChange={(e) => setElectricianFilter(e.target.value)}
            className="ao-elec-filter-select"
          >
            <option value="ALL">All Electricians</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {electricians.map((el) => (
              <option key={el.userId} value={el.userId}>
                {el.name} ({el.userId})
              </option>
            ))}
          </select>
        </div>

        {/* Status Quick Pills & Date Range */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="ao-elec-status-pills">
            {[
              { id: 'ALL', label: 'All Status' },
              { id: 'UNASSIGNED', label: 'Unassigned', isSpecial: 'pill-unassigned' },
              { id: 'ASSIGNED', label: 'Assigned' },
              { id: 'ACCEPTED', label: 'Accepted' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'REOPENED', label: 'Reopened' },
              { id: 'REJECTED', label: 'Rejected' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`ao-elec-status-pill ${
                  statusFilter === st.id ? `active ${st.isSpecial || ''}` : ''
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 text-xs">
            <span className="text-slate-400 font-medium">Period:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="ao-elec-filter-select text-xs py-1"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Past 7 Days</option>
              <option value="MONTH">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-900/50 rounded-xl border border-slate-800">
            <RefreshCw className="w-7 h-7 mx-auto animate-spin text-amber-400" />
            <p className="text-xs">Loading campus electrical tickets...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-xl border border-slate-800">
            <Zap className="w-8 h-8 mx-auto text-slate-600" />
            <h3 className="font-semibold text-slate-300 text-sm">No electrical issues found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No electrical issue tickets match your current search and filter settings.
            </p>
          </div>
        ) : (
          <div className="ao-elec-tickets-grid">
            {filteredIssues.map((issue) => {
              const pri = PRIORITY_STYLES[issue.priority] || PRIORITY_STYLES.MEDIUM;
              const sta = STATUS_STYLES[issue.status] || {
                bg: 'bg-slate-800',
                text: 'text-slate-300',
                border: 'border-slate-700',
                label: issue.status,
              };
              const isUnassigned = !issue.assignedElectricianId || issue.status === 'UNASSIGNED';
              const isEmergency = issue.priority === 'EMERGENCY';
              const isTerminal = issue.status === 'CANCELLED' || issue.status === 'COMPLETED';

              return (
                <div
                  key={issue.id}
                  className={`ao-elec-ticket-card ${isEmergency ? 'is-emergency' : ''} ${
                    isUnassigned ? 'is-unassigned' : ''
                  }`}
                >
                  {/* Card Top: Request ID & Badges */}
                  <div className="ao-elec-card-top">
                    <div className="ao-elec-card-badges">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                        {issue.requestId}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${pri.bg} ${pri.text} ${pri.border}`}>
                        {issue.priority}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {issue.issueCategory}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${sta.bg} ${sta.text} ${sta.border}`}>
                        {sta.label}
                      </span>
                      {isUnassigned && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          ACTION REQUIRED: UNASSIGNED
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Reported: <strong className="text-slate-300">{new Date(issue.reportedAt || issue.createdAt).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div>
                    <div className="ao-elec-card-location">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {issue.buildingName} — {issue.floor}
                        {issue.roomNumber ? `, Room ${issue.roomNumber}` : ''}
                      </span>
                      <span className="text-xs font-normal text-slate-400">
                        ({issue.locationType})
                      </span>
                    </div>
                    <p className="ao-elec-card-spot mt-0.5 pl-5">
                      Exact Spot: <strong className="text-slate-200">{issue.specificLocation}</strong>
                    </p>
                  </div>

                  {/* Description Box */}
                  <div className="ao-elec-card-desc">
                    <p className="line-clamp-2">{issue.description}</p>
                  </div>

                  {/* Meta Details Grid */}
                  <div className="ao-elec-card-meta">
                    <div>
                      Reporter: <strong className="text-slate-200">{issue.reportedByName || 'Technician'}</strong>
                      {issue.reportedByDepartment && (
                        <span className="text-slate-400"> ({issue.reportedByDepartment})</span>
                      )}
                    </div>
                    <div>
                      Electrician: {issue.assignedElectricianName ? (
                        <strong className="text-slate-200">
                          {issue.assignedElectricianName}
                          {issue.assignedElectricianPhone ? ` (${issue.assignedElectricianPhone})` : ''}
                        </strong>
                      ) : (
                        <strong className="text-amber-400 italic">Unassigned</strong>
                      )}
                    </div>
                    <div>
                      {issue.resolutionRemarks ? (
                        <span className="text-emerald-300 truncate block">
                          Resolved: {issue.resolutionRemarks}
                        </span>
                      ) : issue.rejectionReason ? (
                        <span className="text-rose-300 truncate block">
                          Rejected: {issue.rejectionReason}
                        </span>
                      ) : issue.workRemarks ? (
                        <span className="text-slate-300 truncate block">
                          Latest: {issue.workRemarks}
                        </span>
                      ) : (
                        <span className="text-slate-500">Status: {issue.status}</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="ao-elec-card-actions">
                    <button
                      type="button"
                      onClick={() => setDetailModalIssue(issue)}
                      className="ao-elec-btn-action ao-elec-btn-details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details & History</span>
                    </button>

                    {!isTerminal && (
                      <button
                        type="button"
                        onClick={() => handleOpenAssign(issue)}
                        className="ao-elec-btn-action ao-elec-btn-assign"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{issue.assignedElectricianId ? 'Reassign Electrician' : 'Assign Electrician'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenOverride(issue)}
                      className="ao-elec-btn-action ao-elec-btn-override"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Override Status</span>
                    </button>

                    {!isTerminal && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancel(issue)}
                        className="ao-elec-btn-action ao-elec-btn-cancel"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Issue</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          1. DETAILS & STATUS HISTORY MODAL
          ======================================================== */}
      <Modal
        isOpen={Boolean(detailModalIssue)}
        onClose={() => setDetailModalIssue(null)}
        title={detailModalIssue ? `Issue Details — ${detailModalIssue.requestId}` : 'Ticket Details'}
        maxWidth="750px"
      >
        {detailModalIssue && (
          <div className="space-y-5 text-slate-200">
            {/* Header Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    {detailModalIssue.requestId}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                      PRIORITY_STYLES[detailModalIssue.priority]?.bg || 'bg-slate-800'
                    } ${
                      PRIORITY_STYLES[detailModalIssue.priority]?.text || 'text-slate-300'
                    } ${
                      PRIORITY_STYLES[detailModalIssue.priority]?.border || 'border-slate-700'
                    }`}
                  >
                    {detailModalIssue.priority} PRIORITY
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                      STATUS_STYLES[detailModalIssue.status]?.bg || 'bg-slate-800'
                    } ${
                      STATUS_STYLES[detailModalIssue.status]?.text || 'text-slate-300'
                    } ${
                      STATUS_STYLES[detailModalIssue.status]?.border || 'border-slate-700'
                    }`}
                  >
                    {STATUS_STYLES[detailModalIssue.status]?.label || detailModalIssue.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Category: <strong className="text-slate-200">{detailModalIssue.issueCategory}</strong>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400">
                <div>
                  Reported: <strong className="text-slate-300">{new Date(detailModalIssue.reportedAt || detailModalIssue.createdAt).toLocaleString()}</strong>
                </div>
                {detailModalIssue.completedAt && (
                  <div>
                    Completed: <strong className="text-emerald-400">{new Date(detailModalIssue.completedAt).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Location Details */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Location Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                <div>Zone / Type: <strong>{detailModalIssue.locationType}</strong></div>
                <div>Building: <strong>{detailModalIssue.buildingName}</strong></div>
                <div>Floor: <strong>{detailModalIssue.floor}</strong></div>
                <div>Room: <strong>{detailModalIssue.roomNumber || 'N/A'}</strong></div>
              </div>
              <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                Exact Spot: <strong className="text-white">{detailModalIssue.specificLocation}</strong>
              </div>
            </div>

            {/* Reporter Information */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Reported By
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300">
                <div>Name: <strong className="text-white">{detailModalIssue.reportedByName || 'Technician'}</strong></div>
                <div>Department: <strong className="text-white">{detailModalIssue.reportedByDepartment || 'N/A'}</strong></div>
                <div>Phone: <strong className="text-white">{detailModalIssue.reportedByPhone || 'N/A'}</strong></div>
              </div>
            </div>

            {/* Problem Description & Photo */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Problem Description
              </h4>
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed">
                {detailModalIssue.description}
              </p>
              {detailModalIssue.photoUrl && (
                <div className="mt-2">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Attached Photo:</span>
                  <img
                    src={detailModalIssue.photoUrl}
                    alt="Electrical fault issue"
                    className="max-h-56 rounded-lg border border-slate-800 object-cover"
                  />
                </div>
              )}
            </div>

            {/* Assigned Electrician */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                Assigned Electrician
              </h4>
              {detailModalIssue.assignedElectricianName ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-white font-medium">
                    {detailModalIssue.assignedElectricianName} ({detailModalIssue.assignedElectricianId})
                  </div>
                  {detailModalIssue.assignedElectricianPhone && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{detailModalIssue.assignedElectricianPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-amber-400 italic">No electrician currently allocated.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const target = detailModalIssue;
                      setDetailModalIssue(null);
                      handleOpenAssign(target);
                    }}
                    className="ao-elec-btn-action ao-elec-btn-assign text-xs"
                  >
                    Assign Now
                  </button>
                </div>
              )}
            </div>

            {/* Remarks / Reasons Section */}
            {(detailModalIssue.rejectionReason ||
              detailModalIssue.acceptanceRemarks ||
              detailModalIssue.workRemarks ||
              detailModalIssue.resolutionRemarks ||
              detailModalIssue.reopenReason ||
              detailModalIssue.overrideReason ||
              detailModalIssue.cancellationReason) && (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Logged Remarks & Reasons
                </h4>
                {detailModalIssue.rejectionReason && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-500/30 text-red-300">
                    <strong>Rejection Reason:</strong> {detailModalIssue.rejectionReason}
                  </div>
                )}
                {detailModalIssue.acceptanceRemarks && (
                  <div className="p-2.5 rounded bg-blue-950/40 border border-blue-500/30 text-blue-300">
                    <strong>Acceptance Remarks:</strong> {detailModalIssue.acceptanceRemarks}
                  </div>
                )}
                {detailModalIssue.workRemarks && (
                  <div className="p-2.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300">
                    <strong>Work Progress Remarks:</strong> {detailModalIssue.workRemarks}
                  </div>
                )}
                {detailModalIssue.resolutionRemarks && (
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    <strong>Resolution Remarks:</strong> {detailModalIssue.resolutionRemarks}
                  </div>
                )}
                {detailModalIssue.reopenReason && (
                  <div className="p-2.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300">
                    <strong>Reopen Reason:</strong> {detailModalIssue.reopenReason}
                  </div>
                )}
                {detailModalIssue.overrideReason && (
                  <div className="p-2.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-200">
                    <strong>Admin Override Reason:</strong> {detailModalIssue.overrideReason}
                    {detailModalIssue.overrideBy && ` (by ${detailModalIssue.overrideBy})`}
                  </div>
                )}
                {detailModalIssue.cancellationReason && (
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    <strong>Cancellation Reason:</strong> {detailModalIssue.cancellationReason}
                    {detailModalIssue.cancelledBy && ` (by ${detailModalIssue.cancelledBy})`}
                  </div>
                )}
              </div>
            )}

            {/* Status History Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Complete Status History & Audit Trail
              </h4>
              {detailModalIssue.statusHistory && detailModalIssue.statusHistory.length > 0 ? (
                <div className="relative pl-6 space-y-4 border-l-2 border-slate-800 ml-2">
                  {detailModalIssue.statusHistory.map((step, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-slate-900" />
                      <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                              STATUS_STYLES[step.status]?.bg || 'bg-slate-800'
                            } ${
                              STATUS_STYLES[step.status]?.text || 'text-slate-300'
                            } ${
                              STATUS_STYLES[step.status]?.border || 'border-slate-700'
                            }`}
                          >
                            {step.status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(step.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Actor: <strong className="text-slate-300">{step.changedByName || step.changedByUserId || 'System'}</strong> ({step.changedByRole || 'SYSTEM'})
                        </div>
                        {step.remarks && (
                          <p className="text-xs text-slate-300 italic pt-1 border-t border-slate-900">
                            "{step.remarks}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No historical changes logged yet.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDetailModalIssue(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          2. ASSIGN / REASSIGN ELECTRICIAN MODAL
          ======================================================== */}
      <Modal
        isOpen={Boolean(assignModalIssue)}
        onClose={() => {
          if (!assignSubmitting) setAssignModalIssue(null);
        }}
        title={`Assign Electrician — ${assignModalIssue?.requestId || ''}`}
        maxWidth="500px"
      >
        {assignModalIssue && (
          <form onSubmit={handleAssignSubmit} className="ao-elec-modal-form">
            <div className="ao-elec-alert-banner ao-elec-alert-info">
              <UserCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Electrician Ticket Allocation</p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Allocate this ticket to an active campus electrician. The electrician will receive an immediate assignment notification.
                </p>
              </div>
            </div>

            <div>
              <label className="ao-elec-modal-label">
                Current Assignee
              </label>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                {assignModalIssue.assignedElectricianName ? (
                  <span>
                    <strong>{assignModalIssue.assignedElectricianName}</strong> ({assignModalIssue.assignedElectricianId})
                  </span>
                ) : (
                  <span className="text-amber-400 italic">Currently Unassigned</span>
                )}
              </div>
            </div>

            <div>
              <label className="ao-elec-modal-label">
                Select Active Electrician <span className="text-red-400">*</span>
              </label>
              {electriciansLoading ? (
                <div className="text-xs text-slate-400 py-2">Loading electricians...</div>
              ) : electricians.length === 0 ? (
                <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-xs text-red-300">
                  No active electrician users found in system. Please register an Electrician in User Management first.
                </div>
              ) : (
                <select
                  value={selectedElectricianId}
                  onChange={(e) => {
                    setSelectedElectricianId(e.target.value);
                    if (assignError) setAssignError('');
                  }}
                  className="ao-elec-filter-select"
                >
                  <option value="" disabled>Choose an active electrician...</option>
                  {electricians.map((el) => (
                    <option key={el.userId} value={el.userId}>
                      {el.name} ({el.userId}) — {el.phone || el.email || 'Electrician'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="ao-elec-modal-label">
                Assignment Remarks (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="E.g., High priority laboratory panel issue, please attend immediately..."
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                className="ao-elec-modal-textarea"
              />
            </div>

            {assignError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {assignError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssignModalIssue(null)}
                disabled={assignSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assignSubmitting || !selectedElectricianId || electricians.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-amber-600/20 disabled:opacity-50"
              >
                {assignSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================
          3. ADMINISTRATIVE STATUS OVERRIDE MODAL
          ======================================================== */}
      <Modal
        isOpen={Boolean(overrideModalIssue)}
        onClose={() => {
          if (!overrideSubmitting) setOverrideModalIssue(null);
        }}
        title={`Status Override — ${overrideModalIssue?.requestId || ''}`}
        maxWidth="500px"
      >
        {overrideModalIssue && (
          <form onSubmit={handleOverrideSubmit} className="ao-elec-modal-form">
            <div className="ao-elec-alert-banner ao-elec-alert-warning">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Super Admin Status Override</p>
                <p className="text-amber-200 text-xs mt-0.5">
                  Administrative overrides bypass regular ticket state machines for exceptional dispute resolution. This action is permanently logged in the audit trail.
                </p>
              </div>
            </div>

            <div>
              <label className="ao-elec-modal-label">
                Target Status <span className="text-red-400">*</span>
              </label>
              <select
                value={overrideTargetStatus}
                onChange={(e) => setOverrideTargetStatus(e.target.value)}
                className="ao-elec-filter-select"
              >
                <option value="ASSIGNED">ASSIGNED (Dispatch to electrician)</option>
                <option value="ACCEPTED">ACCEPTED (Acknowledge work)</option>
                <option value="IN_PROGRESS">IN_PROGRESS (Under repair)</option>
                <option value="COMPLETED">COMPLETED (Mark resolved)</option>
                <option value="REOPENED">REOPENED (Reopen for rework)</option>
                <option value="REJECTED">REJECTED (Decline ticket)</option>
                <option value="CANCELLED">CANCELLED (Cancel ticket)</option>
              </select>
            </div>

            <div>
              <label className="ao-elec-modal-label">
                Mandatory Audit Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="State the institutional reason for administratively overriding this ticket status (minimum 5 characters)..."
                value={overrideReason}
                onChange={(e) => {
                  setOverrideReason(e.target.value);
                  if (overrideError) setOverrideError('');
                }}
                className="ao-elec-modal-textarea"
              />
              <div className="text-[11px] text-slate-500 text-right mt-1">
                {overrideReason.length} / 1000 characters (min 5)
              </div>
            </div>

            {overrideError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {overrideError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setOverrideModalIssue(null)}
                disabled={overrideSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={overrideSubmitting || !overrideReason || overrideReason.trim().length < 5}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-purple-600/20 disabled:opacity-50"
              >
                {overrideSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Status Override</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================
          4. CANCEL ISSUE MODAL
          ======================================================== */}
      <Modal
        isOpen={Boolean(cancelModalIssue)}
        onClose={() => {
          if (!cancelSubmitting) setCancelModalIssue(null);
        }}
        title={`Cancel Ticket — ${cancelModalIssue?.requestId || ''}`}
        maxWidth="500px"
      >
        {cancelModalIssue && (
          <form onSubmit={handleCancelSubmit} className="ao-elec-modal-form">
            <div className="ao-elec-alert-banner ao-elec-alert-danger">
              <Ban className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cancel Electrical Issue</p>
                <p className="text-rose-200 text-xs mt-0.5">
                  Cancelling this request permanently halts further repair workflow. A cancellation reason must be provided for institutional transparency.
                </p>
              </div>
            </div>

            <div>
              <label className="ao-elec-modal-label">
                Cancellation Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="State why this ticket is being cancelled (minimum 5 characters)..."
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  if (cancelError) setCancelError('');
                }}
                className="ao-elec-modal-textarea"
              />
              <div className="text-[11px] text-slate-500 text-right mt-1">
                {cancelReason.length} / 1000 characters (min 5)
              </div>
            </div>

            {cancelError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {cancelError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalIssue(null)}
                disabled={cancelSubmitting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={cancelSubmitting || !cancelReason || cancelReason.trim().length < 5}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {cancelSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

