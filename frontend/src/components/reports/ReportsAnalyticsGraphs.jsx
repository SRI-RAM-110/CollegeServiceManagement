import React, { useState, useMemo } from 'react';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  Building2,
  Building,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  Info,
  ArrowUpRight,
  Bus,
  Home,
  FileText,
  Coffee,
  Send,
  UserCheck,
  ShieldAlert,
  ArrowUpDown,
  BarChart3
} from 'lucide-react';

const DEPARTMENT_FULL_NAMES = {
  CSE: 'Computer Science & Engineering',
  ECE: 'Electronics & Communication Engineering',
  EEE: 'Electrical & Electronics Engineering',
  MECH: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  IT: 'Information Technology',
  AIML: 'Artificial Intelligence & Machine Learning',
  MBA: 'Master of Business Administration',
  MCA: 'Master of Computer Applications',
  'BS&H': 'Basic Sciences & Humanities',
  ADMIN: 'Administrative Office'
};

const UNIFIED_GRAPH_SERVICES = [
  { id: 'ALL', label: 'All Services', shortName: 'All Services', icon: Layers, color: 'text-blue-400' },
  { id: 'SEMINAR_HALL', label: 'Seminar Hall Booking', shortName: 'Seminar Hall', icon: Building2, color: 'text-blue-400' },
  { id: 'ACCOMMODATION', label: 'Accommodation', shortName: 'Accommodation', icon: Home, color: 'text-emerald-400' },
  { id: 'TRANSPORT', label: 'Transport', shortName: 'Transport', icon: Bus, color: 'text-amber-400' },
  { id: 'STATIONERY', label: 'Stationery', shortName: 'Stationery', icon: FileText, color: 'text-indigo-400' },
  { id: 'MEALS', label: 'Snacks & Meals', shortName: 'Snacks & Meals', icon: Coffee, color: 'text-sky-400' }
];

/**
 * Interactive Analytics Graphs for Reports & Analytics Page
 * Displays:
 * 1. Request Status Distribution & Pending Workflow Breakdown (Interactive Donut Chart with AO Forwarding distinction)
 * 2. Resource / Facility Utilization (Seminar Hall, Accommodation, Transport, Stationery, Meals)
 * 3. Department Comparison (Grouped Horizontal Bar Chart with comprehensive status metrics)
 * 
 * NOTE: Requests Over Time has been completely removed as requested.
 */
