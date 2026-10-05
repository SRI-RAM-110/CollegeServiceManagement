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
  FileText,
  Edit3,
  Save,
  AlertCircle,
  Calendar,
  User as UserIcon,
  Mail,
  Users,
  ShieldAlert
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
  const [searchParams] = useSearchParams();
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

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    eventTitle: '',
    date: '',
    venue: '',
    totalGuests: 20,
    mealTypes: [],
    mealItems: [],
    serviceTime: '',
    specialRequirements: ''
  });

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await mealsApi.getRequests();
      const reqList = res.data || [];

      setRequests(reqList);

      const total = reqList.length;
      const pending = reqList.filter(r => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length;
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

  const handleOpenDetails = (req) => {
    setSelectedRequest(req);
    setIsEditing(false);
    setIsDirty(false);
  };

  const handleStartEdit = () => {
    if (!selectedRequest) return;
    const req = selectedRequest;
    const types = req.mealTypes || [];
    const guests = req.totalGuests || (req.mealItems && req.mealItems[0]?.guestCount) || (req.guestCounts ? Object.values(req.guestCounts)[0] : 20);

    const items = types.map((t) => {
      const existing = req.mealItems?.find(
        (mi) => mi.mealType && mi.mealType.toLowerCase() === t.toLowerCase()
      );
      return {
        mealType: t,
        guestCount: existing?.guestCount || req.guestCounts?.[t] || guests,
        preferredTime: existing?.preferredTime || '',
        description: existing?.description || ''
      };
    });

    setEditForm({
      eventTitle: req.eventTitle || req.eventName || '',
      date: req.date || req.eventDate || '',
      venue: req.venue || '',
      totalGuests: guests,
      mealTypes: [...types],
      mealItems: items,
      serviceTime: req.serviceTime || '',
      specialRequirements: req.specialRequirements || req.dietaryRequirements || ''
    });
    setIsEditing(true);
    setIsDirty(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsDirty(false);
  };

  const handleToggleMealType = (type) => {
    setIsDirty(true);
    setEditForm((prev) => {
      const exists = prev.mealTypes.includes(type);
      const nextTypes = exists
        ? prev.mealTypes.filter((t) => t !== type)
        : [...prev.mealTypes, type];

      const nextItems = nextTypes.map((mt) => {
        const found = prev.mealItems.find((i) => i.mealType === mt);
        return (
          found || {
            mealType: mt,
            guestCount: prev.totalGuests || 20,
            preferredTime:
              (mt === 'Snacks' || mt.includes('Tea') || mt.includes('Coffee')) ? prev.serviceTime : '',
            description: ''
          }
        );
      });

      const hasRefreshments = nextTypes.some(
        (mt) => mt === 'Snacks' || mt.toLowerCase().includes('tea') || mt.toLowerCase().includes('coffee')
      );

      return {
        ...prev,
        mealTypes: nextTypes,
        mealItems: nextItems,
        serviceTime: hasRefreshments ? prev.serviceTime : ''
      };
    });
  };

  const handleUpdateItemGuestCount = (mealType, count) => {
    setIsDirty(true);
    const parsed = parseInt(count, 10);
    const val = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setEditForm((prev) => ({
      ...prev,
      mealItems: prev.mealItems.map((item) =>
        item.mealType === mealType ? { ...item, guestCount: val } : item
      )
    }));
  };

  const handleUpdateItemDescription = (mealType, desc) => {
    setIsDirty(true);
    setEditForm((prev) => ({
      ...prev,
      mealItems: prev.mealItems.map((item) =>
        item.mealType === mealType ? { ...item, description: desc } : item
      )
    }));
  };

  const handleSaveChanges = async () => {
    if (!editForm.eventTitle?.trim()) {
      addToast('Event / Purpose is required.', 'error');
      return;
    }
    if (!editForm.date) {
      addToast('Event date is required.', 'error');
      return;
    }
    if (!editForm.venue?.trim()) {
      addToast('Venue / Location is required.', 'error');
      return;
    }
    if (!editForm.mealTypes || editForm.mealTypes.length === 0) {
      addToast('Please select at least one Meal Type.', 'error');
      return;
    }
    if (!editForm.totalGuests || editForm.totalGuests <= 0) {
      addToast('Total guest count must be greater than zero.', 'error');
      return;
    }

    const hasRefreshments = editForm.mealTypes.some(
      (mt) => mt === 'Snacks' || mt.toLowerCase().includes('tea') || mt.toLowerCase().includes('coffee')
    );

    if (hasRefreshments) {
      if (!editForm.serviceTime || (editForm.serviceTime !== 'FORENOON' && editForm.serviceTime !== 'AFTERNOON')) {
        addToast('Please select Service Time (FORENOON or AFTERNOON) for Snacks / Tea & Coffee.', 'error');
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        eventTitle: editForm.eventTitle.trim(),
        date: editForm.date,
        venue: editForm.venue.trim(),
        totalGuests: parseInt(editForm.totalGuests, 10),
        mealTypes: editForm.mealTypes,
        serviceTime: hasRefreshments ? editForm.serviceTime : null,
        mealItems: editForm.mealItems.map((item) => ({
          mealType: item.mealType,
          guestCount: parseInt(item.guestCount || editForm.totalGuests, 10),
          preferredTime:
            (item.mealType === 'Snacks' || item.mealType.includes('Tea') || item.mealType.includes('Coffee')) && editForm.serviceTime
              ? editForm.serviceTime
              : (item.preferredTime || null),
          description: item.description || ''
        })),
        specialRequirements: editForm.specialRequirements?.trim() || ''
      };

      const res = await mealsApi.updateRequest(selectedRequest.id, payload);
      const updated = res.data;
      addToast('Meal request updated successfully.', 'success');
      setSelectedRequest(updated);
      setIsEditing(false);
      setIsDirty(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to update meal request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(true);
      await mealsApi.approve(id);
      addToast('Meal catering request approved successfully!', 'success');
      setSelectedRequest(null);
      setIsEditing(false);
      setIsDirty(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error approving request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveWithCheck = (id) => {
    if (isEditing && isDirty) {
      addToast('Please save your changes before approving the request.', 'warning');
      return;
    }
    if (isEditing) {
      addToast('Please save your changes before approving the request.', 'warning');
      return;
    }
    handleApprove(id);
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
      setIsEditing(false);
      setIsDirty(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error rejecting request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const targetDate = selectedDate || getTodayStr();

  // Active catering requests for the selected dashboard date (excluding REJECTED and CANCELLED)
  const todayMeals = requests.filter(r => {
    const isApproved = r.status === 'APPROVED' || r.status === 'BOOKED';
    const isNotDeclined = r.status !== 'REJECTED' && r.status !== 'CANCELLED';
    const reqDate = (r.date || r.eventDate || '').trim().substring(0, 10);
    return isApproved && isNotDeclined && reqDate === targetDate;
  });

  const matchesCategory = (categoryKey, mealTypeStr) => {
    if (!mealTypeStr || typeof mealTypeStr !== 'string') return false;
    const norm = mealTypeStr.toLowerCase().replace(/[^a-z]/g, '');
    switch (categoryKey) {
      case 'breakfast':
        return norm.includes('breakfast');
      case 'lunch':
        return norm.includes('lunch');
      case 'dinner':
        return norm.includes('dinner');
      case 'snacks':
        return norm.includes('snack');
      case 'teaCoffee':
        return norm.includes('tea') || norm.includes('coffee');
      default:
        return false;
    }
  };

  const getRequestCategoryGuestCount = (req, categoryKey) => {
    // 1. Check if the category is present in req.mealTypes or req.mealItems
    let hasCategory = false;
    if (Array.isArray(req.mealTypes) && req.mealTypes.some(mt => matchesCategory(categoryKey, mt))) {
      hasCategory = true;
    }
    if (Array.isArray(req.mealItems) && req.mealItems.some(mi => matchesCategory(categoryKey, mi.mealType))) {
      hasCategory = true;
    }

    if (!hasCategory) return 0;

    // 2. Specific item guest count if present in mealItems
    if (Array.isArray(req.mealItems) && req.mealItems.length > 0) {
      const item = req.mealItems.find(mi => matchesCategory(categoryKey, mi.mealType));
      if (item && typeof item.guestCount === 'number' && item.guestCount > 0) {
        return item.guestCount;
      }
    }

    // 3. Fallback to guestCounts map if provided
    if (req.guestCounts && typeof req.guestCounts === 'object') {
      for (const [key, val] of Object.entries(req.guestCounts)) {
        if (matchesCategory(categoryKey, key) && Number(val) > 0) {
          return Number(val);
        }
      }
    }

    // 4. Fallback to request-level guest count
    const total = Number(req.totalGuests || req.guests || req.guestCount || 0);
    return total > 0 ? total : 0;
  };

  const todayCounts = {
    breakfast: todayMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'breakfast'), 0),
    lunch: todayMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'lunch'), 0),
    dinner: todayMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'dinner'), 0),
    snacks: todayMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'snacks'), 0),
    teaCoffee: todayMeals.reduce((sum, req) => sum + getRequestCategoryGuestCount(req, 'teaCoffee'), 0)
  };

  const filteredRequests = requests.filter(req => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      (req.eventName?.toLowerCase() || '').includes(q) ||
      (req.eventTitle?.toLowerCase() || '').includes(q) ||
      (req.department?.toLowerCase() || '').includes(q) ||
      (req.venue?.toLowerCase() || '').includes(q) ||
      (req.requestId?.toLowerCase() || '').includes(q) ||
      (req.purpose?.toLowerCase() || '').includes(q) ||
      (req.requestedBy?.toLowerCase() || '').includes(q) ||
      (req.requesterUserId?.toLowerCase() || '').includes(q);

    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const reqDate = (req.date || req.eventDate || '').trim().substring(0, 10);
    const matchesDate = !dateFilter || reqDate === dateFilter;

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
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
                Date: <strong className="text-white">{targetDate}</strong>
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
                      <span className="font-semibold text-white block">{meal.eventName || meal.eventTitle || 'Department Guest Catering'}</span>
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
          <div className="admin-filter-bar flex flex-wrap items-center gap-2.5">
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
                      {req.serviceTime && (
                        <div className="mt-1 text-[10px] font-semibold text-amber-400">
                          Service Time: {req.serviceTime}
                        </div>
                      )}
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
                          onClick={() => handleOpenDetails(req)}
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {(req.status === 'PENDING' || req.status === 'UNDER_REVIEW') && (
                          <>
                            <button
                              onClick={() => handleApproveWithCheck(req.id)}
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

      {/* Details Modal (View, Edit, Save, Review, Approve) */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRequest(null);
            setIsEditing(false);
            setIsDirty(false);
          }}
          title={isEditing ? `Edit Meal Request (${selectedRequest.requestId})` : "Guest Meal Arrangement Details"}
        >
          {/* VIEW / REVIEW MODE */}
          {!isEditing && (
            <div className="space-y-4 text-sm text-slate-300">
              {/* Identity & Status Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Request ID</span>
                  <span className="font-mono font-bold text-white text-sm">{selectedRequest.requestId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Status</span>
                  <div className="mt-0.5">
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Department</span>
                  <span className="font-semibold text-white">{selectedRequest.department}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Created Date</span>
                  <span className="text-slate-300 font-medium text-xs">
                    {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>

              {/* Requester Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Requester Name</span>
                    <span className="font-medium text-slate-200 text-xs">{selectedRequest.requestedBy || 'Faculty Requester'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Requester Email</span>
                    <span className="font-mono text-slate-300 text-xs">
                      {selectedRequest.requesterEmail || (selectedRequest.requesterUserId ? `${selectedRequest.requesterUserId}@nrtec.local` : `${selectedRequest.department?.toLowerCase() || 'cse'}@nrtec.local`)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event, Date, Venue & Total Guest Count */}
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Event / Purpose</span>
                  <span className="text-base font-bold text-white block mt-0.5">
                    {selectedRequest.eventTitle || selectedRequest.eventName || 'Institutional Hospitality'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-500 block">Date</span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {selectedRequest.date || selectedRequest.eventDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Venue / Location</span>
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      {selectedRequest.venue}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Guest Count</span>
                    <span className="font-bold text-amber-400 font-mono text-sm flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      {selectedRequest.totalGuests || (selectedRequest.mealItems && selectedRequest.mealItems[0]?.guestCount) || '—'} guests
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Time Banner for Snacks / Tea & Coffee */}
              {(selectedRequest.mealTypes?.some(t => t.toLowerCase().includes('snack') || t.toLowerCase().includes('tea') || t.toLowerCase().includes('coffee')) || selectedRequest.serviceTime) && (
                <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-sky-200 block">Refreshments Service Time</span>
                      <span className="text-[11px] text-sky-400">Scheduled serving window for Snacks & Beverages</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-md text-xs font-bold font-mono tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {selectedRequest.serviceTime || 'NOT SET'}
                  </span>
                </div>
              )}

              {/* Selected Meal Types & Items Quantities */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white block">Selected Meal Packages & Quantities</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedRequest.mealTypes?.map((mt) => (
                      <span key={mt} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {mt}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {selectedRequest.mealTypes?.map((mt) => {
                    const itemDetail = selectedRequest.mealItems?.find(i => i.mealType && i.mealType.toLowerCase() === mt.toLowerCase());
                    const qty = itemDetail?.guestCount || selectedRequest.guestCounts?.[mt] || selectedRequest.totalGuests || 'N/A';
                    const isRef = mt.toLowerCase().includes('snack') || mt.toLowerCase().includes('tea') || mt.toLowerCase().includes('coffee');
                    return (
                      <div key={mt} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{mt}</span>
                          <span className="font-mono font-bold text-amber-400 text-xs">{qty} guests</span>
                        </div>
                        {isRef && selectedRequest.serviceTime && (
                          <div className="mt-1 text-[11px] font-medium text-sky-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Service Time: {selectedRequest.serviceTime}</span>
                          </div>
                        )}
                        {itemDetail?.description && (
                          <div className="mt-1 text-[11px] text-slate-400 italic">
                            "{itemDetail.description}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Requirements */}
              {selectedRequest.specialRequirements && (
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Special Requirements / Dietary Notes</span>
                  <p className="text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs leading-relaxed">
                    {selectedRequest.specialRequirements}
                  </p>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <div>
                  {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'UNDER_REVIEW') && (
                    <button
                      onClick={handleStartEdit}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5"
                      title="Edit request details before approval"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Edit Request</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'UNDER_REVIEW') && (
                    <>
                      <button
                        onClick={() => handleOpenReject(selectedRequest.id)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-medium transition"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleApproveWithCheck(selectedRequest.id)}
                        disabled={actionLoading}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-md flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Catering Plan</span>
                      </button>
                    </>
                  )}

                  {selectedRequest.status === 'APPROVED' && (
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
                  )}
                </div>
              </div>
            </div>
          )}

          {/* EDIT MODE */}
          {isEditing && (
            <div className="space-y-4 text-sm text-slate-300">
              {/* Notice & System Controlled Identity Fields */}
              <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                    System-Controlled Identity Fields (Read-Only)
                  </span>
                  <StatusBadge status={selectedRequest.status} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Request ID</span>
                    <span className="font-mono font-medium text-white">{selectedRequest.requestId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Department</span>
                    <span className="font-medium text-white">{selectedRequest.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Requester</span>
                    <span className="font-medium text-slate-300 truncate block">{selectedRequest.requestedBy}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Email</span>
                    <span className="font-mono text-slate-400 text-[11px] truncate block">
                      {selectedRequest.requesterEmail || (selectedRequest.requesterUserId ? `${selectedRequest.requesterUserId}@nrtec.local` : 'faculty@nrtec.local')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-3.5 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
                {/* Event Title & Date & Venue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Event / Purpose <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.eventTitle}
                      onChange={(e) => {
                        setIsDirty(true);
                        setEditForm(prev => ({ ...prev, eventTitle: e.target.value }));
                      }}
                      placeholder="e.g. National Conference on AI Hospitality"
                      className="admin-filter-input w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => {
                        setIsDirty(true);
                        setEditForm(prev => ({ ...prev, date: e.target.value }));
                      }}
                      className="admin-filter-input w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Venue / Location <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.venue}
                      onChange={(e) => {
                        setIsDirty(true);
                        setEditForm(prev => ({ ...prev, venue: e.target.value }));
                      }}
                      placeholder="e.g. Mechanical Seminar Hall Dining"
                      className="admin-filter-input w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Total Guest Count <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.totalGuests}
                      onChange={(e) => {
                        setIsDirty(true);
                        const val = parseInt(e.target.value, 10) || 0;
                        setEditForm(prev => ({ ...prev, totalGuests: val }));
                      }}
                      className="admin-filter-input w-full font-mono"
                    />
                  </div>
                </div>

                {/* Meal Types Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Meal Types <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Tea / Coffee'].map((type) => {
                      const isSelected = editForm.mealTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleToggleMealType(type)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Service Time Section (Mandatory if Snacks or Tea / Coffee is selected) */}
                {editForm.mealTypes.some(t => t === 'Snacks' || t.toLowerCase().includes('tea') || t.toLowerCase().includes('coffee')) && (
                  <div className="p-3.5 rounded-lg bg-sky-950/40 border border-sky-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-sky-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>Service Time for Snacks / Tea & Coffee <span className="text-rose-400">*</span></span>
                      </label>
                      <span className="text-[10px] text-sky-300 font-medium">Select Serving Window</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsDirty(true);
                          setEditForm(prev => ({ ...prev, serviceTime: 'FORENOON' }));
                        }}
                        className={`p-2.5 rounded-lg text-xs font-bold text-center border transition ${
                          editForm.serviceTime === 'FORENOON'
                            ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        FORENOON
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDirty(true);
                          setEditForm(prev => ({ ...prev, serviceTime: 'AFTERNOON' }));
                        }}
                        className={`p-2.5 rounded-lg text-xs font-bold text-center border transition ${
                          editForm.serviceTime === 'AFTERNOON'
                            ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        AFTERNOON
                      </button>
                    </div>
                  </div>
                )}

                {/* Per-Item Quantities Breakdown */}
                {editForm.mealTypes.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Meal Items & Quantities
                    </label>
                    <div className="space-y-2">
                      {editForm.mealTypes.map((mt) => {
                        const item = editForm.mealItems.find(i => i.mealType === mt) || { guestCount: editForm.totalGuests, description: '' };
                        return (
                          <div key={mt} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-white w-28 shrink-0">{mt}</span>
                            <div className="flex items-center gap-2 grow">
                              <span className="text-slate-400 text-[11px] shrink-0">Quantity:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.guestCount}
                                onChange={(e) => handleUpdateItemGuestCount(mt, e.target.value)}
                                className="admin-filter-input w-24 font-mono py-1"
                              />
                              <input
                                type="text"
                                placeholder="Menu notes (optional)"
                                value={item.description || ''}
                                onChange={(e) => handleUpdateItemDescription(mt, e.target.value)}
                                className="admin-filter-input grow py-1 text-slate-200"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Special Requirements */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Special Requirements / Dietary Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.specialRequirements}
                    onChange={(e) => {
                      setIsDirty(true);
                      setEditForm(prev => ({ ...prev, specialRequirements: e.target.value }));
                    }}
                    placeholder="e.g. Vegetarian only. No onion/garlic for VIP table..."
                    className="admin-filter-input w-full text-xs"
                  />
                </div>
              </div>

              {/* Edit Mode Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel Edit
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}
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
