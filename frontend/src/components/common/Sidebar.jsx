import React from 'react';
import { COLLEGE_LOGO } from '../../constants/branding';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Bus,
  FileText,
  Coffee,
  ListOrdered,
  Users,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  Building,
  Clock,
  Truck,
  Box,
  UtensilsCrossed,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const userRoles = [
    ...(user?.role ? [user.role] : []),
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ];

  const getNavLinks = () => {
    if (userRoles.includes('CREATOR') || userRoles.includes('AO_ADMIN')) {
      return [
        { name: 'Dashboard', path: '/admin/ao', icon: LayoutDashboard },
        { name: 'User Management', path: '/admin/users', icon: Users },
        { name: 'Seminar Hall', path: '/admin/seminar', icon: CalendarDays },
        { name: 'Accommodation', path: '/admin/accommodation', icon: BedDouble },
        { name: 'Transport', path: '/admin/transport', icon: Bus },
        { name: 'Snacks & Meals', path: '/admin/meals', icon: Coffee },
        { name: 'Stationery Requests', path: '/admin/stationery', icon: FileText },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    if (userRoles.includes('SEMINAR_ADMIN')) {
      return [
        { name: 'Dashboard', path: '/admin/seminar', icon: LayoutDashboard },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    if (userRoles.includes('ACCOMMODATION_ADMIN')) {
      return [
        { name: 'Dashboard', path: '/admin/accommodation', icon: LayoutDashboard },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    if (userRoles.includes('TRANSPORT_ADMIN')) {
      return [
        { name: 'Dashboard', path: '/admin/transport', icon: LayoutDashboard },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    if (userRoles.includes('STATIONERY_ADMIN')) {
      return [
        { name: 'Dashboard', path: '/admin/stationery', icon: LayoutDashboard },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    if (userRoles.includes('MEALS_ADMIN')) {
      return [
        { name: 'Dashboard', path: '/admin/meals', icon: LayoutDashboard },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    // Check for SEMINAR_COORDINATOR (single role or combined with department role)
    const isCoordinator = userRoles.includes('SEMINAR_COORDINATOR');
    const isDeptUser = userRoles.includes('DEPARTMENT_USER') || userRoles.includes('DEPARTMENT_HOD');

    if (isCoordinator && !isDeptUser) {
      return [
        { name: 'Coordinator Dashboard', path: '/admin/seminar', icon: LayoutDashboard },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    if (isCoordinator && isDeptUser) {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Coordinator Dashboard', path: '/admin/seminar', icon: ShieldCheck },
        { name: 'Seminar Hall Booking', path: '/seminar-booking', icon: CalendarDays },
        { name: 'Accommodation', path: '/accommodation', icon: BedDouble },
        { name: 'Transport', path: '/transport', icon: Bus },
        { name: 'Stationery', path: '/stationery', icon: FileText },
        { name: 'Snacks & Meals', path: '/snacks-meals', icon: Coffee },
        { name: 'My Requests', path: '/my-requests', icon: ListOrdered },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    return [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Seminar Hall Booking', path: '/seminar-booking', icon: CalendarDays },
      { name: 'Accommodation', path: '/accommodation', icon: BedDouble },
      { name: 'Transport', path: '/transport', icon: Bus },
      { name: 'Stationery', path: '/stationery', icon: FileText },
      { name: 'Snacks & Meals', path: '/snacks-meals', icon: Coffee },
      { name: 'My Requests', path: '/my-requests', icon: ListOrdered },
      { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="sidebar-overlay"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Header / College Emblem Logo */}
        <div className="sidebar-header">
          {/* Logo Emblem */}
          <div className="sidebar-emblem">
            <img src={COLLEGE_LOGO} alt="NEC College Logo" style={{ objectFit: 'contain' }} />
          </div>
          <div>
            <h2 className="sidebar-title">
              Narasaraopet
            </h2>
            <div className="sidebar-subtitle">
              Engineering College
            </div>
            <span className="sidebar-tagline">
              Empowering Tomorrow
            </span>
          </div>

          {/* Close button visible on mobile */}
          <button
            onClick={onClose}
            className="mobile-sidebar-close sidebar-close-btn"
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav-container">
          <div className="sidebar-nav-list">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={19} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer with campus quote */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-quote">
            "Together for a Better Campus"
          </div>
          <div className="sidebar-footer-desc">
            Narasaraopet Engineering College<br />
            Empowering Knowledge. Enriching Lives.
          </div>
        </div>
      </aside>
    </>
  );
};