export default function ReportsAnalyticsGraphs({
  reportData,
  summary,
  selectedServices = [],
  selectedDepartments = [],
  selectedStatuses = [],
  selectedHall = 'ALL',
  dateRangeType = 'ALL',
  startDate = '',
  endDate = '',
  displayedServiceBreakdown = [],
  displayedDeptBreakdown = []
}) {
  // Active facility sub-tab when multiple services are selected
  const [activeFacilityTab, setActiveFacilityTab] = useState(null);
  const [hoveredStatusIndex, setHoveredStatusIndex] = useState(null);
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState(null);
  const [deptSortMetric, setDeptSortMetric] = useState('TOTAL'); // 'TOTAL', 'APPROVED', 'PENDING', 'NAME'

  // Determine active services
  const isServiceActive = (srvKey) => {
    if (!selectedServices || selectedServices.length === 0 || selectedServices.length >= 5) {
      return true;
    }
    return selectedServices.includes(srvKey);
  };

  const activeServicesList = useMemo(() => {
    const list = [];
    if (isServiceActive('SEMINAR_HALL')) list.push({ id: 'SEMINAR_HALL', label: 'Seminar Halls', icon: Building2 });
    if (isServiceActive('ACCOMMODATION')) list.push({ id: 'ACCOMMODATION', label: 'Accommodation', icon: Home });
    if (isServiceActive('TRANSPORT')) list.push({ id: 'TRANSPORT', label: 'Transport', icon: Bus });
    if (isServiceActive('STATIONERY')) list.push({ id: 'STATIONERY', label: 'Stationery', icon: FileText });
    if (isServiceActive('MEALS')) list.push({ id: 'MEALS', label: 'Snacks & Meals', icon: Coffee });
    return list;
  }, [selectedServices]);

  // Ensure active facility tab points to an active service
  const currentFacilityTab = useMemo(() => {
    if (activeFacilityTab && activeServicesList.some((s) => s.id === activeFacilityTab)) {
      return activeFacilityTab;
    }
    return activeServicesList[0]?.id || 'SEMINAR_HALL';
  }, [activeFacilityTab, activeServicesList]);

  // Service selection for the Unified Analytics Graph: 'ALL' or individual service key
  const [selectedGraphService, setSelectedGraphService] = useState('ALL');

  // -------------------------------------------------------------
  // UNIFIED SERVICE & STATUS ANALYTICS DATA
  // Combines Overall Service Breakdown & Request Status Distribution
  // -------------------------------------------------------------
  const unifiedServiceData = useMemo(() => {
    const records = reportData?.detailedRecords || [];

    // Helper to test if a record belongs to a service ID
    const matchesService = (rServiceKey, targetServiceId) => {
      const s = (rServiceKey || '').toUpperCase().trim();
      if (targetServiceId === 'ALL') return true;
      if (targetServiceId === 'SEMINAR_HALL' || targetServiceId === 'SEMINAR') {
        return s === 'SEMINAR' || s === 'SEMINAR_HALL';
      }
      return s === targetServiceId.toUpperCase().trim();
    };

    // Calculate metrics for any slice of records
    const computeSlice = (recList) => {
      let approved = 0;
      let pending = 0;
      let rejected = 0;
      let cancelled = 0;
      let pendingAoForwarding = 0;
      let pendingHostelAdmin = 0;
      let pendingGeneral = 0;

      recList.forEach((r) => {
        const st = (r.status || '').toUpperCase().trim();
        const srv = (r.serviceKey || '').toUpperCase().trim();
        const aoStatus = (r.aoApprovalStatus || '').toUpperCase().trim();
        const fwd = r.forwardedTo || '';
        const stage = (r.workflowStage || '').toUpperCase().trim();

        if (
          st === 'APPROVED' || st === 'BOOKED' || st === 'COLLECTED' ||
          st === 'READY_FOR_COLLECTION' || st === 'AO_DIRECT_APPROVED' || st === 'COMPLETED'
        ) {
          approved += 1;
        } else if (st === 'REJECTED' || st === 'AO_REJECTED') {
          rejected += 1;
        } else if (st === 'CANCELLED' || st === 'CANCELLATION_REQUESTED') {
          cancelled += 1;
        } else {
          pending += 1;
          if (srv === 'ACCOMMODATION') {
            if (stage === 'AWAITING_AO_FORWARDING' || st === 'PENDING_AO_APPROVAL' || ((st === 'PENDING' || st === 'UNDER_REVIEW') && (aoStatus === 'PENDING' || !aoStatus) && !fwd)) {
              pendingAoForwarding += 1;
            } else if (
              stage === 'FORWARDED_HOSTEL_ADMIN' || st === 'FORWARDED_TO_BOYS_ADMIN' || st === 'FORWARDED_TO_GIRLS_ADMIN' ||
              st === 'AO_APPROVED' || aoStatus === 'FORWARDED' || aoStatus === 'APPROVED'
            ) {
              pendingHostelAdmin += 1;
            } else {
              pendingGeneral += 1;
            }
          } else {
            pendingGeneral += 1;
          }
        }
      });

      const total = approved + pending + rejected + cancelled;
      const approvedPct = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
      const pendingPct = total > 0 ? ((pending / total) * 100).toFixed(1) : '0.0';
      const rejectedPct = total > 0 ? ((rejected / total) * 100).toFixed(1) : '0.0';
      const cancelledPct = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0.0';

      return {
        total,
        approved,
        pending,
        rejected,
        cancelled,
        approvedPct,
        pendingPct,
        rejectedPct,
        cancelledPct,
        pendingAoForwarding,
        pendingHostelAdmin,
        pendingGeneral
      };
    };

    // 1. Overall stats (all filtered records)
    const overallStats = computeSlice(records);

    // Fallback if records is empty but summary or displayedServiceBreakdown is available
    if (records.length === 0 && (summary?.totalRequests > 0 || (displayedServiceBreakdown && displayedServiceBreakdown.length > 0))) {
      overallStats.total = summary?.totalRequests || 0;
      overallStats.approved = summary?.approved || 0;
      overallStats.pending = summary?.pending || 0;
      overallStats.rejected = summary?.rejected || 0;
      overallStats.cancelled = summary?.cancelled || 0;
      overallStats.pendingAoForwarding = summary?.pendingAoReview || 0;
      overallStats.pendingHostelAdmin = summary?.pendingHostelReview || 0;
      overallStats.pendingGeneral = summary?.pendingGeneral != null
        ? summary.pendingGeneral
        : Math.max(0, overallStats.pending - overallStats.pendingAoForwarding - overallStats.pendingHostelAdmin);
      const t = overallStats.total;
      overallStats.approvedPct = t > 0 ? ((overallStats.approved / t) * 100).toFixed(1) : '0.0';
      overallStats.pendingPct = t > 0 ? ((overallStats.pending / t) * 100).toFixed(1) : '0.0';
      overallStats.rejectedPct = t > 0 ? ((overallStats.rejected / t) * 100).toFixed(1) : '0.0';
      overallStats.cancelledPct = t > 0 ? ((overallStats.cancelled / t) * 100).toFixed(1) : '0.0';
    }

    // 2. Per-service stats list for comparison
    const serviceList = [
      { id: 'SEMINAR_HALL', label: 'Seminar Hall Booking', shortName: 'Seminar Hall', icon: Building2, color: 'text-blue-400' },
      { id: 'ACCOMMODATION', label: 'Accommodation', shortName: 'Accommodation', icon: Home, color: 'text-emerald-400' },
      { id: 'TRANSPORT', label: 'Transport', shortName: 'Transport', icon: Bus, color: 'text-amber-400' },
      { id: 'STATIONERY', label: 'Stationery', shortName: 'Stationery', icon: FileText, color: 'text-indigo-400' },
      { id: 'MEALS', label: 'Snacks & Meals', shortName: 'Snacks & Meals', icon: Coffee, color: 'text-sky-400' }
    ].map((srv) => {
      const isIncludedInPageFilter = isServiceActive(srv.id);

      let srvSlice;
      if (records.length > 0) {
        const filteredForSrv = records.filter((r) => matchesService(r.serviceKey, srv.id));
        srvSlice = computeSlice(filteredForSrv);
      } else {
        const row = (displayedServiceBreakdown || []).find((b) => {
          const k = (b.serviceKey || '').toUpperCase().trim();
          const n = (b.serviceName || '').toUpperCase().trim();
          if (srv.id === 'SEMINAR_HALL') return k === 'SEMINAR' || n.includes('SEMINAR');
          if (srv.id === 'ACCOMMODATION') return k === 'ACCOMMODATION' || n.includes('ACCOMMODATION');
          if (srv.id === 'TRANSPORT') return k === 'TRANSPORT' || n.includes('TRANSPORT');
          if (srv.id === 'STATIONERY') return k === 'STATIONERY' || n.includes('STATIONERY');
          if (srv.id === 'MEALS') return k === 'MEALS' || n.includes('MEAL');
          return false;
        });
        const total = row ? (row.total || 0) : 0;
        const approved = row ? (row.approved || 0) : 0;
        const pending = row ? (row.pending || 0) : 0;
        const rejected = row ? (row.rejected || 0) : 0;
        const cancelled = row ? (row.cancelled || 0) : 0;
        srvSlice = {
          total,
          approved,
          pending,
          rejected,
          cancelled,
          approvedPct: total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0',
          pendingPct: total > 0 ? ((pending / total) * 100).toFixed(1) : '0.0',
          rejectedPct: total > 0 ? ((rejected / total) * 100).toFixed(1) : '0.0',
          cancelledPct: total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0.0',
          pendingAoForwarding: srv.id === 'ACCOMMODATION' ? (summary?.pendingAoReview || 0) : 0,
          pendingHostelAdmin: srv.id === 'ACCOMMODATION' ? (summary?.pendingHostelReview || 0) : 0,
          pendingGeneral: srv.id === 'ACCOMMODATION' ? 0 : pending
        };
      }

      return {
        ...srv,
        isIncludedInPageFilter,
        ...srvSlice
      };
    });

    // 3. Current active view data (ALL or individual service)
    const currentViewData = selectedGraphService === 'ALL'
      ? overallStats
      : (serviceList.find((s) => s.id === selectedGraphService) || overallStats);

    const maxServiceTotal = Math.max(...serviceList.map((s) => s.total), 1);

    return {
      overallStats,
      serviceList,
      currentViewData,
      maxServiceTotal,
      selectedGraphService
    };
  }, [reportData, summary, displayedServiceBreakdown, selectedGraphService, selectedServices]);

  // Backward compatibility reference for page-level indicators
  const statusBreakdownData = unifiedServiceData.overallStats;

  // -------------------------------------------------------------
  // GRAPH 2: RESOURCE / FACILITY UTILIZATION DATA
  // -------------------------------------------------------------
  const facilityData = useMemo(() => {
    // 1. Seminar Hall Utilization
    const allHalls = reportData?.hallBreakdown || [];
    const isSpecificHall = selectedHall && selectedHall !== 'ALL';
    const displayHalls = isSpecificHall
      ? allHalls.filter((h) =>
          h.hallId?.equalsIgnoreCase
            ? h.hallId.equalsIgnoreCase(selectedHall)
            : (h.hallId || '').toUpperCase() === selectedHall.toUpperCase()
        )
      : allHalls;

    const maxHallHours = Math.max(...displayHalls.map((h) => h.totalBookedHours || 0), 1);
    const maxHallBookings = Math.max(...displayHalls.map((h) => h.total || 0), 1);

    // 2. Accommodation
    const accRoomUsage = reportData?.accommodationMetrics?.roomUsage || {};
    const accRoomsList = Object.entries(accRoomUsage)
      .map(([room, count]) => ({
        name: room,
        count
      }))
      .sort((a, b) => b.count - a.count);
    const maxAccBookings = Math.max(...accRoomsList.map((r) => r.count), 1);

    // 3. Transport
    const transVehicleUsage = reportData?.transportMetrics?.vehicleUsage || {};
    const transList = Object.entries(transVehicleUsage)
      .map(([vehicle, count]) => ({
        name: vehicle,
        count
      }))
      .sort((a, b) => b.count - a.count);
    const maxTransBookings = Math.max(...transList.map((t) => t.count), 1);

    // 4. Stationery
    const stationeryList = (reportData?.stationeryItems || []).slice(0, 7);
    const maxStationeryQty = Math.max(...stationeryList.map((s) => s.totalQuantity || 0), 1);

    // 5. Snacks & Meals Headcount
    const meals = reportData?.mealsHeadcount || {};
    const mealList = [
      { name: 'Lunch', count: meals.lunch || 0, color: 'bg-emerald-500', barColor: '#10B981' },
      { name: 'Dinner', count: meals.dinner || 0, color: 'bg-blue-500', barColor: '#3B82F6' },
      { name: 'Snacks', count: meals.snacks || 0, color: 'bg-amber-500', barColor: '#F59E0B' },
      { name: 'Breakfast', count: meals.breakfast || 0, color: 'bg-indigo-500', barColor: '#6366F1' },
      { name: 'Tea / Coffee', count: meals.teaCoffee || 0, color: 'bg-rose-500', barColor: '#F43F5E' }
    ];
    const maxMealCount = Math.max(...mealList.map((m) => m.count), 1);

    return {
      halls: displayHalls,
      maxHallHours,
      maxHallBookings,
      isSpecificHall,
      accommodation: accRoomsList,
      maxAccBookings,
      transport: transList,
      maxTransBookings,
      stationery: stationeryList,
      maxStationeryQty,
      meals: mealList,
      maxMealCount
    };
  }, [reportData, selectedHall]);

  // -------------------------------------------------------------
  // GRAPH 3: DEPARTMENT COMPARISON (GROUPED HORIZONTAL BARS)
  // -------------------------------------------------------------
  const departmentGroupedData = useMemo(() => {
    const deptMap = new Map();

    // 1. Initialize from displayedDeptBreakdown
    (displayedDeptBreakdown || []).forEach((d) => {
      const name = (d.department || 'UNKNOWN').toUpperCase().trim();
      deptMap.set(name, {
        department: name,
        fullName: DEPARTMENT_FULL_NAMES[name] || name,
        total: d.total || d.totalRequests || 0,
        approved: d.approved || 0,
        pending: d.pending || 0,
        rejected: d.rejected || 0,
        cancelled: d.cancelled || 0,
        pendingAoReview: d.pendingAoReview || 0,
        seminarCount: d.seminarCount || d.seminarHallCount || 0,
        accommodationCount: d.accommodationCount || 0,
        transportCount: d.transportCount || 0,
        stationeryCount: d.stationeryCount || 0,
        mealsCount: d.mealsCount || 0
      });
    });

    // 2. Cross-verify with detailed records if available
    const records = reportData?.detailedRecords || [];
    if (records.length > 0) {
      const recordDeptCounts = new Map();
      records.forEach((r) => {
        const dName = (r.department || 'UNKNOWN').toUpperCase().trim();
        if (!recordDeptCounts.has(dName)) {
          recordDeptCounts.set(dName, {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            cancelled: 0,
            pendingAoReview: 0,
            seminarCount: 0,
            accommodationCount: 0,
            transportCount: 0,
            stationeryCount: 0,
            mealsCount: 0
          });
        }
        const item = recordDeptCounts.get(dName);
        item.total += 1;
        const st = (r.status || '').toUpperCase().trim();
        const srv = (r.serviceKey || '').toUpperCase().trim();

        if (srv === 'SEMINAR') item.seminarCount += 1;
        else if (srv === 'ACCOMMODATION') item.accommodationCount += 1;
        else if (srv === 'TRANSPORT') item.transportCount += 1;
        else if (srv === 'STATIONERY') item.stationeryCount += 1;
        else if (srv === 'MEALS') item.mealsCount += 1;

        if (
          st === 'APPROVED' || st === 'BOOKED' || st === 'COLLECTED' ||
          st === 'READY_FOR_COLLECTION' || st === 'AO_DIRECT_APPROVED' || st === 'COMPLETED'
        ) {
          item.approved += 1;
        } else if (st === 'REJECTED' || st === 'AO_REJECTED') {
          item.rejected += 1;
        } else if (st === 'CANCELLED' || st === 'CANCELLATION_REQUESTED') {
          item.cancelled += 1;
        } else {
          item.pending += 1;
          if (srv === 'ACCOMMODATION' && (st === 'PENDING_AO_APPROVAL' || r.workflowStage === 'AWAITING_AO_FORWARDING')) {
            item.pendingAoReview += 1;
          }
        }
      });

      // Synchronize deptMap with exact filtered counts
      recordDeptCounts.forEach((counts, dName) => {
        const existing = deptMap.get(dName) || {
          department: dName,
          fullName: DEPARTMENT_FULL_NAMES[dName] || dName
        };
        deptMap.set(dName, {
          ...existing,
          ...counts
        });
      });
    }

    let list = Array.from(deptMap.values());

    // Filter by selectedDepartments
    if (selectedDepartments && selectedDepartments.length > 0 && !selectedDepartments.includes('ALL')) {
      const selectedUpper = selectedDepartments.map((d) => d.toUpperCase().trim());
      list = list.filter((item) => selectedUpper.includes(item.department));
    }

    // Sort according to deptSortMetric
    if (deptSortMetric === 'APPROVED') {
      list.sort((a, b) => b.approved - a.approved || b.total - a.total);
    } else if (deptSortMetric === 'PENDING') {
      list.sort((a, b) => b.pending - a.pending || b.total - a.total);
    } else if (deptSortMetric === 'NAME') {
      list.sort((a, b) => a.department.localeCompare(b.department));
    } else {
      // Default: 'TOTAL'
      list.sort((a, b) => b.total - a.total || b.approved - a.approved);
    }

    // Calculate maximum values for scale proportioning
    const maxStatusVal = Math.max(
      ...list.map((d) => Math.max(d.approved, d.pending, d.rejected, d.cancelled, 1)),
      1
    );
    const maxTotalVal = Math.max(...list.map((d) => d.total), 1);

    return {
      departments: list,
      maxStatusVal,
      maxTotalVal,
      totalDepartments: list.length
    };
  }, [displayedDeptBreakdown, reportData, selectedDepartments, deptSortMetric]);

  return (
    <div className="space-y-6 pt-2">
      {/* Analytics Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Visual Analytics & Performance Breakdown
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time interactive graphs visualizing demand, capacity, and departmental throughput for active selections
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBreakdownData.pendingAoForwarding > 0 && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5 font-medium animate-pulse">
              <Send className="w-3 h-3 text-cyan-400" />
              {statusBreakdownData.pendingAoForwarding} Awaiting AO Forwarding
            </span>
          )}
          {selectedStatuses && selectedStatuses.length > 0 && selectedStatuses.length < 6 && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              Status Filter Active ({selectedStatuses.length})
            </span>
          )}
          {selectedHall && selectedHall !== 'ALL' && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
              Facility: {selectedHall}
            </span>
          )}
        </div>
      </div>

      {/* TOP ROW: 2 Columns for Desktop (Status Distribution & Facility Utilization) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* UNIFIED SERVICE & STATUS ANALYTICS GRAPH                  */}
        {/* ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            {/* Header: Title + Service Selector Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Unified Service & Status Analytics
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Combined service request volume and status distribution
                </p>
              </div>

              {/* Service Selection Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="service-analytics-select" className="text-xs text-slate-400 font-medium hidden sm:inline">
                  Service:
                </label>
                <div className="relative">
                  <select
                    id="service-analytics-select"
                    value={selectedGraphService}
                    onChange={(e) => setSelectedGraphService(e.target.value)}
                    className="input text-xs py-1.5 pl-2.5 pr-7 bg-slate-800 border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer font-medium"
                  >
                    {UNIFIED_GRAPH_SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap">
                  Total: {unifiedServiceData.currentViewData.total}
                </span>
              </div>
            </div>

            {/* Consistent Status Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-850/60 border border-slate-800/80 mb-4 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Status Legend:
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Approved
                </span>
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span> Pending
                </span>
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Rejected
                </span>
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-500"></span> Cancelled
                </span>
              </div>
            </div>

            {/* VIEW 1: ALL SERVICES COMPARISON (Grouped / Stacked Horizontal Bar Chart) */}
            {selectedGraphService === 'ALL' ? (
              <div className="space-y-3 py-1">
                {unifiedServiceData.serviceList.map((srv) => {
                  const SrvIcon = srv.icon;
                  const total = srv.total;
                  const hasRequests = total > 0;
                  
                  const approvedW = total > 0 ? (srv.approved / total) * 100 : 0;
                  const pendingW = total > 0 ? (srv.pending / total) * 100 : 0;
                  const rejectedW = total > 0 ? (srv.rejected / total) * 100 : 0;
                  const cancelledW = total > 0 ? (srv.cancelled / total) * 100 : 0;

                  return (
                    <div
                      key={srv.id}
                      className="p-2.5 rounded-xl bg-slate-850/40 border border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700/80 transition-all space-y-1.5"
                    >
                      {/* Service Header with Total Requisitions */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center">
                            <SrvIcon className={`w-3.5 h-3.5 ${srv.color}`} />
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedGraphService(srv.id)}
                            className="text-white font-semibold hover:text-blue-400 transition flex items-center gap-1 text-left"
                            title={`Click to inspect ${srv.label}`}
                          >
                            <span>{srv.label}</span>
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400">
                            Total: <strong className="text-white font-bold">{total}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Stacked Horizontal Bar Chart */}
                      <div className="h-3.5 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                        {hasRequests ? (
                          <>
                            {srv.approved > 0 && (
                              <div
                                style={{ width: `${approvedW}%` }}
                                className="bg-emerald-500 h-full transition-all duration-300 hover:brightness-110"
                                title={`${srv.label} - Approved: ${srv.approved} (${srv.approvedPct}%)`}
                              />
                            )}
                            {srv.pending > 0 && (
                              <div
                                style={{ width: `${pendingW}%` }}
                                className="bg-amber-500 h-full transition-all duration-300 hover:brightness-110"
                                title={`${srv.label} - Pending: ${srv.pending} (${srv.pendingPct}%)`}
                              />
                            )}
                            {srv.rejected > 0 && (
                              <div
                                style={{ width: `${rejectedW}%` }}
                                className="bg-rose-500 h-full transition-all duration-300 hover:brightness-110"
                                title={`${srv.label} - Rejected: ${srv.rejected} (${srv.rejectedPct}%)`}
                              />
                            )}
                            {srv.cancelled > 0 && (
                              <div
                                style={{ width: `${cancelledW}%` }}
                                className="bg-slate-500 h-full transition-all duration-300 hover:brightness-110"
                                title={`${srv.label} - Cancelled: ${srv.cancelled} (${srv.cancelledPct}%)`}
                              />
                            )}
                          </>
                        ) : (
                          <div
                            style={{ width: '100%' }}
                            className="bg-slate-800/80 h-full flex items-center justify-center text-[9px] text-slate-600"
                          >
                            0 requisitions
                          </div>
                        )}
                      </div>

                      {/* Granular Actual Counts & Status Breakdown Row */}
                      <div className="grid grid-cols-4 gap-1 text-[11px] font-mono pt-0.5">
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="text-[10px] text-emerald-300/80">Appr:</span>
                          <span className="font-bold">{srv.approved}</span>
                        </div>
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="text-[10px] text-amber-300/80">Pend:</span>
                          <span className="font-bold">{srv.pending}</span>
                        </div>
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <span className="text-[10px] text-rose-300/80">Rej:</span>
                          <span className="font-bold">{srv.rejected}</span>
                        </div>
                        <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          <span className="text-[10px] text-slate-400/80">Canc:</span>
                          <span className="font-bold">{srv.cancelled}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VIEW 2: INDIVIDUAL SERVICE BREAKDOWN (Detailed Single Service View) */
              <div className="space-y-3.5 py-1">
                {/* Single Service Header Banner */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {(() => {
                      const activeSrvObj = UNIFIED_GRAPH_SERVICES.find((s) => s.id === selectedGraphService);
                      const IconC = activeSrvObj?.icon || Layers;
                      return (
                        <>
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <IconC className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">
                              {activeSrvObj?.label || selectedGraphService}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Service-specific status volume and fulfillment breakdown
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGraphService('ALL')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/30 transition"
                  >
                    <span>View All Services</span>
                  </button>
                </div>

                {/* 4 Status KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <span className="text-[10px] uppercase font-semibold text-emerald-400 block">Approved</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-bold font-mono text-white">
                        {unifiedServiceData.currentViewData.approved}
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-semibold">
                        {unifiedServiceData.currentViewData.approvedPct}%
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                    <span className="text-[10px] uppercase font-semibold text-amber-400 block">Pending</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-bold font-mono text-white">
                        {unifiedServiceData.currentViewData.pending}
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-semibold">
                        {unifiedServiceData.currentViewData.pendingPct}%
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/30">
                    <span className="text-[10px] uppercase font-semibold text-rose-400 block">Rejected</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-bold font-mono text-white">
                        {unifiedServiceData.currentViewData.rejected}
                      </span>
                      <span className="text-xs font-mono text-rose-400 font-semibold">
                        {unifiedServiceData.currentViewData.rejectedPct}%
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cancelled</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-lg font-bold font-mono text-white">
                        {unifiedServiceData.currentViewData.cancelled}
                      </span>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        {unifiedServiceData.currentViewData.cancelledPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Service Proportion Stacked Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Status Distribution</span>
                    <span className="font-mono text-white font-medium">
                      Total: {unifiedServiceData.currentViewData.total} Requisitions
                    </span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                    {unifiedServiceData.currentViewData.total > 0 ? (
                      <>
                        <div
                          style={{ width: `${unifiedServiceData.currentViewData.approvedPct}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Approved: ${unifiedServiceData.currentViewData.approved} (${unifiedServiceData.currentViewData.approvedPct}%)`}
                        />
                        <div
                          style={{ width: `${unifiedServiceData.currentViewData.pendingPct}%` }}
                          className="bg-amber-500 h-full"
                          title={`Pending: ${unifiedServiceData.currentViewData.pending} (${unifiedServiceData.currentViewData.pendingPct}%)`}
                        />
                        <div
                          style={{ width: `${unifiedServiceData.currentViewData.rejectedPct}%` }}
                          className="bg-rose-500 h-full"
                          title={`Rejected: ${unifiedServiceData.currentViewData.rejected} (${unifiedServiceData.currentViewData.rejectedPct}%)`}
                        />
                        <div
                          style={{ width: `${unifiedServiceData.currentViewData.cancelledPct}%` }}
                          className="bg-slate-500 h-full"
                          title={`Cancelled: ${unifiedServiceData.currentViewData.cancelled} (${unifiedServiceData.currentViewData.cancelledPct}%)`}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-slate-800 h-full flex items-center justify-center text-[10px] text-slate-600">
                        No requests recorded for this service
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Progress Detail Rows */}
                <div className="space-y-1.5 pt-1">
                  {[
                    { label: 'Approved', count: unifiedServiceData.currentViewData.approved, pct: unifiedServiceData.currentViewData.approvedPct, color: 'bg-emerald-500', text: 'text-emerald-400' },
                    { label: 'Pending Review', count: unifiedServiceData.currentViewData.pending, pct: unifiedServiceData.currentViewData.pendingPct, color: 'bg-amber-500', text: 'text-amber-400' },
                    { label: 'Rejected', count: unifiedServiceData.currentViewData.rejected, pct: unifiedServiceData.currentViewData.rejectedPct, color: 'bg-rose-500', text: 'text-rose-400' },
                    { label: 'Cancelled', count: unifiedServiceData.currentViewData.cancelled, pct: unifiedServiceData.currentViewData.cancelledPct, color: 'bg-slate-500', text: 'text-slate-400' }
                  ].map((row) => (
                    <div key={row.label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${row.color}`}></span>
                          {row.label}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          <strong className={row.text}>{row.count}</strong> ({row.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${row.pct}%` }}
                          className={`${row.color} h-full rounded-full transition-all duration-300`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DISTINCT PENDING WORKFLOW STAGE BREAKDOWN */}
            <div className="mt-4 pt-3.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Pending Workflow Stages Breakdown
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {selectedGraphService === 'ALL'
                    ? <>Total Pending: <strong className="text-amber-400">{unifiedServiceData.overallStats.pending}</strong></>
                    : <>Service Pending: <strong className="text-amber-400">{unifiedServiceData.currentViewData.pending}</strong></>
                  }
                </span>
              </div>

              {selectedGraphService === 'ACCOMMODATION' ? (
                /* Accommodation-Specific 2-Stage Pending Workflow */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    className={`p-2.5 rounded-xl border transition-all ${
                      unifiedServiceData.currentViewData.pendingAoForwarding > 0
                        ? 'bg-cyan-950/30 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-850/40 border-slate-800 opacity-60'
                    }`}
                    title="Accommodation requests pending AO Admin review and forwarding"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-cyan-300 flex items-center gap-1">
                        <Send className="w-3 h-3 text-cyan-400" />
                        1. Awaiting AO Admin Forwarding
                      </span>
                      <span className="text-xs font-bold font-mono text-cyan-300">
                        {unifiedServiceData.currentViewData.pendingAoForwarding}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Requisitions awaiting AO review to assign/forward to Boys or Girls Hostel Admin
                    </p>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border transition-all ${
                      unifiedServiceData.currentViewData.pendingHostelAdmin > 0
                        ? 'bg-orange-950/30 border-orange-500/40 shadow-sm'
                        : 'bg-slate-850/40 border-slate-800 opacity-60'
                    }`}
                    title="Forwarded by AO Admin, awaiting hostel administrator room allocation"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-orange-300 flex items-center gap-1">
                        <Home className="w-3 h-3 text-orange-400" />
                        2. Awaiting Hostel Admin Action
                      </span>
                      <span className="text-xs font-bold font-mono text-orange-300">
                        {unifiedServiceData.currentViewData.pendingHostelAdmin}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Forwarded to Boys/Girls Hostel Administrator for room verification & allocation
                    </p>
                  </div>
                </div>
              ) : selectedGraphService !== 'ALL' ? (
                /* Other Individual Service Pending Note */
                <div className="p-2.5 rounded-xl bg-slate-850/50 border border-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {selectedGraphService === 'SEMINAR_HALL' && 'Seminar Hall booking requests under coordinator verification'}
                      {selectedGraphService === 'TRANSPORT' && 'Transport vehicle allocation requests pending transport incharge'}
                      {selectedGraphService === 'STATIONERY' && 'Stationery requests pending inventory verification & dispatch'}
                      {selectedGraphService === 'MEALS' && 'Snacks & meals catering orders under cafeteria approval'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-400">
                    {unifiedServiceData.currentViewData.pending} Pending
                  </span>
                </div>
              ) : (
                /* All Services 3-Way Pending Workflow Breakdown */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 1. Awaiting AO Admin Forwarding */}
                  <div
                    className={`p-2.5 rounded-xl border transition-all ${
                      unifiedServiceData.overallStats.pendingAoForwarding > 0
                        ? 'bg-cyan-950/30 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-850/40 border-slate-800 opacity-60'
                    }`}
                    title="Accommodation requests pending AO Admin review and forwarding"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-cyan-300 flex items-center gap-1">
                        <Send className="w-3 h-3 text-cyan-400" />
                        Awaiting AO Forwarding
                      </span>
                      <span className="text-xs font-bold font-mono text-cyan-300">
                        {unifiedServiceData.overallStats.pendingAoForwarding}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Accommodation requests to forward to hostel admin
                    </p>
                  </div>

                  {/* 2. Awaiting Hostel Administrator */}
                  <div
                    className={`p-2.5 rounded-xl border transition-all ${
                      unifiedServiceData.overallStats.pendingHostelAdmin > 0
                        ? 'bg-orange-950/30 border-orange-500/40 shadow-sm'
                        : 'bg-slate-850/40 border-slate-800 opacity-60'
                    }`}
                    title="Forwarded by AO Admin, currently awaiting Boys or Girls Hostel Admin approval"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-orange-300 flex items-center gap-1">
                        <Home className="w-3 h-3 text-orange-400" />
                        Awaiting Hostel Admin
                      </span>
                      <span className="text-xs font-bold font-mono text-orange-300">
                        {unifiedServiceData.overallStats.pendingHostelAdmin}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Forwarded to Boys/Girls Hostel Administrator
                    </p>
                  </div>

                  {/* 3. General Service Pending */}
                  <div
                    className={`p-2.5 rounded-xl border transition-all ${
                      unifiedServiceData.overallStats.pendingGeneral > 0
                        ? 'bg-amber-950/30 border-amber-500/40 shadow-sm'
                        : 'bg-slate-850/40 border-slate-800 opacity-60'
                    }`}
                    title="Seminar Hall, Transport, Stationery, Snacks & Meals requests awaiting review"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Other Services Pending
                      </span>
                      <span className="text-xs font-bold font-mono text-amber-300">
                        {unifiedServiceData.overallStats.pendingGeneral}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Seminar, Transport, Stationery & Meals
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Unified Graph Footer */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 mt-3">
            <span>
              Approval Rate:{' '}
              <strong className="text-emerald-400 font-mono">
                {unifiedServiceData.currentViewData.total > 0
                  ? Math.round(
                      (unifiedServiceData.currentViewData.approved / unifiedServiceData.currentViewData.total) * 100
                    )
                  : 0}
                %
              </strong>
            </span>
            <span className="text-slate-400">
              {unifiedServiceData.currentViewData.total === 0
                ? 'No records match filter'
                : 'Synchronized with active filters'}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* GRAPH 2: RESOURCE / FACILITY UTILIZATION                  */}
        {/* ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  Resource & Facility Utilization
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Capacity metrics, booking volume, and resource demand
                </p>
              </div>

              {/* Sub-Service Tab Selector when Multiple Services are Active */}
              {activeServicesList.length > 1 && (
                <div className="flex items-center bg-slate-850 rounded-lg p-0.5 border border-slate-800 overflow-x-auto max-w-full">
                  {activeServicesList.map((srv) => {
                    const IconComp = srv.icon;
                    const isActive = currentFacilityTab === srv.id;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => setActiveFacilityTab(srv.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition whitespace-nowrap ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        {srv.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TAB CONTENT: SEMINAR HALLS */}
            {currentFacilityTab === 'SEMINAR_HALL' && (
              <div className="space-y-3 pt-1">
                {facilityData.isSpecificHall && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
                    <span>
                      Filtering resource: <strong>{selectedHall}</strong>
                    </span>
                    <span className="font-mono text-white">Specific Venue View</span>
                  </div>
                )}

                {facilityData.halls.length > 0 ? (
                  <div className="space-y-3">
                    {facilityData.halls.map((hall) => {
                      const hours = hall.totalBookedHours || 0;
                      const pct = Math.min(
                        100,
                        Math.round((hours / Math.max(facilityData.maxHallHours, 1)) * 100)
                      );

                      return (
                        <div key={hall.hallId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-200 font-medium flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                              {hall.hallName}
                              <span className="text-[10px] text-slate-500 font-mono">({hall.hallId})</span>
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              <strong className="text-white">{hours} hrs</strong> ({hall.total} bookings)
                            </span>
                          </div>
                          {/* Progress Bar with Slot Distribution */}
                          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${(hall.forenoonCount / Math.max(hall.total, 1)) * pct}%` }}
                              className="bg-blue-500 h-full"
                              title={`Forenoon: ${hall.forenoonCount}`}
                            />
                            <div
                              style={{ width: `${(hall.afternoonCount / Math.max(hall.total, 1)) * pct}%` }}
                              className="bg-indigo-500 h-full"
                              title={`Afternoon: ${hall.afternoonCount}`}
                            />
                            <div
                              style={{ width: `${(hall.fullDayCount / Math.max(hall.total, 1)) * pct}%` }}
                              className="bg-emerald-500 h-full"
                              title={`Full Day: ${hall.fullDayCount}`}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Slot Color Legend */}
                    <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 pt-2">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-blue-500"></span> Forenoon (3h)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-indigo-500"></span> Afternoon (4h)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-emerald-500"></span> Full Day (7h)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No seminar hall bookings found for selected criteria.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ACCOMMODATION */}
            {currentFacilityTab === 'ACCOMMODATION' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span>Hostel / Room Allocation</span>
                  <span>
                    Total Guests:{' '}
                    <strong className="text-white font-mono">
                      {reportData?.accommodationMetrics?.totalGuests || 0}
                    </strong>
                  </span>
                </div>

                {facilityData.accommodation.length > 0 ? (
                  <div className="space-y-2.5">
                    {facilityData.accommodation.map((room) => {
                      const pct = Math.round((room.count / facilityData.maxAccBookings) * 100);
                      return (
                        <div key={room.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">{room.name}</span>
                            <span className="font-mono text-white text-xs">{room.count} stays</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No guest house bookings found for selected criteria.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: TRANSPORT */}
            {currentFacilityTab === 'TRANSPORT' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span>Fleet Vehicle Deployment</span>
                  <span>
                    Total Passengers:{' '}
                    <strong className="text-white font-mono">
                      {reportData?.transportMetrics?.totalPassengers || 0}
                    </strong>
                  </span>
                </div>

                {facilityData.transport.length > 0 ? (
                  <div className="space-y-2.5">
                    {facilityData.transport.map((v) => {
                      const pct = Math.round((v.count / facilityData.maxTransBookings) * 100);
                      return (
                        <div key={v.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">{v.name}</span>
                            <span className="font-mono text-white text-xs">{v.count} trips</span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No fleet journeys recorded for selected criteria.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: STATIONERY */}
            {currentFacilityTab === 'STATIONERY' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span>Top Requested Consumables</span>
                  <span>
                    Items Tracked: <strong className="text-white font-mono">{facilityData.stationery.length}</strong>
                  </span>
                </div>

                {facilityData.stationery.length > 0 ? (
                  <div className="space-y-2.5">
                    {facilityData.stationery.map((item) => {
                      const pct = Math.round((item.totalQuantity / facilityData.maxStationeryQty) * 100);
                      return (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">{item.name}</span>
                            <span className="font-mono text-indigo-400 text-xs">
                              {item.totalQuantity} {item.unit}{' '}
                              <span className="text-slate-500">({item.requestCount} reqs)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No stationery requisitions found for selected criteria.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SNACKS & MEALS */}
            {currentFacilityTab === 'MEALS' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span>Catering Headcount Breakdown</span>
                  <span>Approved Servings</span>
                </div>

                <div className="space-y-2.5">
                  {facilityData.meals.map((meal) => {
                    const pct = Math.round((meal.count / facilityData.maxMealCount) * 100);
                    return (
                      <div key={meal.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{meal.name}</span>
                          <span className="font-mono text-white text-xs">{meal.count} guests</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: meal.barColor }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Facility Footer */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Active Resource:{' '}
              <strong className="text-slate-300 font-semibold">{currentFacilityTab.replace('_', ' ')}</strong>
            </span>
            <span>Capacity analytics updated</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM ROW: FULL WIDTH REDESIGNED DEPARTMENT COMPARISON   */}
      {/* ========================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Department Comparison & Grouped Status Metrics
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative requisition volumes and workflow throughput across departments
            </p>
          </div>

          {/* Controls: Legend and Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Approved
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pending
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Rejected
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Cancelled
              </span>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center bg-slate-850 rounded-xl p-1 border border-slate-800 text-xs">
              <span className="text-[11px] text-slate-500 px-2 font-medium hidden sm:inline">Sort:</span>
              <button
                type="button"
                onClick={() => setDeptSortMetric('TOTAL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  deptSortMetric === 'TOTAL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                By Total
              </button>
              <button
                type="button"
                onClick={() => setDeptSortMetric('APPROVED')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  deptSortMetric === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                By Approved
              </button>
              <button
                type="button"
                onClick={() => setDeptSortMetric('PENDING')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  deptSortMetric === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                By Pending
              </button>
              <button
                type="button"
                onClick={() => setDeptSortMetric('NAME')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  deptSortMetric === 'NAME'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
        </div>

        {/* Grouped Horizontal Bars Container */}
        {departmentGroupedData.departments.length > 0 ? (
          <div className="space-y-4 pt-1">
            {departmentGroupedData.departments.map((dept, idx) => {
              const total = dept.total || 0;
              const approved = dept.approved || 0;
              const pending = dept.pending || 0;
              const rejected = dept.rejected || 0;
              const cancelled = dept.cancelled || 0;
              const pendingAo = dept.pendingAoReview || 0;

              const maxVal = departmentGroupedData.maxStatusVal;
              const isHovered = hoveredDeptIndex === idx;

              // Calculate width percentages relative to highest single status count across all depts
              const approvedPct = maxVal > 0 ? (approved / maxVal) * 100 : 0;
              const pendingPct = maxVal > 0 ? (pending / maxVal) * 100 : 0;
              const rejectedPct = maxVal > 0 ? (rejected / maxVal) * 100 : 0;
              const cancelledPct = maxVal > 0 ? (cancelled / maxVal) * 100 : 0;

              return (
                <div
                  key={dept.department}
                  onMouseEnter={() => setHoveredDeptIndex(idx)}
                  onMouseLeave={() => setHoveredDeptIndex(null)}
                  className={`p-3.5 rounded-2xl transition-all border ${
                    isHovered
                      ? 'bg-slate-800/80 border-purple-500/60 shadow-lg scale-[1.005]'
                      : 'bg-slate-800/30 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700/80'
                  }`}
                >
                  {/* Department Name & Summary Badges Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                      <span className="font-bold text-white text-sm tracking-wide">
                        {dept.department}
                      </span>
                      {dept.fullName && dept.fullName !== dept.department && (
                        <span className="text-xs text-slate-400 font-normal hidden md:inline">
                          &bull; {dept.fullName}
                        </span>
                      )}
                      {pendingAo > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-medium flex items-center gap-1">
                          <Send className="w-2.5 h-2.5" />
                          {pendingAo} Awaiting AO Forwarding
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">
                        Total:{' '}
                        <strong className="text-white font-bold">{total}</strong> reqs
                      </span>
                      {total > 0 && (
                        <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {Math.round((approved / total) * 100)}% approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Grouped Horizontal Bars (4 side-by-side or stacked cleanly in a grid) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1">
                    {/* 1. Approved Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Approved
                        </span>
                        <span className="font-mono font-bold text-emerald-400">{approved}</span>
                      </div>
                      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex items-center">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(approvedPct, approved > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* 2. Pending Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending
                        </span>
                        <span className="font-mono font-bold text-amber-400">{pending}</span>
                      </div>
                      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex items-center">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(pendingPct, pending > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* 3. Rejected Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> Rejected
                        </span>
                        <span className="font-mono font-bold text-rose-400">{rejected}</span>
                      </div>
                      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex items-center">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(rejectedPct, rejected > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* 4. Cancelled Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-500"></span> Cancelled
                        </span>
                        <span className="font-mono font-bold text-slate-400">{cancelled}</span>
                      </div>
                      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex items-center">
                        <div
                          className="h-full bg-slate-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(cancelledPct, cancelled > 0 ? 5 : 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Service Footprint on Hover */}
                  {isHovered && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono text-slate-300 animate-fadeIn">
                      <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">Seminar Hall</span>
                        <strong className="text-blue-400">{dept.seminarCount}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">Accommodation</span>
                        <strong className="text-emerald-400">{dept.accommodationCount}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">Transport</span>
                        <strong className="text-amber-400">{dept.transportCount}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">Stationery</span>
                        <strong className="text-indigo-400">{dept.stationeryCount}</strong>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800 text-center col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-500 block">Snacks & Meals</span>
                        <strong className="text-purple-400">{dept.mealsCount}</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Building className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p>No department records match current filter selections.</p>
          </div>
        )}

        {/* Department Footer */}
        <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 mt-4">
          <span>
            Comparing <strong className="text-slate-300 font-mono">{departmentGroupedData.totalDepartments}</strong>{' '}
            active departments
          </span>
          <span>
            Sorted by{' '}
            {deptSortMetric === 'TOTAL'
              ? 'total requisition volume'
              : deptSortMetric === 'APPROVED'
              ? 'approved requisitions'
              : deptSortMetric === 'PENDING'
              ? 'pending requisitions'
              : 'alphabetical order'}
          </span>
        </div>
      </div>
    </div>
  );
}
