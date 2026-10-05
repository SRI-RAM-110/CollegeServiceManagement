import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLLEGE_LOGO } from '../../constants/branding';
import {
  CalendarDays,
  BedDouble,
  Bus,
  FileText,
  Coffee,
  Megaphone,
  Clock,
  Eye,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { QuickCalendar } from '../../components/calendar/QuickCalendar';
import { AnnouncementsCard } from '../../components/common/AnnouncementsCard';
import { Modal } from '../../components/common/Modal';
import { RequestDetailsModal } from '../../components/common/RequestDetailsModal';
import { getTodayStr } from '../../utils/dateUtils';

export const DepartmentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('ALL');

  const DASHBOARD_SERVICE_FILTERS = [
    { key: 'ALL', label: 'All' },
    { key: 'SEMINAR', label: 'Seminar' },
    { key: 'ACCOMMODATION', label: 'Accommodation' },
    { key: 'STATIONERY', label: 'Stationery' },
    { key: 'MEALS', label: 'Meals' },
    { key: 'TRANSPORT', label: 'Transport' },
  ];

  useEffect(() => {
    loadDashboard();
  }, [user?.userId]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getStats();
      if (res.data) {
        setDashboardData(res.data);
      }
    } catch (e) {
      console.error('Failed to load dashboard:', e);
      setError(e.response?.data?.message || e.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const stats = dashboardData?.stats || {};
  const upcomingEvents = dashboardData?.upcomingEvents || [];
  const recentRequests = dashboardData?.recentRequests || [];
  const announcements = dashboardData?.announcements || [];

  const filteredUpcomingEvents = upcomingEvents.filter((item) => {
    if (selectedServiceFilter === 'ALL') return true;
    if (item.serviceCategory) {
      return item.serviceCategory.toUpperCase() === selectedServiceFilter;
    }
    // Fallback matching
    if (selectedServiceFilter === 'SEMINAR') return item.service?.toLowerCase().includes('seminar');
    if (selectedServiceFilter === 'ACCOMMODATION') return item.service?.toLowerCase().includes('accommodation');
    if (selectedServiceFilter === 'STATIONERY') return item.service?.toLowerCase().includes('stationery');
    if (selectedServiceFilter === 'MEALS') return item.service?.toLowerCase().includes('meals') || item.service?.toLowerCase().includes('snacks');
    if (selectedServiceFilter === 'TRANSPORT') return item.service?.toLowerCase().includes('transport');
    return true;
  });

  const getEmptyMessage = (filterKey) => {
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

  if (loading && !dashboardData) {
    return (
      <div className="card-panel py-16 text-center text-slate-400">
        <div className="empty-state-branded">
          <img src={COLLEGE_LOGO} alt="NEC Logo" className="empty-state-logo pulse-subtle" style={{ objectFit: 'contain' }} />
          <span>Loading department dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="card-panel p-8 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-rose-400">
          <AlertCircle size={20} />
          <span className="font-semibold text-sm">Unable to load dashboard</span>
        </div>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={loadDashboard}
          className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
        >
          <RefreshCw size={13} />
          <span>Retry Loading Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <div className="column-stack">
      {/* Welcome Banner matching 01_Department_Dashboard.png */}
      <div className="welcome-banner">
        {/* Subtle decorative glow */}
        <div className="page-banner-glow" />

        <div className="page-banner-content">
          <h1 className="page-banner-title">
            Welcome, {user?.name || 'Department'}!
          </h1>
          <p className="page-banner-subtitle">
            Manage your departmental requests and services in one place. {user?.department ? `(${user.department} Department)` : ''}
          </p>
          <div className="page-banner-quote">
            “Collaboration Today, A Brighter Tomorrow”
          </div>
        </div>

        {/* Official College Logo */}
        <div className="banner-logo-container">
          <img src={COLLEGE_LOGO} alt="NEC College Logo" className="banner-college-logo" style={{ objectFit: 'contain' }} />
        </div>

        <div className="banner-meta">
          <div className="page-banner-badge">
            <Calendar size={15} color="var(--arctic-blue)" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="banner-tagline">
            Ideas · Inspire · Innovation
          </div>
        </div>
      </div>

      {/* 5 Service Stat Cards */}
      <div className="service-cards-grid">
        <StatCard
          icon={CalendarDays}
          title="Seminar Hall"
          value={stats.seminarHalls}
          subtitle="Your Bookings"
          color="blue"
          onClick={() => navigate('/seminar-booking')}
        />
        <StatCard
          icon={BedDouble}
          title="Accommodation"
          value={stats.accommodation}
          subtitle="Active Requests"
          color="green"
          onClick={() => navigate('/accommodation')}
        />
        <StatCard
          icon={Bus}
          title="Transport"
          value={stats.transport}
          subtitle="This Month"
          color="amber"
          onClick={() => navigate('/transport')}
        />
        <StatCard
          icon={FileText}
          title="Stationery"
          value={stats.stationery}
          subtitle="This Month"
          color="blue"
          onClick={() => navigate('/stationery')}
        />
        <StatCard
          icon={Coffee}
          title="Snacks & Meals"
          value={stats.meals}
          subtitle="This Month"
          color="blue"
          onClick={() => navigate('/snacks-meals')}
        />
      </div>

      {/* Main Grid: Left tables, Right Quick Calendar & Announcements */}
      <div className="two-column-layout">
        {/* Left Column: Tables */}
        <div className="column-stack">
          {/* Upcoming Events / Bookings */}
          <div className="card-panel">
            <div className="card-header">
              <span className="card-title">
                <CalendarDays size={18} color="var(--arctic-blue)" />
                Upcoming Events / Bookings
              </span>
              <button
                onClick={() => navigate('/my-requests')}
                className="view-all-link"
              >
                View All
              </button>
            </div>

            {/* Service Filters matching My Requests pill tabs */}
            <div className="tabs-container" style={{ marginBottom: '16px' }}>
              {DASHBOARD_SERVICE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedServiceFilter(f.key)}
                  className={`btn tab-pill-btn ${selectedServiceFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcomingEvents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="table-empty-cell">
                        {getEmptyMessage(selectedServiceFilter)}
                      </td>
                    </tr>
                  ) : (
                    filteredUpcomingEvents.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="table-cell-date">{item.date}</td>
                        <td className="table-cell-service">{item.service}</td>
                        <td>{item.details}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          <button
                            onClick={() => setSelectedRequest(item)}
                            className="action-view-btn"
                          >
                            <Eye size={15} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Requests */}
          <div className="card-panel">
            <div className="card-header">
              <span className="card-title">
                <FileText size={18} color="var(--arctic-blue)" />
                Recent Requests
              </span>
              <button
                onClick={() => navigate('/my-requests')}
                className="view-all-link"
              >
                View All
              </button>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service</th>
                    <th>Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="table-empty-cell">
                        No recent requests.
                      </td>
                    </tr>
                  ) : (
                    recentRequests.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="table-cell-date">{item.date}</td>
                        <td className="table-cell-service">{item.service}</td>
                        <td>{item.details}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Calendar & Announcements */}
        <div className="column-stack">
          <QuickCalendar
            selectedDate={selectedDate}
            onSelectDate={(newDate) => setSelectedDate(newDate)}
            events={[
              ...upcomingEvents.map((e) => ({
                id: e.id || e.title || Math.random(),
                date: e.date,
                title: `${e.title || e.eventTitle || e.purpose || e.details || 'Event'} (${e.service || 'Service'})`,
                status: e.status || 'APPROVED',
                department: e.department || user?.department,
              })),
              ...recentRequests.map((r) => ({
                id: r.id || r.details || Math.random(),
                date: r.date,
                title: `${r.service || 'Request'}: ${r.title || r.eventTitle || r.purpose || r.details || 'Details'}`,
                status: r.status,
                department: user?.department,
              })),
            ]}
          />

          {/* Real Backend Announcements Card */}
          <AnnouncementsCard />
        </div>
      </div>

      {/* Enhanced Official Request Details Modal with PDF Preview & Download */}
      {selectedRequest && (
        <RequestDetailsModal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
        />
      )}
    </div>
  );
};

export default DepartmentDashboard;
