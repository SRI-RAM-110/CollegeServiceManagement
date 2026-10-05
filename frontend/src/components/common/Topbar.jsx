import React, { useState, useRef, useEffect } from 'react';
import { COLLEGE_LOGO } from '../../constants/branding';
import { Menu, Search, Bell, ChevronDown, LogOut, CheckCheck, Sun, Moon, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  CREATOR: 'Creator',
  AO_ADMIN: 'Super Admin',
  DEPARTMENT_HOD: 'Department HOD',
  SEMINAR_COORDINATOR: 'Seminar Coordinator',
  DEPARTMENT_USER: 'Department User',
  SEMINAR_ADMIN: 'Seminar Admin',
  ACCOMMODATION_ADMIN: 'Accommodation Admin',
  TRANSPORT_ADMIN: 'Transport Admin',
  STATIONERY_ADMIN: 'Stationery Admin',
  MEALS_ADMIN: 'Meals Admin',
};

const DEPARTMENT_NAMES = {
  CSE: 'Computer Science & Engineering',
  ECE: 'Electronics & Communication Engineering',
  EEE: 'Electrical & Electronics Engineering',
  ME: 'Mechanical Engineering',
  MECH: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  AI: 'Artificial Intelligence & Data Science',
  AIDS: 'Artificial Intelligence & Data Science',
  AIML: 'Artificial Intelligence & Machine Learning',
  IT: 'Information Technology',
  MBA: 'Master of Business Administration',
  MCA: 'Master of Computer Applications',
  PHARM: 'Pharmacy',
  ADMIN: 'Administrative Office',
};

