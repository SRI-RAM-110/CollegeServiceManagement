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
} from 'lucide-react';
import { seminarApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import { getTodayStr, formatDateDisplay } from '../../utils/dateUtils';

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
            onClick={fetchBookings}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

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
    </div>
  );
}
