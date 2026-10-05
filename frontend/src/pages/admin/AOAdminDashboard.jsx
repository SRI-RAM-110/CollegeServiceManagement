import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Home, 
  Truck, 
  FileText, 
  Utensils, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Search, 
  Eye, 
  Check, 
  X,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar as CalendarIcon,
  CalendarDays,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Plus,
  Megaphone
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { COLLEGE_LOGO } from '../../constants/branding';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import QuickCalendar from '../../components/calendar/QuickCalendar';
import AnnouncementsCard from '../../components/common/AnnouncementsCard';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { 
  dashboardApi, 
  requestsApi, 
  seminarApi, 
  accommodationApi, 
  transportApi, 
  stationeryApi, 
  mealsApi,
  announcementApi 
} from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { getTodayStr } from '../../utils/dateUtils';

export default function AOAdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useNotifications();
  const [dashboardData, setDashboardData] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [calendarDate, setCalendarDate] = useState(getTodayStr());
  const [distributionTab, setDistributionTab] = useState('SERVICE');
  const [upcomingServiceFilter, setUpcomingServiceFilter] = useState('ALL');

  // Announcement modal & state
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementKey, setAnnouncementKey] = useState(0);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'NOTICE',
    date: getTodayStr(),
    audience: 'COLLEGE_WIDE',
    department: 'CSE',
  });
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  // Filters
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Modals & Action states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [docModalRequest, setDocModalRequest] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAOData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const [dashRes, reqsRes] = await Promise.all([
        dashboardApi.getStats(),
        requestsApi.getAllRequests(),
      ]);

      setDashboardData(dashRes.data || {});
      setAllRequests(reqsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load AO Dashboard data');
      addToast(err.message || 'Failed to load AO Dashboard data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAOData();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    if (e) e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      addToast('Title and content are required for announcement', 'error');
      return;
    }
    try {
      setAnnouncementLoading(true);
      await announcementApi.create({
        title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
        type: announcementForm.type || 'NOTICE',
        date: announcementForm.date || getTodayStr(),
        audience: announcementForm.audience || 'COLLEGE_WIDE',
        department: announcementForm.audience === 'DEPARTMENT' ? announcementForm.department : null,
      });
      addToast(
        announcementForm.audience === 'DEPARTMENT'
          ? `Announcement published to ${announcementForm.department} department!`
          : 'Announcement published successfully to entire campus!',
        'success'
      );
      setAnnouncementModalOpen(false);
      setAnnouncementForm({
        title: '',
        content: '',
        type: 'NOTICE',
        date: getTodayStr(),
        audience: 'COLLEGE_WIDE',
        department: 'CSE',
      });
      setAnnouncementKey(prev => prev + 1);
    } catch (err) {
      addToast(err.message || 'Failed to create announcement', 'error');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // Super Admin universal approval handler
  const handleApprove = async (req) => {
    try {
      setActionLoading(true);
      const s = (req.service || '').toLowerCase();
      if (s.includes('seminar')) {
        await seminarApi.approve(req.id);
      } else if (s.includes('accommodation')) {
        await accommodationApi.approve(req.id);
      } else if (s.includes('transport')) {
        await transportApi.approve(req.id);
      } else if (s.includes('stationery')) {
        await stationeryApi.approve(req.id);
      } else if (s.includes('meal') || s.includes('snack')) {
        await mealsApi.approve(req.id);
      }
      addToast(`${req.service} request approved successfully!`, 'success');
      setSelectedRequest(null);
      fetchAOData();
    } catch (err) {
      addToast(err.message || 'Error approving request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (req) => {
    setRejectTarget(req);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    try {
      setActionLoading(true);
      const s = (rejectTarget.service || '').toLowerCase();
      if (s.includes('seminar')) {
        await seminarApi.reject(rejectTarget.id, rejectReason);
      } else if (s.includes('accommodation')) {
        await accommodationApi.reject(rejectTarget.id, rejectReason);
      } else if (s.includes('transport')) {
        await transportApi.reject(rejectTarget.id, rejectReason);
      } else if (s.includes('stationery')) {
        await stationeryApi.reject(rejectTarget.id, rejectReason);
      } else if (s.includes('meal') || s.includes('snack')) {
        await mealsApi.reject(rejectTarget.id, rejectReason);
      }
      addToast(`${rejectTarget.service} request rejected.`, 'info');
      setRejectModalOpen(false);
      setSelectedRequest(null);
      fetchAOData();
    } catch (err) {
      addToast(err.message || 'Error rejecting request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = allRequests.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      (req.requestId?.toLowerCase() || '').includes(q) ||
      (req.department?.toLowerCase() || '').includes(q) ||
      (req.details?.toLowerCase() || '').includes(q) ||
      (req.service?.toLowerCase() || '').includes(q) ||
      (req.requestedBy?.toLowerCase() || '').includes(q) ||
      (req.requesterUserId?.toLowerCase() || '').includes(q) ||
      (req.status?.toLowerCase() || '').includes(q);

    const matchesService = serviceFilter === 'ALL' || req.service === serviceFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    return matchesSearch && matchesService && matchesStatus;
  });

  const getServiceIcon = (service) => {
    const s = (service || '').toLowerCase();
    if (s.includes('seminar')) return Building2;
    if (s.includes('accommodation')) return Home;
    if (s.includes('transport')) return Truck;
    if (s.includes('stationery')) return FileText;
    return Utensils;
  };

  // Aggregated stats from dashboardData or computed from list
  const total = dashboardData?.totalRequests ?? allRequests.length;
  const pending = dashboardData?.pending ?? allRequests.filter(r => r.status === 'PENDING').length;
  const approved = dashboardData?.approved ?? allRequests.filter(r => r.status === 'APPROVED' || r.status === 'BOOKED').length;
  const rejected = dashboardData?.rejected ?? allRequests.filter(r => r.status === 'REJECTED').length;
  const completed = dashboardData?.completed ?? allRequests.filter(r => r.status === 'COMPLETED' || r.status === 'COLLECTED').length;

  const byService = dashboardData?.byService || dashboardData?.requestsByService || {
    'Seminar Hall': allRequests.filter(r => r.service === 'Seminar Hall').length,
    'Accommodation': allRequests.filter(r => r.service === 'Accommodation').length,
    'Transport': allRequests.filter(r => r.service === 'Transport').length,
    'Stationery': allRequests.filter(r => r.service === 'Stationery').length,
    'Snacks & Meals': allRequests.filter(r => r.service === 'Snacks & Meals').length,
  };

  const pendingByService = dashboardData?.pendingByService || {
    'Seminar Hall': allRequests.filter(r => r.service === 'Seminar Hall' && r.status === 'PENDING').length,
    'Accommodation': allRequests.filter(r => r.service === 'Accommodation' && r.status === 'PENDING').length,
    'Transport': allRequests.filter(r => r.service === 'Transport' && r.status === 'PENDING').length,
    'Stationery': allRequests.filter(r => r.service === 'Stationery' && r.status === 'PENDING').length,
    'Snacks & Meals': allRequests.filter(r => r.service === 'Snacks & Meals' && r.status === 'PENDING').length,
  };

  const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'ME', 'CIVIL', 'AI', 'MBA', 'PHARM'];
  const byDepartment = dashboardData?.byDepartment || dashboardData?.requestsByDepartment || (() => {
    const map = {};
    DEPARTMENTS.forEach(d => {
      map[d] = allRequests.filter(r => r.department === d).length;
    });
    return map;
  })();

  const AO_SERVICE_FILTERS = [
    { key: 'ALL', label: 'All' },
    { key: 'SEMINAR', label: 'Seminar' },
    { key: 'ACCOMMODATION', label: 'Accommodation' },
    { key: 'STATIONERY', label: 'Stationery' },
    { key: 'MEALS', label: 'Meals' },
    { key: 'TRANSPORT', label: 'Transport' },
  ];

  const getUpcomingEmptyMessage = (filterKey) => {
    switch (filterKey) {
      case 'SEMINAR':
        return 'No upcoming Seminar events found.';
      case 'ACCOMMODATION':
        return 'No upcoming Accommodation events found.';
      case 'STATIONERY':
        return 'No upcoming Stationery events found.';
      case 'MEALS':
        return 'No upcoming Meals events found.';
      case 'TRANSPORT':
        return 'No upcoming Transport events found.';
      default:
        return 'No upcoming events found.';
    }
  };

  const filteredUpcomingEvents = (
    dashboardData?.upcomingEvents ||
    allRequests.filter(r => r.status === 'APPROVED' || r.status === 'PENDING')
  ).filter((item) => {
    if (upcomingServiceFilter === 'ALL') return true;
    if (item.serviceCategory) {
      return item.serviceCategory.toUpperCase() === upcomingServiceFilter;
    }
    const s = (item.service || '').toLowerCase();
    if (upcomingServiceFilter === 'SEMINAR') return s.includes('seminar');
    if (upcomingServiceFilter === 'ACCOMMODATION') return s.includes('accommodation');
    if (upcomingServiceFilter === 'STATIONERY') return s.includes('stationery');
    if (upcomingServiceFilter === 'MEALS') return s.includes('meal') || s.includes('snack');
    if (upcomingServiceFilter === 'TRANSPORT') return s.includes('transport');
    return true;
  });

  if (refreshing && !dashboardData) {
    return (
      <div className="card-panel py-16 text-center text-slate-400">
        <div className="empty-state-branded">
          <img src={COLLEGE_LOGO} alt="NEC Logo" className="empty-state-logo pulse-subtle" style={{ objectFit: 'contain' }} />
          <span>Loading Administrative Officer Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="card-panel p-8 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-rose-400">
          <AlertCircle size={20} />
          <span className="font-semibold text-sm">Unable to load AO Dashboard</span>
        </div>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={fetchAOData}
          className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
        >
          <RefreshCw size={13} />
          <span>Retry Loading AO Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="ao-header-logo-circle w-12 h-12 rounded-full bg-white p-1 border-2 border-white/40 shadow-[0_0_16px_rgba(37,99,235,0.30)] flex-shrink-0 flex items-center justify-center overflow-hidden">
            <img src={COLLEGE_LOGO} alt="NEC College Logo" className="ao-header-logo w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Administrative Officer Dashboard</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Super Admin
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Complete institutional governance, cross-service requisitions, and analytics for Narasaraopet Engineering College.
            </p>
          </div>
        </div>
        <button
          onClick={fetchAOData}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-sm border border-slate-700/60 transition"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total College Requests"
          value={total}
          icon={TrendingUp}
          color="blue"
          trend="All 5 Services"
        />
        <StatCard
          title="Pending Approval"
          value={pending}
          icon={Clock}
          color="amber"
          trend="Action required"
        />
        <StatCard
          title="Approved Requests"
          value={approved}
          icon={CheckCircle}
          color="emerald"
          trend="Confirmed / Booked"
        />
        <StatCard
          title="Rejected Requests"
          value={rejected}
          icon={XCircle}
          color="rose"
          trend="Declined"
        />
      </div>

      {/* Service Statistics Cards (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { name: 'Seminar Hall', icon: Building2, color: 'text-blue-400', border: 'hover:border-blue-500/40', route: '/admin/seminar' },
          { name: 'Accommodation', icon: Home, color: 'text-emerald-400', border: 'hover:border-emerald-500/40', route: '/admin/accommodation' },
          { name: 'Transport', icon: Truck, color: 'text-amber-400', border: 'hover:border-amber-500/40', route: '/admin/transport' },
          { name: 'Stationery', icon: FileText, color: 'text-indigo-400', border: 'hover:border-indigo-500/40', route: '/admin/stationery' },
          { name: 'Snacks & Meals', icon: Utensils, color: 'text-sky-400', border: 'hover:border-sky-500/40', route: '/admin/meals' },
        ].map((srv) => {
          const count = byService[srv.name] || 0;
          const pend = pendingByService[srv.name] || 0;
          const Icon = srv.icon;
          return (
            <div
              key={srv.name}
              onClick={() => navigate(srv.route)}
              className="card-panel p-4 cursor-pointer transition group hover:border-blue-500/40"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${srv.color}`} />
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
              </div>
              <h4 className="text-xs font-semibold text-slate-300 group-hover:text-white transition">{srv.name}</h4>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-bold font-mono text-white">{count}</span>
                {pend > 0 ? (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {pend} pending
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">0 pending</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Service Volume Breakdown & Quick Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Service / Department Volume Breakdown */}
        <div className="lg:col-span-2 card-panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-blue-400" />
                Requests Distribution
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {distributionTab === 'SERVICE' ? 'Proportional demand across facilities and campus resources' : 'Requisition distribution across academic departments'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDistributionTab('SERVICE')}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition ${distributionTab === 'SERVICE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  By Service
                </button>
                <button
                  type="button"
                  onClick={() => setDistributionTab('DEPARTMENT')}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition ${distributionTab === 'DEPARTMENT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  By Department
                </button>
              </div>
              <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                Total: <strong className="text-white">{total}</strong>
              </span>
            </div>
          </div>

          {distributionTab === 'SERVICE' ? (
            <div className="space-y-3.5 pt-1">
              {Object.entries(byService).map(([svcName, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const barColor = 
                  svcName === 'Seminar Hall' ? 'bg-blue-500' :
                  svcName === 'Accommodation' ? 'bg-emerald-500' :
                  svcName === 'Transport' ? 'bg-amber-500' :
                  svcName === 'Stationery' ? 'bg-indigo-500' : 'bg-sky-500';

                return (
                  <div key={svcName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{svcName}</span>
                      <span className="text-slate-400">
                        <strong className="text-white font-mono">{count}</strong> requests ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 progress-fill ${barColor}`}
                        style={{ '--progress-width': `${Math.max(pct, total === 0 ? 0 : 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {total === 0 && (
                <div className="text-xs text-slate-500 py-1">
                  Zero departmental requests recorded in database.
                </div>
              )}
              {DEPARTMENTS.map((dept) => {
                const count = byDepartment[dept] || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{dept}</span>
                      <span className="text-slate-400">
                        <strong className="text-white font-mono">{count}</strong> requests ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full rounded-full transition-all duration-700 bg-blue-500"
                        style={{ width: `${Math.max(pct, total === 0 ? 0 : 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Super Admin Quick Actions */}
        <div className="card-panel p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800/60">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Administrative Controls
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Quick navigation & direct super admin intervention</p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/admin/seminar')}
              className="w-full p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left text-xs flex items-center justify-between text-slate-300 hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Seminar Hall Scheduling</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => navigate('/admin/accommodation')}
              className="w-full p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left text-xs flex items-center justify-between text-slate-300 hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Hostel & Guest Rooms</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => navigate('/admin/transport')}
              className="w-full p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left text-xs flex items-center justify-between text-slate-300 hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <span>Vehicle Fleet Dispatches</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => navigate('/admin/stationery')}
              className="w-full p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left text-xs flex items-center justify-between text-slate-300 hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Stationery Requests</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={() => navigate('/admin/meals')}
              className="w-full p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left text-xs flex items-center justify-between text-slate-300 hover:text-white transition"
            >
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-sky-400" />
                <span>Hospitality & Meal Catering</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Campus Calendar Section across All Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Campus Notices</span>
            <button
              onClick={() => setAnnouncementModalOpen(true)}
              className="btn btn-primary btn-sm flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Post Notice</span>
            </button>
          </div>

          <AnnouncementsCard key={announcementKey} title="Institutional Announcements" />

          {/* Upcoming Events / Bookings Section with Service Filters */}
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-400" />
                Upcoming Events & Bookings
              </h3>
              <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                Active: <strong className="text-white">{filteredUpcomingEvents.length}</strong>
              </span>
            </div>

            {/* Service Filters */}
            <div className="tabs-container" style={{ marginBottom: '12px' }}>
              {AO_SERVICE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setUpcomingServiceFilter(f.key)}
                  className={`btn tab-pill-btn ${upcomingServiceFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="custom-table-container">
              <table className="custom-table w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Details</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcomingEvents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-500">
                        {getUpcomingEmptyMessage(upcomingServiceFilter)}
                      </td>
                    </tr>
                  ) : (
                    filteredUpcomingEvents.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-300">{item.date}</td>
                        <td className="py-2.5 px-3 font-medium text-white">{item.service}</td>
                        <td className="py-2.5 px-3 text-slate-300">{item.department}</td>
                        <td className="py-2.5 px-3 text-slate-300 truncate max-w-[200px]">{item.details}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={item.status} /></td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedRequest(item)}
                            className="btn btn-secondary btn-sm p-1"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-panel p-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              Campus Operations Calendar
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consolidated institutional calendar mapping active bookings, academic conferences, guest room occupancy, bus routes, catering schedules, and store requisitions.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Scheduled Activities:</span>
              <span className="font-bold text-white font-mono">{allRequests.length}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Pending Actions:</span>
              <span className="font-bold text-amber-400 font-mono">{pending}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <QuickCalendar
            selectedDate={calendarDate}
            onSelectDate={(newDate) => setCalendarDate(newDate)}
            events={allRequests.map((r) => ({
              id: r.id || r.requestId,
              date: r.date || r.tripDate || r.eventDate || r.checkInDate || (typeof r.createdAt === 'string' ? r.createdAt.substring(0, 10) : getTodayStr()),
              title: `${r.service || 'Service'}: ${r.details || r.purpose || r.eventName || r.eventTitle || r.destination || 'Campus Activity'}`,
              status: r.status,
              department: r.department,
            }))}
          />
        </div>
      </div>

      {/* Bottom Section: All Requests Master Table */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Master Requests Register</h2>
            <p className="text-xs text-slate-400">Universal log of all faculty requests with direct Super Admin override authority</p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ID, dept, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="admin-filter-input pl-8 w-48"
              />
            </div>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="admin-filter-input"
            >
              <option value="ALL">All Services</option>
              <option value="Seminar Hall">Seminar Hall</option>
              <option value="Accommodation">Accommodation</option>
              <option value="Transport">Transport</option>
              <option value="Stationery">Stationery</option>
              <option value="Snacks & Meals">Snacks & Meals</option>
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

        {/* Master Table */}
        <div className="custom-table-container">
          <table className="custom-table w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Details / Event</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Super Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No requests found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const SvcIcon = getServiceIcon(req.service);
                  return (
                    <tr key={req.id || req.requestId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {req.requestId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 border border-slate-700/80 text-white">
                          <SvcIcon className="w-3 h-3 text-blue-400" />
                          {req.service}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {req.department}
                      </td>
                      <td className="py-3 px-4 text-slate-200 max-w-[220px] truncate">
                        {req.details || 'No details provided'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {req.date || req.createdAt?.split('T')[0] || '—'}
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
                                onClick={() => handleApprove(req)}
                                disabled={actionLoading}
                                className="btn btn-success btn-sm flex items-center gap-1"
                                title="Approve Request"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleOpenReject(req)}
                                disabled={actionLoading}
                                className="btn btn-danger btn-sm flex items-center gap-1"
                                title="Reject Request"
                              >
                                <X className="w-3 h-3" />
                                <span>Reject</span>
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
          title={`${selectedRequest.service} Request Details`}
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
                <span className="text-xs text-slate-500 block">Service Facility</span>
                <span className="font-medium text-blue-400">{selectedRequest.service}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-1">Details / Specification</span>
              <p className="text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 text-xs">
                {selectedRequest.details || 'No additional details.'}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Date: <strong className="text-slate-200">{selectedRequest.date || 'N/A'}</strong></span>
              <span>Requested By: <strong className="text-slate-200">{selectedRequest.requestedBy || 'Faculty'}</strong></span>
            </div>

            {selectedRequest.status === 'PENDING' && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleOpenReject(selectedRequest)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-medium transition"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md"
                >
                  Approve as AO Super Admin
                </button>
              </div>
            )}

            {(selectedRequest.status === 'APPROVED' || selectedRequest.status === 'BOOKED' || selectedRequest.status === 'READY_FOR_COLLECTION' || selectedRequest.status === 'COLLECTED') && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    const req = selectedRequest;
                    setSelectedRequest(null);
                    setDocModalRequest(req);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  id="btn-view-official-doc-ao"
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
          title="Reject Request (Super Admin)"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400 text-xs">
              Please provide a reason for declining this request.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incompatible with college academic schedule..."
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

      {/* Create Announcement Modal */}
      {announcementModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setAnnouncementModalOpen(false)}
          title="Publish Campus Announcement"
        >
          <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-sm text-slate-300">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Notice Title</label>
              <input
                type="text"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Annual Technical Symposium Notice"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Notice Type</label>
                <select
                  value={announcementForm.type}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="NOTICE">General Notice</option>
                  <option value="EVENT">Campus Event</option>
                  <option value="MAINTENANCE">Maintenance Alert</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Display Date</label>
                <input
                  type="date"
                  value={announcementForm.date}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Audience</label>
                <select
                  value={announcementForm.audience}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, audience: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="COLLEGE_WIDE">College-Wide (All Users)</option>
                  <option value="DEPARTMENT">Department Specific</option>
                </select>
              </div>

              {announcementForm.audience === 'DEPARTMENT' ? (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Department</label>
                  <select
                    value={announcementForm.department}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center text-xs text-slate-400 pt-5">
                  <span>Broadcast to all campus departments</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Announcement Message / Content</label>
              <textarea
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter details of the circular or notification..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAnnouncementModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={announcementLoading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-md flex items-center gap-1.5"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>{announcementLoading ? 'Publishing...' : 'Publish Announcement'}</span>
              </button>
            </div>
          </form>
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
