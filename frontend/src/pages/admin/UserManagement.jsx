import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Building2,
  KeyRound,
  Power,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Sliders,
  CheckCircle2,
  XCircle,
  Building,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Lock,
  Layers,
  ChevronDown,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminUserApi, seminarApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';

const DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'AI', name: 'AI & Data Science' },
  { code: 'MBA', name: 'Master of Business Administration' },
  { code: 'PHARM', name: 'Pharmacy' },
  { code: 'ADMIN', name: 'Administrative Office' },
];

const ROLES_LIST = [
  { id: 'DEPARTMENT_HOD', label: 'Department HOD', desc: 'Full authority for department approvals & service requests' },
  { id: 'SEMINAR_COORDINATOR', label: 'Seminar Coordinator', desc: 'Direct coordinator authority over specifically assigned seminar halls' },
  { id: 'SERVICE_ADMIN', label: 'Service Admin', desc: 'Administration over specific facility modules' },
  { id: 'AO_ADMIN', label: 'AO Admin / Super Admin', desc: 'Universal super admin rights across all services & users' },
  { id: 'DEPARTMENT_USER', label: 'Department Faculty / Staff', desc: 'Standard department service requester' },
];

const SERVICES_LIST = [
  { id: 'SEMINAR_ADMIN', label: 'Seminar Hall', key: 'SEMINAR' },
  { id: 'ACCOMMODATION_ADMIN', label: 'Accommodation', key: 'ACCOMMODATION' },
  { id: 'TRANSPORT_ADMIN', label: 'Transport', key: 'TRANSPORT' },
  { id: 'STATIONERY_ADMIN', label: 'Stationery', key: 'STATIONERY' },
  { id: 'MEALS_ADMIN', label: 'Meals / Snacks', key: 'MEALS' },
];

const SEMINAR_HALLS_LIST = [
  { id: 'SH-1', name: 'Seminar Hall 1', location: 'Block 3 – Ground Floor', capacity: 300 },
  { id: 'SH-2', name: 'Seminar Hall 2', location: 'Block 3 – Third Floor', capacity: 200 },
  { id: 'SH-3', name: 'Seminar Hall 3', location: 'Block 4 – Ground Floor', capacity: 350 },
  { id: 'SH-4', name: 'Seminar Hall 4', location: 'Pharma Block', capacity: 200 },
  { id: 'TECH-HUB', name: 'Tech Hub', location: 'Block 3 – Third Floor', capacity: 150 },
];

