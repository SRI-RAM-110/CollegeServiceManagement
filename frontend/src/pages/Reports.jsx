import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Building2,
  Building,
  Home,
  Truck,
  FileText,
  Utensils,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Search,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Users,
  ShieldCheck,
  CalendarDays,
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { reportsApi } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { RequestDetailsModal } from '../components/common/RequestDetailsModal';
import { MultiSelectDropdown } from '../components/common/MultiSelectDropdown';
import ReportsAnalyticsGraphs from '../components/reports/ReportsAnalyticsGraphs';

// All supported services definition
const SUPPORTED_SERVICES = [
  { id: 'ACCOMMODATION', label: 'Accommodation', icon: Home, color: 'text-emerald-400' },
  { id: 'SEMINAR_HALL', label: 'Seminar Hall Booking', icon: Building2, color: 'text-blue-400' },
  { id: 'TRANSPORT', label: 'Transport', icon: Truck, color: 'text-amber-400' },
  { id: 'STATIONERY', label: 'Stationery', icon: FileText, color: 'text-indigo-400' },
  { id: 'MEALS', label: 'Snacks & Meals', icon: Utensils, color: 'text-sky-400' },
];

// Valid statuses matching models and reporting logic
const VALID_STATUSES = [
  { id: 'APPROVED', label: 'Approved / Confirmed', badge: 'Approved' },
  { id: 'PENDING', label: 'Pending Review', badge: 'Pending' },
  { id: 'UNDER_REVIEW', label: 'Under Review', badge: 'Review' },
  { id: 'REJECTED', label: 'Rejected', badge: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled', badge: 'Cancelled' },
  { id: 'COMPLETED', label: 'Completed', badge: 'Completed' },
];

export default function Reports() {
  const { user } = useAuth();
  const { addToast } = useNotifications();

  // Permissions state
  const [permissions, setPermissions] = useState(null);
  const [permLoading, setPermLoading] = useState(true);

  // Date Filter States
  const [dateRangeType, setDateRangeType] = useState('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Multi-Select Filter States
  const [selectedServices, setSelectedServices] = useState(
    SUPPORTED_SERVICES.map((s) => s.id)
  );
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(
    VALID_STATUSES.map((st) => st.id)
  );
  const [selectedHallId, setSelectedHallId] = useState('ALL');

  // Search & Pagination for detailed records
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Data & Loading States
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [excelDownloading, setExcelDownloading] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Load user report permissions on mount
  useEffect(() => {
    let isCancelled = false;
    const loadPermissions = async () => {
      try {
        setPermLoading(true);
        const res = await reportsApi.getPermissions();
        if (!isCancelled && res?.data) {
          const perm = res.data;
          setPermissions(perm);

          // Configure initial department defaults based on permissions
          if (perm.departmentUser) {
            setSelectedDepartments([perm.userDepartment || 'CSE']);
          } else if (perm.availableDepartments && perm.availableDepartments.length > 0) {
            setSelectedDepartments(perm.availableDepartments);
          } else {
            setSelectedDepartments(['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIML', 'MBA', 'MCA', 'BS&H']);
          }

          // Seminar hall coordinator default
          if (perm.seminarCoordinator && perm.allowedHalls && perm.allowedHalls.length === 1) {
            setSelectedHallId(perm.allowedHalls[0].hallId);
          }
        }
      } catch (err) {
        console.error('Failed to load report permissions:', err);
        setError('Failed to initialize report permissions.');
      } finally {
        if (!isCancelled) setPermLoading(false);
      }
    };

    loadPermissions();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Department options memoized from permissions
  const departmentOptions = useMemo(() => {
    const list = permissions?.availableDepartments || [
      'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIML', 'MBA', 'MCA', 'BS&H'
    ];
    return list.map((d) => ({
      id: d,
      label: d
    }));
  }, [permissions]);

  // Construct backend payload based on multi-select filters
  const buildFilterPayload = () => {
    const totalServices = SUPPORTED_SERVICES.length;
    const isAllServicesSelected = selectedServices.length === totalServices || selectedServices.length === 0;

    const totalDepts = departmentOptions.length;
    const isAllDeptsSelected = selectedDepartments.length === totalDepts || selectedDepartments.length === 0;

    const totalStatuses = VALID_STATUSES.length;
    const isAllStatusesSelected = selectedStatuses.length === totalStatuses || selectedStatuses.length === 0;

    return {
      dateRangeType,
      startDate: dateRangeType === 'CUSTOM' ? startDate : null,
      endDate: dateRangeType === 'CUSTOM' ? endDate : null,

      // Multi-select services
      services: isAllServicesSelected ? null : selectedServices,
      service: isAllServicesSelected ? 'ALL' : (selectedServices.length === 1 ? selectedServices[0] : selectedServices[0]),

      // Multi-select departments
      departments: permissions?.departmentUser
        ? [permissions.userDepartment]
        : (isAllDeptsSelected ? null : selectedDepartments),
      department: permissions?.departmentUser
        ? permissions.userDepartment
        : (selectedDepartments.length === 1 ? selectedDepartments[0] : 'ALL'),

      // Multi-select statuses
      statuses: isAllStatusesSelected ? null : selectedStatuses,
      status: isAllStatusesSelected ? 'ALL' : (selectedStatuses.length === 1 ? selectedStatuses[0] : selectedStatuses[0]),

      // Seminar Hall filter (applies when Seminar Hall is in selected services or all services)
      hallId: isAllServicesSelected || selectedServices.includes('SEMINAR_HALL') ? selectedHallId : 'ALL',

      viewType: permissions?.departmentUser ? 'DEPARTMENT' : 'SUMMARY',
      search: searchQuery
    };
  };

  // 2. Fetch Report Data whenever any filter changes
  const fetchReportData = async () => {
    if (!permissions) return;
    try {
      setLoading(true);
      setError(null);

      const filterPayload = buildFilterPayload();
      const res = await reportsApi.getData(filterPayload);
      if (res?.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err?.message || 'Error fetching report analytics.');
      addToast(err?.message || 'Error fetching reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissions) {
      fetchReportData();
    }
  }, [
    permissions,
    dateRangeType,
    startDate,
    endDate,
    selectedServices,
    selectedDepartments,
    selectedStatuses,
    selectedHallId
  ]);

  // Export PDF with active multi-select filters
  const handleExportPdf = async () => {
    try {
      setPdfDownloading(true);
      const filterPayload = buildFilterPayload();
      const blob = await reportsApi.exportPdf(filterPayload);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `NEC_Reports_Analytics_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('PDF Report downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      addToast('Failed to generate PDF report: ' + err.message, 'error');
    } finally {
      setPdfDownloading(false);
    }
  };

  // Export Excel with active multi-select filters
  const handleExportExcel = async () => {
    try {
      setExcelDownloading(true);
      const filterPayload = buildFilterPayload();
      const blob = await reportsApi.exportExcel(filterPayload);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      );
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `NEC_Reports_Analytics_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('Excel Report downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to download Excel:', err);
      addToast('Failed to generate Excel report: ' + err.message, 'error');
    } finally {
      setExcelDownloading(false);
    }
  };

  // Quick Date Click Helper
  const handleQuickDate = (type) => {
    setDateRangeType(type);
    if (type !== 'CUSTOM') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Check if a service is actively included in the current selection
  const isServiceIncluded = (srvId) => {
    if (selectedServices.length === 0 || selectedServices.length === SUPPORTED_SERVICES.length) {
      return true; // All services included when none or all are checked
    }
    return selectedServices.includes(srvId);
  };

  // Filtered detailed records by search
  const filteredRecords = useMemo(() => {
    if (!reportData?.detailedRecords) return [];
    if (!searchQuery.trim()) return reportData.detailedRecords;
    const q = searchQuery.toLowerCase();
    return reportData.detailedRecords.filter((r) =>
      r.requestId?.toLowerCase().includes(q) ||
      r.service?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.requesterName?.toLowerCase().includes(q) ||
      r.purpose?.toLowerCase().includes(q) ||
      r.resourceName?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const serviceBreakdown = reportData?.serviceBreakdown || [];
  const departmentBreakdown = reportData?.departmentBreakdown || [];

  // Filter service breakdown rows according to active services
  const displayedServiceBreakdown = useMemo(() => {
    return serviceBreakdown.filter((row) => {
      const srvKey =
        row.serviceName === 'Seminar Hall'
          ? 'SEMINAR_HALL'
          : row.serviceName === 'Accommodation'
          ? 'ACCOMMODATION'
          : row.serviceName === 'Transport'
          ? 'TRANSPORT'
          : row.serviceName === 'Stationery'
          ? 'STATIONERY'
          : 'MEALS';
      return isServiceIncluded(srvKey);
    });
  }, [serviceBreakdown, selectedServices]);

  // Filter department breakdown rows according to active departments
  const displayedDeptBreakdown = useMemo(() => {
    if (selectedDepartments.length === 0 || selectedDepartments.length === departmentOptions.length) {
      return departmentBreakdown;
    }
    return departmentBreakdown.filter((d) =>
      selectedDepartments.some((dept) => dept.toUpperCase() === d.department?.toUpperCase())
    );
  }, [departmentBreakdown, selectedDepartments, departmentOptions]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  if (permLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-slate-400 text-sm">Loading Reports & Analytics engine...</p>
      </div>
    );
  }

  const summary = reportData?.summary || {
    totalRequests: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
    underReview: 0
  };

  const hallBreakdown = reportData?.hallBreakdown || [];
  const slotBreakdown = reportData?.slotBreakdown || { FORENOON: 0, AFTERNOON: 0, FULL_DAY: 0 };
  const mealsHeadcount = reportData?.mealsHeadcount || {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snacks: 0,
    teaCoffee: 0,
    snacksForenoon: 0,
    snacksAfternoon: 0,
    teaCoffeeForenoon: 0,
    teaCoffeeAfternoon: 0
  };
  const stationeryItems = reportData?.stationeryItems || [];
  const transportMetrics = reportData?.transportMetrics || { totalTrips: 0, totalPassengers: 0, vehicleUsage: {} };
  const accommodationMetrics = reportData?.accommodationMetrics || { totalGuests: 0, approvedStays: 0, roomUsage: {} };

  const seminarHallServiceActive = isServiceIncluded('SEMINAR_HALL');
  const accommodationServiceActive = isServiceIncluded('ACCOMMODATION');
  const transportServiceActive = isServiceIncluded('TRANSPORT');
  const stationeryServiceActive = isServiceIncluded('STATIONERY');
  const mealsServiceActive = isServiceIncluded('MEALS');

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header & Institutional Branding (Tabs removed for unified layout) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Reports & Analytics
                </h1>
                <p className="text-xs text-slate-400">
                  Narasaraopet Engineering College (Autonomous) &bull; Service Performance & Requisition Auditing
                </p>
              </div>
            </div>
          </div>

          {/* User Role Context & Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {permissions?.aoAdmin
                  ? 'AO Super Admin'
                  : permissions?.seminarCoordinator
                  ? 'Seminar Coordinator'
                  : permissions?.serviceAdmin
                  ? `${permissions.allowedServices?.[0] || 'Service'} Admin`
                  : `${permissions?.userDepartment || 'Dept'} User`}
              </span>
            </div>

            <button
              onClick={fetchReportData}
              disabled={loading}
              className="btn btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={pdfDownloading || loading}
              className="btn flex items-center gap-1.5 px-3 py-2 text-xs bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg transition shadow-sm font-medium disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${pdfDownloading ? 'animate-bounce' : ''}`} />
              <span>{pdfDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={excelDownloading || loading}
              className="btn flex items-center gap-1.5 px-3 py-2 text-xs bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg transition shadow-sm font-medium disabled:opacity-50"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${excelDownloading ? 'animate-bounce' : ''}`} />
              <span>{excelDownloading ? 'Exporting...' : 'Download Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Date Filters & Multi-Select Filters */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
        {/* Quick Date Filters + Custom Picker */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Date Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'THIS_YEAR', label: 'This Year' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => handleQuickDate(d.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  dateRangeType === d.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateRangeType === 'CUSTOM' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input text-xs py-1.5 px-2 bg-slate-800 border-slate-700 text-white rounded-lg"
                placeholder="From Date"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input text-xs py-1.5 px-2 bg-slate-800 border-slate-700 text-white rounded-lg"
                placeholder="To Date"
              />
            </div>
          )}
        </div>

        {/* Dropdown Filters Grid with Multi-Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Multi-Select Service Filter */}
          <MultiSelectDropdown
            label="Services"
            icon={Layers}
            options={SUPPORTED_SERVICES}
            selectedValues={selectedServices}
            onChange={(newVals) => setSelectedServices(newVals)}
            allSelectedLabel="All Services"
            placeholder="Select Services"
          />

          {/* Multi-Select Department Filter */}
          {permissions?.departmentUser ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  Department
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Assigned</span>
              </label>
              <div className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-emerald-400 font-medium">
                <span>{permissions.userDepartment}</span>
                <span className="text-[10px] text-slate-500 font-normal">Locked</span>
              </div>
            </div>
          ) : (
            <MultiSelectDropdown
              label="Departments"
              icon={Building}
              options={departmentOptions}
              selectedValues={selectedDepartments}
              onChange={(newVals) => setSelectedDepartments(newVals)}
              allSelectedLabel="All Departments"
              placeholder="Select Departments"
              searchable={true}
            />
          )}

          {/* Seminar Hall / Resource Filter (Enabled when Seminar Hall is selected or all active) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Resource / Hall
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {seminarHallServiceActive ? 'Active' : 'N/A'}
              </span>
            </label>
            {seminarHallServiceActive ? (
              permissions?.seminarCoordinator && permissions?.allowedHalls?.length === 1 ? (
                <div className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-blue-400 font-medium">
                  <span>{permissions.allowedHalls[0].hallName}</span>
                  <span className="text-[10px] text-slate-500 font-normal">Assigned</span>
                </div>
              ) : (
                <select
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(e.target.value)}
                  className="input text-xs py-2 px-3 bg-slate-800 border-slate-700 text-white rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="ALL">All Seminar Halls</option>
                  {permissions?.allowedHalls?.map((hall) => (
                    <option key={hall.hallId} value={hall.hallId}>
                      {hall.hallName}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <div className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-500 flex items-center justify-between">
                <span>Not applicable</span>
                <span className="text-[10px] text-slate-600">Select Hall</span>
              </div>
            )}
          </div>

          {/* Multi-Select Status Filter */}
          <MultiSelectDropdown
            label="Statuses"
            icon={Filter}
            options={VALID_STATUSES}
            selectedValues={selectedStatuses}
            onChange={(newVals) => setSelectedStatuses(newVals)}
            allSelectedLabel="All Statuses"
            placeholder="Select Statuses"
          />
        </div>
      </div>

      {/* 3. Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="card-panel p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Requisitions</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {summary.totalRequests || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Matching selected filters
          </div>
        </div>

        <div className="card-panel p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Approved / Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary.approved || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {summary.totalRequests > 0
              ? `${Math.round(((summary.approved || 0) / summary.totalRequests) * 100)}% approval rate`
              : '0% rate'}
          </div>
        </div>

        <div className="card-panel p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {summary.pending || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Awaiting administrator action
          </div>
        </div>

        <div className="card-panel p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Rejected</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {summary.rejected || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Declined requests
          </div>
        </div>

        <div className="card-panel p-4 border-l-4 border-l-slate-500">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Cancelled</span>
            <AlertCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300">
            {summary.cancelled || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            User / admin cancellations
          </div>
        </div>
      </div>

      {/* 4. Interactive Analytics Graphs (Visual Trends, Status Distribution, Facility Utilization, Department Comparison) */}
      <ReportsAnalyticsGraphs
        reportData={reportData}
        summary={summary}
        selectedServices={selectedServices}
        selectedDepartments={selectedDepartments}
        selectedStatuses={selectedStatuses}
        selectedHall={selectedHallId}
        dateRangeType={dateRangeType}
        startDate={startDate}
        endDate={endDate}
        displayedServiceBreakdown={displayedServiceBreakdown}
        displayedDeptBreakdown={displayedDeptBreakdown}
      />

      {/* 5. Service Metrics & Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Service Metrics & Utilization
            </h2>
            <p className="text-xs text-slate-400">
              Usage breakdown and granular requisition data across college facilities
            </p>
          </div>
        </div>

        {/* Overall Service Usage Breakdown Table */}
        <div className="card-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Overall Service Breakdown
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {displayedServiceBreakdown.length} active service{displayedServiceBreakdown.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Service</th>
                  <th className="pb-3 font-semibold text-center">Total Requests</th>
                  <th className="pb-3 font-semibold text-center text-emerald-400">Approved</th>
                  <th className="pb-3 font-semibold text-center text-amber-400">Pending</th>
                  <th className="pb-3 font-semibold text-center text-rose-400">Rejected</th>
                  <th className="pb-3 font-semibold text-center text-slate-400">Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {displayedServiceBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500">
                      No service usage records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  displayedServiceBreakdown.map((row) => (
                    <tr key={row.serviceName} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        {row.serviceName === 'Seminar Hall' && <Building2 className="w-4 h-4 text-blue-400" />}
                        {row.serviceName === 'Accommodation' && <Home className="w-4 h-4 text-emerald-400" />}
                        {row.serviceName === 'Transport' && <Truck className="w-4 h-4 text-amber-400" />}
                        {row.serviceName === 'Stationery' && <FileText className="w-4 h-4 text-indigo-400" />}
                        {row.serviceName === 'Snacks & Meals' && <Utensils className="w-4 h-4 text-sky-400" />}
                        <span>{row.serviceName}</span>
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-slate-200">
                        {row.totalRequests}
                      </td>
                      <td className="py-3 text-center font-mono text-emerald-400 font-semibold">
                        {row.approved}
                      </td>
                      <td className="py-3 text-center font-mono text-amber-400 font-semibold">
                        {row.pending}
                      </td>
                      <td className="py-3 text-center font-mono text-rose-400 font-semibold">
                        {row.rejected}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-400">
                        {row.cancelled}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Detail Panels for Active Services */}

        {/* A. Seminar Hall Analytics */}
        {seminarHallServiceActive && (
          <div className="space-y-4">
            <div className="card-panel p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Individual Seminar Hall Utilization
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Utilization and session distribution across venues
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Seminar Hall</th>
                      <th className="pb-3 font-semibold text-center">Total Bookings</th>
                      <th className="pb-3 font-semibold text-center text-emerald-400">Approved</th>
                      <th className="pb-3 font-semibold text-center text-amber-400">Pending</th>
                      <th className="pb-3 font-semibold text-center text-rose-400">Rejected</th>
                      <th className="pb-3 font-semibold text-center text-slate-400">Cancelled</th>
                      <th className="pb-3 font-semibold text-center">Forenoon</th>
                      <th className="pb-3 font-semibold text-center">Afternoon</th>
                      <th className="pb-3 font-semibold text-center">Full Day</th>
                      <th className="pb-3 font-semibold text-right text-blue-400">Booked Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {hallBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-6 text-center text-slate-500">
                          No seminar hall booking records found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      hallBreakdown.map((hall) => (
                        <tr
                          key={hall.hallId}
                          className={`hover:bg-slate-800/30 transition ${
                            selectedHallId === hall.hallId ? 'bg-blue-900/10 border-l-2 border-l-blue-500' : ''
                          }`}
                        >
                          <td className="py-3 font-bold text-white flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-blue-400" />
                            <span>{hall.hallName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({hall.hallId})</span>
                          </td>
                          <td className="py-3 text-center font-mono font-bold text-slate-200">
                            {hall.totalBookings}
                          </td>
                          <td className="py-3 text-center font-mono text-emerald-400 font-semibold">
                            {hall.approved}
                          </td>
                          <td className="py-3 text-center font-mono text-amber-400 font-semibold">
                            {hall.pending}
                          </td>
                          <td className="py-3 text-center font-mono text-rose-400 font-semibold">
                            {hall.rejected}
                          </td>
                          <td className="py-3 text-center font-mono text-slate-400">
                            {hall.cancelled}
                          </td>
                          <td className="py-3 text-center font-mono text-slate-300">
                            {hall.forenoonCount}
                          </td>
                          <td className="py-3 text-center font-mono text-slate-300">
                            {hall.afternoonCount}
                          </td>
                          <td className="py-3 text-center font-mono text-slate-300">
                            {hall.fullDayCount}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-blue-400">
                            {hall.bookedHours} hrs
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seminar Slot Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card-panel p-4 bg-gradient-to-br from-slate-900 to-slate-800/60 border-slate-800">
                <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Forenoon Sessions</span>
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-2">
                  {slotBreakdown.FORENOON || 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  9:30 AM &ndash; 1:00 PM Slot
                </div>
              </div>

              <div className="card-panel p-4 bg-gradient-to-br from-slate-900 to-slate-800/60 border-slate-800">
                <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Afternoon Sessions</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-2">
                  {slotBreakdown.AFTERNOON || 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  1:30 PM &ndash; 4:30 PM Slot
                </div>
              </div>

              <div className="card-panel p-4 bg-gradient-to-br from-slate-900 to-slate-800/60 border-slate-800">
                <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Full Day Sessions</span>
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-2">
                  {slotBreakdown.FULL_DAY || 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Full Working Day Reservations
                </div>
              </div>
            </div>
          </div>
        )}

        {/* B. Accommodation Analytics */}
        {accommodationServiceActive && (
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-400" />
                Guest House & Accommodation Metrics
              </h3>
              <span className="text-xs text-slate-400">Guest Capacity & Room Utilization</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <span className="text-xs text-slate-400">Total Guests Hosted</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {accommodationMetrics.totalGuests || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Approved and fulfilled stays</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <span className="text-xs text-slate-400">Approved Stays</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {accommodationMetrics.approvedStays || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Confirmed guest room allocations</span>
              </div>
            </div>
          </div>
        )}

        {/* C. Transport Analytics */}
        {transportServiceActive && (
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                Transport & Fleet Requisition Metrics
              </h3>
              <span className="text-xs text-slate-400">Trip Volume & Passenger Logistics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <span className="text-xs text-slate-400">Total Trips Scheduled</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">
                  {transportMetrics.totalTrips || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Fleet journeys deployed</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <span className="text-xs text-slate-400">Total Expected Passengers</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {transportMetrics.totalPassengers || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Faculty, delegates & students</span>
              </div>
            </div>
          </div>
        )}

        {/* D. Stationery Analytics */}
        {stationeryServiceActive && (
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Stationery Items Requisition Demand
              </h3>
              <span className="text-xs text-slate-400">Total Requested Quantities</span>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Item Name</th>
                    <th className="pb-3 font-semibold text-center">Request Count</th>
                    <th className="pb-3 font-semibold text-right">Total Quantity Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {stationeryItems.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-6 text-center text-slate-500">
                        No stationery requisition records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    stationeryItems.map((item) => (
                      <tr key={item.name || item.itemName} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 font-medium text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                          {item.name || item.itemName}
                        </td>
                        <td className="py-2.5 text-center font-mono text-slate-300">
                          {item.requestCount || 1}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-indigo-400">
                          {item.totalQuantity || item.requestedQuantity} {item.unit || 'Units'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* E. Snacks & Meals Analytics */}
        {mealsServiceActive && (
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-sky-400" />
                Catering Headcount & Servings Summary
              </h3>
              <span className="text-xs text-slate-400">Approved & Requested Servings</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Breakfast</span>
                <span className="text-xl font-bold font-mono text-white">{mealsHeadcount.breakfast || 0}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Guests</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Lunch</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{mealsHeadcount.lunch || 0}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Guests</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Dinner</span>
                <span className="text-xl font-bold font-mono text-amber-400">{mealsHeadcount.dinner || 0}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Guests</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Snacks</span>
                <span className="text-xl font-bold font-mono text-sky-400">{mealsHeadcount.snacks || 0}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  FN: {mealsHeadcount.snacksForenoon || 0} | AN: {mealsHeadcount.snacksAfternoon || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                <span className="text-xs font-semibold text-slate-400 block mb-1">Tea / Coffee</span>
                <span className="text-xl font-bold font-mono text-indigo-400">{mealsHeadcount.teaCoffee || 0}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  FN: {mealsHeadcount.teaCoffeeForenoon || 0} | AN: {mealsHeadcount.teaCoffeeAfternoon || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Department Performance & Requisition Auditing Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" />
              Department Consumption & Performance
            </h2>
            <p className="text-xs text-slate-400">
              Cross-service requisition matrix across academic and administrative units
            </p>
          </div>
        </div>

        {/* Department User Highlight Cards */}
        {permissions?.departmentUser && (
          <div className="card-panel p-4 bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400" />
                {permissions.userDepartment} Department Breakdown by Facility
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Assigned Department</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {serviceBreakdown.map((s) => (
                <div key={s.serviceName} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    {s.serviceName}
                  </span>
                  <span className="text-xl font-bold font-mono text-white block">
                    {s.totalRequests}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <span className="text-emerald-400">{s.approved} app</span>
                    <span className="text-amber-400">{s.pending} pend</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Department Service Consumption Matrix Table */}
        <div className="card-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              Department Consumption Matrix
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {displayedDeptBreakdown.length} department{displayedDeptBreakdown.length !== 1 ? 's' : ''} listed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold text-center">Seminar Hall</th>
                  <th className="pb-3 font-semibold text-center">Accommodation</th>
                  <th className="pb-3 font-semibold text-center">Transport</th>
                  <th className="pb-3 font-semibold text-center">Stationery</th>
                  <th className="pb-3 font-semibold text-center">Snacks & Meals</th>
                  <th className="pb-3 font-semibold text-center text-blue-400">Total Requests</th>
                  <th className="pb-3 font-semibold text-center text-emerald-400">Approved</th>
                  <th className="pb-3 font-semibold text-center text-amber-400">Pending</th>
                  <th className="pb-3 font-semibold text-center text-rose-400">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {displayedDeptBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-6 text-center text-slate-500">
                      No department usage records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  displayedDeptBreakdown.map((d) => (
                    <tr key={d.department} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {d.department}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-300">
                        {d.seminarHallCount || d.seminarCount || 0}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-300">
                        {d.accommodationCount || 0}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-300">
                        {d.transportCount || 0}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-300">
                        {d.stationeryCount || 0}
                      </td>
                      <td className="py-3 text-center font-mono text-slate-300">
                        {d.mealsCount || 0}
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-blue-400">
                        {d.totalRequests || d.total || 0}
                      </td>
                      <td className="py-3 text-center font-mono font-bold text-emerald-400">
                        {d.approved || 0}
                      </td>
                      <td className="py-3 text-center font-mono font-semibold text-amber-400">
                        {d.pending || 0}
                      </td>
                      <td className="py-3 text-center font-mono font-semibold text-rose-400">
                        {d.rejected || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Detailed Requests Table Section */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Detailed Requisition Log
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} matching applied filters
            </p>
          </div>

          {/* Search Input & Page Size */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search requests..."
                className="input text-xs py-1.5 pl-8 pr-3 bg-slate-800 border-slate-700 text-white rounded-lg w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="input text-xs py-1.5 px-2 bg-slate-800 border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
          <table className="table w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Request ID</th>
                <th className="pb-3 font-semibold">Service</th>
                <th className="pb-3 font-semibold">Department</th>
                <th className="pb-3 font-semibold">Requester</th>
                <th className="pb-3 font-semibold">Event / Trip Date</th>
                <th className="pb-3 font-semibold">Purpose / Title</th>
                <th className="pb-3 font-semibold">Resource / Slot</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    No service usage records found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={record.requestId} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 font-mono font-bold text-blue-400">
                      {record.requestId}
                    </td>
                    <td className="py-3 text-slate-300">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 border border-slate-700/60 font-medium">
                        {record.service}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-slate-300">
                      {record.department}
                    </td>
                    <td className="py-3 text-slate-400">
                      {record.requestedBy || record.requesterName || 'Faculty'}
                    </td>
                    <td className="py-3 font-mono text-slate-300 whitespace-nowrap">
                      {record.date || record.createdDate}
                    </td>
                    <td className="py-3 text-slate-200 max-w-xs truncate" title={record.purpose}>
                      {record.purpose || '&mdash;'}
                    </td>
                    <td className="py-3 text-slate-300 whitespace-nowrap">
                      {record.resource || record.resourceName ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {record.resource || record.resourceName}
                          </span>
                          {(record.slotOrTiming || record.slot) && (
                            <span className="text-[10px] text-slate-400">
                              {record.slotOrTiming || record.slot}
                            </span>
                          )}
                        </div>
                      ) : (
                        record.slotOrTiming || record.slot || '&mdash;'
                      )}
                    </td>
                    <td className="py-3 text-center">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedRequest(record);
                          setIsModalOpen(true);
                        }}
                        className="btn btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredRecords.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/60 text-xs text-slate-400">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}{' '}
              entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary px-2.5 py-1 text-xs rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-1 font-mono text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary px-2.5 py-1 text-xs rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Detailed Request Viewing */}
      {isModalOpen && selectedRequest && (
        <RequestDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
        />
      )}
    </div>
  );
}
