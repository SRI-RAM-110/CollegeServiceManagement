import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Building2,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Eye,
  Check,
  X,
  FileText,
  User,
  Users,
  Phone,
  Mail,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  Info,
  Plus,
  Trash2,
  Zap,
  Upload,
  Image as ImageIcon,
  Send,
  RotateCcw,
  MapPin,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { seminarApi, electricalIssueApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { getTodayStr, formatDateDisplay } from '../../utils/dateUtils';
import '../../styles/seminar-technician-electrical.css';

const ISSUE_PRIORITY_STYLES = {
  LOW: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' },
  MEDIUM: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  HIGH: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  EMERGENCY: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40 animate-pulse' },
};

const ISSUE_STATUS_STYLES = {
  ASSIGNED: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', label: 'Assigned' },
  ACCEPTED: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30', label: 'Accepted' },
  IN_PROGRESS: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', label: 'In Progress' },
  REJECTED: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30', label: 'Rejected' },
  COMPLETED: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Completed' },
  REOPENED: { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', label: 'Reopened' },
  CANCELLED: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Cancelled' },
};

export default function SeminarTechnicianDashboard() {
  const { addToast } = useNotifications();
  const { user, isAOAdmin, isSeminarAdmin } = useAuth();
  const assignedHallIds = user?.assignedHallIds || [];

  const [bookings, setBookings] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHall, setSelectedHall] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('UPCOMING'); // UPCOMING, TODAY, ALL

  // Checklist Modal State
  const [activeChecklistModal, setActiveChecklistModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState('');
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [currentChecklist, setCurrentChecklist] = useState(null);

  // Custom Item Inputs
  const [newCustomItemName, setNewCustomItemName] = useState('');
  const [newCustomItemCategory, setNewCustomItemCategory] = useState('CUSTOM');

  // ==========================================
  // ELECTRICAL ISSUES STATE & HANDLERS
  // ==========================================
  const [activeMainTab, setActiveMainTab] = useState('CHECKLIST'); // 'CHECKLIST' or 'ELECTRICAL'
  const [electricalSubTab, setElectricalSubTab] = useState('MY_ISSUES'); // 'MY_ISSUES' or 'REPORT'

  const [electricalIssues, setElectricalIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesRefreshing, setIssuesRefreshing] = useState(false);
  const [issueStatusFilter, setIssueStatusFilter] = useState('ALL');
  const [issueSearchQuery, setIssueSearchQuery] = useState('');

  const initialFormState = {
    locationType: 'Academic Block',
    buildingName: '',
    floor: '',
    roomNumber: '',
    specificLocation: '',
    issueCategory: 'Wiring / Switchboard',
    priority: 'MEDIUM',
    description: '',
    photoUrl: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Modals for Electrical Issues
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null);
  const [reopenModalIssue, setReopenModalIssue] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenSubmitting, setReopenSubmitting] = useState(false);
  const [reopenError, setReopenError] = useState('');

  const fetchMyElectricalIssues = async (showRefresh = false) => {
    if (showRefresh) setIssuesRefreshing(true);
    else setIssuesLoading(true);
    try {
      const res = await electricalIssueApi.getMyRequests();
      const list = Array.isArray(res) ? res : res?.data && Array.isArray(res.data) ? res.data : [];
      setElectricalIssues(list);
    } catch (err) {
      console.error('Failed to fetch technician electrical issues:', err);
      addToast(err?.message || 'Failed to fetch electrical issues', 'error');
    } finally {
      setIssuesLoading(false);
      setIssuesRefreshing(false);
    }
  };

  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('Only JPG, PNG, and WebP images are supported', 'warning');
      return;
    }

    if (file.size > 1024 * 1024) {
      addToast('Image file size must be less than 1MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
      setFormData((prev) => ({ ...prev, photoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setFormData((prev) => ({ ...prev, photoUrl: '' }));
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.buildingName?.trim()) errors.buildingName = 'Building name is required';
    if (!formData.floor?.trim()) errors.floor = 'Floor is required';
    if (!formData.specificLocation?.trim()) errors.specificLocation = 'Specific location is required';
    if (!formData.description?.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('Please fill all required fields correctly', 'warning');
      return;
    }

    setFormErrors({});
    setFormSubmitting(true);

    try {
      // NOTE: Exclude reporter user id, name, department, status, assigned electrician!
      // The backend securely resolves reporter identity from the authenticated session context.
      const payload = {
        locationType: formData.locationType,
        buildingName: formData.buildingName.trim(),
        floor: formData.floor.trim(),
        roomNumber: formData.roomNumber?.trim() || null,
        specificLocation: formData.specificLocation.trim(),
        issueCategory: formData.issueCategory,
        priority: formData.priority,
        description: formData.description.trim(),
        photoUrl: formData.photoUrl || null,
      };

      const res = await electricalIssueApi.createRequest(payload);
      const reqId = res?.requestId || res?.data?.requestId || 'New Ticket';
      addToast(`Electrical issue created successfully! Request ID: ${reqId}`, 'success');

      setFormData(initialFormState);
      setPhotoPreview(null);
      setElectricalSubTab('MY_ISSUES');
      fetchMyElectricalIssues();
    } catch (err) {
      console.error('Failed to create electrical issue:', err);
      addToast(err?.message || 'Failed to submit electrical issue', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleReopenSubmit = async () => {
    if (!reopenModalIssue) return;
    if (!reopenReason || reopenReason.trim().length < 5) {
      setReopenError('Reopening reason must be at least 5 characters');
      return;
    }

    setReopenSubmitting(true);
    setReopenError('');

    try {
      await electricalIssueApi.reopenRequest(reopenModalIssue.id, reopenReason.trim());
      addToast(`Ticket ${reopenModalIssue.requestId} has been reopened`, 'success');
      setReopenModalIssue(null);
      setReopenReason('');
      fetchMyElectricalIssues();
    } catch (err) {
      console.error('Failed to reopen issue:', err);
      setReopenError(err?.message || 'Failed to reopen ticket');
      addToast(err?.message || 'Failed to reopen ticket', 'error');
    } finally {
      setReopenSubmitting(false);
    }
  };

  const filteredIssues = useMemo(() => {
    return electricalIssues.filter((issue) => {
      if (issueStatusFilter !== 'ALL' && issue.status !== issueStatusFilter) {
        return false;
      }
      if (issueSearchQuery.trim()) {
        const q = issueSearchQuery.toLowerCase();
        const matchId = issue.requestId?.toLowerCase().includes(q);
        const matchBuilding = issue.buildingName?.toLowerCase().includes(q);
        const matchLocation = issue.specificLocation?.toLowerCase().includes(q);
        const matchCat = issue.issueCategory?.toLowerCase().includes(q);
        const matchDesc = issue.description?.toLowerCase().includes(q);
        const matchElectrician = issue.assignedElectricianName?.toLowerCase().includes(q);
        if (!matchId && !matchBuilding && !matchLocation && !matchCat && !matchDesc && !matchElectrician) {
          return false;
        }
      }
      return true;
    });
  }, [electricalIssues, issueStatusFilter, issueSearchQuery]);

  const electricalStats = useMemo(() => {
    const total = electricalIssues.length;
    const inProgress = electricalIssues.filter((i) =>
      ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'REOPENED'].includes(i.status)
    ).length;
    const completed = electricalIssues.filter((i) => i.status === 'COMPLETED').length;
    const emergencyOrHigh = electricalIssues.filter((i) =>
      ['HIGH', 'EMERGENCY'].includes(i.priority)
    ).length;

    return { total, inProgress, completed, emergencyOrHigh };
  }, [electricalIssues]);

  const fetchHalls = async () => {
    try {
      const res = await seminarApi.getHalls();
      if (res?.data && Array.isArray(res.data)) {
        setHalls(res.data);
      }
    } catch {
      // Non-critical if halls list fallback exists
    }
  };

  const fetchBookings = async () => {
    try {
      setRefreshing(true);
      const res = await seminarApi.getTechnicianBookings();
      if (res?.data && Array.isArray(res.data)) {
        setBookings(res.data);
      } else {
        setBookings([]);
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch technician bookings.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHalls();
    fetchBookings();
  }, []);

  // Compute hall name lookup
  const hallMap = useMemo(() => {
    const map = {};
    halls.forEach((h) => {
      const id = h.hallId || h.id;
      if (id) map[id] = h.name || id;
    });
    return map;
  }, [halls]);

  const todayStr = getTodayStr();

  // Robust date helpers prioritizing actual booking fields: date, startDate, and dates array
  const getBookingEventDates = (b) => {
    if (!b) return [];
    if (b.isRecurring && Array.isArray(b.dates) && b.dates.length > 0) {
      return b.dates;
    }
    if (Array.isArray(b.dates) && b.dates.length > 0) {
      return b.dates;
    }
    if (Array.isArray(b.occurrences) && b.occurrences.length > 0) {
      const occDates = b.occurrences.map((o) => o?.date).filter(Boolean);
      if (occDates.length > 0) return occDates;
    }
    const singleDate = b.date || b.startDate || b.bookingDate;
    return singleDate ? [singleDate] : [];
  };

  const getPrimaryBookingDate = (b) => {
    if (!b) return '';
    return b.date || b.startDate || b.bookingDate || (Array.isArray(b.dates) ? b.dates[0] : '');
  };

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Restrict results to technician's authorized halls for non-admins
      if (!isAOAdmin && !isSeminarAdmin && !assignedHallIds.includes(b.hallId)) {
        return false;
      }

      // Hall filter
      if (selectedHall !== 'ALL' && b.hallId !== selectedHall) return false;

      // Search query (title, requester, department, hall)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (b.eventTitle || '').toLowerCase().includes(q);
        const matchesReq = (b.requesterName || '').toLowerCase().includes(q);
        const matchesDept = (b.department || '').toLowerCase().includes(q);
        const matchesHall = (b.hallName || hallMap[b.hallId] || b.hallId || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesReq && !matchesDept && !matchesHall) return false;
      }

      // Date range filter
      const eventDates = getBookingEventDates(b);

      if (dateRangeFilter === 'TODAY') {
        if (!eventDates.includes(todayStr)) return false;
      } else if (dateRangeFilter === 'UPCOMING') {
        const hasUpcoming = eventDates.some((d) => d >= todayStr);
        if (!hasUpcoming) return false;
      }

      return true;
    });
  }, [bookings, selectedHall, searchQuery, dateRangeFilter, hallMap, todayStr, isAOAdmin, isSeminarAdmin, assignedHallIds]);

  // Open Checklist
  const handleOpenChecklist = async (booking, occurrenceDate) => {
    const targetDate = occurrenceDate || getPrimaryBookingDate(booking) || todayStr;
    setSelectedBooking(booking);
    setSelectedOccurrenceDate(targetDate);
    setActiveChecklistModal(true);
    setChecklistLoading(true);

    try {
      const res = await seminarApi.getEquipmentChecklist(booking.bookingId || booking.id, targetDate);
      if (res?.data) {
        setCurrentChecklist(res.data);
      } else {
        addToast('Checklist initialized with standard items.', 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to load equipment checklist.', 'error');
    } finally {
      setChecklistLoading(false);
    }
  };

  // Toggle checklist item status
  const handleItemStatusChange = (index, newStatus) => {
    if (!currentChecklist || !currentChecklist.items) return;
    const updatedItems = [...currentChecklist.items];
    updatedItems[index] = {
      ...updatedItems[index],
      status: newStatus,
    };
    setCurrentChecklist({
      ...currentChecklist,
      items: updatedItems,
    });
  };

  // Update checklist item notes
  const handleItemNotesChange = (index, notes) => {
    if (!currentChecklist || !currentChecklist.items) return;
    const updatedItems = [...currentChecklist.items];
    updatedItems[index] = {
      ...updatedItems[index],
      notes,
    };
    setCurrentChecklist({
      ...currentChecklist,
      items: updatedItems,
    });
  };

  // Add custom item matching backend ChecklistItem model (key, itemName, category, status, notes)
  const handleAddCustomItem = () => {
    if (!newCustomItemName.trim()) return;
    const newItem = {
      key: `custom_${Date.now()}`,
      itemName: newCustomItemName.trim(),
      category: newCustomItemCategory || 'CUSTOM',
      status: 'PENDING',
      notes: '',
    };
    setCurrentChecklist({
      ...currentChecklist,
      items: [...(currentChecklist.items || []), newItem],
    });
    setNewCustomItemName('');
  };

  // Remove custom item
  const handleRemoveItem = (index) => {
    if (!currentChecklist || !currentChecklist.items) return;
    const updatedItems = currentChecklist.items.filter((_, i) => i !== index);
    setCurrentChecklist({
      ...currentChecklist,
      items: updatedItems,
    });
  };

  // Save Checklist
  const handleSaveChecklist = async () => {
    if (!selectedBooking || !selectedOccurrenceDate || !currentChecklist) return;
    try {
      setSavingChecklist(true);
      const payload = {
        ...currentChecklist,
        checklistStatus: currentChecklist.checklistStatus || 'PENDING',
      };
      const res = await seminarApi.saveEquipmentChecklist(
        selectedBooking.bookingId || selectedBooking.id,
        selectedOccurrenceDate,
        payload
      );
      if (res?.data) {
        setCurrentChecklist(res.data);
      }
      addToast('Equipment checklist saved successfully!', 'success');
      setActiveChecklistModal(false);
      fetchBookings();
    } catch (err) {
      addToast(err.message || 'Failed to save checklist.', 'error');
    } finally {
      setSavingChecklist(false);
    }
  };

  // Computed stats
  const stats = useMemo(() => {
    const authorizedBookings = bookings.filter((b) => {
      if (!isAOAdmin && !isSeminarAdmin && !assignedHallIds.includes(b.hallId)) {
        return false;
      }
      return true;
    });

    const totalEvents = authorizedBookings.length;
    let todayEvents = 0;
    authorizedBookings.forEach((b) => {
      const dates = getBookingEventDates(b);
      if (dates.includes(todayStr)) todayEvents++;
    });
    return {
      total: totalEvents,
      today: todayEvents,
      assignedHallsCount: assignedHallIds.length,
    };
  }, [bookings, todayStr, assignedHallIds, isAOAdmin, isSeminarAdmin]);

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950/40 border border-cyan-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
            <Wrench className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Seminar Equipment Technician Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TECHNICIAN
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Inspect, test, and verify standard audiovisual equipment and organizer requirements for confirmed seminar bookings.
            </p>
            {/* Assigned Halls Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Assigned Halls:
              </span>
              {assignedHallIds.length > 0 ? (
                assignedHallIds.map((hid) => (
                  <span
                    key={hid}
                    className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-500/30"
                  >
                    {hallMap[hid] || hid}
                  </span>
                ))
              ) : isAOAdmin || isSeminarAdmin ? (
                <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                  Global Hall Inspection Access (Admin)
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 italic">No halls assigned yet. Contact AO Admin.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => {
              if (activeMainTab === 'ELECTRICAL') {
                fetchMyElectricalIssues(true);
              } else {
                fetchBookings();
              }
            }}
            disabled={activeMainTab === 'ELECTRICAL' ? issuesRefreshing : refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                (activeMainTab === 'ELECTRICAL' ? issuesRefreshing : refreshing) ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveMainTab('CHECKLIST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeMainTab === 'CHECKLIST'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>AV Equipment Checklist</span>
          {bookings.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-900/80 text-[10px] text-cyan-200 ml-1 font-mono">
              {bookings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveMainTab('ELECTRICAL');
            fetchMyElectricalIssues();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeMainTab === 'ELECTRICAL'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Electrical Issues</span>
          {electricalIssues.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-900/80 text-[10px] text-amber-200 ml-1 font-mono">
              {electricalIssues.length}
            </span>
          )}
        </button>
      </div>

      {activeMainTab === 'CHECKLIST' ? (
        <>
          {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Confirmed Events"
          value={stats.total}
          subtitle="Ready for equipment inspection"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Today's Sessions"
          value={stats.today}
          subtitle="Requiring immediate readiness"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Assigned Venues"
          value={isAOAdmin || isSeminarAdmin ? 'All Halls' : stats.assignedHallsCount}
          subtitle="Halls under your supervision"
          icon={Building2}
          color="emerald"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by event title, organizer, hall, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hall selector */}
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Assigned Halls</option>
              {halls.map((h) => {
                const hid = h.hallId || h.id;
                if (!isAOAdmin && !isSeminarAdmin && !assignedHallIds.includes(hid)) return null;
                return (
                  <option key={hid} value={hid}>
                    {h.name || hid}
                  </option>
                );
              })}
            </select>

            {/* Date range filter */}
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => setDateRangeFilter('UPCOMING')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  dateRangeFilter === 'UPCOMING'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setDateRangeFilter('TODAY')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  dateRangeFilter === 'TODAY'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRangeFilter('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  dateRangeFilter === 'ALL'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-900/50 rounded-xl border border-slate-800">
            <RefreshCw className="w-7 h-7 mx-auto animate-spin text-cyan-400" />
            <p className="text-xs">Loading approved bookings for assigned halls...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2 bg-slate-900/40 rounded-xl border border-slate-800">
            <Wrench className="w-8 h-8 mx-auto text-slate-600" />
            <h3 className="font-semibold text-slate-300 text-sm">No bookings found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are no confirmed seminar events matching your criteria in your assigned halls.
            </p>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const hallDisplay = b.hallName || hallMap[b.hallId] || b.hallId;
            const datesList = getBookingEventDates(b);
            const primaryDate = getPrimaryBookingDate(b);
            const isToday = datesList.includes(todayStr);
            const isMultiDaySpan = (b.isMultiDay || (b.startDate && b.endDate && b.startDate !== b.endDate)) && !b.isRecurring;

            return (
              <div
                key={b.bookingId || b.id}
                className={`p-4 rounded-xl border transition duration-200 bg-slate-900/90 hover:bg-slate-800/60 ${
                  isToday
                    ? 'border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Event Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        {b.bookingId || 'BOOKING'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        {hallDisplay}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {b.department || 'General'}
                      </span>
                      {b.isRecurring && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Recurring ({datesList.length} dates)
                        </span>
                      )}
                      {isMultiDaySpan && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Multi-Day
                        </span>
                      )}
                      {isToday && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          TODAY
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      {b.eventTitle || 'Untitled Event'}
                    </h2>

                    {/* Schedule info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>
                          Date: <strong className="text-slate-200">
                            {isMultiDaySpan && b.startDate && b.endDate
                              ? `${formatDateDisplay(b.startDate)} - ${formatDateDisplay(b.endDate)}`
                              : formatDateDisplay(primaryDate)}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Slot: <strong className="text-slate-200">{b.slot || 'Full Day'} ({b.startTime} - {b.endTime})</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Organizer: <strong className="text-slate-200">{b.requesterName || 'N/A'}</strong></span>
                      </div>
                      {b.requesterPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Phone: {b.requesterPhone}</span>
                        </div>
                      )}
                      {b.requesterEmail && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[200px]" title={b.requesterEmail}>
                            Email: {b.requesterEmail}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Attendees: {b.attendeesCount || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Requested Arrangements Note */}
                    {b.additionalRequirements && (
                      <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-blue-300">Requested Arrangements: </strong>
                          <span>{b.additionalRequirements}</span>
                        </div>
                      </div>
                    )}

                    {/* If recurring, display occurrence chips for checklist inspection */}
                    {b.isRecurring && datesList.length > 1 && (
                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                          Recurring Occurrences (Separate checklist for each date):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {datesList.map((dt, idx) => (
                            <button
                              key={dt}
                              onClick={() => handleOpenChecklist(b, dt)}
                              className={`text-[11px] px-2.5 py-1 rounded-md font-mono font-medium border flex items-center gap-1 transition ${
                                dt === todayStr
                                   ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500 hover:text-white'
                              }`}
                            >
                              <span>Day {idx + 1}: {formatDateDisplay(dt)}</span>
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Column */}
                  <div className="flex flex-row lg:flex-col items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    <button
                      onClick={() => handleOpenChecklist(b, primaryDate)}
                      className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 transition active:scale-95"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>Equipment Checklist</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      ) : (
        <div className="ste-container space-y-5">
          {/* Sub Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="ste-tabs-bar border-b-0 pb-0">
              <button
                type="button"
                onClick={() => setElectricalSubTab('MY_ISSUES')}
                className={`ste-tab-btn ${electricalSubTab === 'MY_ISSUES' ? 'active' : ''}`}
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>My Electrical Issues</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {electricalIssues.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setElectricalSubTab('REPORT')}
                className={`ste-tab-btn ${electricalSubTab === 'REPORT' ? 'active' : ''}`}
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Report Electrical Issue</span>
              </button>
            </div>

            <button
              onClick={() => fetchMyElectricalIssues(true)}
              disabled={issuesRefreshing}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${issuesRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Issues</span>
            </button>
          </div>

          {/* Sub-tab: Report Electrical Issue Form */}
          {electricalSubTab === 'REPORT' && (
            <form onSubmit={handleSubmitIssue} className="ste-form-card">
              <div className="ste-form-header">
                <h3 className="ste-form-title">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Report Campus Electrical Issue
                </h3>
                <p className="ste-form-subtitle">
                  Submit an electrical fault ticket for any academic, administrative, hostel, or outdoor location. The single active campus electrician will be notified immediately upon submission.
                </p>
              </div>

              {/* Form Grid */}
              <div className="ste-form-grid">
                {/* Location Type */}
                <div className="ste-field-group">
                  <label className="ste-field-label">
                    <span>Location Type</span>
                    <span className="required-star">*</span>
                  </label>
                  <select
                    value={formData.locationType}
                    onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                    className="ste-select"
                  >
                    <option value="Academic Block">Academic Block</option>
                    <option value="Hostel">Hostel</option>
                    <option value="Administration">Administration</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Auditorium / Seminar">Auditorium / Seminar</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Building Name */}
                <div className="ste-field-group">
                  <label className="ste-field-label">
                    <span>Building Name</span>
                    <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Main Academic Block, Science Block, Mechanical Block"
                    value={formData.buildingName}
                    onChange={(e) => {
                      setFormData({ ...formData, buildingName: e.target.value });
                      if (formErrors.buildingName) setFormErrors({ ...formErrors, buildingName: null });
                    }}
                    className="ste-input"
                  />
                  {formErrors.buildingName && <span className="ste-field-error">{formErrors.buildingName}</span>}
                </div>

                {/* Floor */}
                <div className="ste-field-group">
                  <label className="ste-field-label">
                    <span>Floor</span>
                    <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Ground Floor, 1st Floor, 2nd Floor"
                    value={formData.floor}
                    onChange={(e) => {
                      setFormData({ ...formData, floor: e.target.value });
                      if (formErrors.floor) setFormErrors({ ...formErrors, floor: null });
                    }}
                    className="ste-input"
                  />
                  {formErrors.floor && <span className="ste-field-error">{formErrors.floor}</span>}
                </div>

                {/* Room Number */}
                <div className="ste-field-group">
                  <label className="ste-field-label">
                    <span>Room / Hall Number (Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Room 204, Seminar Hall 1, Server Room"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="ste-input"
                  />
                </div>

                {/* Specific Location */}
                <div className="ste-field-group md:col-span-2">
                  <label className="ste-field-label">
                    <span>Specific Location / Exact Spot</span>
                    <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Near electrical distribution panel, East corridor next to water cooler, Stage podium"
                    value={formData.specificLocation}
                    onChange={(e) => {
                      setFormData({ ...formData, specificLocation: e.target.value });
                      if (formErrors.specificLocation) setFormErrors({ ...formErrors, specificLocation: null });
                    }}
                    className="ste-input"
                  />
                  {formErrors.specificLocation && <span className="ste-field-error">{formErrors.specificLocation}</span>}
                </div>

                {/* Issue Category */}
                <div className="ste-field-group">
                  <label className="ste-field-label">
                    <span>Issue Category</span>
                    <span className="required-star">*</span>
                  </label>
                  <select
                    value={formData.issueCategory}
                    onChange={(e) => setFormData({ ...formData, issueCategory: e.target.value })}
                    className="ste-select"
                  >
                    <option value="Wiring / Switchboard">Wiring / Switchboard</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Power Outage">Power Outage</option>
                    <option value="Fan / Appliance">Fan / Appliance</option>
                    <option value="Short Circuit">Short Circuit</option>
                    <option value="AC / Heavy Equipment">AC / Heavy Equipment</option>
                    <option value="UPS / Inverter">UPS / Inverter</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Priority Selector */}
                <div className="ste-field-group">
                  <label className="ste-field-label">
                    <span>Urgency / Priority</span>
                    <span className="required-star">*</span>
                  </label>
                  <div className="ste-priority-selector">
                    {['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'].map((pri) => (
                      <button
                        key={pri}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: pri })}
                        className={`ste-priority-btn ${formData.priority === pri ? `active priority-${pri.toLowerCase()}` : ''}`}
                      >
                        {pri}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="ste-field-group md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="ste-field-label">
                      <span>Detailed Description</span>
                      <span className="required-star">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formData.description.length} / 2000 (min 10)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Describe the issue, symptoms, safety hazards, equipment involved, or context (minimum 10 characters)..."
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      if (formErrors.description) setFormErrors({ ...formErrors, description: null });
                    }}
                    className="ste-textarea"
                  />
                  {formErrors.description && <span className="ste-field-error">{formErrors.description}</span>}
                </div>

                {/* Photo Upload Box */}
                <div className="ste-field-group md:col-span-2">
                  <label className="ste-field-label">
                    <span>Issue Photograph (Optional, max 1MB)</span>
                  </label>
                  {photoPreview || formData.photoUrl ? (
                    <div className="ste-photo-preview-wrap">
                      <img src={photoPreview || formData.photoUrl} alt="Issue Preview" className="ste-photo-preview-img" />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="ste-photo-remove-btn"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="ste-photo-uploader">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-300">
                        Click to upload photograph from device
                      </span>
                      <span className="text-[10px] text-slate-500">
                        JPG, PNG, WebP up to 1MB
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="ste-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(initialFormState);
                    setPhotoPreview(null);
                    setFormErrors({});
                    setElectricalSubTab('MY_ISSUES');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-amber-600/20 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit Electrical Issue</span>
                </button>
              </div>
            </form>
          )}

          {/* Sub-tab: My Electrical Issues */}
          {electricalSubTab === 'MY_ISSUES' && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="My Reported Issues"
                  value={electricalStats.total}
                  subtitle="Total tickets submitted"
                  icon={Zap}
                  color="blue"
                />
                <StatCard
                  title="Active / In Progress"
                  value={electricalStats.inProgress}
                  subtitle="Under electrician attention"
                  icon={Clock}
                  color="amber"
                />
                <StatCard
                  title="Resolved & Completed"
                  value={electricalStats.completed}
                  subtitle="Successfully repaired"
                  icon={CheckCircle2}
                  color="emerald"
                />
                <StatCard
                  title="High & Emergency"
                  value={electricalStats.emergencyOrHigh}
                  subtitle="Priority attention cases"
                  icon={AlertTriangle}
                  color="purple"
                />
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search tickets by Request ID, building, location, category, electrician..."
                      value={issueSearchQuery}
                      onChange={(e) => setIssueSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  {/* Status Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
                    {['ALL', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'REJECTED', 'COMPLETED', 'REOPENED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setIssueStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          issueStatusFilter === st
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {st === 'ALL' ? 'All Status' : ISSUE_STATUS_STYLES[st]?.label || st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Issues List */}
              <div className="space-y-3">
                {issuesLoading ? (
                  <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-900/50 rounded-xl border border-slate-800">
                    <RefreshCw className="w-7 h-7 mx-auto animate-spin text-amber-400" />
                    <p className="text-xs">Loading electrical tickets reported by you...</p>
                  </div>
                ) : filteredIssues.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-xl border border-slate-800">
                    <Zap className="w-8 h-8 mx-auto text-slate-600" />
                    <h3 className="font-semibold text-slate-300 text-sm">No electrical issues found</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {issueSearchQuery || issueStatusFilter !== 'ALL'
                        ? 'No electrical issues match your current filters.'
                        : 'You have not reported any electrical issues yet. Click "Report Electrical Issue" above to submit a new ticket.'}
                    </p>
                  </div>
                ) : (
                  filteredIssues.map((issue) => {
                    const pri = ISSUE_PRIORITY_STYLES[issue.priority] || ISSUE_PRIORITY_STYLES.MEDIUM;
                    const sta = ISSUE_STATUS_STYLES[issue.status] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700', label: issue.status };
                    return (
                      <div
                        key={issue.id}
                        className="p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition duration-200 bg-slate-900/90 hover:bg-slate-800/60"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2">
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
                            </div>

                            {/* Location & Summary */}
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{issue.buildingName} — {issue.floor}{issue.roomNumber ? `, ${issue.roomNumber}` : ''}</span>
                                <span className="text-xs font-normal text-slate-400">({issue.locationType})</span>
                              </h4>
                              <p className="text-xs text-slate-400 font-medium">
                                Specific Spot: <span className="text-slate-200">{issue.specificLocation}</span>
                              </p>
                              <p className="text-xs text-slate-300 line-clamp-2">
                                {issue.description}
                              </p>
                            </div>

                            {/* Electrician & Status info */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/70">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Reported: {new Date(issue.reportedAt || issue.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-cyan-400" />
                                <span>Electrician: <strong className="text-slate-200">{issue.assignedElectricianName || 'Awaiting Assignment'}</strong></span>
                              </div>
                              {issue.assignedElectricianPhone && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Phone className="w-3 h-3 text-emerald-400" />
                                  <span>{issue.assignedElectricianPhone}</span>
                                </div>
                              )}
                            </div>

                            {/* Remarks Highlight */}
                            {issue.rejectionReason && (
                              <div className="text-[11px] p-2 rounded bg-red-950/30 border border-red-500/20 text-red-300">
                                <strong>Rejection Reason:</strong> {issue.rejectionReason}
                              </div>
                            )}
                            {issue.resolutionRemarks && (
                              <div className="text-[11px] p-2 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                                <strong>Resolution Remarks:</strong> {issue.resolutionRemarks}
                              </div>
                            )}
                          </div>

                          {/* Action Column */}
                          <div className="flex flex-row lg:flex-col items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                            <button
                              type="button"
                              onClick={() => setSelectedIssueDetail(issue)}
                              className="w-full lg:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              <span>View Details</span>
                            </button>

                            {issue.status === 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReopenModalIssue(issue);
                                  setReopenReason('');
                                  setReopenError('');
                                }}
                                className="w-full lg:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reopen</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Equipment Checklist Modal */}
      <Modal
        isOpen={activeChecklistModal}
        onClose={() => setActiveChecklistModal(false)}
        title={
          selectedBooking
            ? `Equipment Inspection — ${selectedBooking.hallName || hallMap[selectedBooking.hallId] || selectedBooking.hallId}`
            : 'Equipment Checklist'
        }
        maxWidth="750px"
      >
        {checklistLoading || !currentChecklist ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-7 h-7 mx-auto animate-spin text-cyan-400" />
            <p className="text-xs">Loading checklist for {selectedOccurrenceDate}...</p>
          </div>
        ) : (
          <div className="space-y-5 text-slate-200">
            {/* Event Summary Box */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">
                  {selectedBooking?.eventTitle}
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px] border border-cyan-500/30">
                  {formatDateDisplay(selectedOccurrenceDate)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-[11px]">
                <span>Slot: <strong className="text-slate-300">{selectedBooking?.slot} ({selectedBooking?.startTime} - {selectedBooking?.endTime})</strong></span>
                <span>Department: <strong className="text-slate-300">{selectedBooking?.department}</strong></span>
                <span>Organizer: <strong className="text-slate-300">{selectedBooking?.requesterName}</strong></span>
                {selectedBooking?.requesterPhone && (
                  <span>Phone: <strong className="text-slate-300">{selectedBooking?.requesterPhone}</strong></span>
                )}
              </div>
            </div>

            {/* Requested Arrangements Verification Section */}
            {currentChecklist.requestedArrangements && (
              <div className="space-y-2.5 p-3.5 bg-blue-950/20 border border-blue-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Organizer Requested Arrangements
                  </h4>
                  <span className="text-[10px] text-blue-400 font-semibold">
                    From Booking
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-blue-500/20 text-xs text-slate-200 whitespace-pre-wrap">
                  {typeof currentChecklist.requestedArrangements === 'string'
                    ? currentChecklist.requestedArrangements
                    : JSON.stringify(currentChecklist.requestedArrangements)}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Technician Verification / Setup Notes:
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Stage arrangement verified, extra podium mic placed..."
                    value={currentChecklist.requestedArrangementsNotes || ''}
                    onChange={(e) =>
                      setCurrentChecklist({
                        ...currentChecklist,
                        requestedArrangementsNotes: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                  />
                </div>
              </div>
            )}

            {/* Standard Equipment Items Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                  Standard Equipment Condition
                </h4>
                <span className="text-[10px] text-slate-400">
                  Mark condition and note any faults
                </span>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {(currentChecklist.items || []).map((item, idx) => {
                  return (
                    <div
                      key={item.key || item.itemId || idx}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-400">
                            {item.category || 'EQUIP'}
                          </span>
                          <span className="text-xs font-bold text-white">{item.itemName || item.name}</span>
                        </div>

                        {/* Status Selectors */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(idx, 'OK')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                              item.status === 'OK'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(idx, 'FAULTY')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                              item.status === 'FAULTY'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <X className="w-3 h-3" />
                            FAULTY
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(idx, 'PENDING')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                              item.status === 'PENDING'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <HelpCircle className="w-3 h-3" />
                            PENDING
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(idx, 'NOT_REQUIRED')}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              item.status === 'NOT_REQUIRED'
                                ? 'bg-slate-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            N/A
                          </button>
                          {((item.key && item.key.startsWith('custom_')) || (item.itemId && item.itemId.startsWith('custom_'))) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notes input */}
                      <input
                        type="text"
                        placeholder="Condition remarks or fault notes..."
                        value={item.notes || ''}
                        onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Item */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Add additional equipment (e.g. Wireless clicker, Extra extension box)..."
                  value={newCustomItemName}
                  onChange={(e) => setNewCustomItemName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={newCustomItemCategory}
                  onChange={(e) => setNewCustomItemCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="AUDIO">Audio</option>
                  <option value="DISPLAY">Display</option>
                  <option value="CLIMATE">Climate</option>
                  <option value="POWER">Power</option>
                  <option value="NETWORK">Network</option>
                  <option value="CUSTOM">Custom</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  disabled={!newCustomItemName.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Overall Status & Remarks */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-white">Overall Readiness Status:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'VERIFIED', label: 'Verified & Ready', color: 'emerald' },
                    { id: 'IN_PROGRESS', label: 'In Progress', color: 'blue' },
                    { id: 'ISSUES_REPORTED', label: 'Faults / Issues', color: 'rose' },
                    { id: 'PENDING', label: 'Pending Inspection', color: 'amber' },
                  ].map((st) => {
                    const currentStatus = currentChecklist.checklistStatus || 'PENDING';
                    const isSelected = currentStatus === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          setCurrentChecklist({
                            ...currentChecklist,
                            checklistStatus: st.id,
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          isSelected
                            ? st.color === 'emerald'
                              ? 'bg-emerald-600 text-white shadow'
                              : st.color === 'rose'
                              ? 'bg-rose-600 text-white shadow'
                              : st.color === 'blue'
                              ? 'bg-blue-600 text-white shadow'
                              : 'bg-amber-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  General Remarks / Handover Notes:
                </label>
                <textarea
                  rows={2}
                  placeholder="E.g. Audio checked at 9:00 AM, all 3 mics tested and batteries replaced, stage projector aligned."
                  value={currentChecklist.generalRemarks || ''}
                  onChange={(e) =>
                    setCurrentChecklist({
                      ...currentChecklist,
                      generalRemarks: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {(currentChecklist.technicianName || currentChecklist.inspectedByName) && (
                <div className="text-[10px] text-slate-500">
                  Last inspected by: <strong className="text-slate-400">{currentChecklist.technicianName || currentChecklist.inspectedByName}</strong>
                  {currentChecklist.inspectedAt && (
                    <span> on {new Date(currentChecklist.inspectedAt).toLocaleString()}</span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveChecklistModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChecklist}
                disabled={savingChecklist}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-cyan-600/20 transition active:scale-95 disabled:opacity-50"
              >
                {savingChecklist && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Checklist
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Electrical Issue Details & History Modal */}
      <Modal
        isOpen={Boolean(selectedIssueDetail)}
        onClose={() => setSelectedIssueDetail(null)}
        title={
          selectedIssueDetail
            ? `Issue Details — ${selectedIssueDetail.requestId}`
            : 'Issue Details'
        }
        maxWidth="750px"
      >
        {selectedIssueDetail && (
          <div className="space-y-5 text-slate-200">
            {/* Header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    {selectedIssueDetail.requestId}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                      ISSUE_PRIORITY_STYLES[selectedIssueDetail.priority]?.bg || 'bg-slate-800'
                    } ${
                      ISSUE_PRIORITY_STYLES[selectedIssueDetail.priority]?.text || 'text-slate-300'
                    } ${
                      ISSUE_PRIORITY_STYLES[selectedIssueDetail.priority]?.border || 'border-slate-700'
                    }`}
                  >
                    {selectedIssueDetail.priority} PRIORITY
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                      ISSUE_STATUS_STYLES[selectedIssueDetail.status]?.bg || 'bg-slate-800'
                    } ${
                      ISSUE_STATUS_STYLES[selectedIssueDetail.status]?.text || 'text-slate-300'
                    } ${
                      ISSUE_STATUS_STYLES[selectedIssueDetail.status]?.border || 'border-slate-700'
                    }`}
                  >
                    {ISSUE_STATUS_STYLES[selectedIssueDetail.status]?.label || selectedIssueDetail.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Category: <strong className="text-slate-200">{selectedIssueDetail.issueCategory}</strong>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400">
                <div>
                  Reported: <strong className="text-slate-300">{new Date(selectedIssueDetail.reportedAt || selectedIssueDetail.createdAt).toLocaleString()}</strong>
                </div>
                {selectedIssueDetail.resolvedAt && (
                  <div>
                    Resolved: <strong className="text-emerald-400">{new Date(selectedIssueDetail.resolvedAt).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Location Details */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Location Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                <div>Zone / Type: <strong>{selectedIssueDetail.locationType}</strong></div>
                <div>Building: <strong>{selectedIssueDetail.buildingName}</strong></div>
                <div>Floor: <strong>{selectedIssueDetail.floor}</strong></div>
                <div>Room: <strong>{selectedIssueDetail.roomNumber || 'N/A'}</strong></div>
              </div>
              <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                Exact Spot: <strong className="text-white">{selectedIssueDetail.specificLocation}</strong>
              </div>
            </div>

            {/* Description & Photo */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Problem Description
              </h4>
              <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedIssueDetail.description}
              </p>
              {selectedIssueDetail.photoUrl && (
                <div className="mt-2">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Attached Photo:</span>
                  <img
                    src={selectedIssueDetail.photoUrl}
                    alt="Issue attachment"
                    className="max-h-56 rounded-lg border border-slate-800 object-cover"
                  />
                </div>
              )}
            </div>

            {/* Electrician & Assignment Info */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Assigned Electrician
              </h4>
              {selectedIssueDetail.assignedElectricianName ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-white font-medium">
                    {selectedIssueDetail.assignedElectricianName}
                  </div>
                  {selectedIssueDetail.assignedElectricianPhone && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{selectedIssueDetail.assignedElectricianPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 italic">No electrician assigned yet.</p>
              )}
            </div>

            {/* Remarks / Reasons */}
            {(selectedIssueDetail.rejectionReason ||
              selectedIssueDetail.acceptanceRemarks ||
              selectedIssueDetail.workRemarks ||
              selectedIssueDetail.resolutionRemarks ||
              selectedIssueDetail.reopenReason) && (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Remarks & Observations
                </h4>
                {selectedIssueDetail.rejectionReason && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-500/30 text-red-300">
                    <strong>Rejection Reason:</strong> {selectedIssueDetail.rejectionReason}
                  </div>
                )}
                {selectedIssueDetail.acceptanceRemarks && (
                  <div className="p-2.5 rounded bg-blue-950/40 border border-blue-500/30 text-blue-300">
                    <strong>Acceptance Remarks:</strong> {selectedIssueDetail.acceptanceRemarks}
                  </div>
                )}
                {selectedIssueDetail.workRemarks && (
                  <div className="p-2.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300">
                    <strong>Work Progress Remarks:</strong> {selectedIssueDetail.workRemarks}
                  </div>
                )}
                {selectedIssueDetail.resolutionRemarks && (
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    <strong>Resolution Remarks:</strong> {selectedIssueDetail.resolutionRemarks}
                  </div>
                )}
                {selectedIssueDetail.reopenReason && (
                  <div className="p-2.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300">
                    <strong>Reopen Reason:</strong> {selectedIssueDetail.reopenReason}
                  </div>
                )}
              </div>
            )}

            {/* Status History Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Status History Timeline
              </h4>
              {selectedIssueDetail.statusHistory && selectedIssueDetail.statusHistory.length > 0 ? (
                <div className="relative pl-6 space-y-4 border-l-2 border-slate-800 ml-2">
                  {selectedIssueDetail.statusHistory.map((step, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-slate-900" />
                      <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                              ISSUE_STATUS_STYLES[step.status]?.bg || 'bg-slate-800'
                            } ${
                              ISSUE_STATUS_STYLES[step.status]?.text || 'text-slate-300'
                            } ${
                              ISSUE_STATUS_STYLES[step.status]?.border || 'border-slate-700'
                            }`}
                          >
                            {step.status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(step.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          By: <strong className="text-slate-300">{step.changedByName || step.changedByUserId || 'System'}</strong> ({step.changedByRole || 'SYSTEM'})
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
                <p className="text-xs text-slate-500 italic">No history records logged yet.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {selectedIssueDetail.status === 'COMPLETED' ? (
                <button
                  type="button"
                  onClick={() => {
                    const issueToReopen = selectedIssueDetail;
                    setSelectedIssueDetail(null);
                    setReopenModalIssue(issueToReopen);
                    setReopenReason('');
                    setReopenError('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen Ticket</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setSelectedIssueDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reopen Ticket Modal */}
      <Modal
        isOpen={Boolean(reopenModalIssue)}
        onClose={() => {
          if (!reopenSubmitting) setReopenModalIssue(null);
        }}
        title={`Reopen Ticket — ${reopenModalIssue?.requestId || ''}`}
        maxWidth="500px"
      >
        <div className="space-y-4 text-slate-200">
          <div className="p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl text-xs text-purple-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Reopen this electrical issue</p>
              <p className="text-purple-300/80 mt-0.5">
                If the reported problem persists or was not resolved satisfactorily, provide a clear explanation below. The assigned electrician will be notified.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Reason for Reopening <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              value={reopenReason}
              onChange={(e) => {
                setReopenReason(e.target.value);
                if (reopenError) setReopenError('');
              }}
              placeholder="State why the issue requires further repair work (minimum 5 characters)..."
              className="ste-modal-textarea"
            />
            {reopenError && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {reopenError}
              </p>
            )}
            <div className="text-[11px] text-slate-500 text-right mt-1">
              {reopenReason.length} characters (min 5)
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setReopenModalIssue(null)}
              disabled={reopenSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReopenSubmit}
              disabled={reopenSubmitting || !reopenReason || reopenReason.trim().length < 5}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {reopenSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Reopen</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