export default function UserManagement() {
  const { addToast } = useNotifications();
  const { user: currentUser } = useAuth();

  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    hods: 0,
    serviceAdmins: 0,
    seminarCoordinators: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');

  // Modals
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [resetPwModalOpen, setResetPwModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Actions dropdown menu state
  const [openMenuUserId, setOpenMenuUserId] = useState(null);
  const actionMenuRef = useRef(null);

  // Close actions dropdown on outside click or Escape key
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setOpenMenuUserId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenMenuUserId(null);
      }
    };

    if (openMenuUserId) {
      document.addEventListener('mousedown', handleDocumentClick);
      document.addEventListener('touchstart', handleDocumentClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuUserId]);

  // Form state for Register
  const [registerForm, setRegisterForm] = useState({
    name: '',
    userId: '',
    email: '',
    phone: '',
    department: 'CSE',
    designation: '',
    password: '12345',
    confirmPassword: '12345',
    roles: ['DEPARTMENT_HOD'],
    servicePermissions: [],
    assignedHallIds: [],
    active: true,
  });

  // Form state for Edit
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    roles: [],
    servicePermissions: [],
    assignedHallIds: [],
    active: true,
  });

  // Form state for Reset Password
  const [resetPwForm, setResetPwForm] = useState({
    temporaryPassword: '12345',
  });

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, usersRes] = await Promise.all([
        adminUserApi.getStats(),
        adminUserApi.getUsers({
          search: search || undefined,
          role: roleFilter !== 'ALL' ? roleFilter : undefined,
          department: deptFilter !== 'ALL' ? deptFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          service: serviceFilter !== 'ALL' ? serviceFilter : undefined,
        }),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    } catch (err) {
      addToast(err.message || 'Failed to load user management data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter, deptFilter, statusFilter, serviceFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle Register
  const handleOpenRegister = () => {
    setRegisterForm({
      name: '',
      userId: '',
      email: '',
      phone: '',
      department: 'CSE',
      designation: '',
      password: '12345',
      confirmPassword: '12345',
      roles: ['DEPARTMENT_HOD'],
      servicePermissions: [],
      assignedHallIds: [],
      active: true,
    });
    setRegisterModalOpen(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerForm.name.trim() || !registerForm.userId.trim()) {
      addToast('Name and Username are required.', 'error');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      addToast('Password and confirmation do not match.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await adminUserApi.registerUser(registerForm);
      addToast(`User ${registerForm.userId} successfully registered!`, 'success');
      setRegisterModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to register user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit
  const handleOpenEdit = (user) => {
    const isTargetCreator = (user.roles || []).includes('CREATOR') || user.userId === 'CREATOR001';
    const isCallerCreator = (currentUser?.roles || []).includes('CREATOR') || currentUser?.role === 'CREATOR';
    if (isTargetCreator && !isCallerCreator) {
      addToast('Only Creator can edit the Creator master account.', 'error');
      return;
    }
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || 'CSE',
      designation: user.designation || '',
      roles: user.roles || [],
      servicePermissions: user.servicePermissions || [],
      assignedHallIds: user.assignedHallIds || [],
      active: user.active ?? true,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const submissionData = { ...editForm };
      if ((selectedUser.roles || []).includes('CREATOR') && !submissionData.roles.includes('CREATOR')) {
        submissionData.roles = [...submissionData.roles, 'CREATOR'];
      }
      await adminUserApi.updateUser(selectedUser.userId, submissionData);
      addToast(`User ${selectedUser.userId} updated successfully!`, 'success');
      setEditModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to update user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Manage Access (quick modal)
  const handleOpenAccess = (user) => {
    const isTargetCreator = (user.roles || []).includes('CREATOR') || user.userId === 'CREATOR001';
    const isCallerCreator = (currentUser?.roles || []).includes('CREATOR') || currentUser?.role === 'CREATOR';
    if (isTargetCreator && !isCallerCreator) {
      addToast('Only Creator can modify Creator master access permissions.', 'error');
      return;
    }
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || 'CSE',
      designation: user.designation || '',
      roles: user.roles || [],
      servicePermissions: user.servicePermissions || [],
      assignedHallIds: user.assignedHallIds || [],
      active: user.active ?? true,
    });
    setAccessModalOpen(true);
  };

  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      let updatedRoles = editForm.roles;
      if ((selectedUser.roles || []).includes('CREATOR') && !updatedRoles.includes('CREATOR')) {
        updatedRoles = [...updatedRoles, 'CREATOR'];
      }
      await adminUserApi.updateUser(selectedUser.userId, {
        roles: updatedRoles,
        servicePermissions: editForm.servicePermissions,
        assignedHallIds: editForm.assignedHallIds,
        department: editForm.department,
      });
      addToast(`Access permissions updated for ${selectedUser.userId}!`, 'success');
      setAccessModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to update access permissions.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Toggle (Activate/Deactivate)
  const handleToggleStatus = async (user) => {
    const isTargetCreator = (user.roles || []).includes('CREATOR') || user.userId === 'CREATOR001';
    const isCallerCreator = (currentUser?.roles || []).includes('CREATOR') || currentUser?.role === 'CREATOR';
    if (isTargetCreator && !isCallerCreator) {
      addToast('Only Creator can modify Creator account status.', 'error');
      return;
    }
    if (isTargetCreator && user.userId?.toLowerCase() === currentUser?.userId?.toLowerCase()) {
      addToast('Cannot deactivate the active Creator account.', 'error');
      return;
    }
    const nextStatus = !user.active;
    const confirmMsg = nextStatus
      ? `Activate user ${user.userId}? They will be able to log in.`
      : `Deactivate user ${user.userId}? They will immediately be denied login access.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminUserApi.toggleStatus(user.userId, nextStatus);
      addToast(`User ${user.userId} ${nextStatus ? 'activated' : 'deactivated'} successfully!`, 'info');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to change status.', 'error');
    }
  };

  // Handle Reset Password
  const handleOpenResetPw = (user) => {
    const isTargetCreator = (user.roles || []).includes('CREATOR') || user.userId === 'CREATOR001';
    const isCallerCreator = (currentUser?.roles || []).includes('CREATOR') || currentUser?.role === 'CREATOR';
    if (isTargetCreator && !isCallerCreator) {
      addToast('Only Creator can reset password for the Creator master account.', 'error');
      return;
    }
    setSelectedUser(user);
    setResetPwForm({ temporaryPassword: '12345' });
    setResetPwModalOpen(true);
  };

  const handleResetPwSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      await adminUserApi.resetPassword(selectedUser.userId, resetPwForm);
      addToast(`Password for ${selectedUser.userId} has been reset to "${resetPwForm.temporaryPassword}". Forced password change is active for next login.`, 'success');
      setResetPwModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to reset password.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Remove User
  const handleOpenRemove = (user) => {
    const isTargetCreator = (user.roles || []).includes('CREATOR') || user.userId === 'CREATOR001';
    if (isTargetCreator) {
      addToast('The Creator master account cannot be removed.', 'error');
      return;
    }
    setUserToRemove(user);
    setRemoveModalOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!userToRemove) return;
    try {
      setRemoving(true);
      await adminUserApi.removeUser(userToRemove.userId);
      addToast(`User ${userToRemove.userId} permanently removed.`, 'success');
      setRemoveModalOpen(false);
      setUserToRemove(null);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Failed to remove user.', 'error');
    } finally {
      setRemoving(false);
    }
  };

  // Toggle helper for multi-select arrays
  const toggleArrayItem = (list, item) => {
    if (list.includes(item)) {
      return list.filter((i) => i !== item);
    }
    return [...list, item];
  };

  return (
    <div className="w-full">
      {/* Outer User Management Container (Wide & Clean Layout) */}
      <div className="w-full space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">USER MANAGEMENT</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Super Admin Control
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Create users and manage their application access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-sm border border-slate-700/60 transition"
            title="Refresh User List"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleOpenRegister}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register User</span>
          </button>
        </div>
      </div>

      {/* Real Database Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
          subtitle="Real DB Count"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={UserCheck}
          color="emerald"
          subtitle="Authorized"
        />
        <StatCard
          title="Inactive Users"
          value={stats.inactiveUsers}
          icon={UserX}
          color="rose"
          subtitle="Suspended"
        />
        <StatCard
          title="HODs"
          value={stats.hods}
          icon={Building2}
          color="purple"
          subtitle="Dept Heads"
        />
        <StatCard
          title="Service Admins"
          value={stats.serviceAdmins}
          icon={Layers}
          color="amber"
          subtitle="Module Admins"
        />
        <StatCard
          title="Seminar Coord."
          value={stats.seminarCoordinators}
          icon={Shield}
          color="indigo"
          subtitle="Hall Specific"
        />
      </div>

      {/* Search & Multi-Filters Card */}
      <div className="card-panel p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, username, dept..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Roles</option>
              <option value="CREATOR">Creator</option>
              <option value="DEPARTMENT_HOD">Department HOD</option>
              <option value="SEMINAR_COORDINATOR">Seminar Coordinator</option>
              <option value="SERVICE_ADMIN">Service Admin</option>
              <option value="AO_ADMIN">AO Admin</option>
              <option value="DEPARTMENT_USER">Department User</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} – {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Service Admins</option>
              <option value="SEMINAR">Seminar Admin</option>
              <option value="ACCOMMODATION">Accommodation Admin</option>
              <option value="TRANSPORT">Transport Admin</option>
              <option value="STATIONERY">Stationery Admin</option>
              <option value="MEALS">Meals Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-2xl">
        <div className="overflow-x-auto min-h-[400px] pb-12">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-2">Username</th>
                <th className="py-2.5 px-2">Email / Phone</th>
                <th className="py-2.5 px-1.5 text-center w-[60px]">Dept</th>
                <th className="py-2.5 px-2">Roles</th>
                <th className="py-2.5 px-2">Services</th>
                <th className="py-2.5 px-2">Seminar Halls</th>
                <th className="py-2.5 px-1.5 text-center w-[75px]">Status</th>
                <th className="py-2.5 pl-2 pr-4 text-right w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                    Loading user registry...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => {
                  const isCoord = (u.roles || []).includes('SEMINAR_COORDINATOR');
                  const isHOD = (u.roles || []).includes('DEPARTMENT_HOD');
                  const isAO = (u.roles || []).includes('AO_ADMIN');
                  const isTargetCreator = (u.roles || []).includes('CREATOR') || u.userId === 'CREATOR001';
                  const isCallerCreator = (currentUser?.roles || []).includes('CREATOR') || currentUser?.role === 'CREATOR';
                  const isSelf = !!(currentUser?.userId && u.userId?.toLowerCase() === currentUser?.userId?.toLowerCase());
                  const isMenuOpen = openMenuUserId === u.userId;
                  const isNearBottom = idx >= users.length - 4 && users.length > 4;

                  return (
                    <tr
                      key={u.id || u.userId}
                      className="hover:bg-slate-800/40 transition"
                      style={isMenuOpen ? { position: 'relative', zIndex: 100 } : undefined}
                    >
                      <td className="py-2 px-3">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {u.name}
                          {u.mustChangePassword && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal border border-amber-500/30" title="Must change temporary password">
                              Temp PW
                            </span>
                          )}
                        </div>
                        {u.designation && <div className="text-[11px] text-slate-400">{u.designation}</div>}
                      </td>

                      <td className="py-2 px-2 font-mono text-slate-300 font-medium whitespace-nowrap text-[11px]">
                        {u.userId}
                      </td>

                      <td className="py-2 px-2 text-slate-300">
                        <div className="text-xs truncate max-w-[165px]" title={u.email}>{u.email || '—'}</div>
                        {u.phone && <div className="text-[10px] text-slate-500">{u.phone}</div>}
                      </td>

                      <td className="py-2 px-1.5 text-center">
                        <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                          {u.department || '—'}
                        </span>
                      </td>

                      {/* Multi-roles list */}
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {(u.roles || []).map((r) => {
                            let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                            if (r === 'CREATOR') badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20 font-bold';
                            else if (r === 'AO_ADMIN') badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                            else if (r === 'DEPARTMENT_HOD') badgeStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                            else if (r === 'SEMINAR_COORDINATOR') badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                            else if (r.endsWith('_ADMIN')) badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';

                            return (
                              <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${badgeStyle}`}>
                                {r.replace('_', ' ')}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Service permissions */}
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {(u.servicePermissions && u.servicePermissions.length > 0) ? (
                            u.servicePermissions.map((sp) => (
                              <span key={sp} className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {sp.replace('_ADMIN', '')}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-[11px]">None</span>
                          )}
                        </div>
                      </td>

                      {/* Seminar Hall Access */}
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1 max-w-[130px]">
                          {isCoord ? (
                            (u.assignedHallIds && u.assignedHallIds.length > 0) ? (
                              u.assignedHallIds.map((h) => (
                                <span key={h} className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                  {h}
                                </span>
                              ))
                            ) : (
                              <span className="text-rose-400 text-[10px] italic">No Halls Assigned</span>
                            )
                          ) : (isAO || isTargetCreator) ? (
                            <span className="text-emerald-400 text-[10px] font-medium">All Halls ({isTargetCreator ? 'Creator' : 'AO'})</span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">N/A</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-1.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                            u.active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          }`}
                          title="Click to toggle status"
                        >
                          {u.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>

                      {/* Actions Column: Unified Dropdown Menu */}
                      <td
                        className="py-2 pl-2 pr-4 text-right"
                        style={isMenuOpen ? { position: 'relative', zIndex: 100 } : undefined}
                      >
                        {isTargetCreator && !isCallerCreator ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Lock className="w-3 h-3" /> System Master
                          </span>
                        ) : (
                        <div
                          className="inline-block text-left"
                          style={isMenuOpen ? { position: 'relative', zIndex: 100 } : undefined}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuUserId(isMenuOpen ? null : u.userId);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition shadow-sm ${
                              isMenuOpen
                                ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 ring-1 ring-blue-500/40'
                                : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border-slate-700 hover:border-blue-500/50 active:scale-95'
                            }`}
                            aria-expanded={isMenuOpen}
                            title="Actions Menu"
                          >
                            <span>Actions</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-blue-400' : 'text-slate-400'}`} />
                          </button>

                          {isMenuOpen && (
                            <div
                              ref={actionMenuRef}
                              onClick={(e) => e.stopPropagation()}
                              className="user-mgmt-action-menu absolute right-0 left-auto w-44 py-1.5 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl z-50 animate-fade-in"
                              style={{
                                right: 0,
                                left: 'auto',
                                top: isNearBottom ? 'auto' : '100%',
                                bottom: isNearBottom ? '100%' : 'auto',
                                marginTop: isNearBottom ? undefined : '6px',
                                marginBottom: isNearBottom ? '6px' : undefined,
                                minWidth: '175px',
                                minHeight: '190px',
                                backgroundColor: '#0f172a',
                                opacity: 1,
                                zIndex: 1000,
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.9), 0 10px 10px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(51, 65, 85, 0.9)',
                              }}
                            >
                              {/* 1. Edit */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuUserId(null);
                                  handleOpenEdit(u);
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit</span>
                              </button>

                              {/* 2. Manage Access */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuUserId(null);
                                  handleOpenAccess(u);
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 hover:text-blue-300 flex items-center gap-2.5 transition"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                <span>Manage Access</span>
                              </button>

                              {/* 3. Reset Password */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuUserId(null);
                                  handleOpenResetPw(u);
                                }}
                                className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 hover:text-amber-300 flex items-center gap-2.5 transition"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                <span>Reset Password</span>
                              </button>

                              {/* 4. Activate / Deactivate (Dynamic State) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuUserId(null);
                                  handleToggleStatus(u);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 transition ${
                                  u.active
                                    ? 'text-slate-200 hover:bg-slate-800 hover:text-amber-300'
                                    : 'text-slate-200 hover:bg-slate-800 hover:text-emerald-300'
                                }`}
                              >
                                <Power className={`w-3.5 h-3.5 ${u.active ? 'text-amber-400' : 'text-emerald-400'}`} />
                                <span>{u.active ? 'Deactivate' : 'Activate'}</span>
                              </button>

                              {/* Divider */}
                              <div className="my-1 border-t border-slate-800" />

                              {/* 5. Remove User */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSelf) return;
                                  setOpenMenuUserId(null);
                                  handleOpenRemove(u);
                                }}
                                disabled={isSelf}
                                className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 transition ${
                                  isSelf
                                    ? 'opacity-40 cursor-not-allowed text-slate-500'
                                    : 'text-rose-400 hover:bg-slate-800 hover:text-rose-200'
                                }`}
                                title={isSelf ? 'Cannot remove currently logged-in account' : 'Permanently remove user'}
                              >
                                <Trash2 className={`w-3.5 h-3.5 ${isSelf ? 'text-slate-500' : 'text-rose-400'}`} />
                                <span>Remove User</span>
                              </button>
                            </div>
                          )}
                        </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: REGISTER NEW USER                               */}
      {/* ======================================================== */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Register New User"
        maxWidth="680px"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                placeholder="e.g. Dr. K. Lakshamana Rao"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Username / Login ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={registerForm.userId}
                onChange={(e) => setRegisterForm({ ...registerForm, userId: e.target.value.toLowerCase().trim() })}
                placeholder="e.g. csehod, seminarcoordinator1"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder="official@nrtec.local"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                placeholder="+91 98480 XXXXX"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Department <span className="text-rose-400">*</span>
              </label>
              <select
                value={registerForm.department}
                onChange={(e) => setRegisterForm({ ...registerForm, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                required
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} – {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Temporary Initial Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                placeholder="Default: 12345"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                required
              />
              <span className="text-[10px] text-amber-400">User will be forced to change this on first login.</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                placeholder="Confirm password"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Section: ROLES / ACCESS (Multi-Select) */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>ROLES / ACCESS (Multi-Select Allowed on ONE Account)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES_LIST.map((r) => {
                const checked = registerForm.roles.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                      checked
                        ? 'bg-blue-600/15 border-blue-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setRegisterForm({
                          ...registerForm,
                          roles: toggleArrayItem(registerForm.roles, r.id),
                        })
                      }
                      className="mt-0.5 rounded text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-xs">{r.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{r.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section: SERVICE ADMIN ACCESS */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>SERVICE ADMIN ACCESS (Specific Module Administration)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {SERVICES_LIST.map((s) => {
                const checked = registerForm.servicePermissions.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition ${
                      checked
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setRegisterForm({
                          ...registerForm,
                          servicePermissions: toggleArrayItem(registerForm.servicePermissions, s.id),
                        })
                      }
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <span className="font-medium text-xs">{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section: SEMINAR HALL ACCESS (Only when SEMINAR_COORDINATOR is selected) */}
          {registerForm.roles.includes('SEMINAR_COORDINATOR') && (
            <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-blue-300 text-xs">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>SEMINAR HALL ACCESS (Coordinator will ONLY access selected halls)</span>
                </div>
                <span className="text-[10px] text-blue-400 font-semibold">
                  {registerForm.assignedHallIds.length} hall(s) selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {SEMINAR_HALLS_LIST.map((h) => {
                  const checked = registerForm.assignedHallIds.includes(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        checked
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setRegisterForm({
                            ...registerForm,
                            assignedHallIds: toggleArrayItem(registerForm.assignedHallIds, h.id),
                          })
                        }
                        className="mt-0.5 rounded text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-bold text-xs">{h.name}</div>
                        <div className="text-[10px] text-slate-400">{h.location}</div>
                        <div className="text-[10px] text-blue-400 font-medium">Cap: {h.capacity}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setRegisterModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: EDIT USER DETAILS                               */}
      {/* ======================================================== */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.userId || ''}`}
        maxWidth="680px"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                value={editForm.designation}
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                placeholder="e.g. Professor & HOD"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} – {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: ROLES / ACCESS (Multi-Select) */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>ROLES / ACCESS (One Account Multiple Roles)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES_LIST.map((r) => {
                const checked = editForm.roles.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                      checked
                        ? 'bg-blue-600/15 border-blue-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setEditForm({
                          ...editForm,
                          roles: toggleArrayItem(editForm.roles, r.id),
                        })
                      }
                      className="mt-0.5 rounded text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-xs">{r.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{r.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section: SERVICE ACCESS */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-white text-xs">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>SERVICE ACCESS PERMISSIONS</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {SERVICES_LIST.map((s) => {
                const checked = editForm.servicePermissions.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition ${
                      checked
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setEditForm({
                          ...editForm,
                          servicePermissions: toggleArrayItem(editForm.servicePermissions, s.id),
                        })
                      }
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <span className="font-medium text-xs">{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section: SEMINAR HALL ACCESS */}
          {editForm.roles.includes('SEMINAR_COORDINATOR') && (
            <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-blue-300 text-xs">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>ASSIGNED SEMINAR HALLS (Strict Backend Authorization)</span>
                </div>
                <span className="text-[10px] text-blue-400 font-semibold">
                  {editForm.assignedHallIds.length} hall(s) selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {SEMINAR_HALLS_LIST.map((h) => {
                  const checked = editForm.assignedHallIds.includes(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        checked
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setEditForm({
                            ...editForm,
                            assignedHallIds: toggleArrayItem(editForm.assignedHallIds, h.id),
                          })
                        }
                        className="mt-0.5 rounded text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-bold text-xs">{h.name}</div>
                        <div className="text-[10px] text-slate-400">{h.location}</div>
                        <div className="text-[10px] text-blue-400 font-medium">Cap: {h.capacity}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
            >
              {submitting ? 'Saving Changes...' : 'Save User Details'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: MANAGE ACCESS (Dedicated Fast Access Window)     */}
      {/* ======================================================== */}
      <Modal
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        title={`Manage Access: ${selectedUser?.name || selectedUser?.userId}`}
        maxWidth="640px"
      >
        <form onSubmit={handleAccessSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <div className="text-white font-semibold text-xs">USER: {selectedUser?.name}</div>
            <div className="text-slate-400 text-[11px]">LOGIN ID: <span className="font-mono text-slate-300">{selectedUser?.userId}</span> | DEPARTMENT: <span className="text-blue-400 font-semibold">{selectedUser?.department}</span></div>
          </div>

          {/* Roles */}
          <div className="space-y-2">
            <div className="font-bold text-white text-xs flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>ROLES:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES_LIST.map((r) => {
                const checked = editForm.roles.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                      checked
                        ? 'bg-blue-600/15 border-blue-500/40 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setEditForm({
                          ...editForm,
                          roles: toggleArrayItem(editForm.roles, r.id),
                        })
                      }
                      className="mt-0.5 rounded text-blue-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-semibold text-xs">{r.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{r.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Service Access */}
          <div className="space-y-2">
            <div className="font-bold text-white text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>SERVICE ACCESS:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SERVICES_LIST.map((s) => {
                const checked = editForm.servicePermissions.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition ${
                      checked
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setEditForm({
                          ...editForm,
                          servicePermissions: toggleArrayItem(editForm.servicePermissions, s.id),
                        })
                      }
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <span className="font-medium text-xs">{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Seminar Hall Access (Only displayed when SEMINAR_COORDINATOR is selected) */}
          {editForm.roles.includes('SEMINAR_COORDINATOR') && (
            <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-blue-300 text-xs">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>SEMINAR HALL ACCESS:</span>
                </div>
                <span className="text-[10px] text-blue-400 font-semibold">
                  {editForm.assignedHallIds.length} hall(s) selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {SEMINAR_HALLS_LIST.map((h) => {
                  const checked = editForm.assignedHallIds.includes(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        checked
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setEditForm({
                            ...editForm,
                            assignedHallIds: toggleArrayItem(editForm.assignedHallIds, h.id),
                          })
                        }
                        className="mt-0.5 rounded text-blue-600 focus:ring-0"
                      />
                      <div>
                        <div className="font-bold text-xs">{h.name}</div>
                        <div className="text-[10px] text-slate-400">{h.location}</div>
                        <div className="text-[10px] text-blue-400 font-medium">Cap: {h.capacity}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setAccessModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
            >
              {submitting ? 'Saving Access...' : 'Save Access'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: RESET PASSWORD                                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={resetPwModalOpen}
        onClose={() => setResetPwModalOpen(false)}
        title={`Reset Password: ${selectedUser?.userId}`}
        maxWidth="460px"
      >
        <form onSubmit={handleResetPwSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-amber-300">
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <KeyRound className="w-4 h-4" />
              <span>Temporary Password Provision</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Resetting will set a temporary password and flag the account with <strong className="text-amber-200">mustChangePassword = true</strong>. The user will be required to choose a new password upon login.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Temporary Password
            </label>
            <input
              type="text"
              value={resetPwForm.temporaryPassword}
              onChange={(e) => setResetPwForm({ temporaryPassword: e.target.value })}
              placeholder="e.g. 12345"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setResetPwModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {submitting ? 'Resetting...' : 'Confirm Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: REMOVE USER CONFIRMATION                         */}
      {/* ======================================================== */}
      <Modal
        isOpen={removeModalOpen}
        onClose={() => !removing && setRemoveModalOpen(false)}
        title="Remove User"
        maxWidth="480px"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-200 text-sm">
                Are you sure you want to permanently remove this user?
              </p>
              <p className="text-[11px] text-rose-300/80">
                This action cannot be undone. All active coordinator and hall assignments will be revoked.
              </p>
            </div>
          </div>

          {userToRemove && (
            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-2.5 text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">User:</span>
                <span className="font-mono font-bold text-white text-sm">{userToRemove.userId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">Name:</span>
                <span className="font-medium text-white">{userToRemove.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span className="text-slate-400">Department:</span>
                <span className="font-medium text-slate-200">{userToRemove.department || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Roles:</span>
                <span className="text-[11px] text-blue-300 font-medium">
                  {(userToRemove.roles || []).join(', ') || userToRemove.role || '—'}
                </span>
              </div>
            </div>
          )}

          <p className="text-slate-400 text-[11px] italic">
            Historical requests, booking records, and audit history will remain intact for reporting.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setRemoveModalOpen(false)}
              disabled={removing}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRemove}
              disabled={removing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition active:scale-95"
            >
              {removing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{removing ? 'Removing...' : 'Remove User'}</span>
            </button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
