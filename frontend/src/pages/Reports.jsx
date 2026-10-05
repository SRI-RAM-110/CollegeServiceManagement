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
  ChevronRight,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Users,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { reportsApi, requestsApi } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { RequestDetailsModal } from '../components/common/RequestDetailsModal';

export default function Reports() {
  const { user } = useAuth();
  const { addToast } = useNotifications();

  // Permissions state
  const [permissions, setPermissions] = useState(null);
  const [permLoading, setPermLoading] = useState(true);

  // Active Tab state
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  // Filter States
  const [dateRangeType, setDateRangeType] = useState('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedService, setSelectedService] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedHallId, setSelectedHallId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination for detailed records
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

          // Configure initial defaults based on permissions
          if (perm.departmentUser) {
            setSelectedDepartment(perm.userDepartment || 'ALL');
            setActiveTab('MY_DEPARTMENT');
          } else if (perm.serviceAdmin && perm.allowedServices?.length === 1) {
            setSelectedService(perm.allowedServices[0]);
            setActiveTab(perm.allowedServices[0] === 'SEMINAR_HALL' ? 'SEMINAR_HALL' : 'SERVICE');
          } else if (perm.seminarCoordinator) {
            setSelectedService('SEMINAR_HALL');
            if (perm.allowedHalls && perm.allowedHalls.length > 0) {
              setSelectedHallId(perm.allowedHalls[0].hallId);
            }
            setActiveTab('SEMINAR_HALL');
          } else {
            setActiveTab('OVERVIEW');
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

  // 2. Fetch Report Data whenever filters change
  const fetchReportData = async () => {
    if (!permissions) return;
    try {
      setLoading(true);
      setError(null);

      const filterPayload = {
        dateRangeType,
        startDate: dateRangeType === 'CUSTOM' ? startDate : null,
        endDate: dateRangeType === 'CUSTOM' ? endDate : null,
        service: selectedService,
        department: permissions.departmentUser ? permissions.userDepartment : selectedDepartment,
        hallId: selectedHallId,
        status: selectedStatus,
        viewType: activeTab === 'MY_REQUESTS' ? 'PERSONAL' : (activeTab === 'MY_DEPARTMENT' ? 'DEPARTMENT' : 'SUMMARY'),
        search: searchQuery
      };

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
    activeTab,
    dateRangeType,
    startDate,
    endDate,
    selectedService,
    selectedDepartment,
    selectedHallId,
    selectedStatus
  ]);

  // Handle Tab Change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);

    if (tab === 'SEMINAR_HALL') {
      setSelectedService('SEMINAR_HALL');
    } else if (tab === 'MY_REQUESTS') {
      setSelectedService('ALL');
    } else if (tab === 'OVERVIEW' && permissions?.aoAdmin) {
      setSelectedService('ALL');
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    try {
      setPdfDownloading(true);
      const filterPayload = {
        dateRangeType,
        startDate: dateRangeType === 'CUSTOM' ? startDate : null,
        endDate: dateRangeType === 'CUSTOM' ? endDate : null,
        service: selectedService,
        department: permissions.departmentUser ? permissions.userDepartment : selectedDepartment,
        hallId: selectedHallId,
        status: selectedStatus,
        viewType: activeTab === 'MY_REQUESTS' ? 'PERSONAL' : (activeTab === 'MY_DEPARTMENT' ? 'DEPARTMENT' : 'SUMMARY'),
        search: searchQuery
      };

      const blob = await reportsApi.exportPdf(filterPayload);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `NEC_Report_${selectedService}_${dateStr}.pdf`;
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

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setExcelDownloading(true);
      const filterPayload = {
        dateRangeType,
        startDate: dateRangeType === 'CUSTOM' ? startDate : null,
        endDate: dateRangeType === 'CUSTOM' ? endDate : null,
        service: selectedService,
        department: permissions.departmentUser ? permissions.userDepartment : selectedDepartment,
        hallId: selectedHallId,
        status: selectedStatus,
        viewType: activeTab === 'MY_REQUESTS' ? 'PERSONAL' : (activeTab === 'MY_DEPARTMENT' ? 'DEPARTMENT' : 'SUMMARY'),
        search: searchQuery
      };

      const blob = await reportsApi.exportExcel(filterPayload);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      );
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `NEC_Report_${selectedService}_${dateStr}.xlsx`;
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

  const serviceBreakdown = reportData?.serviceBreakdown || [];
  const departmentBreakdown = reportData?.departmentBreakdown || [];
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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Institutional Branding */}
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

        {/* Dynamic Navigation Tabs based on Role */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          {permissions?.departmentUser ? (
            <>
              <button
                onClick={() => handleTabChange('MY_DEPARTMENT')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === 'MY_DEPARTMENT'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                My Department Usage ({permissions.userDepartment})
              </button>
              <button
                onClick={() => handleTabChange('MY_REQUESTS')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === 'MY_REQUESTS'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                My Service Requests
              </button>
            </>
          ) : (
            <>
              {permissions?.canViewOverall && (
                <button
                  onClick={() => handleTabChange('OVERVIEW')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    activeTab === 'OVERVIEW'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Overview
                </button>
              )}

              {permissions?.allowedServices?.includes('SEMINAR_HALL') && (
                <button
                  onClick={() => handleTabChange('SEMINAR_HALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    activeTab === 'SEMINAR_HALL'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Seminar Hall Reports
                </button>
              )}

              <button
                onClick={() => handleTabChange('SERVICE')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === 'SERVICE'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Service Reports
              </button>

              {permissions?.canViewAllDepartments && (
                <button
                  onClick={() => handleTabChange('DEPARTMENT')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    activeTab === 'DEPARTMENT'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  Department Reports
                </button>
              )}

              <button
                onClick={() => handleTabChange('DETAILED')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  activeTab === 'DETAILED'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Detailed Requests
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Interactive Filters Section */}
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

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Service Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Service
            </label>
            {permissions?.serviceAdmin && permissions?.allowedServices?.length === 1 ? (
              <div className="input text-xs py-2 px-3 bg-slate-800/80 border-slate-700 text-blue-400 font-medium rounded-lg">
                {permissions.allowedServices[0].replace('_', ' ')}
              </div>
            ) : (
              <select
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  if (e.target.value !== 'SEMINAR_HALL') {
                    setSelectedHallId('ALL');
                  }
                }}
                className="input text-xs py-2 px-3 bg-slate-800 border-slate-700 text-white rounded-lg w-full"
              >
                <option value="ALL">All Services</option>
                {permissions?.allowedServices?.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv === 'SEMINAR_HALL'
                      ? 'Seminar Hall'
                      : srv === 'ACCOMMODATION'
                      ? 'Accommodation'
                      : srv === 'TRANSPORT'
                      ? 'Transport'
                      : srv === 'STATIONERY'
                      ? 'Stationery'
                      : srv === 'MEALS'
                      ? 'Snacks & Meals'
                      : srv}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Department Dropdown (Locked for Department Users) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Department
            </label>
            {permissions?.departmentUser ? (
              <div className="input text-xs py-2 px-3 bg-slate-800/80 border-slate-700 text-emerald-400 font-medium rounded-lg flex items-center justify-between">
                <span>{permissions.userDepartment}</span>
                <span className="text-[10px] text-slate-500 font-normal">Locked</span>
              </div>
            ) : (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="input text-xs py-2 px-3 bg-slate-800 border-slate-700 text-white rounded-lg w-full"
              >
                <option value="ALL">All Departments</option>
                {permissions?.availableDepartments?.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Seminar Hall Dropdown (Displays whenever service is SEMINAR_HALL or Seminar tab is active) */}
          {(selectedService === 'SEMINAR_HALL' || activeTab === 'SEMINAR_HALL') ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Seminar Hall
              </label>
              {permissions?.seminarCoordinator && permissions?.allowedHalls?.length === 1 ? (
                <div className="input text-xs py-2 px-3 bg-slate-800/80 border-slate-700 text-blue-400 font-medium rounded-lg">
                  {permissions.allowedHalls[0].hallName}
                </div>
              ) : (
                <select
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(e.target.value)}
                  className="input text-xs py-2 px-3 bg-slate-800 border-slate-700 text-white rounded-lg w-full"
                >
                  <option value="ALL">All Seminar Halls</option>
                  {permissions?.allowedHalls?.map((hall) => (
                    <option key={hall.hallId} value={hall.hallId}>
                      {hall.hallName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Resource / Facility
              </label>
              <div className="input text-xs py-2 px-3 bg-slate-800/50 border-slate-700/50 text-slate-500 rounded-lg">
                Select a specific service
              </div>
            </div>
          )}

          {/* Status Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input text-xs py-2 px-3 bg-slate-800 border-slate-700 text-white rounded-lg w-full"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved / Booked</option>
              <option value="PENDING">Pending Approval</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
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
          <div className="text-[11px] text-slate-500 mt-1">
            Matching selected criteria
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
          <div className="text-[11px] text-slate-500 mt-1">
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
          <div className="text-[11px] text-slate-500 mt-1">
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
          <div className="text-[11px] text-slate-500 mt-1">
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
          <div className="text-[11px] text-slate-500 mt-1">
            User / admin cancellations
          </div>
        </div>
      </div>

      {/* 4. Tab Specific Visual & Breakdown Panels */}

      {/* TAB A: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Services Breakdown Table */}
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Overall Service Usage Breakdown
              </h2>
              <span className="text-xs text-slate-400">All 5 College Facilities</span>
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
                    <th className="pb-3 font-semibold text-right">Drill Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {serviceBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-500">
                        No service usage records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    serviceBreakdown.map((row) => (
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
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
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
                              setSelectedService(srvKey);
                              setActiveTab(srvKey === 'SEMINAR_HALL' ? 'SEMINAR_HALL' : 'SERVICE');
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                          >
                            Explore <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department-wise Usage Matrix */}
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400" />
                Department Service Consumption Matrix
              </h2>
              <span className="text-xs text-slate-400">Academic & Administrative Units</span>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {departmentBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-slate-500">
                        No service usage records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    departmentBreakdown.map((dept) => (
                      <tr key={dept.department} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {dept.department}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {dept.seminarHallCount}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {dept.accommodationCount}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {dept.transportCount}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {dept.stationeryCount}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {dept.mealsCount}
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-blue-400">
                          {dept.totalRequests}
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-emerald-400">
                          {dept.approved}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: SEMINAR HALL SPECIAL REPORTING */}
      {(activeTab === 'SEMINAR_HALL' || (selectedService === 'SEMINAR_HALL' && activeTab === 'SERVICE')) && (
        <div className="space-y-6">
          {/* Hall-wise Usage Grid / Table */}
          <div className="card-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  Individual Seminar Hall Usage & Utilization
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dynamic analysis of college seminar halls, auditorium, and conference venues
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter Specific Hall:</span>
                <select
                  value={selectedHallId}
                  onChange={(e) => setSelectedHallId(e.target.value)}
                  className="input text-xs py-1 px-2.5 bg-slate-800 border-slate-700 text-white rounded-lg"
                >
                  <option value="ALL">All Seminar Halls</option>
                  {permissions?.allowedHalls?.map((h) => (
                    <option key={h.hallId} value={h.hallId}>
                      {h.hallName}
                    </option>
                  ))}
                </select>
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

          {/* Slot Breakdown Cards */}
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

      {/* TAB C: SERVICE SPECIFIC DETAILED PANELS */}
      {activeTab === 'SERVICE' && selectedService !== 'SEMINAR_HALL' && (
        <div className="space-y-6">
          {/* Snacks & Meals Headcount Summary */}
          {selectedService === 'MEALS' && (
            <div className="card-panel p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-sky-400" />
                  Catering Headcount & Servings Summary
                </h2>
                <span className="text-xs text-slate-400">Total Servings Approved & Requested</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Breakfast</span>
                  <span className="text-xl font-bold font-mono text-white">{mealsHeadcount.breakfast}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Guests</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Lunch</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">{mealsHeadcount.lunch}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Guests</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Dinner</span>
                  <span className="text-xl font-bold font-mono text-amber-400">{mealsHeadcount.dinner}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Guests</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Snacks</span>
                  <span className="text-xl font-bold font-mono text-sky-400">{mealsHeadcount.snacks}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    FN: {mealsHeadcount.snacksForenoon} | AN: {mealsHeadcount.snacksAfternoon}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-center">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Tea / Coffee</span>
                  <span className="text-xl font-bold font-mono text-indigo-400">{mealsHeadcount.teaCoffee}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    FN: {mealsHeadcount.teaCoffeeForenoon} | AN: {mealsHeadcount.teaCoffeeAfternoon}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Stationery Items Requested Table (Request-only, NO inventory) */}
          {selectedService === 'STATIONERY' && (
            <div className="card-panel p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Stationery Items Requisition Demand
                </h2>
                <span className="text-xs text-slate-400">Total Requested Quantities</span>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Item Name</th>
                      <th className="pb-3 font-semibold text-right">Total Quantity Requested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {stationeryItems.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="py-6 text-center text-slate-500">
                          No stationery requisition records found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      stationeryItems.map((item) => (
                        <tr key={item.itemName} className="hover:bg-slate-800/30 transition">
                          <td className="py-2.5 font-medium text-white flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                            {item.itemName}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-indigo-400">
                            {item.requestedQuantity}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Transport Summary */}
          {selectedService === 'TRANSPORT' && (
            <div className="card-panel p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  Transport & Fleet Requisition Metrics
                </h2>
                <span className="text-xs text-slate-400">Trip Volume & Passenger Logistics</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-xs text-slate-400">Total Trips Scheduled</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {transportMetrics.totalTrips}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-xs text-slate-400">Total Expected Passengers</span>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {transportMetrics.totalPassengers}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Accommodation Summary */}
          {selectedService === 'ACCOMMODATION' && (
            <div className="card-panel p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-400" />
                  Guest House & Accommodation Metrics
                </h2>
                <span className="text-xs text-slate-400">Guest Capacity & Room Utilization</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-xs text-slate-400">Total Guests Hosted</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {accommodationMetrics.totalGuests}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <span className="text-xs text-slate-400">Approved Stays</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {accommodationMetrics.approvedStays}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB D: DEPARTMENT REPORTS */}
      {activeTab === 'DEPARTMENT' && (
        <div className="space-y-6">
          <div className="card-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-400" />
                  Department Requisition Auditing
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed consumption per academic and administrative wing
                </p>
              </div>

              {/* Department selector */}
              {!permissions?.departmentUser && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Select Department:</span>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="input text-xs py-1 px-3 bg-slate-800 border-slate-700 text-white rounded-lg"
                  >
                    <option value="ALL">All Departments</option>
                    {permissions?.availableDepartments?.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Department Breakdown Matrix */}
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
                    <th className="pb-3 font-semibold text-center text-blue-400">Total</th>
                    <th className="pb-3 font-semibold text-center text-emerald-400">Approved</th>
                    <th className="pb-3 font-semibold text-center text-amber-400">Pending</th>
                    <th className="pb-3 font-semibold text-center text-rose-400">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {departmentBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-6 text-center text-slate-500">
                        No department usage records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    departmentBreakdown.map((d) => (
                      <tr key={d.department} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {d.department}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {d.seminarHallCount}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {d.accommodationCount}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {d.transportCount}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {d.stationeryCount}
                        </td>
                        <td className="py-3 text-center font-mono text-slate-300">
                          {d.mealsCount}
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-blue-400">
                          {d.totalRequests}
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-emerald-400">
                          {d.approved}
                        </td>
                        <td className="py-3 text-center font-mono font-semibold text-amber-400">
                          {d.pending}
                        </td>
                        <td className="py-3 text-center font-mono font-semibold text-rose-400">
                          {d.rejected}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB E: DEPARTMENT USER VIEW (My Department Usage & My Service Requests) */}
      {(activeTab === 'MY_DEPARTMENT' || activeTab === 'MY_REQUESTS') && permissions?.departmentUser && (
        <div className="space-y-6">
          <div className="card-panel p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-400" />
                {activeTab === 'MY_DEPARTMENT'
                  ? `${permissions.userDepartment} Department Service Usage`
                  : 'My Submitted Service Requests'}
              </h2>
              <span className="text-xs text-slate-400">
                {activeTab === 'MY_DEPARTMENT'
                  ? 'Aggregate usage across all services for your department'
                  : 'Requests created directly by your faculty account'}
              </span>
            </div>

            {/* Department Breakdown by Service */}
            {activeTab === 'MY_DEPARTMENT' && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {serviceBreakdown.map((s) => (
                  <div key={s.serviceName} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
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
            )}
          </div>
        </div>
      )}

      {/* 5. Detailed Requests Table (Available across all tabs or directly via Detailed tab) */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              {activeTab === 'MY_REQUESTS'
                ? 'Personal Service Requests'
                : 'Detailed Requisition Log'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredRecords.length} records matching applied filters
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
                className="input text-xs py-1.5 pl-8 pr-3 bg-slate-800 border-slate-700 text-white rounded-lg w-48 sm:w-64"
              />
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="input text-xs py-1.5 px-2 bg-slate-800 border-slate-700 text-white rounded-lg"
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
                <th className="pb-3 font-semibold">Purpose / Event Title</th>
                <th className="pb-3 font-semibold">Resource / Hall / Slot</th>
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
                      {record.requesterName || 'Faculty'}
                    </td>
                    <td className="py-3 font-mono text-slate-300 whitespace-nowrap">
                      {record.date || record.createdDate}
                    </td>
                    <td className="py-3 text-slate-200 max-w-xs truncate" title={record.purpose}>
                      {record.purpose || '&mdash;'}
                    </td>
                    <td className="py-3 text-slate-300 whitespace-nowrap">
                      {record.resourceName ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{record.resourceName}</span>
                          {record.slot && (
                            <span className="text-[10px] text-slate-400">Slot: {record.slot}</span>
                          )}
                        </div>
                      ) : (
                        record.slot || '&mdash;'
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
