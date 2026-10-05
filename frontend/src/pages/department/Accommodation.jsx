import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  Users,
  Wifi,
  Tv,
  AirVent,
  Bath,
  RotateCcw,
  Send,
  Info,
  Home,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  Search,
  Filter,
  Wrench,
  MapPin,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { accommodationApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { ServiceDateRangeViewer } from '../../components/common/ServiceDateRangeViewer';
import confetti from 'canvas-confetti';
import { getTodayStr, getDateOffsetStr } from '../../utils/dateUtils';

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') return dateVal.substring(0, 10);
  if (Array.isArray(dateVal)) {
    const [y, m, d] = dateVal;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(dateVal).substring(0, 10);
};

export const Accommodation = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [rooms, setRooms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'my-requests'
  const [selectedReqModal, setSelectedReqModal] = useState(null);

  // Form states
  const [hostel, setHostel] = useState('Girls Hostel');
  const [roomType, setRoomType] = useState('AC Room');
  const [roomId, setRoomId] = useState('GH-AC-1');
  const [checkInDate, setCheckInDate] = useState(getTodayStr());
  const [checkOutDate, setCheckOutDate] = useState(getDateOffsetStr(2));
  const [guestsCount, setGuestsCount] = useState(1);
  const [facultyOrGuestName, setFacultyOrGuestName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [liveAvailabilityStatus, setLiveAvailabilityStatus] = useState(null);

  // Filter states for My Requests tab
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [myStatusFilter, setMyStatusFilter] = useState('ALL');
  const [myHostelFilter, setMyHostelFilter] = useState('ALL');
  const [myTypeFilter, setMyTypeFilter] = useState('ALL');

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [targetHostel, setTargetHostel] = useState('Girls Hostel');
  const [targetRoomType, setTargetRoomType] = useState('AC Room');
  const [targetRoomId, setTargetRoomId] = useState('GH-AC-1');
  const [targetCheckIn, setTargetCheckIn] = useState(getTodayStr());
  const [targetCheckOut, setTargetCheckOut] = useState(getDateOffsetStr(2));
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.userId]);

  const loadData = async () => {
    try {
      const [roomsRes, reqsRes] = await Promise.all([
        accommodationApi.getRooms(),
        accommodationApi.getRequests(),
      ]);
      if (roomsRes.data) setRooms(roomsRes.data);
      if (reqsRes.data) setRequests(reqsRes.data);
    } catch (e) {
      showToast('Failed to load accommodation data', 'error');
    }
  };

  // Live availability check when room or dates change
  useEffect(() => {
    if (!roomId || !checkInDate || !checkOutDate) return;
    if (checkInDate >= checkOutDate) {
      setLiveAvailabilityStatus(null);
      return;
    }

    let isMounted = true;
    const checkRoomAvail = async () => {
      setCheckingAvailability(true);
      try {
        const res = await accommodationApi.getRoomAvailability(roomId, {
          checkInDate,
          checkOutDate,
        });
        if (isMounted && res.data) {
          setLiveAvailabilityStatus(res.data);
        }
      } catch (err) {
        if (isMounted) setLiveAvailabilityStatus(null);
      } finally {
        if (isMounted) setCheckingAvailability(false);
      }
    };

    const timer = setTimeout(checkRoomAvail, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [roomId, checkInDate, checkOutDate]);

  const selectedRoomObj = rooms.find((r) => r.roomId === roomId);
  const isRoomInMaintenance =
    selectedRoomObj?.status === 'Maintenance' ||
    selectedRoomObj?.status === 'Unavailable' ||
    selectedRoomObj?.isUnderMaintenance;

  const handleSelectRoom = (room) => {
    setHostel(room.hostel);
    setRoomType(room.roomType);
    setRoomId(room.roomId);
    if (room.status === 'Maintenance' || room.status === 'Unavailable') {
      showToast(`Note: ${room.roomId} is currently under ${room.status}`, 'warning');
    } else {
      showToast(`Selected ${room.roomId} (${room.hostel})`, 'info');
    }
  };

  const handleReset = () => {
    setFacultyOrGuestName('');
    setPurpose('');
    setAdditionalNotes('');
    setGuestsCount(1);
    setCheckInDate(getTodayStr());
    setCheckOutDate(getDateOffsetStr(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = getTodayStr();
    if (checkInDate < today) {
      showToast('Check-in date cannot be in the past', 'warning');
      return;
    }
    if (checkInDate === checkOutDate) {
      showToast('Same-day check-in and check-out is not allowed. Check-out must be at least the next day.', 'warning');
      return;
    }
    if (checkOutDate < checkInDate) {
      showToast('Check-out date cannot be earlier than check-in date', 'warning');
      return;
    }
    const count = Number(guestsCount);
    if (!guestsCount || isNaN(count) || count < 1) {
      showToast('Number of guests must be at least 1', 'warning');
      return;
    }
    if (count > 50) {
      showToast('Number of guests cannot exceed 50', 'warning');
      return;
    }
    if (isRoomInMaintenance) {
      showToast(
        `Room ${roomId} is currently under ${selectedRoomObj?.status || 'Maintenance'}. Please choose another room.`,
        'error'
      );
      return;
    }
    if (!purpose.trim()) {
      showToast('Please specify the purpose of visit', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await accommodationApi.createRequest({
        facultyOrGuestName: facultyOrGuestName.trim() || 'Visiting Guest',
        hostel,
        roomType,
        roomId,
        checkInDate,
        checkOutDate,
        guestsCount: Number(guestsCount),
        purpose,
        additionalNotes,
      });

      if (res.success) {
        showToast('Accommodation request submitted successfully!', 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        handleReset();
        await loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit accommodation request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancel = (req) => {
    setCancelItem(req);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  // Submit Cancellation
  const handleSubmitCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Please enter a cancellation reason', 'warning');
      return;
    }

    const reqId = cancelItem?.id || cancelItem?.requestId;
    setCancelLoading(true);
    try {
      const res = await accommodationApi.cancelRequest(reqId, {
        reason: cancelReason.trim(),
      });
      if (res.success) {
        const isPending = cancelItem.status === 'PENDING';
        showToast(
          isPending
            ? 'Booking cancelled immediately.'
            : 'Cancellation request submitted for admin review.',
          'success'
        );
        setCancelModalOpen(false);
        setCancelItem(null);
        await loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to process cancellation', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (req) => {
    setRescheduleItem(req);
    setTargetHostel(req.hostel || 'Girls Hostel');
    setTargetRoomType(req.roomType || 'AC Room');
    setTargetRoomId(req.roomId || (req.hostel?.includes('Girls') ? 'GH-AC-1' : 'BH-AC-1'));
    setTargetCheckIn(req.checkInDate || getTodayStr());
    setTargetCheckOut(req.checkOutDate || getDateOffsetStr(2));
    setRescheduleReason('');
    setRescheduleModalOpen(true);
  };

  // Submit Reschedule
  const handleSubmitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleReason.trim()) {
      showToast('Please enter a reason for rescheduling', 'warning');
      return;
    }
    const today = getTodayStr();
    if (targetCheckIn < today) {
      showToast('New check-in date cannot be in the past', 'warning');
      return;
    }
    if (targetCheckIn === targetCheckOut) {
      showToast('Same-day check-in/out is not allowed for reschedule.', 'warning');
      return;
    }
    if (targetCheckOut < targetCheckIn) {
      showToast('New check-out date cannot be earlier than check-in', 'warning');
      return;
    }

    const reqId = rescheduleItem?.id || rescheduleItem?.requestId;
    setRescheduleLoading(true);
    try {
      const res = await accommodationApi.rescheduleRequest(reqId, {
        newRoomId: targetRoomId,
        newCheckInDate: targetCheckIn,
        newCheckOutDate: targetCheckOut,
        reason: rescheduleReason.trim(),
      });
      if (res.success) {
        showToast(
          'Reschedule request submitted. Awaiting administrator review.',
          'success'
        );
        setRescheduleModalOpen(false);
        setRescheduleItem(null);
        await loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit reschedule request', 'error');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const girlsRooms = rooms.filter((r) => r.hostel.includes('Girls'));
  const boysRooms = rooms.filter((r) => r.hostel.includes('Boys'));

  const fetchAccommodationBookings = async ({ fromDate, toDate }) => {
    const res = await accommodationApi.getRequests({ fromDate, toDate });
    return res.data || [];
  };

  // Filtered requests for "My Accommodation Requests" tab
  const filteredMyRequests = requests.filter((r) => {
    const q = mySearchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (r.requestId && r.requestId.toLowerCase().includes(q)) ||
      (r.facultyOrGuestName && r.facultyOrGuestName.toLowerCase().includes(q)) ||
      (r.purpose && r.purpose.toLowerCase().includes(q)) ||
      (r.hostel && r.hostel.toLowerCase().includes(q));

    const matchStatus = myStatusFilter === 'ALL' || r.status === myStatusFilter;
    const matchHostel = myHostelFilter === 'ALL' || r.hostel === myHostelFilter;
    const matchType = myTypeFilter === 'ALL' || r.roomType === myTypeFilter;

    return matchSearch && matchStatus && matchHostel && matchType;
  });

  return (
    <div className="page-stack">
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-glow" />
        <div>
          <h1 className="page-banner-title">Guest Room Accommodation</h1>
          <p className="page-banner-subtitle">
            Request guest rooms for visiting faculty, speakers, or external guests.
          </p>
        </div>
        <div className="banner-tagline">“Comfort to Collaborate”</div>
      </div>

      {/* Date Range Bookings Viewer */}
      <ServiceDateRangeViewer
        title="View Accommodation Bookings in Date Range"
        buttonLabel="Show Bookings"
        countLabel="Total Bookings"
        loadingMessage="Loading accommodation bookings..."
        errorMessage="Unable to load accommodation bookings. Please try again."
        emptyMessage="No accommodation bookings found for the selected date range."
        onFetch={fetchAccommodationBookings}
        renderResults={(records) => (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Check-in Date</th>
                <th>Check-out Date</th>
                <th>Hostel</th>
                <th>Room / Type</th>
                <th>Department</th>
                <th>Applicant / Guest</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((a, idx) => (
                <tr key={a.id || a.requestId || idx}>
                  <td className="table-cell-date">{formatDateDisplay(a.checkInDate)}</td>
                  <td className="table-cell-date">{formatDateDisplay(a.checkOutDate)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.hostel}</td>
                  <td>{a.roomType || a.roomId || '-'}</td>
                  <td>{a.department}</td>
                  <td>{a.facultyOrGuestName || a.requestedBy || '-'}</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      />

      {/* Tabs */}
      <div className="tabs-container">
        <button
          onClick={() => setActiveTab('available')}
          className={`btn tab-pill-btn ${activeTab === 'available' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <BedDouble size={16} /> Available Rooms & Booking
        </button>
        <button
          onClick={() => setActiveTab('my-requests')}
          className={`btn tab-pill-btn ${activeTab === 'my-requests' ? 'btn-primary' : 'btn-secondary'}`}
        >
          My Accommodation Requests ({requests.length})
        </button>
      </div>

      {activeTab === 'available' ? (
        <div className="column-stack">
          {/* Top Row: Left = Room Selection, Right = Availability & Calendar */}
          <div className="two-column-layout balanced">
            {/* Left Column: Hostel & Room Selection */}
            <div className="card-panel accommodation-selection-panel">
              <span className="accommodation-selection-title">
                <BedDouble size={18} className="text-arctic-blue" />
                Hostel & Room Selection
              </span>
              <div className="space-y-3.5">
                {/* Girls Hostel Block */}
                <div>
                  <div className="hostel-block-header">
                    <Home size={13} /> Girls Hostel – Guest Rooms
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {girlsRooms.map((room) => {
                      const isMaint = room.status === 'Maintenance' || room.status === 'Unavailable';
                      const isSelected = roomId === room.roomId;
                      return (
                        <div
                          key={room.roomId}
                          onClick={() => handleSelectRoom(room)}
                          className={`room-card-compact ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="room-header">
                            <span className="room-title">
                              {room.roomType}
                            </span>
                            <StatusBadge
                              status={isMaint ? 'MAINTENANCE' : room.available ? 'AVAILABLE' : 'PENDING'}
                            />
                          </div>
                          <div className="room-meta-row">
                            <span className="font-mono text-arctic-blue font-semibold">{room.roomId}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users size={11} className="text-arctic-blue" /> {room.capacity} Guests
                            </span>
                          </div>
                          {room.location && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                              <MapPin size={10} className="text-slate-500" /> {room.location}
                            </div>
                          )}
                          <div className="room-amenities-row">
                            {room.amenities?.slice(0, 3).map((a) => (
                              <span key={a} className="amenity-chip">✓ {a}</span>
                            ))}
                          </div>
                          <button
                            type="button"
                            className={`btn btn-sm w-full mt-2 text-xs py-1 ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                          >
                            {isSelected ? 'Selected' : 'Select Room'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Boys Hostel Block */}
                <div>
                  <div className="hostel-block-header">
                    <Home size={13} /> Boys Hostel – Guest Rooms
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {boysRooms.map((room) => {
                      const isMaint = room.status === 'Maintenance' || room.status === 'Unavailable';
                      const isSelected = roomId === room.roomId;
                      return (
                        <div
                          key={room.roomId}
                          onClick={() => handleSelectRoom(room)}
                          className={`room-card-compact ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="room-header">
                            <span className="room-title">
                              {room.roomType}
                            </span>
                            <StatusBadge
                              status={isMaint ? 'MAINTENANCE' : room.available ? 'AVAILABLE' : 'PENDING'}
                            />
                          </div>
                          <div className="room-meta-row">
                            <span className="font-mono text-arctic-blue font-semibold">{room.roomId}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users size={11} className="text-arctic-blue" /> {room.capacity} Guests
                            </span>
                          </div>
                          {room.location && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                              <MapPin size={10} className="text-slate-500" /> {room.location}
                            </div>
                          )}
                          <div className="room-amenities-row">
                            {room.amenities?.slice(0, 3).map((a) => (
                              <span key={a} className="amenity-chip">✓ {a}</span>
                            ))}
                          </div>
                          <button
                            type="button"
                            className={`btn btn-sm w-full mt-2 text-xs py-1 ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                          >
                            {isSelected ? 'Selected' : 'Select Room'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Room Availability & Status */}
            <div className="card-panel">
              <span className="card-title mb-2.5 flex items-center gap-1.5 font-bold text-sm">
                <Clock size={16} className="text-arctic-blue" />
                Live Room Availability & Status
              </span>

              {/* Maintenance Warning */}
              {isRoomInMaintenance && (
                <div className="mb-2.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-400 flex-shrink-0" />
                  <span>
                    Warning: Room <strong>{roomId}</strong> is under {selectedRoomObj?.status || 'Maintenance'}.
                    Requests for this room will be rejected.
                  </span>
                </div>
              )}

              {liveAvailabilityStatus && !isRoomInMaintenance && (
                <div
                  className={`mb-2.5 p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    liveAvailabilityStatus.isAvailable
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {liveAvailabilityStatus.isAvailable ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-400" />
                    )}
                    <span>
                      {liveAvailabilityStatus.isAvailable
                        ? `Room ${roomId} is AVAILABLE for selected dates.`
                        : `Room ${roomId} has conflicting bookings for selected dates.`}
                    </span>
                  </div>
                  {checkingAvailability && (
                    <span className="text-[10px] text-slate-400">checking...</span>
                  )}
                </div>
              )}

              {/* Selected Room Details Highlight */}
              {selectedRoomObj && (
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1 mb-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Selected Facility:</span>
                    <span className="font-semibold text-white">{selectedRoomObj.hostel} — {selectedRoomObj.roomType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Room Code:</span>
                    <span className="font-mono text-arctic-blue font-semibold">{selectedRoomObj.roomId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Max Capacity:</span>
                    <span className="text-slate-200">{selectedRoomObj.capacity} Guests</span>
                  </div>
                  {selectedRoomObj.location && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Location:</span>
                      <span className="text-slate-300">{selectedRoomObj.location}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Calendar */}
              <QuickCalendar
                title="Accommodation Quick Calendar"
                selectedDate={checkInDate}
                onSelectDate={(newDate) => {
                  setCheckInDate(newDate);
                  setCheckOutDate(getDateOffsetStr(1, newDate));
                }}
                events={requests.map((r) => ({
                  id: r.id || r.requestId,
                  date: r.checkInDate,
                  title: `${r.hostel} - ${r.roomType} (${r.guestsCount} guests)`,
                  status: r.status,
                  department: r.department,
                }))}
                showLegend={true}
                showEventsList={true}
              />
            </div>
          </div>

          {/* Bottom Panel: Accommodation Request Form (Spans Full Width with balanced grid) */}
          <div className="card-panel">
            <div className="mb-3.5 pb-2 border-b border-slate-800">
              <span className="card-title flex items-center gap-2">
                <BedDouble size={18} className="text-arctic-blue" />
                Accommodation Request Form
              </span>
              <p className="card-subtitle text-xs text-slate-400 mt-0.5">
                Submit guest room reservation details for official faculty or external visitor stays.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="form-column">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs">Hostel *</label>
                  <select
                    value={hostel}
                    onChange={(e) => {
                      const newHostel = e.target.value;
                      setHostel(newHostel);
                      const prefix = newHostel.includes('Girls') ? 'GH' : 'BH';
                      const suffix = roomType.includes('Non-AC') ? 'NAC-1' : 'AC-1';
                      setRoomId(`${prefix}-${suffix}`);
                    }}
                    className="w-full text-xs"
                  >
                    <option value="Girls Hostel">Girls Hostel</option>
                    <option value="Boys Hostel">Boys Hostel</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Room Type *</label>
                  <select
                    value={roomType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setRoomType(newType);
                      const prefix = hostel.includes('Girls') ? 'GH' : 'BH';
                      const suffix = newType.includes('Non-AC') ? 'NAC-1' : 'AC-1';
                      setRoomId(`${prefix}-${suffix}`);
                    }}
                    className="w-full text-xs"
                  >
                    <option value="AC Room">
                      AC Room ({hostel.includes('Girls') ? 'GH-AC-1' : 'BH-AC-1'})
                    </option>
                    <option value="Non-AC Room">
                      Non-AC Room ({hostel.includes('Girls') ? 'GH-NAC-1' : 'BH-NAC-1'})
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Check-in Date *</label>
                  <input
                    type="date"
                    value={checkInDate}
                    min={getTodayStr()}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Check-out Date *</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    min={checkInDate || getTodayStr()}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="form-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label text-xs mb-0">Number of Guests *</label>
                    <span className="text-[10px] text-slate-400">
                      Minimum: 1 | Maximum: 50
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(e.target.value)}
                    placeholder="Enter guest count (1-50)"
                    required
                    className="w-full text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Number of Guests (Minimum: 1 | Maximum: 50)
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Guest / Faculty Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Ramesh (External Guest)"
                    value={facultyOrGuestName}
                    onChange={(e) => setFacultyOrGuestName(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="form-group">
                  <label className="form-label text-xs">Purpose of Visit *</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Guest Lecture, Workshop, Interview"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                    className="w-full text-xs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">Additional Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Any special requirements..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="form-actions-row">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-outline btn-flex-1 text-xs"
                  disabled={submitting}
                >
                  <RotateCcw size={14} /> Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-flex-2 text-xs"
                  disabled={submitting || isRoomInMaintenance}
                >
                  <Send size={14} /> {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>

          {/* Guidelines Box */}
          <div className="guidelines-card">
            <div className="guidelines-header">
              <Info size={16} className="text-arctic-blue" />
              <span className="guidelines-title text-xs">Accommodation Guidelines</span>
            </div>
            <ul className="guidelines-list text-xs">
              <li>Rooms are available strictly for official college guest visits and invited speakers.</li>
              <li>Same-day check-in/out is not supported. Multi-day stays allowed.</li>
              <li>Requests must be submitted within room capacity limits.</li>
              <li>Approved requests can be rescheduled or cancelled upon review.</li>
            </ul>
            <div className="guidelines-footer">
              <Home size={14} className="text-emerald" />
              <span className="guidelines-tagline text-xs">“Comfort to Collaborate”</span>
            </div>
          </div>

          {/* Full-width Recent Accommodation Requests Table */}
          <div className="recent-card-panel">
            <div className="card-header">
              <span className="card-title">Recent Accommodation Requests</span>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Hostel</th>
                    <th>Room</th>
                    <th>Dates</th>
                    <th>Guests</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="table-empty-cell">
                        No accommodation requests yet.
                      </td>
                    </tr>
                  ) : (
                    requests.slice(0, 5).map((r) => {
                      const canCancel =
                        r.status === 'PENDING' ||
                        r.status === 'APPROVED' ||
                        r.status === 'BOOKED';
                      const canReschedule =
                        r.status === 'APPROVED' || r.status === 'BOOKED';

                      return (
                        <tr key={r.id || r.requestId}>
                          <td className="font-mono text-xs font-semibold text-slate-200">
                            {r.requestId || '-'}
                          </td>
                          <td>{r.hostel}</td>
                          <td>{r.roomType || r.roomId}</td>
                          <td className="table-cell-date text-xs">
                            {formatDateDisplay(r.checkInDate)} → {formatDateDisplay(r.checkOutDate)}
                          </td>
                          <td>{r.guestsCount}</td>
                          <td>
                            <StatusBadge status={r.status} />
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedReqModal(r)}
                                className="action-view-btn"
                                title="View Details & PDF"
                              >
                                <Eye size={12} /> View
                              </button>
                              {canCancel && (
                                <button
                                  onClick={() => handleOpenCancel(r)}
                                  className="btn btn-outline btn-sm text-rose-400 hover:text-rose-300 border-rose-500/40 text-[11px] py-0.5 px-1.5"
                                  title="Cancel"
                                >
                                  <XCircle size={12} />
                                </button>
                              )}
                              {canReschedule && (
                                <button
                                  onClick={() => handleOpenReschedule(r)}
                                  className="btn btn-outline btn-sm text-blue-400 hover:text-blue-300 border-blue-500/40 text-[11px] py-0.5 px-1.5"
                                  title="Reschedule"
                                >
                                  <RotateCcw size={12} />
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
        </div>
      ) : (
        /* My Accommodation Requests Full List Tab */
        <div className="card-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="card-title">My Accommodation Requests</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {requests.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                View status, download official PDF approval docs, cancel or reschedule requests.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="btn btn-outline btn-sm text-xs py-1 px-2.5 self-start md:self-auto flex items-center gap-1.5"
              title="Refresh requests"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          {/* 4 Stat Cards */}
          <div className="stat-grid-4 mb-4">
            <StatCard
              icon={BedDouble}
              value={requests.length}
              subtitle="Total Requests"
              color="blue"
            />
            <StatCard
              icon={Clock}
              value={requests.filter((r) => r.status === 'PENDING').length}
              subtitle="Pending Review"
              color="amber"
            />
            <StatCard
              icon={CheckCircle2}
              value={requests.filter((r) => r.status === 'APPROVED' || r.status === 'BOOKED').length}
              subtitle="Approved Bookings"
              color="emerald"
            />
            <StatCard
              icon={XCircle}
              value={requests.filter((r) => r.status === 'CANCELLED' || r.status === 'CANCELLATION_REQUESTED' || r.status === 'REJECTED').length}
              subtitle="Cancelled / Rejected"
              color="rose"
            />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ID, guest, purpose..."
                value={mySearchQuery}
                onChange={(e) => setMySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500"
              />
            </div>

            <select
              value={myStatusFilter}
              onChange={(e) => setMyStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="CANCELLATION_REQUESTED">Cancel Requested</option>
              <option value="RESCHEDULE_REQUESTED">Reschedule Requested</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={myHostelFilter}
              onChange={(e) => setMyHostelFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="ALL">All Hostels</option>
              <option value="Girls Hostel">Girls Hostel</option>
              <option value="Boys Hostel">Boys Hostel</option>
            </select>

            <select
              value={myTypeFilter}
              onChange={(e) => setMyTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="ALL">All Room Types</option>
              <option value="AC Room">AC Room</option>
              <option value="Non-AC Room">Non-AC Room</option>
            </select>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Hostel</th>
                  <th>Room Type</th>
                  <th>Dates</th>
                  <th>Guests</th>
                  <th>Guest / Faculty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMyRequests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="table-empty-cell py-8 text-center text-slate-500">
                      No accommodation requests found.
                    </td>
                  </tr>
                ) : (
                  filteredMyRequests.map((r) => {
                    const canCancel =
                      r.status === 'PENDING' ||
                      r.status === 'APPROVED' ||
                      r.status === 'BOOKED';
                    const canReschedule =
                      r.status === 'APPROVED' || r.status === 'BOOKED';

                    return (
                      <tr key={r.id || r.requestId}>
                        <td className="font-mono text-xs font-semibold text-slate-200">
                          {r.requestId}
                        </td>
                        <td className="font-medium text-slate-200">{r.hostel}</td>
                        <td>{r.roomType}</td>
                        <td className="table-cell-date text-xs">
                          {formatDateDisplay(r.checkInDate)} → {formatDateDisplay(r.checkOutDate)}
                        </td>
                        <td>{r.guestsCount}</td>
                        <td className="text-slate-300 text-xs">
                          {r.facultyOrGuestName || 'Guest'}
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedReqModal(r)}
                              className="btn btn-outline btn-sm text-xs py-1 px-2.5 flex items-center gap-1"
                              title="View Document & PDF"
                            >
                              <Eye size={12} /> View
                            </button>
                            {canCancel && (
                              <button
                                onClick={() => handleOpenCancel(r)}
                                className="btn btn-outline btn-sm text-rose-400 hover:text-rose-300 border-rose-500/40 text-xs py-1 px-2.5 flex items-center gap-1"
                                title="Cancel"
                              >
                                <XCircle size={12} /> Cancel
                              </button>
                            )}
                            {canReschedule && (
                              <button
                                onClick={() => handleOpenReschedule(r)}
                                className="btn btn-outline btn-sm text-blue-400 hover:text-blue-300 border-blue-500/40 text-xs py-1 px-2.5 flex items-center gap-1"
                                title="Reschedule"
                              >
                                <RotateCcw size={12} /> Reschedule
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
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && cancelItem && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Accommodation Booking"
        >
          <form onSubmit={handleSubmitCancel} className="space-y-4 text-sm text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Request ID:</span>
                <span className="font-mono text-white">{cancelItem.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Room:</span>
                <span className="text-white">{cancelItem.hostel} - {cancelItem.roomType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dates:</span>
                <span className="text-white">
                  {formatDateDisplay(cancelItem.checkInDate)} → {formatDateDisplay(cancelItem.checkOutDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <StatusBadge status={cancelItem.status} />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {cancelItem.status === 'PENDING'
                ? 'This booking is currently pending review and will be cancelled immediately.'
                : 'This booking is approved. Submitting this request will flag it for Accommodation Administrator review.'}
            </p>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please state why this accommodation is no longer required..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={cancelLoading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOpen && rescheduleItem && (
        <Modal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          title="Reschedule Accommodation Booking"
        >
          <form onSubmit={handleSubmitReschedule} className="space-y-4 text-sm text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Original Request:</span>
                <span className="font-mono text-white">{rescheduleItem.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Room:</span>
                <span className="text-white">{rescheduleItem.hostel} - {rescheduleItem.roomType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Dates:</span>
                <span className="text-white">
                  {formatDateDisplay(rescheduleItem.checkInDate)} → {formatDateDisplay(rescheduleItem.checkOutDate)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Hostel</label>
                <select
                  value={targetHostel}
                  onChange={(e) => {
                    const h = e.target.value;
                    setTargetHostel(h);
                    const prefix = h.includes('Girls') ? 'GH' : 'BH';
                    const suffix = targetRoomType.includes('Non-AC') ? 'NAC-1' : 'AC-1';
                    setTargetRoomId(`${prefix}-${suffix}`);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="Girls Hostel">Girls Hostel</option>
                  <option value="Boys Hostel">Boys Hostel</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Room Type</label>
                <select
                  value={targetRoomType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setTargetRoomType(t);
                    const prefix = targetHostel.includes('Girls') ? 'GH' : 'BH';
                    const suffix = t.includes('Non-AC') ? 'NAC-1' : 'AC-1';
                    setTargetRoomId(`${prefix}-${suffix}`);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="AC Room">AC Room</option>
                  <option value="Non-AC Room">Non-AC Room</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">New Check-in Date *</label>
                <input
                  type="date"
                  value={targetCheckIn}
                  min={getTodayStr()}
                  onChange={(e) => setTargetCheckIn(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">New Check-out Date *</label>
                <input
                  type="date"
                  value={targetCheckOut}
                  min={targetCheckIn || getTodayStr()}
                  onChange={(e) => setTargetCheckOut(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Reason for Rescheduling *
              </label>
              <textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Reason for changing dates or room type..."
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={rescheduleLoading}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-md"
              >
                {rescheduleLoading ? 'Submitting...' : 'Submit Reschedule'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Enhanced Official Request Details Modal with PDF Preview & Download */}
      {selectedReqModal && (
        <RequestDetailsModal
          isOpen={!!selectedReqModal}
          onClose={() => setSelectedReqModal(null)}
          request={{
            ...selectedReqModal,
            service: 'Accommodation',
            serviceCategory: 'ACCOMMODATION',
          }}
        />
      )}
    </div>
  );
};

export default Accommodation;
