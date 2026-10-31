import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Building2,
  BedDouble,
  Bus,
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ShieldCheck,
  Check,
  X,
  Users,
  MapPin,
  Phone,
  UserCheck,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { resourceApi } from '../../services/api';
import Modal from '../../components/common/Modal';

const HOSTEL_OPTIONS = ['Girls Hostel', 'Boys Hostel', 'Guest House'];
const ROOM_STATUS_OPTIONS = ['Available', 'Maintenance', 'Unavailable'];
const VEHICLE_STATUS_OPTIONS = ['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE'];
const VEHICLE_TYPE_OPTIONS = ['College Bus', 'Minibus', 'Van', 'Staff Car', 'Utility'];
const STATIONERY_CATEGORIES = ['Paper', 'Writing', 'Files & Folders', 'Desk Accessories', 'Printing', 'General'];

export default function ResourceManagement() {
  const { addToast } = useNotifications();
  const { user, canManageResources } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState('halls'); // 'halls' | 'rooms' | 'vehicles' | 'stationery'

  // Data Collections
  const [halls, setHalls] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stationery, setStationery] = useState([]);

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Per-category loading and error states for robust error isolation
  const [categoryLoading, setCategoryLoading] = useState({
    halls: true,
    rooms: true,
    vehicles: true,
    stationery: true,
  });

  const [categoryErrors, setCategoryErrors] = useState({
    halls: null,
    rooms: null,
    vehicles: null,
    stationery: null,
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [roomHostelFilter, setRoomHostelFilter] = useState('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [stationeryCategoryFilter, setStationeryCategoryFilter] = useState('all');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [editCategory, setEditCategory] = useState('halls');
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [hallForm, setHallForm] = useState({
    hallId: '',
    name: '',
    location: '',
    capacity: '',
    status: 'Available',
    coordinatorUserIds: '',
    ccEmails: '',
    active: true,
  });

  const [roomForm, setRoomForm] = useState({
    roomId: '',
    hostel: 'Girls Hostel',
    roomType: 'AC Room',
    capacity: 2,
    status: 'Available',
    active: true,
  });

  const [vehicleForm, setVehicleForm] = useState({
    vehicleId: '',
    name: '',
    type: 'College Bus',
    registrationNumber: '',
    capacity: 50,
    driverName: '',
    driverPhone: '',
    status: 'AVAILABLE',
    active: true,
  });

  const [stationeryForm, setStationeryForm] = useState({
    itemId: '',
    name: '',
    category: 'Paper',
    unit: 'rim',
    description: '',
    active: true,
  });

  // Confirmation & Error Dialog States
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [errorDialog, setErrorDialog] = useState(null);

  // ==========================================
  // FETCH ALL RESOURCES FROM BACKEND
  // ==========================================
  const loadCategory = useCallback(async (cat) => {
    setCategoryLoading((prev) => ({ ...prev, [cat]: true }));
    setCategoryErrors((prev) => ({ ...prev, [cat]: null }));

    try {
      if (cat === 'halls') {
        const res = await resourceApi.getHalls();
        setHalls(Array.isArray(res?.data) ? res.data : []);
      } else if (cat === 'rooms') {
        const res = await resourceApi.getRooms();
        setRooms(Array.isArray(res?.data) ? res.data : []);
      } else if (cat === 'vehicles') {
        const res = await resourceApi.getVehicles();
        setVehicles(Array.isArray(res?.data) ? res.data : []);
      } else if (cat === 'stationery') {
        const res = await resourceApi.getStationeryItems();
        setStationery(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || `Failed to load ${cat}.`;
      setCategoryErrors((prev) => ({ ...prev, [cat]: msg }));
      addToast(`Error loading ${cat}: ${msg}`, 'error');
    } finally {
      setCategoryLoading((prev) => ({ ...prev, [cat]: false }));
    }
  }, [addToast]);

  const loadResources = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setCategoryLoading({ halls: true, rooms: true, vehicles: true, stationery: true });
      setLoading(true);
    }
    setRefreshing(true);
    setCategoryErrors({ halls: null, rooms: null, vehicles: null, stationery: null });

    try {
      const [hallsRes, roomsRes, vehiclesRes, stationeryRes] = await Promise.allSettled([
        resourceApi.getHalls(),
        resourceApi.getRooms(),
        resourceApi.getVehicles(),
        resourceApi.getStationeryItems(),
      ]);

      let hasAnyRejection = false;

      // Halls
      if (hallsRes.status === 'fulfilled' && hallsRes.value?.data) {
        setHalls(Array.isArray(hallsRes.value.data) ? hallsRes.value.data : []);
        setCategoryErrors((prev) => ({ ...prev, halls: null }));
      } else if (hallsRes.status === 'rejected') {
        hasAnyRejection = true;
        const msg = hallsRes.reason?.response?.data?.message || hallsRes.reason?.message || 'Failed to load seminar halls.';
        setCategoryErrors((prev) => ({ ...prev, halls: msg }));
      }

      // Rooms
      if (roomsRes.status === 'fulfilled' && roomsRes.value?.data) {
        setRooms(Array.isArray(roomsRes.value.data) ? roomsRes.value.data : []);
        setCategoryErrors((prev) => ({ ...prev, rooms: null }));
      } else if (roomsRes.status === 'rejected') {
        hasAnyRejection = true;
        const msg = roomsRes.reason?.response?.data?.message || roomsRes.reason?.message || 'Failed to load accommodation rooms.';
        setCategoryErrors((prev) => ({ ...prev, rooms: msg }));
      }

      // Vehicles
      if (vehiclesRes.status === 'fulfilled' && vehiclesRes.value?.data) {
        setVehicles(Array.isArray(vehiclesRes.value.data) ? vehiclesRes.value.data : []);
        setCategoryErrors((prev) => ({ ...prev, vehicles: null }));
      } else if (vehiclesRes.status === 'rejected') {
        hasAnyRejection = true;
        const msg = vehiclesRes.reason?.response?.data?.message || vehiclesRes.reason?.message || 'Failed to load transport fleet.';
        setCategoryErrors((prev) => ({ ...prev, vehicles: msg }));
      }

      // Stationery
      if (stationeryRes.status === 'fulfilled' && stationeryRes.value?.data) {
        setStationery(Array.isArray(stationeryRes.value.data) ? stationeryRes.value.data : []);
        setCategoryErrors((prev) => ({ ...prev, stationery: null }));
      } else if (stationeryRes.status === 'rejected') {
        hasAnyRejection = true;
        const msg = stationeryRes.reason?.response?.data?.message || stationeryRes.reason?.message || 'Failed to load stationery catalog.';
        setCategoryErrors((prev) => ({ ...prev, stationery: msg }));
      }

      if (hasAnyRejection) {
        addToast('Some resource categories failed to load. See error details in individual tabs.', 'warning');
      }
    } catch (err) {
      addToast(err?.message || 'Failed to load resources from backend.', 'error');
    } finally {
      setCategoryLoading({ halls: false, rooms: false, vehicles: false, stationery: false });
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // ==========================================
  // COMPUTED STATS
  // ==========================================
  const stats = useMemo(() => {
    const activeHalls = halls.filter((h) => h.active !== false).length;
    const activeRooms = rooms.filter((r) => r.active !== false).length;
    const activeVehicles = vehicles.filter((v) => v.active !== false).length;
    const activeStationery = stationery.filter((s) => s.active !== false).length;

    return {
      halls: { active: activeHalls, total: halls.length },
      rooms: { active: activeRooms, total: rooms.length },
      vehicles: { active: activeVehicles, total: vehicles.length },
      stationery: { active: activeStationery, total: stationery.length },
    };
  }, [halls, rooms, vehicles, stationery]);

  // ==========================================
  // FILTERED LISTS
  // ==========================================
  const filteredHalls = useMemo(() => {
    return halls.filter((h) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        h.hallId?.toLowerCase().includes(q) ||
        h.name?.toLowerCase().includes(q) ||
        h.location?.toLowerCase().includes(q);

      const isActive = h.active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [halls, searchQuery, statusFilter]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.roomId?.toLowerCase().includes(q) ||
        r.hostel?.toLowerCase().includes(q) ||
        r.roomType?.toLowerCase().includes(q);

      const isActive = r.active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      const matchesHostel = roomHostelFilter === 'all' || r.hostel === roomHostelFilter;

      return matchesSearch && matchesStatus && matchesHostel;
    });
  }, [rooms, searchQuery, statusFilter, roomHostelFilter]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.vehicleId?.toLowerCase().includes(q) ||
        v.name?.toLowerCase().includes(q) ||
        v.registrationNumber?.toLowerCase().includes(q) ||
        v.driverName?.toLowerCase().includes(q);

      const isActive = v.active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      const matchesType = vehicleTypeFilter === 'all' || v.type === vehicleTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vehicles, searchQuery, statusFilter, vehicleTypeFilter]);

  const filteredStationery = useMemo(() => {
    return stationery.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.itemId?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q);

      const isActive = s.active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      const matchesCategory =
        stationeryCategoryFilter === 'all' || s.category === stationeryCategoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [stationery, searchQuery, statusFilter, stationeryCategoryFilter]);

  // ==========================================
  // MODAL OPEN / EDIT INITIATORS
  // ==========================================
  const handleOpenAdd = (category) => {
    setEditCategory(category);
    setIsNew(true);
    setEditingId(null);

    if (category === 'halls') {
      const nextId = `SH-${String(halls.length + 1).padStart(2, '0')}`;
      setHallForm({
        hallId: nextId,
        name: '',
        location: '',
        capacity: 100,
        status: 'Available',
        coordinatorUserIds: '',
        ccEmails: '',
        active: true,
      });
    } else if (category === 'rooms') {
      setRoomForm({
        roomId: '',
        hostel: 'Girls Hostel',
        roomType: 'AC Room',
        capacity: 2,
        status: 'Available',
        active: true,
      });
    } else if (category === 'vehicles') {
      const nextId = `V-${String(vehicles.length + 1).padStart(2, '0')}`;
      setVehicleForm({
        vehicleId: nextId,
        name: `College Bus ${vehicles.length + 1}`,
        type: 'College Bus',
        registrationNumber: '',
        capacity: 50,
        driverName: '',
        driverPhone: '',
        status: 'AVAILABLE',
        active: true,
      });
    } else if (category === 'stationery') {
      const nextId = `ST-${String(stationery.length + 1).padStart(2, '0')}`;
      setStationeryForm({
        itemId: nextId,
        name: '',
        category: 'Paper',
        unit: 'rim',
        description: '',
        active: true,
      });
    }

    setIsModalOpen(true);
  };

  const handleOpenEdit = (category, item) => {
    setEditCategory(category);
    setIsNew(false);

    if (category === 'halls') {
      setEditingId(item.hallId);
      setHallForm({
        hallId: item.hallId || '',
        name: item.name || '',
        location: item.location || '',
        capacity: item.capacity || 100,
        status: item.status || 'Available',
        coordinatorUserIds: Array.isArray(item.coordinatorUserIds) ? item.coordinatorUserIds.join(', ') : '',
        ccEmails: Array.isArray(item.ccEmails) ? item.ccEmails.join(', ') : '',
        active: item.active !== false,
      });
    } else if (category === 'rooms') {
      setEditingId(item.roomId);
      setRoomForm({
        roomId: item.roomId || '',
        hostel: item.hostel || 'Girls Hostel',
        roomType: item.roomType || 'AC Room',
        capacity: item.capacity || 2,
        status: item.status || 'Available',
        active: item.active !== false,
      });
    } else if (category === 'vehicles') {
      setEditingId(item.vehicleId);
      setVehicleForm({
        vehicleId: item.vehicleId || '',
        name: item.name || '',
        type: item.type || 'College Bus',
        registrationNumber: item.registrationNumber || '',
        capacity: item.capacity || 50,
        driverName: item.driverName || '',
        driverPhone: item.driverPhone || '',
        status: item.status || 'AVAILABLE',
        active: item.active !== false,
      });
    } else if (category === 'stationery') {
      setEditingId(item.itemId);
      setStationeryForm({
        itemId: item.itemId || '',
        name: item.name || '',
        category: item.category || 'Paper',
        unit: item.unit || 'piece',
        description: item.description || '',
        active: item.active !== false,
      });
    }

    setIsModalOpen(true);
  };

  // ==========================================
  // FORM SUBMISSION (CREATE / UPDATE)
  // ==========================================
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (editCategory === 'halls') {
        if (!hallForm.hallId.trim() || !hallForm.name.trim() || !hallForm.location.trim() || !hallForm.capacity) {
          throw new Error('Please fill all required fields (Hall ID, Name, Location, Capacity).');
        }

        const coordinatorList = hallForm.coordinatorUserIds
          ? hallForm.coordinatorUserIds.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const emailList = hallForm.ccEmails
          ? hallForm.ccEmails.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        const payload = {
          hallId: hallForm.hallId.trim().toUpperCase(),
          name: hallForm.name.trim(),
          location: hallForm.location.trim(),
          capacity: parseInt(hallForm.capacity, 10),
          status: hallForm.status,
          coordinatorUserIds: coordinatorList,
          ccEmails: emailList,
          active: hallForm.active,
        };

        if (isNew) {
          await resourceApi.createHall(payload);
          addToast(`Seminar hall '${payload.name}' created successfully.`, 'success');
        } else {
          await resourceApi.updateHall(editingId, payload);
          addToast(`Seminar hall '${payload.name}' updated successfully.`, 'success');
        }
      } else if (editCategory === 'rooms') {
        if (!roomForm.roomId.trim() || !roomForm.hostel.trim() || !roomForm.roomType.trim() || !roomForm.capacity) {
          throw new Error('Please fill all required fields (Room ID, Hostel, Room Type, Capacity).');
        }

        const payload = {
          roomId: roomForm.roomId.trim().toUpperCase(),
          hostel: roomForm.hostel.trim(),
          roomType: roomForm.roomType.trim(),
          capacity: parseInt(roomForm.capacity, 10),
          status: roomForm.status,
          active: roomForm.active,
        };

        if (isNew) {
          await resourceApi.createRoom(payload);
          addToast(`Accommodation room '${payload.roomId}' created successfully.`, 'success');
        } else {
          await resourceApi.updateRoom(editingId, payload);
          addToast(`Accommodation room '${payload.roomId}' updated successfully.`, 'success');
        }
      } else if (editCategory === 'vehicles') {
        if (!vehicleForm.vehicleId.trim() || !vehicleForm.name.trim() || !vehicleForm.type.trim() || !vehicleForm.capacity) {
          throw new Error('Please fill all required fields (Vehicle ID, Name, Type, Capacity).');
        }

        const payload = {
          vehicleId: vehicleForm.vehicleId.trim().toUpperCase(),
          name: vehicleForm.name.trim(),
          type: vehicleForm.type.trim(),
          registrationNumber: vehicleForm.registrationNumber.trim().toUpperCase(),
          capacity: parseInt(vehicleForm.capacity, 10),
          driverName: vehicleForm.driverName.trim(),
          driverPhone: vehicleForm.driverPhone.trim(),
          status: vehicleForm.status,
          active: vehicleForm.active,
        };

        if (isNew) {
          await resourceApi.addVehicle(payload);
          addToast(`Vehicle '${payload.name}' added to fleet successfully.`, 'success');
        } else {
          await resourceApi.updateVehicle(editingId, payload);
          addToast(`Vehicle '${payload.name}' updated successfully.`, 'success');
        }
      } else if (editCategory === 'stationery') {
        if (!stationeryForm.itemId.trim() || !stationeryForm.name.trim() || !stationeryForm.category.trim() || !stationeryForm.unit.trim()) {
          throw new Error('Please fill all required fields (Item ID, Name, Category, Unit).');
        }

        const payload = {
          itemId: stationeryForm.itemId.trim().toUpperCase(),
          name: stationeryForm.name.trim(),
          category: stationeryForm.category.trim(),
          unit: stationeryForm.unit.trim(),
          description: stationeryForm.description.trim(),
          active: stationeryForm.active,
        };

        if (isNew) {
          await resourceApi.createStationeryItem(payload);
          addToast(`Stationery item '${payload.name}' created successfully.`, 'success');
        } else {
          await resourceApi.updateStationeryItem(editingId, payload);
          addToast(`Stationery item '${payload.name}' updated successfully.`, 'success');
        }
      }

      setIsModalOpen(false);
      await loadResources(true);
    } catch (err) {
      addToast(err?.message || 'Failed to save resource.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // TOGGLE ACTIVE STATUS (CONFIRMATION PROMPT)
  // ==========================================
  const promptToggleStatus = (category, item) => {
    const isCurrentlyActive = item.active !== false;
    const name = item.name || item.roomId || item.vehicleId || item.itemId;

    setConfirmDialog({
      type: 'toggle',
      category,
      item,
      title: `${isCurrentlyActive ? 'Deactivate' : 'Activate'} Resource`,
      message: isCurrentlyActive
        ? `Are you sure you want to deactivate "${name}"? Inactive resources will no longer appear in new request forms for department users.`
        : `Are you sure you want to activate "${name}"? This resource will immediately become selectable for new department requests.`,
      confirmText: isCurrentlyActive ? 'Deactivate' : 'Activate',
      confirmVariant: isCurrentlyActive ? 'btn-danger' : 'btn-primary',
    });
  };

  // ==========================================
  // DELETE RESOURCE (CONFIRMATION PROMPT)
  // ==========================================
  const promptDelete = (category, item) => {
    const name = item.name || item.roomId || item.vehicleId || item.itemId;
    setConfirmDialog({
      type: 'delete',
      category,
      item,
      title: `Delete Resource: ${name}`,
      message: `Are you sure you want to permanently delete "${name}"? This action cannot be undone. If historical bookings or requests reference this resource, the backend will prevent deletion to preserve audit history.`,
      confirmText: 'Delete Permanently',
      confirmVariant: 'btn-danger',
    });
  };

  // ==========================================
  // CONFIRMED ACTION EXECUTION
  // ==========================================
  const handleExecuteConfirm = async () => {
    if (!confirmDialog) return;
    const { type, category, item } = confirmDialog;
    setConfirmDialog(null);

    try {
      if (type === 'toggle') {
        if (category === 'halls') {
          await resourceApi.toggleHallStatus(item.hallId);
        } else if (category === 'rooms') {
          await resourceApi.toggleRoomStatus(item.roomId);
        } else if (category === 'vehicles') {
          await resourceApi.toggleVehicleStatus(item.vehicleId);
        } else if (category === 'stationery') {
          await resourceApi.toggleStationeryItemStatus(item.itemId);
        }
        addToast(`Status updated successfully.`, 'success');
      } else if (type === 'delete') {
        if (category === 'halls') {
          await resourceApi.deleteHall(item.hallId);
        } else if (category === 'rooms') {
          await resourceApi.deleteRoom(item.roomId);
        } else if (category === 'vehicles') {
          await resourceApi.deleteVehicle(item.vehicleId);
        } else if (category === 'stationery') {
          await resourceApi.deleteStationeryItem(item.itemId);
        }
        addToast(`Resource deleted successfully.`, 'success');
      }
      await loadResources(true);
    } catch (err) {
      const errMsg = err?.message || 'Operation failed.';
      if (errMsg.toLowerCase().includes('historical') || errMsg.toLowerCase().includes('booking') || errMsg.toLowerCase().includes('request')) {
        setErrorDialog({
          title: 'Resource Deletion Protected',
          message: errMsg,
          guidance: 'To maintain data integrity and institutional compliance, resources with past or current requests cannot be deleted. Instead, please use the Deactivate toggle to withdraw this resource from future selections.',
        });
      } else {
        addToast(errMsg, 'error');
      }
    }
  };

  if (!canManageResources) {
    return (
      <div className="rm-container">
        <div className="rm-state-box" style={{ minHeight: '60vh' }}>
          <div className="rm-state-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={32} />
          </div>
          <h2 className="rm-state-title" style={{ color: '#fca5a5' }}>Access Denied</h2>
          <p className="rm-state-desc">
            Resource Management is restricted exclusively to Administrative Officers with the <strong>AO_ADMIN</strong> role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rm-container">
      {/* Page Header */}
      <div className="rm-header">
        <div className="rm-header-info">
          <div className="rm-header-title-row">
            <h1 className="rm-title">Dynamic Resource Management</h1>
            <span className="rm-role-badge">
              <ShieldCheck size={14} /> AO_ADMIN ACCESS ONLY
            </span>
          </div>
          <p className="rm-subtitle">
            Configure, expand, and monitor seminar halls, hostel rooms, vehicle fleet, and requestable stationery items dynamically from MongoDB.
          </p>
        </div>

        <div className="rm-header-actions">
          <button
            onClick={() => loadResources()}
            disabled={refreshing}
            className="btn btn-secondary"
            title="Refresh resource lists from backend"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => handleOpenAdd(activeTab)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>
              Add{' '}
              {activeTab === 'halls'
                ? 'Hall'
                : activeTab === 'rooms'
                ? 'Room'
                : activeTab === 'vehicles'
                ? 'Vehicle'
                : 'Item'}
            </span>
          </button>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="rm-stats-grid">
        <div
          className={`rm-stat-card ${activeTab === 'halls' ? 'active-tab-stat' : ''}`}
          onClick={() => setActiveTab('halls')}
        >
          <div className="rm-stat-content">
            <span className="rm-stat-label">Seminar Halls</span>
            <div className="rm-stat-counts">
              <span className="rm-stat-active-num">{stats.halls.active}</span>
              <span className="rm-stat-total-label">/ {stats.halls.total} Active</span>
            </div>
          </div>
          <div className="rm-stat-icon-box">
            <Building2 size={22} />
          </div>
        </div>

        <div
          className={`rm-stat-card ${activeTab === 'rooms' ? 'active-tab-stat' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          <div className="rm-stat-content">
            <span className="rm-stat-label">Accommodation</span>
            <div className="rm-stat-counts">
              <span className="rm-stat-active-num">{stats.rooms.active}</span>
              <span className="rm-stat-total-label">/ {stats.rooms.total} Active</span>
            </div>
          </div>
          <div className="rm-stat-icon-box">
            <BedDouble size={22} />
          </div>
        </div>

        <div
          className={`rm-stat-card ${activeTab === 'vehicles' ? 'active-tab-stat' : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          <div className="rm-stat-content">
            <span className="rm-stat-label">Transport Fleet</span>
            <div className="rm-stat-counts">
              <span className="rm-stat-active-num">{stats.vehicles.active}</span>
              <span className="rm-stat-total-label">/ {stats.vehicles.total} Active</span>
            </div>
          </div>
          <div className="rm-stat-icon-box">
            <Bus size={22} />
          </div>
        </div>

        <div
          className={`rm-stat-card ${activeTab === 'stationery' ? 'active-tab-stat' : ''}`}
          onClick={() => setActiveTab('stationery')}
        >
          <div className="rm-stat-content">
            <span className="rm-stat-label">Stationery Items</span>
            <div className="rm-stat-counts">
              <span className="rm-stat-active-num">{stats.stationery.active}</span>
              <span className="rm-stat-total-label">/ {stats.stationery.total} Catalog</span>
            </div>
          </div>
          <div className="rm-stat-icon-box">
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="rm-tabs-bar">
        <button
          className={`rm-tab-btn ${activeTab === 'halls' ? 'active' : ''}`}
          onClick={() => setActiveTab('halls')}
        >
          <Building2 size={18} />
          <span>Halls & Auditoriums</span>
          <span className="rm-tab-pill-badge">{halls.length}</span>
        </button>

        <button
          className={`rm-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          <BedDouble size={18} />
          <span>Accommodation Rooms</span>
          <span className="rm-tab-pill-badge">{rooms.length}</span>
        </button>

        <button
          className={`rm-tab-btn ${activeTab === 'vehicles' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          <Bus size={18} />
          <span>Transport Vehicles</span>
          <span className="rm-tab-pill-badge">{vehicles.length}</span>
        </button>

        <button
          className={`rm-tab-btn ${activeTab === 'stationery' ? 'active' : ''}`}
          onClick={() => setActiveTab('stationery')}
        >
          <FileText size={18} />
          <span>Stationery Catalog</span>
          <span className="rm-tab-pill-badge">{stationery.length}</span>
        </button>
      </div>

      {/* Main Panel */}
      <div className="rm-panel">
        {/* Search & Filter Bar */}
        <div className="rm-filter-bar">
          <div className="rm-search-box">
            <Search size={18} className="rm-search-icon" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rm-search-input"
            />
          </div>

          <div className="rm-filter-group">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rm-filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Tab-Specific Filters */}
            {activeTab === 'rooms' && (
              <select
                value={roomHostelFilter}
                onChange={(e) => setRoomHostelFilter(e.target.value)}
                className="rm-filter-select"
              >
                <option value="all">All Hostels</option>
                {HOSTEL_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            )}

            {activeTab === 'vehicles' && (
              <select
                value={vehicleTypeFilter}
                onChange={(e) => setVehicleTypeFilter(e.target.value)}
                className="rm-filter-select"
              >
                <option value="all">All Vehicle Types</option>
                {VEHICLE_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            {activeTab === 'stationery' && (
              <select
                value={stationeryCategoryFilter}
                onChange={(e) => setStationeryCategoryFilter(e.target.value)}
                className="rm-filter-select"
              >
                <option value="all">All Categories</option>
                {STATIONERY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content Table by Category */}
        {categoryLoading[activeTab] ? (
          <div className="rm-state-box">
            <div className="rm-state-icon">
              <RefreshCw size={26} className="animate-spin" />
            </div>
            <p className="rm-state-title">
              Loading {activeTab === 'halls' ? 'Seminar Halls' : activeTab === 'rooms' ? 'Accommodation Rooms' : activeTab === 'vehicles' ? 'Transport Vehicles' : 'Stationery Catalog'}...
            </p>
            <p className="rm-state-desc">Fetching dynamic data from MongoDB.</p>
          </div>
        ) : categoryErrors[activeTab] ? (
          <div className="rm-state-box" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="rm-state-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <AlertTriangle size={28} />
            </div>
            <p className="rm-state-title" style={{ color: '#fca5a5' }}>
              Failed to Load {activeTab === 'halls' ? 'Seminar Halls' : activeTab === 'rooms' ? 'Accommodation Rooms' : activeTab === 'vehicles' ? 'Transport Vehicles' : 'Stationery Catalog'}
            </p>
            <p className="rm-state-desc" style={{ color: '#f87171' }}>
              {categoryErrors[activeTab]}
            </p>
            <button
              onClick={() => loadCategory(activeTab)}
              className="btn btn-secondary flex items-center gap-2 mt-2"
              style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
            >
              <RefreshCw size={15} /> Retry Loading
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1: SEMINAR HALLS */}
            {activeTab === 'halls' && (
              filteredHalls.length === 0 ? (
                <div className="rm-state-box">
                  <div className="rm-state-icon">
                    <Building2 size={26} />
                  </div>
                  <p className="rm-state-title">No Seminar Halls Found</p>
                  <p className="rm-state-desc">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No seminar halls match your search query or filter criteria.'
                      : 'No seminar halls are currently configured in the database.'}
                  </p>
                  <button onClick={() => handleOpenAdd('halls')} className="btn btn-primary">
                    <Plus size={16} /> Add First Hall
                  </button>
                </div>
              ) : (
                <div className="rm-table-wrapper">
                  <table className="rm-table">
                    <thead>
                      <tr>
                        <th>Hall ID</th>
                        <th>Hall Name</th>
                        <th>Location</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th>Active</th>
                        <th>Coordinators</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHalls.map((h) => {
                        const isActive = h.active !== false;
                        return (
                          <tr key={h.hallId} className={isActive ? '' : 'inactive-row'}>
                            <td>
                              <span className="rm-id-pill">{h.hallId}</span>
                            </td>
                            <td>
                              <div className="font-semibold text-white">{h.name}</div>
                            </td>
                            <td>
                              <span className="text-slate-300 flex items-center gap-1.5 text-xs">
                                <MapPin size={13} className="text-blue-400" />
                                {h.location || 'Campus'}
                              </span>
                            </td>
                            <td>
                              <span className="font-medium text-slate-200">{h.capacity || 0} seats</span>
                            </td>
                            <td>
                              <span
                                className={`rm-badge ${
                                  h.status === 'Available'
                                    ? 'rm-badge-available'
                                    : 'rm-badge-maintenance'
                                }`}
                              >
                                {h.status || 'Available'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`rm-badge ${
                                  isActive ? 'rm-badge-active' : 'rm-badge-inactive'
                                }`}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <span className="text-xs text-slate-400">
                                {Array.isArray(h.coordinatorUserIds) && h.coordinatorUserIds.length > 0
                                  ? `${h.coordinatorUserIds.length} assigned`
                                  : 'None'}
                              </span>
                            </td>
                            <td>
                              <div className="rm-action-buttons">
                                <button
                                  className="rm-icon-btn"
                                  onClick={() => handleOpenEdit('halls', h)}
                                  title="Edit Seminar Hall"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  className={`rm-icon-btn ${
                                    isActive ? 'btn-toggle-inactive' : 'btn-toggle-active'
                                  }`}
                                  onClick={() => promptToggleStatus('halls', h)}
                                  title={isActive ? 'Deactivate Hall' : 'Activate Hall'}
                                >
                                  <Power size={15} />
                                </button>
                                <button
                                  className="rm-icon-btn btn-delete"
                                  onClick={() => promptDelete('halls', h)}
                                  title="Delete Hall"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* TAB 2: ACCOMMODATION ROOMS */}
            {activeTab === 'rooms' && (
              filteredRooms.length === 0 ? (
                <div className="rm-state-box">
                  <div className="rm-state-icon">
                    <BedDouble size={26} />
                  </div>
                  <p className="rm-state-title">No Accommodation Rooms Found</p>
                  <p className="rm-state-desc">
                    {searchQuery || statusFilter !== 'all' || roomHostelFilter !== 'all'
                      ? 'No accommodation rooms match your current search or filter criteria.'
                      : 'No accommodation rooms have been created yet.'}
                  </p>
                  <button onClick={() => handleOpenAdd('rooms')} className="btn btn-primary">
                    <Plus size={16} /> Add Room
                  </button>
                </div>
              ) : (
                <div className="rm-table-wrapper">
                  <table className="rm-table">
                    <thead>
                      <tr>
                        <th>Room ID</th>
                        <th>Hostel</th>
                        <th>Type</th>
                        <th>Beds</th>
                        <th>Status</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRooms.map((r) => {
                        const isActive = r.active !== false;
                        return (
                          <tr key={r.roomId} className={isActive ? '' : 'inactive-row'}>
                            <td>
                              <span className="rm-id-pill">{r.roomId}</span>
                            </td>
                            <td>
                              <span className="font-semibold text-white">{r.hostel}</span>
                            </td>
                            <td>
                              <span className="text-slate-300 text-xs">{r.roomType || 'Standard'}</span>
                            </td>
                            <td>
                              <span className="font-medium text-slate-200">{r.capacity || 2} Beds</span>
                            </td>
                            <td>
                              <span
                                className={`rm-badge ${
                                  r.status === 'Available'
                                    ? 'rm-badge-available'
                                    : r.status === 'Maintenance'
                                    ? 'rm-badge-maintenance'
                                    : 'rm-badge-unavailable'
                                }`}
                              >
                                {r.status || 'Available'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`rm-badge ${
                                  isActive ? 'rm-badge-active' : 'rm-badge-inactive'
                                }`}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="rm-action-buttons">
                                <button
                                  className="rm-icon-btn"
                                  onClick={() => handleOpenEdit('rooms', r)}
                                  title="Edit Room"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  className={`rm-icon-btn ${
                                    isActive ? 'btn-toggle-inactive' : 'btn-toggle-active'
                                  }`}
                                  onClick={() => promptToggleStatus('rooms', r)}
                                  title={isActive ? 'Deactivate Room' : 'Activate Room'}
                                >
                                  <Power size={15} />
                                </button>
                                <button
                                  className="rm-icon-btn btn-delete"
                                  onClick={() => promptDelete('rooms', r)}
                                  title="Delete Room"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* TAB 3: TRANSPORT VEHICLES */}
            {activeTab === 'vehicles' && (
              filteredVehicles.length === 0 ? (
                <div className="rm-state-box">
                  <div className="rm-state-icon">
                    <Bus size={26} />
                  </div>
                  <p className="rm-state-title">No Transport Vehicles Found</p>
                  <p className="rm-state-desc">
                    {searchQuery || statusFilter !== 'all' || vehicleTypeFilter !== 'all'
                      ? 'No transport vehicles match your search query or filter criteria.'
                      : 'No vehicles are currently registered in the fleet.'}
                  </p>
                  <button onClick={() => handleOpenAdd('vehicles')} className="btn btn-primary">
                    <Plus size={16} /> Add Vehicle
                  </button>
                </div>
              ) : (
                <div className="rm-table-wrapper">
                  <table className="rm-table">
                    <thead>
                      <tr>
                        <th>Vehicle ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Registration No</th>
                        <th>Capacity</th>
                        <th>Driver Details</th>
                        <th>Status</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.map((v) => {
                        const isActive = v.active !== false;
                        return (
                          <tr key={v.vehicleId} className={isActive ? '' : 'inactive-row'}>
                            <td>
                              <span className="rm-id-pill">{v.vehicleId}</span>
                            </td>
                            <td>
                              <div className="font-semibold text-white">{v.name}</div>
                            </td>
                            <td>
                              <span className="text-slate-300 text-xs">{v.type || 'College Bus'}</span>
                            </td>
                            <td>
                              <span className="font-mono text-xs text-sky-400">
                                {v.registrationNumber || 'N/A'}
                              </span>
                            </td>
                            <td>
                              <span className="font-medium text-slate-200">{v.capacity || 0} Seats</span>
                            </td>
                            <td>
                              <div className="text-xs text-slate-300">
                                {v.driverName ? (
                                  <div>
                                    <span className="text-white font-medium">{v.driverName}</span>
                                    {v.driverPhone && (
                                      <span className="text-slate-400 ml-1.5 flex items-center gap-1 mt-0.5">
                                        <Phone size={11} className="text-emerald-400" />
                                        {v.driverPhone}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-500">Unassigned</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`rm-badge ${
                                  v.status === 'AVAILABLE'
                                    ? 'rm-badge-available'
                                    : v.status === 'MAINTENANCE'
                                    ? 'rm-badge-maintenance'
                                    : 'rm-badge-unavailable'
                                }`}
                              >
                                {v.status || 'AVAILABLE'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`rm-badge ${
                                  isActive ? 'rm-badge-active' : 'rm-badge-inactive'
                                }`}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="rm-action-buttons">
                                <button
                                  className="rm-icon-btn"
                                  onClick={() => handleOpenEdit('vehicles', v)}
                                  title="Edit Vehicle"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  className={`rm-icon-btn ${
                                    isActive ? 'btn-toggle-inactive' : 'btn-toggle-active'
                                  }`}
                                  onClick={() => promptToggleStatus('vehicles', v)}
                                  title={isActive ? 'Deactivate Vehicle' : 'Activate Vehicle'}
                                >
                                  <Power size={15} />
                                </button>
                                <button
                                  className="rm-icon-btn btn-delete"
                                  onClick={() => promptDelete('vehicles', v)}
                                  title="Delete Vehicle"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* TAB 4: STATIONERY CATALOG */}
            {activeTab === 'stationery' && (
              filteredStationery.length === 0 ? (
                <div className="rm-state-box">
                  <div className="rm-state-icon">
                    <FileText size={26} />
                  </div>
                  <p className="rm-state-title">No Stationery Items Found</p>
                  <p className="rm-state-desc">
                    {searchQuery || statusFilter !== 'all' || stationeryCategoryFilter !== 'all'
                      ? 'No stationery items match your search query or filter criteria.'
                      : 'No items are currently in the stationery request catalog.'}
                  </p>
                  <button onClick={() => handleOpenAdd('stationery')} className="btn btn-primary">
                    <Plus size={16} /> Add Item
                  </button>
                </div>
              ) : (
                <div className="rm-table-wrapper">
                  <table className="rm-table">
                    <thead>
                      <tr>
                        <th>Item ID</th>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Unit</th>
                        <th>Description</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStationery.map((s) => {
                        const isActive = s.active !== false;
                        return (
                          <tr key={s.itemId} className={isActive ? '' : 'inactive-row'}>
                            <td>
                              <span className="rm-id-pill">{s.itemId}</span>
                            </td>
                            <td>
                              <div className="font-semibold text-white">{s.name}</div>
                            </td>
                            <td>
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {s.category || 'General'}
                              </span>
                            </td>
                            <td>
                              <span className="text-slate-300 text-xs font-medium">{s.unit || 'piece'}</span>
                            </td>
                            <td>
                              <span className="text-xs text-slate-400 line-clamp-1 max-w-xs">
                                {s.description || 'Standard institutional supply'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`rm-badge ${
                                  isActive ? 'rm-badge-active' : 'rm-badge-inactive'
                                }`}
                              >
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="rm-action-buttons">
                                <button
                                  className="rm-icon-btn"
                                  onClick={() => handleOpenEdit('stationery', s)}
                                  title="Edit Stationery Item"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  className={`rm-icon-btn ${
                                    isActive ? 'btn-toggle-inactive' : 'btn-toggle-active'
                                  }`}
                                  onClick={() => promptToggleStatus('stationery', s)}
                                  title={isActive ? 'Deactivate Item' : 'Activate Item'}
                                >
                                  <Power size={15} />
                                </button>
                                <button
                                  className="rm-icon-btn btn-delete"
                                  onClick={() => promptDelete('stationery', s)}
                                  title="Delete Item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* ========================================================
          CREATE / EDIT MODAL
          ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={
          isNew
            ? `Add ${
                editCategory === 'halls'
                  ? 'Seminar Hall'
                  : editCategory === 'rooms'
                  ? 'Accommodation Room'
                  : editCategory === 'vehicles'
                  ? 'Transport Vehicle'
                  : 'Stationery Item'
              }`
            : `Edit ${
                editCategory === 'halls'
                  ? 'Seminar Hall'
                  : editCategory === 'rooms'
                  ? 'Accommodation Room'
                  : editCategory === 'vehicles'
                  ? 'Transport Vehicle'
                  : 'Stationery Item'
              }`
        }
        maxWidth="620px"
      >
        <form onSubmit={handleSubmitForm} className="rm-modal-form">
          {/* SEMINAR HALL FORM */}
          {editCategory === 'halls' && (
            <>
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Hall ID *</label>
                  <input
                    type="text"
                    value={hallForm.hallId}
                    onChange={(e) => setHallForm({ ...hallForm, hallId: e.target.value })}
                    disabled={!isNew}
                    placeholder="e.g. SH-07, AUD-01"
                    required
                  />
                  {!isNew && <span className="rm-helper-text">Hall ID cannot be altered once created.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Seating Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    value={hallForm.capacity}
                    onChange={(e) => setHallForm({ ...hallForm, capacity: e.target.value })}
                    placeholder="e.g. 250"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hall Name *</label>
                <input
                  type="text"
                  value={hallForm.name}
                  onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                  placeholder="e.g. Main Auditorium, Tech Hub 2"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location / Building *</label>
                <input
                  type="text"
                  value={hallForm.location}
                  onChange={(e) => setHallForm({ ...hallForm, location: e.target.value })}
                  placeholder="e.g. Block 3 – Ground Floor"
                  required
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Operational Status</label>
                  <select
                    value={hallForm.status}
                    onChange={(e) => setHallForm({ ...hallForm, status: e.target.value })}
                  >
                    <option value="Available">Available</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Reserved">Reserved</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Active State</label>
                  <div className="pt-2">
                    <label className="rm-checkbox-label">
                      <input
                        type="checkbox"
                        checked={hallForm.active}
                        onChange={(e) => setHallForm({ ...hallForm, active: e.target.checked })}
                      />
                      <span>Active for Booking Requests</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Coordinator User IDs (Optional)</label>
                <input
                  type="text"
                  value={hallForm.coordinatorUserIds}
                  onChange={(e) => setHallForm({ ...hallForm, coordinatorUserIds: e.target.value })}
                  placeholder="e.g. coord_cse, coord_ece (comma-separated)"
                />
                <span className="rm-helper-text">User IDs of faculty authorized as coordinators for this hall.</span>
              </div>

              <div className="form-group">
                <label className="form-label">CC Email Notifications (Optional)</label>
                <input
                  type="text"
                  value={hallForm.ccEmails}
                  onChange={(e) => setHallForm({ ...hallForm, ccEmails: e.target.value })}
                  placeholder="e.g. ao@nrtec.ac.in, principal@nrtec.ac.in"
                />
                <span className="rm-helper-text">Additional email addresses alerted on bookings for this hall.</span>
              </div>
            </>
          )}

          {/* ACCOMMODATION ROOM FORM */}
          {editCategory === 'rooms' && (
            <>
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Room ID *</label>
                  <input
                    type="text"
                    value={roomForm.roomId}
                    onChange={(e) => setRoomForm({ ...roomForm, roomId: e.target.value })}
                    disabled={!isNew}
                    placeholder="e.g. GH-AC-05, BH-NONAC-12"
                    required
                  />
                  {!isNew && <span className="rm-helper-text">Room ID cannot be altered once created.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Hostel Facility *</label>
                  <select
                    value={roomForm.hostel}
                    onChange={(e) => setRoomForm({ ...roomForm, hostel: e.target.value })}
                    required
                  >
                    {HOSTEL_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Room Classification *</label>
                  <select
                    value={roomForm.roomType}
                    onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}
                    required
                  >
                    <option value="AC Room">AC Room</option>
                    <option value="Non-AC Room">Non-AC Room</option>
                    <option value="VIP Suite">VIP Suite</option>
                    <option value="Standard Room">Standard Room</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Bed Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Operational Status</label>
                  <select
                    value={roomForm.status}
                    onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                  >
                    {ROOM_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Active State</label>
                  <div className="pt-2">
                    <label className="rm-checkbox-label">
                      <input
                        type="checkbox"
                        checked={roomForm.active}
                        onChange={(e) => setRoomForm({ ...roomForm, active: e.target.checked })}
                      />
                      <span>Active for Accommodation Requests</span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TRANSPORT VEHICLE FORM */}
          {editCategory === 'vehicles' && (
            <>
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Vehicle ID *</label>
                  <input
                    type="text"
                    value={vehicleForm.vehicleId}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleId: e.target.value })}
                    disabled={!isNew}
                    placeholder="e.g. V-06, V-07"
                    required
                  />
                  {!isNew && <span className="rm-helper-text">Vehicle ID cannot be changed once created.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Type *</label>
                  <select
                    value={vehicleForm.type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                    required
                  >
                    {VEHICLE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Vehicle Name *</label>
                  <input
                    type="text"
                    value={vehicleForm.name}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                    placeholder="e.g. College Bus 6, Staff Van"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Registration Number</label>
                  <input
                    type="text"
                    value={vehicleForm.registrationNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                    placeholder="e.g. AP39 AB 1234"
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Seating Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    value={vehicleForm.capacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Operational Status</label>
                  <select
                    value={vehicleForm.status}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}
                  >
                    {VEHICLE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Assigned Driver Name</label>
                  <input
                    type="text"
                    value={vehicleForm.driverName}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driver Phone Number</label>
                  <input
                    type="text"
                    value={vehicleForm.driverPhone}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driverPhone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="rm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={vehicleForm.active}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, active: e.target.checked })}
                  />
                  <span>Active in Fleet (Selectable for Department Trips)</span>
                </label>
              </div>
            </>
          )}

          {/* STATIONERY ITEM FORM (NO STOCK OR INVENTORY FIELDS) */}
          {editCategory === 'stationery' && (
            <>
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Item ID *</label>
                  <input
                    type="text"
                    value={stationeryForm.itemId}
                    onChange={(e) => setStationeryForm({ ...stationeryForm, itemId: e.target.value })}
                    disabled={!isNew}
                    placeholder="e.g. ST-09, ST-10"
                    required
                  />
                  {!isNew && <span className="rm-helper-text">Item ID cannot be changed once created.</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    value={stationeryForm.category}
                    onChange={(e) => setStationeryForm({ ...stationeryForm, category: e.target.value })}
                    required
                  >
                    {STATIONERY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input
                    type="text"
                    value={stationeryForm.name}
                    onChange={(e) => setStationeryForm({ ...stationeryForm, name: e.target.value })}
                    placeholder="e.g. Highlighter Set (5 colors)"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit of Measure *</label>
                  <input
                    type="text"
                    value={stationeryForm.unit}
                    onChange={(e) => setStationeryForm({ ...stationeryForm, unit: e.target.value })}
                    placeholder="e.g. rim, pack, box, piece"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Item Description / Specifications</label>
                <textarea
                  rows="3"
                  value={stationeryForm.description}
                  onChange={(e) => setStationeryForm({ ...stationeryForm, description: e.target.value })}
                  placeholder="e.g. 5 colors assorted chisel tip permanent highlighters for office and exam use."
                />
              </div>

              <div className="form-group">
                <label className="rm-checkbox-label">
                  <input
                    type="checkbox"
                    checked={stationeryForm.active}
                    onChange={(e) => setStationeryForm({ ...stationeryForm, active: e.target.checked })}
                  />
                  <span>Active in Requisition Catalog (Request-Only)</span>
                </label>
                <span className="rm-helper-text">
                  Note: Stationery items are strictly request-only. No stock or inventory levels are tracked.
                </span>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="rm-modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Saving...
                </>
              ) : isNew ? (
                <>
                  <Plus size={15} /> Create Resource
                </>
              ) : (
                <>
                  <Check size={15} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          CONFIRMATION DIALOG (TOGGLE / DELETE)
          ======================================================== */}
      {confirmDialog && (
        <Modal
          isOpen={!!confirmDialog}
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          maxWidth="480px"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <AlertTriangle size={20} />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed m-0">
                {confirmDialog.message}
              </p>
            </div>

            <div className="rm-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${confirmDialog.confirmVariant || 'btn-primary'}`}
                onClick={handleExecuteConfirm}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================
          ERROR / DATA INTEGRITY DIALOG
          ======================================================== */}
      {errorDialog && (
        <Modal
          isOpen={!!errorDialog}
          onClose={() => setErrorDialog(null)}
          title={errorDialog.title}
          maxWidth="500px"
        >
          <div className="flex flex-col gap-4">
            <div className="rm-error-alert">
              <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-rose-300">Action Prevented</span>
                <span>{errorDialog.message}</span>
              </div>
            </div>

            {errorDialog.guidance && (
              <p className="text-xs text-slate-400 leading-relaxed">
                <Info size={14} className="inline mr-1 text-blue-400" />
                {errorDialog.guidance}
              </p>
            )}

            <div className="rm-modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setErrorDialog(null)}
              >
                Understood
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
