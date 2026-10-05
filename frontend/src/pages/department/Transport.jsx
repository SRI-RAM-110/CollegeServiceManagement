import React, { useState, useEffect } from 'react';
import {
  Bus,
  Clock,
  MapPin,
  Calendar,
  Users,
  Send,
  RotateCcw,
  Info,
  Phone,
  CheckCircle,
  Truck,
  Eye,
} from 'lucide-react';
import { transportApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { Modal } from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { ServiceDateRangeViewer } from '../../components/common/ServiceDateRangeViewer';
import confetti from 'canvas-confetti';
import { getTodayStr, getTomorrowStr } from '../../utils/dateUtils';

const formatDateDisplay = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') return dateVal.substring(0, 10);
  if (Array.isArray(dateVal)) {
    const [y, m, d] = dateVal;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(dateVal).substring(0, 10);
};

export const Transport = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [vehicles, setVehicles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedReqModal, setSelectedReqModal] = useState(null);

  // Form states
  const [tripType, setTripType] = useState('College Bus');
  const [tripDate, setTripDate] = useState(getTomorrowStr());
  const [roundTrip, setRoundTrip] = useState(true);
  const [pickupLocation, setPickupLocation] = useState('Narasaraopet Engineering College');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [departureTime, setDepartureTime] = useState('09:00 AM');
  const [returnTime, setReturnTime] = useState('05:00 PM');
  const [expectedPassengers, setExpectedPassengers] = useState(40);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.userId]);

  useEffect(() => {
    loadVehiclesAndTrips(tripDate);
  }, [tripDate]);

  const loadData = async () => {
    try {
      const [vRes, rRes, tRes] = await Promise.all([
        transportApi.getVehicles(tripDate),
        transportApi.getRequests(),
        transportApi.getTrips(tripDate),
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (rRes.data) setRequests(rRes.data);
      if (tRes.data) setTrips(tRes.data);
    } catch (e) {
      showToast('Failed to load transport fleet data', 'error');
    }
  };

  const loadVehiclesAndTrips = async (date) => {
    try {
      const [vRes, tRes] = await Promise.all([
        transportApi.getVehicles(date),
        transportApi.getTrips(date),
      ]);
      if (vRes.data) setVehicles(vRes.data);
      if (tRes.data) setTrips(tRes.data);
    } catch (e) {
      console.error('Error refreshing vehicles and trips for date:', e);
    }
  };

  const availableVehiclesCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedThisMonthCount = requests.filter((r) => r.status === 'APPROVED').length;

  const handleReset = () => {
    setTripType('College Bus');
    setTripDate(getTomorrowStr());
    setDestination('');
    setPurpose('');
    setExpectedPassengers(40);
    setAdditionalNotes('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const today = getTodayStr();
    if (tripDate < today) {
      showToast('Trip date cannot be in the past', 'warning');
      return;
    }
    if (!destination.trim()) {
      showToast('Please enter the destination', 'warning');
      return;
    }
    if (!purpose.trim()) {
      showToast('Please specify the trip purpose', 'warning');
      return;
    }
    if (!expectedPassengers || Number(expectedPassengers) <= 0) {
      showToast('Expected passengers must be at least 1', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await transportApi.createRequest({
        tripType,
        tripDate,
        roundTrip,
        pickupLocation,
        destination,
        purpose,
        departureTime,
        returnTime,
        expectedPassengers: Number(expectedPassengers),
        additionalNotes,
      });

      if (res.success) {
        showToast('Transport request submitted successfully!', 'success');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        handleReset();
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit transport request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTransportRequests = async ({ fromDate, toDate }) => {
    const res = await transportApi.getRequests({ fromDate, toDate });
    return res.data || [];
  };

  return (
    <div className="page-stack">
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-glow" />
        <div>
          <h1 className="page-banner-title">
            Transport Service
          </h1>
          <p className="page-banner-subtitle">
            Request college transport for departmental activities, field visits, and official trips.
          </p>
        </div>
        <div className="banner-tagline">
          “Safe Journey<br />Stronger Together”
        </div>
      </div>

      {/* Date Range Transport Requests Viewer */}
      <ServiceDateRangeViewer
        title="View Transport Requests in Date Range"
        buttonLabel="Show Requests"
        countLabel="Total Requests"
        loadingMessage="Loading transport requests..."
        errorMessage="Unable to load transport requests. Please try again."
        emptyMessage="No transport requests found for the selected date range."
        onFetch={fetchTransportRequests}
        renderResults={(records) => (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Request ID</th>
                <th>Department</th>
                <th>Departure</th>
                <th>Destination</th>
                <th>Pickup Location</th>
                <th>Time</th>
                <th>Passengers</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((t, idx) => (
                <tr key={t.id || t.requestId || idx}>
                  <td className="table-cell-date">{formatDateDisplay(t.tripDate)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.requestId}</td>
                  <td>{t.department}</td>
                  <td>{t.pickupLocation || 'Campus'}</td>
                  <td style={{ fontWeight: 600 }}>{t.destination}</td>
                  <td>{t.pickupLocation || '-'}</td>
                  <td>{t.departureTime || '-'}</td>
                  <td style={{ color: 'var(--arctic-blue)', fontWeight: 600 }}>
                    {t.expectedPassengers || 1}
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      />

      {/* Stat Cards Row */}
      <div className="stat-grid-4">
        <StatCard
          icon={Bus}
          title=""
          value={requests.length}
          subtitle="Total Transport Requests"
          color="blue"
        />
        <StatCard
          icon={Clock}
          title=""
          value={pendingRequestsCount}
          subtitle="Pending Review"
          color="amber"
        />
        <StatCard
          icon={CheckCircle}
          title=""
          value={approvedThisMonthCount}
          subtitle="Approved Trips"
          color="emerald"
        />
        <StatCard
          icon={Truck}
          title=""
          value={availableVehiclesCount}
          subtitle="Available Vehicles"
          color="cyan"
        />
      </div>

      {/* Balanced 2-Column Layout */}
      <div className="two-column-layout balanced">
        {/* Left Column: Request Form & Guidelines */}
        <div className="column-stack">
          <div className="card-panel">
            <div className="mb-4">
              <span className="card-title">
                <Bus size={18} className="text-arctic-blue" />
                Request Transport
              </span>
            </div>

            <form onSubmit={handleSubmit} className="form-column">
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">
                    Trip Type *
                  </label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                  >
                    <option value="College Bus">College Bus (50 Seater)</option>
                    <option value="Mini Bus">Mini Bus (25/32 Seater)</option>
                    <option value="Tempo Traveller">Tempo Traveller (12/17 Seater)</option>
                    <option value="Innova">Innova (7 Seater)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Trip Date *
                  </label>
                  <input
                    type="date"
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="roundTripCheck"
                  checked={roundTrip}
                  onChange={(e) => setRoundTrip(e.target.checked)}
                />
                <label htmlFor="roundTripCheck" className="checkbox-label">
                  Round Trip (Return on same day)
                </label>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">
                    Pickup Location *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Narasaraopet Engineering College"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Destination *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vijayawada"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">
                    Departure Time *
                  </label>
                  <select
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  >
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Return Time
                  </label>
                  <select
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                  >
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                    <option value="08:00 PM">08:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">
                    Expected Passengers *
                  </label>
                  <input
                    type="number"
                    value={expectedPassengers}
                    onChange={(e) => setExpectedPassengers(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Purpose of Trip *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Visit, Workshop, Conference"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Additional Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Any special requirements (e.g. extra stop, luggage, etc.)"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>

              <div className="form-actions-row">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-outline btn-flex-1"
                  disabled={submitting}
                >
                  <RotateCcw size={16} /> Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-flex-2"
                  disabled={submitting}
                >
                  <Send size={16} /> {submitting ? 'Sending...' : 'Send Request to Admin'}
                </button>
              </div>
            </form>
          </div>

          {/* Transport Guidelines */}
          <div className="guidelines-card">
            <div className="guidelines-header">
              <Info size={18} className="text-arctic-blue" />
              <span className="guidelines-title">Transport Guidelines</span>
            </div>
            <ul className="guidelines-list">
              <li>Submit requests at least 2 working days in advance.</li>
              <li>Transport is subject to availability and admin approval.</li>
              <li>Please provide accurate travel details and passenger counts.</li>
              <li>For long trips, mention halt points and return schedule if any.</li>
              <li>In case of changes, inform the admin office immediately.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Fleet, Trips, Calendar & Assistance */}
        <div className="column-stack">
          {/* Available Vehicles */}
          <div className="card-panel">
            <div className="card-header">
              <span className="card-title">Available Vehicles on {tripDate}</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {vehicles.length} Fleet
              </span>
            </div>

            <div className="vehicle-list">
              {vehicles.length === 0 ? (
                <div className="table-empty-cell">
                  No vehicles registered.
                </div>
              ) : (
                vehicles.map((v) => (
                  <div
                    key={v.vehicleId || v.id}
                    className="vehicle-item-row"
                  >
                    <div className="vehicle-item-info">
                      <div
                        className={`vehicle-icon-box ${v.status === 'AVAILABLE' ? 'available' : 'unavailable'}`}
                      >
                        <Bus size={22} className={v.status === 'AVAILABLE' ? 'text-arctic-blue' : 'text-danger'} />
                      </div>
                      <div>
                        <div className="vehicle-name">
                          {v.name}
                        </div>
                        <div className="vehicle-meta">
                          {v.registrationNumber} · {v.capacity} Seats
                        </div>
                      </div>
                    </div>

                    <StatusBadge status={v.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Trips on Selected Date */}
          <div className="card-panel">
            <div className="card-header">
              <span className="card-title">
                <Clock size={18} className="text-arctic-blue" /> Trips on {tripDate}
              </span>
              <span className="badge-trip-count">
                {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}
              </span>
            </div>

            <div className="trips-scroll-list">
              {trips.length === 0 ? (
                <div className="table-empty-cell">
                  No trips scheduled for {tripDate}.
                </div>
              ) : (
                trips.map((t) => (
                  <div
                    key={t.id || t.requestId}
                    className="trip-item-card"
                  >
                    <div className="trip-item-details">
                      <div>
                        <span className="trip-item-time">
                          {t.departureTime || '09:00 AM'}
                        </span>
                        <span className="trip-item-dest">
                          {t.destination}
                        </span>
                      </div>
                      <div className="trip-item-sub">
                        {t.department} · {t.vehicleName || t.tripType} {t.purpose ? `· ${t.purpose}` : ''}
                      </div>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Calendar */}
          <QuickCalendar
            selectedDate={tripDate}
            onSelectDate={(newDate) => setTripDate(newDate)}
            events={[
              ...requests.map((r) => ({
                id: r.id || r.requestId,
                date: r.tripDate,
                title: `${r.tripType} to ${r.destination}`,
                status: r.status,
                department: r.department,
              })),
              ...trips.map((t) => ({
                id: 'trip-' + (t.id || t.requestId),
                date: t.tripDate,
                title: `${t.vehicleName || t.tripType} - ${t.destination}`,
                status: t.status,
                department: t.department,
              })),
            ]}
          />

          {/* Need Assistance Card */}
          <div className="assistance-card">
            <div className="assistance-icon-box">
              <Phone size={20} className="text-arctic-blue" />
            </div>
            <div>
              <div className="assistance-title">Need Assistance?</div>
              <div className="assistance-sub">Contact Transport Office</div>
              <div className="assistance-phone">
                +91 86394 12345
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transport Requests Section */}
      <div className="card-panel">
        <div className="card-header">
          <span className="card-title">Recent Transport Requests</span>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Trip Type</th>
                <th>Destination</th>
                <th>Timing</th>
                <th>Passengers</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty-cell">
                    No transport requests submitted yet.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id || r.requestId}>
                    <td className="table-cell-date">{formatDateDisplay(r.tripDate || r.createdAt)}</td>
                    <td>{r.tripType}</td>
                    <td className="table-cell-dest">{r.destination}</td>
                    <td>
                      {r.departureTime} {r.returnTime ? `- ${r.returnTime}` : ''}
                    </td>
                    <td>{r.expectedPassengers}</td>
                    <td className="table-cell-purpose-truncate">
                      {r.purpose}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedReqModal(r)}
                        className="action-view-btn"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Official Request Details Modal with PDF Preview & Download */}
      {selectedReqModal && (
        <RequestDetailsModal
          isOpen={!!selectedReqModal}
          onClose={() => setSelectedReqModal(null)}
          request={{
            ...selectedReqModal,
            service: 'Transport',
            serviceCategory: 'TRANSPORT',
          }}
        />
      )}
    </div>
  );
};

export default Transport;
