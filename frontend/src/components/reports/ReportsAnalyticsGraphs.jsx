import React, { useState, useMemo } from 'react';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  Building2,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  ChevronRight,
  Info,
  Sparkles,
  ArrowUpRight,
  Bus,
  Home,
  FileText,
  Coffee,
  HelpCircle
} from 'lucide-react';

/**
 * Interactive Analytics Graphs for Reports & Analytics Page
 * Displays:
 * 1. Request Status Distribution (Interactive Donut Chart with hover tooltips and metrics)
 * 2. Requests Over Time (Interactive Area/Line Trend Chart with dynamic buckets)
 * 3. Resource / Facility Utilization (Service-specific with Seminar Hall, Accommodation, Transport, Stationery, Meals)
 * 4. Department Comparison (Interactive Horizontal Stacked/Grouped Bars with cross-service metrics)
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
  const [hoveredTimeIndex, setHoveredTimeIndex] = useState(null);
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState(null);
  const [deptSortMetric, setDeptSortMetric] = useState('TOTAL'); // 'TOTAL' or 'APPROVED'

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

  // -------------------------------------------------------------
  // GRAPH 1: REQUEST STATUS DISTRIBUTION DATA & CALCULATIONS
  // -------------------------------------------------------------
  const statusChartData = useMemo(() => {
    const approved = summary?.approved || 0;
    const pending = summary?.pending || 0;
    const rejected = summary?.rejected || 0;
    const cancelled = summary?.cancelled || 0;
    const total = summary?.totalRequests || (approved + pending + rejected + cancelled);

    const segments = [
      { id: 'APPROVED', label: 'Approved', count: approved, color: '#10B981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-400' },
      { id: 'PENDING', label: 'Pending Review', count: pending, color: '#F59E0B', bgClass: 'bg-amber-500', textClass: 'text-amber-400' },
      { id: 'REJECTED', label: 'Rejected', count: rejected, color: '#F43F5E', bgClass: 'bg-rose-500', textClass: 'text-rose-400' },
      { id: 'CANCELLED', label: 'Cancelled', count: cancelled, color: '#64748B', bgClass: 'bg-slate-500', textClass: 'text-slate-400' }
    ];

    // Compute percentages and SVG arc coordinates
    let cumulativeAngle = 0;
    const computedSegments = segments.map((seg) => {
      const percentage = total > 0 ? (seg.count / total) * 100 : 0;
      const angle = total > 0 ? (seg.count / total) * 360 : 0;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle += angle;

      return {
        ...seg,
        percentage: Math.round(percentage * 10) / 10,
        startAngle,
        endAngle
      };
    });

    return { total, segments: computedSegments };
  }, [summary]);

  // -------------------------------------------------------------
  // GRAPH 2: REQUESTS OVER TIME DATA & CALCULATIONS
  // -------------------------------------------------------------
  const timeSeriesData = useMemo(() => {
    const records = reportData?.detailedRecords || [];
    if (records.length === 0) return { points: [], maxVal: 0, peakDate: 'N/A', avgDaily: '0' };

    // Group records by calendar date
    const dateMap = new Map();
    records.forEach((r) => {
      // Use record date (YYYY-MM-DD) or extract from createdAt
      let dStr = r.date;
      if (!dStr || dStr === '-' || dStr.length < 10) {
        if (r.createdAt) {
          dStr = String(r.createdAt).slice(0, 10);
        }
      }
      if (!dStr || dStr.length < 10) dStr = 'Unknown';

      if (!dateMap.has(dStr)) {
        dateMap.set(dStr, { date: dStr, total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 });
      }
      const item = dateMap.get(dStr);
      item.total += 1;
      const st = (r.status || '').toUpperCase();
      if (st.includes('APPROV') || st.includes('CONFIRM')) item.approved += 1;
      else if (st.includes('PEND') || st.includes('REVIEW')) item.pending += 1;
      else if (st.includes('REJECT')) item.rejected += 1;
      else if (st.includes('CANCEL')) item.cancelled += 1;
    });

    // Sort chronologically
    const sorted = Array.from(dateMap.values())
      .filter((d) => d.date !== 'Unknown')
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0 && dateMap.has('Unknown')) {
      sorted.push(dateMap.get('Unknown'));
    }

    const maxVal = Math.max(...sorted.map((s) => s.total), 1);
    const peak = sorted.reduce((max, cur) => (cur.total > max.total ? cur : max), sorted[0] || { date: 'N/A', total: 0 });
    const avgDaily = sorted.length > 0 ? (records.length / sorted.length).toFixed(1) : '0';

    return {
      points: sorted,
      maxVal,
      peakDate: peak.date,
      peakCount: peak.total,
      avgDaily
    };
  }, [reportData]);

  // -------------------------------------------------------------
  // GRAPH 3: RESOURCE / FACILITY UTILIZATION DATA
  // -------------------------------------------------------------
  const facilityData = useMemo(() => {
    // 1. Seminar Hall Utilization
    const allHalls = reportData?.hallBreakdown || [];
    // If a specific hall is filtered, filter or highlight it
    const isSpecificHall = selectedHall && selectedHall !== 'ALL';
    const displayHalls = isSpecificHall
      ? allHalls.filter((h) => h.hallId.equalsIgnoreCase ? h.hallId.equalsIgnoreCase(selectedHall) : h.hallId.toUpperCase() === selectedHall.toUpperCase())
      : allHalls;

    const maxHallHours = Math.max(...displayHalls.map((h) => h.totalBookedHours || 0), 1);
    const maxHallBookings = Math.max(...displayHalls.map((h) => h.total || 0), 1);

    // 2. Accommodation
    const accRoomUsage = reportData?.accommodationMetrics?.roomUsage || {};
    const accRoomsList = Object.entries(accRoomUsage).map(([room, count]) => ({
      name: room,
      count
    })).sort((a, b) => b.count - a.count);
    const maxAccBookings = Math.max(...accRoomsList.map((r) => r.count), 1);

    // 3. Transport
    const transVehicleUsage = reportData?.transportMetrics?.vehicleUsage || {};
    const transList = Object.entries(transVehicleUsage).map(([vehicle, count]) => ({
      name: vehicle,
      count
    })).sort((a, b) => b.count - a.count);
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
  // GRAPH 4: DEPARTMENT COMPARISON DATA
  // -------------------------------------------------------------
  const departmentChartData = useMemo(() => {
    const depts = [...displayedDeptBreakdown];
    if (deptSortMetric === 'APPROVED') {
      depts.sort((a, b) => b.approved - a.approved);
    } else {
      depts.sort((a, b) => b.total - a.total);
    }

    const topDepts = depts.slice(0, 10);
    const maxTotal = Math.max(...topDepts.map((d) => d.total), 1);

    return {
      departments: topDepts,
      maxTotal,
      hasMore: depts.length > 10,
      totalCount: depts.length
    };
  }, [displayedDeptBreakdown, deptSortMetric]);

  return (
    <div className="space-y-6 pt-2">
      {/* Analytics Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Visual Analytics & Filtered Trends
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time interactive graphs visualizing demand, capacity, and departmental throughput for active selections
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedStatuses && selectedStatuses.length > 0 && selectedStatuses.length < 6 && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Status Filter Active ({selectedStatuses.length} selected)
            </span>
          )}
          {selectedHall && selectedHall !== 'ALL' && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
              Facility: {selectedHall}
            </span>
          )}
        </div>
      </div>

      {/* Grid: 2 Columns for Desktop, Stacked for Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================= */}
        {/* GRAPH 1: REQUEST STATUS DISTRIBUTION                      */}
        {/* ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-400" />
                  Request Status Distribution
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Proportion of approved, pending, rejected, and cancelled requests
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Total: {statusChartData.total}
              </span>
            </div>

            {/* Donut Chart and Legend */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              {/* SVG Donut */}
              <div className="relative w-44 h-44 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Empty Background Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#1E293B"
                    strokeWidth="14"
                  />

                  {statusChartData.total > 0 ? (
                    statusChartData.segments.map((seg, idx) => {
                      if (seg.count === 0) return null;
                      const circumference = 2 * Math.PI * 38;
                      const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((seg.startAngle / 360) * circumference);
                      const isHovered = hoveredStatusIndex === idx;

                      return (
                        <circle
                          key={seg.id}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={seg.color}
                          strokeWidth={isHovered ? 17 : 14}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredStatusIndex(idx)}
                          onMouseLeave={() => setHoveredStatusIndex(null)}
                        />
                      );
                    })
                  ) : (
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#334155"
                      strokeWidth="14"
                      strokeDasharray="4 4"
                    />
                  )}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  {hoveredStatusIndex !== null && statusChartData.segments[hoveredStatusIndex] ? (
                    <>
                      <span className="text-xl font-bold font-mono text-white">
                        {statusChartData.segments[hoveredStatusIndex].count}
                      </span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusChartData.segments[hoveredStatusIndex].textClass}`}>
                        {statusChartData.segments[hoveredStatusIndex].percentage}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold font-mono text-white">
                        {statusChartData.total}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                        Requisitions
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Segment Legend Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 w-full max-w-xs">
                {statusChartData.segments.map((seg, idx) => {
                  const isHovered = hoveredStatusIndex === idx;
                  return (
                    <div
                      key={seg.id}
                      onMouseEnter={() => setHoveredStatusIndex(idx)}
                      onMouseLeave={() => setHoveredStatusIndex(null)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                        isHovered
                          ? 'bg-slate-800 border-blue-500/60 shadow-md scale-[1.02]'
                          : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${seg.bgClass}`}></span>
                        <span className="text-xs font-medium text-slate-300">{seg.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-white mr-1.5">{seg.count}</span>
                        <span className="text-[10px] font-mono text-slate-400">({seg.percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Status Distribution Footer Note */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Approval Rate: <strong className="text-emerald-400 font-mono">
              {statusChartData.total > 0 ? Math.round(((summary?.approved || 0) / statusChartData.total) * 100) : 0}%
            </strong></span>
            <span>
              {statusChartData.total === 0 ? 'No records match filter' : 'Synchronized with active filters'}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* GRAPH 2: REQUESTS OVER TIME (TREND TIMELINE)              */}
        {/* ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Requests Over Time
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Timeline distribution across the active date range ({dateRangeType.replace('_', ' ')})
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">
                  Daily Avg: <strong className="text-blue-300 font-mono">{timeSeriesData.avgDaily}</strong>
                </span>
              </div>
            </div>

            {/* Time Series Graph Canvas */}
            {timeSeriesData.points.length > 0 ? (
              <div className="relative pt-2 pb-4">
                {/* SVG Line / Area Graph */}
                <div className="w-full h-44">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="timeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Reference Gridlines */}
                    {[0, 0.33, 0.66, 1].map((pct, idx) => (
                      <line
                        key={idx}
                        x1="0"
                        y1={130 - pct * 110}
                        x2="500"
                        y2={130 - pct * 110}
                        stroke="#1E293B"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                    ))}

                    {/* Area Polygon */}
                    {timeSeriesData.points.length > 1 && (
                      <polygon
                        points={`0,130 ${timeSeriesData.points
                          .map((p, i) => {
                            const x = (i / (timeSeriesData.points.length - 1)) * 500;
                            const y = 130 - (p.total / timeSeriesData.maxVal) * 110;
                            return `${x},${y}`;
                          })
                          .join(' ')} 500,130`}
                        fill="url(#timeAreaGrad)"
                      />
                    )}

                    {/* Trend Line Path */}
                    {timeSeriesData.points.length > 1 ? (
                      <polyline
                        points={timeSeriesData.points
                          .map((p, i) => {
                            const x = (i / (timeSeriesData.points.length - 1)) * 500;
                            const y = 130 - (p.total / timeSeriesData.maxVal) * 110;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      /* Single point fallback horizontal bar */
                      <line
                        x1="0"
                        y1="75"
                        x2="500"
                        y2="75"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Interactive Data Dots */}
                    {timeSeriesData.points.map((p, i) => {
                      const x =
                        timeSeriesData.points.length > 1
                          ? (i / (timeSeriesData.points.length - 1)) * 500
                          : 250;
                      const y = 130 - (p.total / timeSeriesData.maxVal) * 110;
                      const isHovered = hoveredTimeIndex === i;

                      return (
                        <g key={i}>
                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 6 : 3.5}
                            fill={isHovered ? '#60A5FA' : '#1D4ED8'}
                            stroke="#FFFFFF"
                            strokeWidth={isHovered ? 2.5 : 1.5}
                            className="cursor-pointer transition-all duration-200"
                            onMouseEnter={() => setHoveredTimeIndex(i)}
                            onMouseLeave={() => setHoveredTimeIndex(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* X-Axis Date Labels */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2">
                  <span>{timeSeriesData.points[0]?.date || 'Start'}</span>
                  {timeSeriesData.points.length > 2 && (
                    <span>{timeSeriesData.points[Math.floor(timeSeriesData.points.length / 2)]?.date}</span>
                  )}
                  <span>{timeSeriesData.points[timeSeriesData.points.length - 1]?.date || 'End'}</span>
                </div>

                {/* Hover Tooltip Card */}
                {hoveredTimeIndex !== null && timeSeriesData.points[hoveredTimeIndex] && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-800/90 border border-blue-500/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-white font-semibold block">
                        {timeSeriesData.points[hoveredTimeIndex].date}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Total Volume: <strong className="text-blue-300 font-mono">{timeSeriesData.points[hoveredTimeIndex].total}</strong> requests
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="text-emerald-400">✓ {timeSeriesData.points[hoveredTimeIndex].approved}</span>
                      <span className="text-amber-400">⏳ {timeSeriesData.points[hoveredTimeIndex].pending}</span>
                      <span className="text-rose-400">✗ {timeSeriesData.points[hoveredTimeIndex].rejected}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs">
                <Calendar className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
                <p>No dated records matching selected filters</p>
              </div>
            )}
          </div>

          {/* Time Series Footer */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Peak Date: <strong className="text-white font-mono">{timeSeriesData.peakDate}</strong> ({timeSeriesData.peakCount || 0} requests)</span>
            <span>{timeSeriesData.points.length} active time points</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* GRAPH 3: RESOURCE / FACILITY UTILIZATION                  */}
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
                    <span>Filtering resource: <strong>{selectedHall}</strong></span>
                    <span className="font-mono text-white">Specific Venue View</span>
                  </div>
                )}

                {facilityData.halls.length > 0 ? (
                  <div className="space-y-3">
                    {facilityData.halls.map((hall) => {
                      const hours = hall.totalBookedHours || 0;
                      const pct = Math.min(100, Math.round((hours / Math.max(facilityData.maxHallHours, 1)) * 100));
                      const isHighlighted = facilityData.isSpecificHall;

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
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500"></span> Forenoon (3h)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500"></span> Afternoon (4h)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"></span> Full Day (7h)</span>
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
                  <span>Total Guests: <strong className="text-white font-mono">{reportData?.accommodationMetrics?.totalGuests || 0}</strong></span>
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
                  <span>Total Passengers: <strong className="text-white font-mono">{reportData?.transportMetrics?.totalPassengers || 0}</strong></span>
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
                  <span>Items Tracked: <strong className="text-white font-mono">{facilityData.stationery.length}</strong></span>
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
                              {item.totalQuantity} {item.unit} <span className="text-slate-500">({item.requestCount} reqs)</span>
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
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: meal.barColor }}></div>
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
            <span>Active Resource: <strong className="text-slate-300 font-semibold">{currentFacilityTab.replace('_', ' ')}</strong></span>
            <span>Capacity analytics updated</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* GRAPH 4: DEPARTMENT COMPARISON                            */}
        {/* ========================================================= */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Department Comparison & Status Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Requisition throughput across academic and administrative departments
                </p>
              </div>

              {/* Sort Toggle */}
              <div className="flex items-center bg-slate-850 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDeptSortMetric('TOTAL')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    deptSortMetric === 'TOTAL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  By Total
                </button>
                <button
                  type="button"
                  onClick={() => setDeptSortMetric('APPROVED')}
                  className={`px-2 py-0.5 rounded font-medium transition ${
                    deptSortMetric === 'APPROVED' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  By Approved
                </button>
              </div>
            </div>

            {/* Department Horizontal Stacked Bars */}
            {departmentChartData.departments.length > 0 ? (
              <div className="space-y-3 pt-1">
                {departmentChartData.departments.map((dept, idx) => {
                  const total = dept.total || 0;
                  const approved = dept.approved || 0;
                  const pending = dept.pending || 0;
                  const rejected = dept.rejected || 0;
                  const cancelled = dept.cancelled || 0;

                  const barWidthPct = Math.round((total / departmentChartData.maxTotal) * 100);
                  const isHovered = hoveredDeptIndex === idx;

                  return (
                    <div
                      key={dept.department}
                      onMouseEnter={() => setHoveredDeptIndex(idx)}
                      onMouseLeave={() => setHoveredDeptIndex(null)}
                      className={`p-2 rounded-xl transition cursor-pointer border ${
                        isHovered
                          ? 'bg-slate-800/80 border-purple-500/50 shadow-md'
                          : 'bg-slate-800/30 border-transparent hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                          {dept.department}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-emerald-400" title="Approved">{approved}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-white font-bold">{total} reqs</span>
                        </div>
                      </div>

                      {/* Stacked Horizontal Bar */}
                      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex" style={{ width: `${Math.max(barWidthPct, 6)}%` }}>
                        {approved > 0 && (
                          <div
                            style={{ width: `${(approved / total) * 100}%` }}
                            className="bg-emerald-500 h-full"
                            title={`Approved: ${approved}`}
                          />
                        )}
                        {pending > 0 && (
                          <div
                            style={{ width: `${(pending / total) * 100}%` }}
                            className="bg-amber-500 h-full"
                            title={`Pending: ${pending}`}
                          />
                        )}
                        {rejected > 0 && (
                          <div
                            style={{ width: `${(rejected / total) * 100}%` }}
                            className="bg-rose-500 h-full"
                            title={`Rejected: ${rejected}`}
                          />
                        )}
                        {cancelled > 0 && (
                          <div
                            style={{ width: `${(cancelled / total) * 100}%` }}
                            className="bg-slate-500 h-full"
                            title={`Cancelled: ${cancelled}`}
                          />
                        )}
                      </div>

                      {/* Hover Expanded Detail showing Service Counts */}
                      {isHovered && (
                        <div className="mt-2 pt-2 border-t border-slate-700/60 grid grid-cols-5 gap-1 text-[10px] text-center font-mono text-slate-300">
                          <div>Sem: <strong className="text-blue-300">{dept.seminarCount || 0}</strong></div>
                          <div>Acc: <strong className="text-emerald-300">{dept.accommodationCount || 0}</strong></div>
                          <div>Trn: <strong className="text-amber-300">{dept.transportCount || 0}</strong></div>
                          <div>Sta: <strong className="text-indigo-300">{dept.stationeryCount || 0}</strong></div>
                          <div>Meal: <strong className="text-purple-300">{dept.mealsCount || 0}</strong></div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Stack Legend */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"></span> Approved</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500"></span> Pending</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500"></span> Rejected</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-500"></span> Cancelled</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No department records match current filter selections.
              </div>
            )}
          </div>

          {/* Department Footer */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Comparing <strong className="text-slate-300 font-mono">{departmentChartData.departments.length}</strong> active departments</span>
            <span>Sorted by {deptSortMetric === 'TOTAL' ? 'total volume' : 'approved requisitions'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