const formatRoleLabel = (roleStr) => {
  if (!roleStr || typeof roleStr !== 'string') return '';
  const key = roleStr.trim().toUpperCase();
  if (ROLE_LABELS[key]) {
    return ROLE_LABELS[key];
  }
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const formatDepartment = (deptStr) => {
  if (!deptStr || typeof deptStr !== 'string') return null;
  const clean = deptStr.trim();
  if (!clean || ['NONE', 'N/A', 'NULL', 'UNDEFINED', '-'].includes(clean.toUpperCase())) {
    return null;
  }
  return DEPARTMENT_NAMES[clean.toUpperCase()] || clean;
};

const getUserRolesList = (user) => {
  const rolesSet = new Set();
  if (user?.role && typeof user.role === 'string' && user.role.trim()) {
    rolesSet.add(user.role.trim().toUpperCase());
  }
  if (Array.isArray(user?.roles)) {
    user.roles.forEach((r) => {
      if (r && typeof r === 'string' && r.trim()) {
        rolesSet.add(r.trim().toUpperCase());
      }
    });
  }
  return Array.from(rolesSet);
};

export const Topbar = ({ onToggleSidebar, searchPlaceholder = 'Search anything...' }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    pushSupported,
    pushPermission,
    isPushSubscribed,
    pushLoading,
    enablePush,
    disablePush,
    testPush,
  } = useNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifSearch, setNotifSearch] = useState('');

  const filteredNotifications = notifications.filter((item) => {
    if (!notifSearch.trim()) return true;
    const q = notifSearch.toLowerCase().trim();
    const title = (item.title || '').toLowerCase();
    const msg = (item.message || '').toLowerCase();
    const srv = (item.service || '').toLowerCase();
    const reqId = (item.referenceId || item.requestId || '').toLowerCase();
    return title.includes(q) || msg.includes(q) || srv.includes(q) || reqId.includes(q);
  });

  const handleNotificationClick = (item) => {
    markAsRead(item.id);
    const targetRef = item.referenceId || item.requestId;
    if (targetRef) {
      const role = user?.role;
      if (
        role === 'DEPARTMENT_USER' ||
        role === 'DEPARTMENT_HOD' ||
        role === 'SEMINAR_COORDINATOR'
      ) {
        navigate(`/my-requests?q=${encodeURIComponent(targetRef)}`);
      } else if (role === 'SEMINAR_ADMIN') {
        navigate(`/admin/seminar?q=${encodeURIComponent(targetRef)}`);
      } else if (role === 'ACCOMMODATION_ADMIN') {
        navigate(`/admin/accommodation?q=${encodeURIComponent(targetRef)}`);
      } else if (role === 'TRANSPORT_ADMIN') {
        navigate(`/admin/transport?q=${encodeURIComponent(targetRef)}`);
      } else if (role === 'STATIONERY_ADMIN') {
        navigate(`/admin/stationery?q=${encodeURIComponent(targetRef)}`);
      } else if (role === 'MEALS_ADMIN') {
        navigate(`/admin/meals?q=${encodeURIComponent(targetRef)}`);
      } else if (role === 'AO_ADMIN' || role === 'CREATOR') {
        navigate(`/admin/ao?q=${encodeURIComponent(targetRef)}`);
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    const role = user?.role;
    if (
      role === 'DEPARTMENT_USER' ||
      role === 'DEPARTMENT_HOD' ||
      role === 'SEMINAR_COORDINATOR'
    ) {
      navigate(`/my-requests?q=${encodeURIComponent(q)}`);
    } else if (role === 'SEMINAR_ADMIN') {
      navigate(`/admin/seminar?q=${encodeURIComponent(q)}`);
    } else if (role === 'ACCOMMODATION_ADMIN') {
      navigate(`/admin/accommodation?q=${encodeURIComponent(q)}`);
    } else if (role === 'TRANSPORT_ADMIN') {
      navigate(`/admin/transport?q=${encodeURIComponent(q)}`);
    } else if (role === 'STATIONERY_ADMIN') {
      navigate(`/admin/stationery?q=${encodeURIComponent(q)}`);
    } else if (role === 'MEALS_ADMIN') {
      navigate(`/admin/meals?q=${encodeURIComponent(q)}`);
    } else if (role === 'CREATOR' || role === 'AO_ADMIN') {
      navigate(`/admin/ao?q=${encodeURIComponent(q)}`);
    } else {
      navigate(`/my-requests?q=${encodeURIComponent(q)}`);
    }
  };

  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
        setShowClearConfirm(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setShowNotifications(false);
        setShowClearConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleClearConfirm = async () => {
    setClearing(true);
    try {
      await clearNotifications();
      setShowClearConfirm(false);
    } catch (err) {
      // Toast notification already alerts user
    } finally {
      setClearing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitial = () => {
    if (!user?.name) return 'U';
    return user.name.charAt(0).toUpperCase();
  };

  const effectiveRoles = getUserRolesList(user);
  const formattedDept = formatDepartment(user?.department);

  return (
    <header className="topbar-header">
      {/* Left: Hamburger Button, Branding & Search */}
      <div className="topbar-left">
        {/* Hamburger / Menu Toggle Button on FAR LEFT */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="topbar-toggle-btn topbar-hamburger-btn"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="topbar-brand">
          <div className="topbar-logo-circle">
            <img src={COLLEGE_LOGO} alt="NEC College Logo" className="topbar-logo" style={{ objectFit: 'contain' }} />
          </div>
          <div className="topbar-brand-titles">
            <span className="topbar-title-desktop">College Department Services Management System</span>
            <span className="topbar-title-mobile">NEC Services</span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="topbar-search-form">
          <Search
            size={18}
            className="topbar-search-icon"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="topbar-search-input"
          />
        </form>
      </div>

      {/* Right: Notifications, User Profile & Sign Out */}
      <div className="topbar-right">
        {/* Global Dark / Light Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="topbar-icon-btn topbar-theme-toggle"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Current: Dark theme — Click for Light theme' : 'Current: Light theme — Click for Dark theme'}
        >
          {theme === 'dark' ? (
            <Sun size={18} className="theme-toggle-sun" aria-hidden="true" />
          ) : (
            <Moon size={18} className="theme-toggle-moon" aria-hidden="true" />
          )}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="topbar-menu-wrapper" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="topbar-icon-btn"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="topbar-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout */}
          {showNotifications && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span className="notif-title">Notifications</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="notif-mark-read-btn"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      disabled={clearing}
                      className="notif-clear-btn"
                      title="Clear all notifications"
                    >
                      <Trash2 size={13} /> Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Confirmation Prompt before clearing notifications */}
              {showClearConfirm && (
                <div className="notif-clear-confirm-bar" role="alertdialog" aria-label="Confirm clear notifications">
                  <span className="notif-clear-confirm-text">
                    Clear all notifications?
                  </span>
                  <div className="notif-clear-confirm-actions">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      disabled={clearing}
                      className="notif-clear-cancel-btn"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleClearConfirm}
                      disabled={clearing}
                      className="notif-clear-confirm-btn"
                    >
                      {clearing ? 'Clearing...' : 'Clear'}
                    </button>
                  </div>
                </div>
              )}

              {/* Web Push Status & Toggle Bar */}
              {pushSupported && (
                <div style={{
                  padding: '7px 14px',
                  background: 'rgba(8, 20, 36, 0.45)',
                  borderBottom: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.74rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bell size={12} style={{ color: isPushSubscribed ? 'var(--arctic-blue)' : 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {pushPermission === 'denied'
                        ? 'Push blocked in browser'
                        : isPushSubscribed
                        ? 'Browser Alerts: ON'
                        : 'Browser Alerts: OFF'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {pushPermission !== 'denied' && (
                      <>
                        {isPushSubscribed ? (
                          <>
                            <button
                              type="button"
                              onClick={testPush}
                              disabled={pushLoading}
                              style={{
                                background: 'rgba(120, 174, 245, 0.15)',
                                border: '1px solid rgba(120, 174, 245, 0.3)',
                                color: 'var(--arctic-blue)',
                                borderRadius: '4px',
                                padding: '2px 7px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                              }}
                              title="Send test desktop push notification"
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={disablePush}
                              disabled={pushLoading}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              Disable
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={enablePush}
                            disabled={pushLoading}
                            style={{
                              background: 'var(--arctic-blue)',
                              color: '#081424',
                              fontWeight: 600,
                              border: 'none',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                            }}
                          >
                            {pushLoading ? 'Enabling...' : 'Enable Push'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Notification Search Box (when notifications exist) */}
              {notifications.length > 0 && (
                <div style={{
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--glass-border)',
                  background: 'rgba(8, 20, 36, 0.25)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                  }}>
                    <Search size={12} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Filter notifications..."
                      value={notifSearch}
                      onChange={(e) => setNotifSearch(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.74rem',
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                    {notifSearch && (
                      <button
                        onClick={() => setNotifSearch('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: '0 2px',
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    No notifications yet.
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="notif-empty">
                    No notifications match "{notifSearch}".
                  </div>
                ) : (
                  filteredNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`notif-item ${item.read ? 'read' : 'unread'}`}
                    >
                      <div className="notif-item-header">
                        <span className="notif-item-title">
                          {item.title}
                        </span>
                        <span className="notif-item-service">{item.service}</span>
                      </div>
                      <p className="notif-item-msg">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="topbar-menu-wrapper" ref={userRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`user-menu-pill ${showUserMenu ? 'active' : ''}`}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
            aria-label={`User profile for ${user?.name || 'current user'}`}
          >
            <div className="user-avatar-circle" aria-hidden="true">
              {getInitial()}
            </div>
            <span className="user-name">
              {user?.name || 'User'}
            </span>
            <ChevronDown
              size={15}
              className={`user-menu-chevron ${showUserMenu ? 'open' : ''}`}
              aria-hidden="true"
            />
          </button>

          {/* User Details Dropdown Panel */}
          {showUserMenu && (
            <div className="user-dropdown-panel" role="region" aria-label="User Profile Details">
              <div className="user-dropdown-header">
                <div className="user-dropdown-name">{user?.name || 'User'}</div>
                {user?.email && (
                  <div className="user-dropdown-email">{user.email}</div>
                )}
              </div>

              <div className="user-dropdown-body">
                {effectiveRoles.length > 0 && (
                  <div className="user-dropdown-section">
                    <div className="user-dropdown-section-title">
                      {effectiveRoles.length > 1 ? 'Roles' : 'Role'}
                    </div>
                    {effectiveRoles.length > 1 ? (
                      <ul className="user-dropdown-roles-list">
                        {effectiveRoles.map((r, idx) => (
                          <li key={idx} className="user-dropdown-role-item">
                            <span className="user-dropdown-bullet" aria-hidden="true">•</span>
                            <span>{formatRoleLabel(r)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="user-dropdown-role-single">
                        {formatRoleLabel(effectiveRoles[0])}
                      </div>
                    )}
                  </div>
                )}

                {formattedDept && (
                  <div className="user-dropdown-section">
                    <div className="user-dropdown-section-title">Department</div>
                    <div className="user-dropdown-dept-value">{formattedDept}</div>
                  </div>
                )}
              </div>

              {/* User Dropdown Footer with Mobile Sign Out Action */}
              <div className="user-dropdown-footer">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="user-dropdown-logout-btn"
                  aria-label="Sign Out from account"
                >
                  <LogOut size={15} aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Separate Sign Out Action Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="topbar-signout-btn"
          aria-label="Sign Out"
        >
          <LogOut size={16} aria-hidden="true" />
          <span className="topbar-signout-text">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
