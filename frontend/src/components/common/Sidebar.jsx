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
  PlusCircle,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserRoles } from '../../utils/authUtils';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const userRoles = getUserRoles(user);

  const getNavLinks = () => {
    if (userRoles.includes('CREATOR') || userRoles.includes('AO_ADMIN')) {
      return [
        { name: 'Dashboard', path: '/admin/ao', icon: LayoutDashboard },
        { name: 'Create Request', path: '/admin/create-request', icon: PlusCircle },
        { name: 'My Requests', path: '/admin/my-requests', icon: ListOrdered },
        { name: 'User Management', path: '/admin/users', icon: Users },
        { name: 'Seminar Hall', path: '/admin/seminar', icon: CalendarDays },
        { name: 'Equipment Dashboard', path: '/technician/seminar', icon: Wrench },
        { name: 'Accommodation', path: '/admin/accommodation', icon: BedDouble },
        { name: 'Transport', path: '/admin/transport', icon: Bus },
        { name: 'Snacks & Meals', path: '/admin/meals', icon: Coffee },
        { name: 'Stationery Requests', path: '/admin/stationery', icon: FileText },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    const isHostelAdmin =
      userRoles.includes('ACCOMMODATION_ADMIN') ||
      userRoles.includes('BOYS_HOSTEL_ADMIN') ||
      userRoles.includes('GIRLS_HOSTEL_ADMIN') ||
      (Array.isArray(user?.assignedHostels) && user.assignedHostels.length > 0);
    const isDeptUser = userRoles.includes('DEPARTMENT_USER') || userRoles.includes('DEPARTMENT_HOD');

    // Collect all service-specific admin dashboards the user is authorized to access
    const adminDashboards = [];

    if (userRoles.includes('SEMINAR_COORDINATOR')) {
      adminDashboards.push({ name: 'Coordinator Dashboard', path: '/admin/seminar', icon: ShieldCheck });
    } else if (userRoles.includes('SEMINAR_ADMIN')) {
      adminDashboards.push({ name: 'Seminar Admin', path: '/admin/seminar', icon: CalendarDays });
    }

    if (isHostelAdmin) {
      adminDashboards.push({ name: 'Hostel Dashboard', path: '/admin/accommodation', icon: LayoutDashboard });
    }

    if (userRoles.includes('TRANSPORT_ADMIN')) {
      adminDashboards.push({ name: 'Transport Dashboard', path: '/admin/transport', icon: LayoutDashboard });
    }

    if (userRoles.includes('STATIONERY_ADMIN')) {
      adminDashboards.push({ name: 'Stationery Dashboard', path: '/admin/stationery', icon: LayoutDashboard });
    }

    if (userRoles.includes('MEALS_ADMIN')) {
      adminDashboards.push({ name: 'Meals Dashboard', path: '/admin/meals', icon: LayoutDashboard });
    }

    if (userRoles.includes('SEMINAR_TECHNICIAN')) {
      adminDashboards.push({ name: 'Equipment Dashboard', path: '/technician/seminar', icon: Wrench });
    }

    // Avoid duplicate links when multiple roles map to the same dashboard
    const seenPaths = new Set();
    const uniqueAdminDashboards = adminDashboards.filter((item) => {
      if (seenPaths.has(item.path)) return false;
      seenPaths.add(item.path);
      return true;
    });

    const departmentServiceLinks = [
      { name: 'Seminar Hall Booking', path: '/seminar-booking', icon: CalendarDays },
      { name: 'Accommodation', path: '/accommodation', icon: BedDouble },
      { name: 'Transport', path: '/transport', icon: Bus },
      { name: 'Stationery', path: '/stationery', icon: FileText },
      { name: 'Snacks & Meals', path: '/snacks-meals', icon: Coffee },
      { name: 'My Requests', path: '/my-requests', icon: ListOrdered },
      { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    ];

    if (isDeptUser) {
      const mainDashboardLink = uniqueAdminDashboards.length > 0
        ? { name: 'Department Dashboard', path: '/dashboard', icon: Building }
        : { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard };

      return [
        mainDashboardLink,
        ...uniqueAdminDashboards,
        ...departmentServiceLinks,
      ];
    }

    // Standalone service admin (non-department user)
    if (uniqueAdminDashboards.length === 1) {
      const single = uniqueAdminDashboards[0];
      return [
        {
          name: single.name === 'Coordinator Dashboard'
            ? 'Coordinator Dashboard'
            : single.name === 'Equipment Dashboard'
              ? 'Equipment Dashboard'
              : 'Dashboard',
          path: single.path,
          icon: single.icon || LayoutDashboard,
        },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    if (uniqueAdminDashboards.length > 1) {
      return [
        ...uniqueAdminDashboards,
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      ];
    }

    return [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ...departmentServiceLinks,
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
              Narasaraopeta
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
            Narasaraopeta Engineering College<br />
            Empowering Knowledge. Enriching Lives.
          </div>
        </div>
      </aside>
    </>
  );
};
