import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Building2,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
  User,
  Phone,
  Plus,
  Zap,
  Upload,
  Send,
  RotateCcw,
  MapPin,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { seminarApi, electricalIssueApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import SeminarInspectionsTab from './SeminarInspectionsTab';
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

  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ==========================================
  // NAVIGATION & ELECTRICAL STATE
  // ==========================================
  const [activeMainTab, setActiveMainTab] = useState('INSPECTIONS'); // 'INSPECTIONS' or 'ELECTRICAL'
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

  useEffect(() => {
    fetchHalls();
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
                Seminar Technician Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                TECHNICIAN
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Conduct pre-event and post-event inspections, audit hall readiness, and report campus electrical maintenance issues.
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
                fetchHalls();
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
          onClick={() => setActiveMainTab('INSPECTIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeMainTab === 'INSPECTIONS'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-emerald-300" />
          <span>Seminar Inspections</span>
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

      {activeMainTab === 'INSPECTIONS' ? (
        <SeminarInspectionsTab
          halls={halls}
          assignedHallIds={assignedHallIds}
          isSuperAdmin={isAOAdmin || isSeminarAdmin}
        />
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
