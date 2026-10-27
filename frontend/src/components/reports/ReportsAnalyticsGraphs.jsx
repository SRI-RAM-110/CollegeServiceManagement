import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  BarChart3
} from 'lucide-react';
import { MultiSelectDropdown } from '../common/MultiSelectDropdown';
import { useTheme } from '../../context/ThemeContext';

const DEPARTMENT_FULL_NAMES = {
  CSE: 'Computer Science & Engineering',
  ECE: 'Electronics & Communication Engineering',
  EEE: 'Electrical & Electronics Engineering',
  MECH: 'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
  IT: 'Information Technology',
  CSDS: 'Cyber Security & Data Science',
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

export const PIE_SERVICE_OPTIONS = [
  { id: 'SEMINAR_HALL', label: 'Seminar Hall Booking', shortName: 'Seminar Hall', icon: Building2, color: '#3B82F6' },
  { id: 'ACCOMMODATION', label: 'Accommodation', shortName: 'Accommodation', icon: Home, color: '#10B981' },
  { id: 'TRANSPORT', label: 'Transport', shortName: 'Transport', icon: Bus, color: '#F59E0B' },
  { id: 'STATIONERY', label: 'Stationery', shortName: 'Stationery', icon: FileText, color: '#6366F1' },
  { id: 'MEALS', label: 'Snacks & Meals', shortName: 'Snacks & Meals', icon: Coffee, color: '#0EA5E9' }
];

export const STATUS_BAR_SERVICE_OPTIONS = PIE_SERVICE_OPTIONS;

/**
 * Helper to split service name into two clean X-axis lines to prevent any truncation or overlapping
 */
function getServiceXAxisLines(serviceId, shortName, label) {
  if (serviceId === 'SEMINAR_HALL' || serviceId === 'SEMINAR') {
    return { line1: 'Seminar', line2: 'Hall' };
  }
  if (serviceId === 'ACCOMMODATION') {
    return { line1: 'Accom.', line2: 'Hostel' };
  }
  if (serviceId === 'TRANSPORT') {
    return { line1: 'Transport', line2: '' };
  }
  if (serviceId === 'STATIONERY') {
    return { line1: 'Stationery', line2: '' };
  }
  if (serviceId === 'MEALS') {
    return { line1: 'Snacks &', line2: 'Meals' };
  }
  const name = shortName || label || serviceId;
  const parts = name.split(' ');
  if (parts.length > 1) {
    return { line1: parts[0], line2: parts.slice(1).join(' ') };
  }
  return { line1: name, line2: '' };
}

/**
 * StatusBarChartCard renders an individual vertical bar graph for a request status:
 * 1. Approved Requests
 * 2. Pending Requests (with accurate AO Admin Forwarding count callout integrated into header)
 * 3. Rejected Requests
 * 4. Cancelled Requests
 *
 * Compares selected services with vertical bars, Y-axis counts, X-axis categories,
 * informative hover tooltips, accessible text colors, and graceful zero handling without fabricating data.
 */
function StatusBarChartCard({
  title,
  icon: Icon,
  statusKey,
  accentColor,
  accentBg,
  accentBorder,
  barColor = '#3B82F6',
  barHoverColor = '#60A5FA',
  total = 0,
  slices = [],
  aoCount = 0,
  hoveredService,
  setHoveredService,
  isLight = false
}) {
  // Chart geometry constants with increased plotting area and generous margins
  const svgWidth = 300;
  const svgHeight = 235;
  const marginLeft = 32;
  const marginRight = 8;
  const marginTop = 28;
  const marginBottom = 48;
  const plotWidth = svgWidth - marginLeft - marginRight; // 260
  const plotHeight = svgHeight - marginTop - marginBottom; // 159

  // Determine Y-axis max scale
  const maxCount = Math.max(...slices.map((s) => s.count), 0);
  let yMax = 5;
  if (maxCount > 50) {
    yMax = Math.ceil(maxCount / 20) * 20;
  } else if (maxCount > 20) {
    yMax = Math.ceil(maxCount / 10) * 10;
  } else if (maxCount > 10) {
    yMax = Math.ceil(maxCount / 5) * 5;
  } else if (maxCount > 5) {
    yMax = 10;
  } else {
    yMax = 5;
  }

  // 3 horizontal grid lines (top, mid, baseline)
  const yTicks = [
    { val: yMax, y: marginTop },
    { val: Math.round(yMax / 2), y: marginTop + plotHeight / 2 },
    { val: 0, y: marginTop + plotHeight }
  ];

  const N = slices.length;
  const slotWidth = N > 0 ? plotWidth / N : plotWidth; // 52px per slot
  const barWidth = 24; // Prominent, clear bars

  return (
    <div
      className={`status-bar-chart-card p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 min-h-[510px] group border ${
        isLight
          ? 'bg-white hover:shadow-lg'
          : 'bg-slate-900/80 hover:border-slate-700/90 shadow-xl'
      } ${accentBorder}`}
      style={{
        boxShadow: isLight
          ? '0 2px 8px -1px rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.04)'
          : undefined
      }}
    >
      <div className="flex flex-col h-full justify-between">
        {/* Card Header: Title, Icon, AO Callout (if pending), and Total Count */}
        <div className={`flex items-center justify-between pb-3.5 border-b mb-3 min-h-[58px] ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${accentBg} border ${accentBorder} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${accentColor}`} />
            </div>
            <div className="min-w-0">
              <h4 className={`text-sm font-bold leading-tight truncate ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {title}
              </h4>
              {statusKey === 'PENDING' && aoCount > 0 ? (
                <span
                  className={`inline-flex items-center gap-1.5 mt-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                    isLight
                      ? 'bg-cyan-50 border-cyan-200 text-cyan-800'
                      : 'bg-cyan-950/70 border-cyan-800/60 text-cyan-300'
                  }`}
                  title={`${aoCount} accommodation requests awaiting AO forwarding`}
                >
                  <Send className="w-2.5 h-2.5 text-cyan-500 shrink-0" />
                  <strong className={isLight ? 'text-cyan-950 font-bold' : 'text-cyan-200 font-bold'}>{aoCount}</strong> awaiting AO fwd
                </span>
              ) : (
                <span className={`text-[11px] block mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  By Service Category
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${accentBg} ${accentColor} border ${accentBorder} shadow-xs`}
            >
              {total} <span className="text-[10px] font-normal opacity-85">reqs</span>
            </span>
          </div>
        </div>

        {/* Vertical Bar Chart Visual (Pure SVG) */}
        <div className={`relative w-full overflow-hidden flex items-center justify-center py-2.5 px-1 rounded-xl transition-colors ${
          isLight ? 'bg-slate-50/70 border border-slate-100' : 'bg-slate-950/30'
        }`}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none overflow-visible"
            style={{ minHeight: '170px', maxHeight: '255px' }}
          >
            {/* Y-Axis Label */}
            <text
              x={marginLeft - 6}
              y={marginTop - 10}
              textAnchor="end"
              fill={isLight ? '#475569' : '#94a3b8'}
              fontSize="10.5px"
              fontWeight="600"
              style={{ fill: isLight ? '#475569' : '#94a3b8' }}
            >
              Reqs
            </text>

            {/* Horizontal Gridlines & Y-Axis Ticks */}
            {yTicks.map((tick, idx) => (
              <g key={idx}>
                <line
                  x1={marginLeft}
                  y1={tick.y}
                  x2={svgWidth - marginRight}
                  y2={tick.y}
                  stroke={idx === yTicks.length - 1 ? (isLight ? '#cbd5e1' : '#475569') : (isLight ? 'rgba(203, 213, 225, 0.7)' : 'rgba(148, 163, 184, 0.15)')}
                  strokeDasharray={idx === yTicks.length - 1 ? 'none' : '3 3'}
                  strokeWidth={idx === yTicks.length - 1 ? 1.5 : 1}
                />
                <text
                  x={marginLeft - 8}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fill={isLight ? '#475569' : '#94a3b8'}
                  fontSize="10.5px"
                  fontFamily="monospace"
                  fontWeight="600"
                  style={{ fill: isLight ? '#475569' : '#94a3b8' }}
                >
                  {tick.val}
                </text>
              </g>
            ))}

            {/* X-Axis Baseline */}
            <line
              x1={marginLeft}
              y1={marginTop + plotHeight}
              x2={svgWidth - marginRight}
              y2={marginTop + plotHeight}
              stroke={isLight ? '#cbd5e1' : '#475569'}
              strokeWidth="1.5"
            />

            {/* Vertical Bars for each Service Category */}
            {slices.map((slice, i) => {
              const barHeight = maxCount > 0 ? (slice.count / yMax) * plotHeight : 0;
              const barX = marginLeft + i * slotWidth + (slotWidth - barWidth) / 2;
              const barCenterX = barX + barWidth / 2;
              const barY = (marginTop + plotHeight) - barHeight;
              const isHovered = hoveredService?.statusKey === statusKey && hoveredService?.serviceId === slice.serviceId;
              const { line1, line2 } = getServiceXAxisLines(slice.serviceId, slice.shortName, slice.label);

              return (
                <g
                  key={slice.serviceId}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredService({ statusKey, statusTitle: title, barColor, ...slice })}
                  onMouseLeave={() => setHoveredService(null)}
                >
                  <title>{`${slice.label}: ${slice.count} ${title} (${slice.pct}% of ${title})`}</title>

                  {/* Interactive Column Hover Zone */}
                  <rect
                    x={marginLeft + i * slotWidth + 1}
                    y={marginTop}
                    width={slotWidth - 2}
                    height={plotHeight + marginBottom - 4}
                    fill={isHovered ? (isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)') : 'transparent'}
                    rx="4"
                    className="transition-colors"
                  />

                  {/* Vertical Bar */}
                  {slice.count > 0 ? (
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={Math.max(barHeight, 4)}
                      rx="4"
                      fill={isHovered ? barHoverColor : barColor}
                      className="transition-all duration-200"
                      style={{
                        filter: isHovered
                          ? isLight
                            ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
                            : `drop-shadow(0 0 6px ${barColor})`
                          : 'none'
                      }}
                    />
                  ) : (
                    /* Zero-value baseline indicator */
                    <rect
                      x={barX}
                      y={marginTop + plotHeight - 2}
                      width={barWidth}
                      height="2"
                      rx="1"
                      fill={isLight ? '#cbd5e1' : '#334155'}
                    />
                  )}

                  {/* Actual Request Count on top of bar */}
                  <text
                    x={barCenterX}
                    y={slice.count > 0 ? Math.max(barY - 6, marginTop + 12) : marginTop + plotHeight - 8}
                    textAnchor="middle"
                    fill={
                      slice.count > 0
                        ? isHovered
                          ? isLight
                            ? '#0f172a'
                            : '#ffffff'
                          : isLight
                            ? '#0f172a'
                            : '#e2e8f0'
                        : isLight
                          ? '#94a3b8'
                          : '#64748b'
                    }
                    fontSize={slice.count > 0 ? '11.5px' : '10px'}
                    fontFamily="monospace"
                    fontWeight={slice.count > 0 ? (isHovered ? '800' : '700') : '500'}
                    style={{
                      fill:
                        slice.count > 0
                          ? isHovered
                            ? isLight
                              ? '#0f172a'
                              : '#ffffff'
                            : isLight
                              ? '#0f172a'
                              : '#e2e8f0'
                          : isLight
                            ? '#94a3b8'
                            : '#64748b'
                    }}
                  >
                    {slice.count}
                  </text>

                  {/* Category Name on X-Axis (Wrapped 2-line label with theme-aware high contrast) */}
                  <text
                    x={barCenterX}
                    y={marginTop + plotHeight + 16}
                    textAnchor="middle"
                    fill={
                      isHovered
                        ? isLight
                          ? '#0f172a'
                          : '#ffffff'
                        : isLight
                          ? '#334155'
                          : '#cbd5e1'
                    }
                    fontSize="10.5px"
                    fontWeight={isHovered ? '700' : '600'}
                    style={{
                      fill:
                        isHovered
                          ? isLight
                            ? '#0f172a'
                            : '#ffffff'
                          : isLight
                            ? '#334155'
                            : '#cbd5e1'
                    }}
                  >
                    <tspan x={barCenterX} dy="0">{line1}</tspan>
                    {line2 && <tspan x={barCenterX} dy="13">{line2}</tspan>}
                  </text>

                  {/* On-bar Hover Tooltip Pill */}
                  {isHovered && slice.count > 0 && (
                    <g className="pointer-events-none transition-all">
                      <rect
                        x={Math.max(marginLeft, Math.min(barCenterX - 40, svgWidth - marginRight - 80))}
                        y={Math.max(4, barY - 26)}
                        width="80"
                        height="20"
                        rx="5"
                        fill={isLight ? '#ffffff' : '#0f172a'}
                        stroke={barColor}
                        strokeWidth="1.5"
                        style={{
                          filter: isLight
                            ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.12))'
                            : 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))'
                        }}
                      />
                      <text
                        x={Math.max(marginLeft, Math.min(barCenterX - 40, svgWidth - marginRight - 80)) + 40}
                        y={Math.max(4, barY - 26) + 13.5}
                        textAnchor="middle"
                        fill={isLight ? '#0f172a' : '#ffffff'}
                        fontSize="10px"
                        fontWeight="700"
                        style={{ fill: isLight ? '#0f172a' : '#ffffff' }}
                      >
                        {slice.count} ({slice.pct}%)
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Empty State Banner when total === 0 */}
            {total === 0 && (
              <g className="pointer-events-none">
                <rect
                  x={marginLeft + 15}
                  y={marginTop + plotHeight / 2 - 14}
                  width={plotWidth - 30}
                  height="28"
                  rx="6"
                  fill={isLight ? '#ffffff' : '#0f172a'}
                  stroke={isLight ? '#cbd5e1' : '#334155'}
                  strokeWidth="1"
                />
                <text
                  x={marginLeft + plotWidth / 2}
                  y={marginTop + plotHeight / 2 + 4}
                  textAnchor="middle"
                  fill={isLight ? '#64748b' : '#94a3b8'}
                  fontSize="11px"
                  fontWeight="500"
                  style={{ fill: isLight ? '#64748b' : '#94a3b8' }}
                >
                  No {title.toLowerCase()} for criteria
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Legend / 5-Service Breakdown List with counts & percentages */}
        <div className={`space-y-2 pt-4 border-t mt-3 ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          {total > 0 ? (
            slices.map((slice) => {
              const isHovered = hoveredService?.statusKey === statusKey && hoveredService?.serviceId === slice.serviceId;
              return (
                <div
                  key={slice.serviceId}
                  onMouseEnter={() => setHoveredService({ statusKey, statusTitle: title, barColor, ...slice })}
                  onMouseLeave={() => setHoveredService(null)}
                  className={`flex items-center justify-between text-xs py-2 px-3 rounded-xl cursor-pointer transition-all ${
                    isHovered
                      ? isLight
                        ? 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                        : 'bg-slate-800 text-white font-semibold shadow-sm'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ring-2 ${
                        isLight ? 'ring-slate-100' : 'ring-slate-800'
                      }`}
                      style={{ backgroundColor: slice.color }}
                    ></span>
                    <span className={`truncate text-xs font-medium ${
                      isLight
                        ? isHovered ? 'text-slate-900' : 'text-slate-700'
                        : isHovered ? 'text-white' : 'text-slate-300'
                    }`}>
                      {slice.shortName || slice.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                    <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}>
                      {slice.count}
                    </strong>
                    <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                      ({slice.pct}%)
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`py-6 text-center text-xs font-medium ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              No {title.toLowerCase()} for selected criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive Analytics Graphs for Reports & Analytics Page
 * Displays:
 * 1. Unified Service & Status Analytics (4 Distinct Status Pie Charts with Service & Department Multi-Selects)
 * 2. Resource & Facility Utilization with Department Multi-Select Filter
 * 3. Department Comparison & Grouped Status Metrics (Top legend removed, individual metrics intact)
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
  displayedDeptBreakdown = [],
  departmentOptions = []
}) {
  // Active facility sub-tab when multiple services are selected
  const [activeFacilityTab, setActiveFacilityTab] = useState(null);
  const [hoveredStatusIndex, setHoveredStatusIndex] = useState(null);
  const [hoveredDeptIndex, setHoveredDeptIndex] = useState(null);
  const [deptSortMetric, setDeptSortMetric] = useState('TOTAL'); // 'TOTAL', 'APPROVED', 'PENDING', 'NAME'

  // Dynamic light/dark theme awareness
  let isLight = false;
  try {
    const themeCtx = useTheme();
    isLight = themeCtx?.isLight || themeCtx?.theme === 'light';
  } catch {
    isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
  }

  // Extract / standardize department options from application's existing department data source
  const availableDeptOptions = useMemo(() => {
    if (departmentOptions && departmentOptions.length > 0) {
      return departmentOptions.map((d) => (typeof d === 'string' ? { id: d, label: d } : d));
    }
    const set = new Set();
    (reportData?.departmentBreakdown || []).forEach((d) => {
      if (d.department) set.add(d.department);
    });
    (reportData?.detailedRecords || []).forEach((r) => {
      if (r.department) set.add(r.department);
    });
    if (set.size > 0) {
      return Array.from(set).sort().map((d) => ({ id: d, label: d }));
    }
    return ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'CSDS', 'AIML', 'MBA', 'MCA', 'BS&H'].map((d) => ({ id: d, label: d }));
  }, [departmentOptions, reportData]);

  // Section 3: Unified Service & Status Analytics Filters
  const [pieSelectedServices, setPieSelectedServices] = useState(PIE_SERVICE_OPTIONS.map((s) => s.id));
  const [pieSelectedDepts, setPieSelectedDepts] = useState(() => availableDeptOptions.map((d) => d.id));
  const [hoveredPieSlice, setHoveredPieSlice] = useState(null);

  // Section 2: Resource & Facility Utilization Department Multi-Select Filter
  const [facilitySelectedDepts, setFacilitySelectedDepts] = useState(() => availableDeptOptions.map((d) => d.id));

  // Sync department selections when availableDeptOptions loads
  const prevAvailableDeptsRef = useRef(availableDeptOptions);
  useEffect(() => {
    if (availableDeptOptions.length > 0 && prevAvailableDeptsRef.current.length === 0) {
      setPieSelectedDepts(availableDeptOptions.map((d) => d.id));
      setFacilitySelectedDepts(availableDeptOptions.map((d) => d.id));
    }
    prevAvailableDeptsRef.current = availableDeptOptions;
  }, [availableDeptOptions]);

  // -------------------------------------------------------------
  // FOUR PIE CHARTS DATA (Unified Service & Status Analytics)
  // -------------------------------------------------------------
  const pieChartsData = useMemo(() => {
    const records = reportData?.detailedRecords || [];
    const isServiceMatch = (rKey, targetServiceId) => {
      const s = (rKey || '').toUpperCase().trim();
      if (targetServiceId === 'SEMINAR_HALL') return s === 'SEMINAR' || s === 'SEMINAR_HALL';
      return s === targetServiceId.toUpperCase().trim();
    };

    const getStatusCategory = (r) => {
      const st = (r.status || '').toUpperCase().trim();
      if (
        st === 'APPROVED' || st === 'BOOKED' || st === 'COLLECTED' ||
        st === 'READY_FOR_COLLECTION' || st === 'AO_DIRECT_APPROVED' || st === 'COMPLETED'
      ) {
        return 'APPROVED';
      }
      if (st === 'REJECTED' || st === 'AO_REJECTED') {
        return 'REJECTED';
      }
      if (st === 'CANCELLED' || st === 'CANCELLATION_REQUESTED') {
        return 'CANCELLED';
      }
      return 'PENDING';
    };

    // Filter by selected services and selected departments
    const filteredRecords = records.filter((r) => {
      const serviceMatch = pieSelectedServices.some((srvId) => isServiceMatch(r.serviceKey, srvId));
      const deptMatch = pieSelectedDepts.includes(r.department);
      return serviceMatch && deptMatch;
    });

    const totalFiltered = filteredRecords.length;

    // Slices for each of the four statuses
    const calculateStatusData = (statusKey) => {
      const statusRecords = filteredRecords.filter((r) => getStatusCategory(r) === statusKey);
      const total = statusRecords.length;

      let aoForwardingCount = 0;
      if (statusKey === 'PENDING') {
        statusRecords.forEach((r) => {
          const srv = (r.serviceKey || '').toUpperCase().trim();
          const st = (r.status || '').toUpperCase().trim();
          const stage = (r.workflowStage || '').toUpperCase().trim();
          const aoStatus = (r.aoApprovalStatus || '').toUpperCase().trim();
          const fwd = r.forwardedTo || '';
          if (srv === 'ACCOMMODATION') {
            if (stage === 'AWAITING_AO_FORWARDING' || st === 'PENDING_AO_APPROVAL' || ((st === 'PENDING' || st === 'UNDER_REVIEW') && (aoStatus === 'PENDING' || !aoStatus) && !fwd)) {
              aoForwardingCount += 1;
            }
          }
        });
      }

      const slices = PIE_SERVICE_OPTIONS
        .filter((srv) => pieSelectedServices.includes(srv.id))
        .map((srv) => {
          const count = statusRecords.filter((r) => isServiceMatch(r.serviceKey, srv.id)).length;
          const pct = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
          return {
            serviceId: srv.id,
            label: srv.label,
            shortName: srv.shortName,
            color: srv.color,
            count,
            pct
          };
        });

      return {
        total,
        slices,
        aoCount: aoForwardingCount
      };
    };

    return {
      totalFiltered,
      approved: calculateStatusData('APPROVED'),
      pending: calculateStatusData('PENDING'),
      rejected: calculateStatusData('REJECTED'),
      cancelled: calculateStatusData('CANCELLED')
    };
  }, [reportData, pieSelectedServices, pieSelectedDepts]);

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
  // Filtered dynamically by facilitySelectedDepts (Department Multi-Select)
  // -------------------------------------------------------------
  const facilityData = useMemo(() => {
    const isAllDeptSelected = availableDeptOptions.length > 0 && facilitySelectedDepts.length === availableDeptOptions.length;
    const isNoneDeptSelected = facilitySelectedDepts.length === 0;
    const isDeptFiltered = !isAllDeptSelected && !isNoneDeptSelected;

    // 1. Seminar Hall Utilization
    const allHalls = reportData?.hallBreakdown || [];
    const isSpecificHall = selectedHall && selectedHall !== 'ALL';
    const baseHalls = isSpecificHall
      ? allHalls.filter((h) =>
          h.hallId?.equalsIgnoreCase
            ? h.hallId.equalsIgnoreCase(selectedHall)
            : (h.hallId || '').toUpperCase() === selectedHall.toUpperCase()
        )
      : allHalls;

    let displayHalls = [];
    if (isNoneDeptSelected) {
      displayHalls = [];
    } else if (!isDeptFiltered) {
      displayHalls = baseHalls;
    } else {
      const semRecords = (reportData?.detailedRecords || []).filter(
        (r) => (r.serviceKey === 'SEMINAR' || r.serviceKey === 'SEMINAR_HALL') && facilitySelectedDepts.includes(r.department)
      );

      displayHalls = baseHalls.map((h) => {
        const id = (h.hallId || '').toUpperCase();
        const matched = semRecords.filter((r) => {
          const res = (r.resource || '').toUpperCase();
          if (res.includes(id)) return true;
          if (id === 'SH-1') return res.includes('SEMINAR HALL 1') || res === 'BLOCK 3 SEMINAR HALL';
          if (id === 'SH-2') return res.includes('SEMINAR HALL 2');
          if (id === 'SH-3') return res.includes('SEMINAR HALL 3');
          if (id === 'SH-4') return res.includes('SEMINAR HALL 4');
          if (id === 'SH-5') return res.includes('TECH HUB');
          if (id === 'SH-6') return res.includes('BLOCK 2');
          return false;
        });

        let forenoon = 0;
        let afternoon = 0;
        let fullDay = 0;

        matched.forEach((r) => {
          const slot = (r.slotOrTiming || '').toUpperCase();
          if (slot.includes('FORENOON')) forenoon += 1;
          else if (slot.includes('AFTERNOON')) afternoon += 1;
          else if (slot.includes('FULL')) fullDay += 1;
          else forenoon += 1;
        });

        const bookedHours = forenoon * 3 + afternoon * 4 + fullDay * 7;

        return {
          ...h,
          total: matched.length,
          forenoonCount: forenoon,
          afternoonCount: afternoon,
          fullDayCount: fullDay,
          totalBookedHours: bookedHours
        };
      });
    }

    const maxHallHours = Math.max(...displayHalls.map((h) => h.totalBookedHours || 0), 1);
    const maxHallBookings = Math.max(...displayHalls.map((h) => h.total || 0), 1);

    // 2. Accommodation
    let accRoomsList = [];
    let totalAccGuests = 0;
    if (isNoneDeptSelected) {
      accRoomsList = [];
      totalAccGuests = 0;
    } else if (!isDeptFiltered) {
      const accRoomUsage = reportData?.accommodationMetrics?.roomUsage || {};
      accRoomsList = Object.entries(accRoomUsage)
        .map(([room, count]) => ({
          name: room,
          count
        }))
        .sort((a, b) => b.count - a.count);
      totalAccGuests = reportData?.accommodationMetrics?.totalGuests || 0;
    } else {
      const accRecords = (reportData?.detailedRecords || []).filter(
        (r) => r.serviceKey === 'ACCOMMODATION' && facilitySelectedDepts.includes(r.department)
      );
      const roomCounts = {};
      accRecords.forEach((r) => {
        const room = r.resource || 'Guest Room';
        roomCounts[room] = (roomCounts[room] || 0) + 1;
        totalAccGuests += (r.guestOrQuantityCount || 1);
      });
      accRoomsList = Object.entries(roomCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    }
    const maxAccBookings = Math.max(...accRoomsList.map((r) => r.count), 1);

    // 3. Transport
    let transList = [];
    let totalTransPassengers = 0;
    if (isNoneDeptSelected) {
      transList = [];
      totalTransPassengers = 0;
    } else if (!isDeptFiltered) {
      const transVehicleUsage = reportData?.transportMetrics?.vehicleUsage || {};
      transList = Object.entries(transVehicleUsage)
        .map(([vehicle, count]) => ({
          name: vehicle,
          count
        }))
        .sort((a, b) => b.count - a.count);
      totalTransPassengers = reportData?.transportMetrics?.totalPassengers || 0;
    } else {
      const transRecords = (reportData?.detailedRecords || []).filter(
        (r) => r.serviceKey === 'TRANSPORT' && facilitySelectedDepts.includes(r.department)
      );
      const vehicleCounts = {};
      transRecords.forEach((r) => {
        const vehicle = r.resource || 'Fleet Vehicle';
        vehicleCounts[vehicle] = (vehicleCounts[vehicle] || 0) + 1;
        totalTransPassengers += (r.guestOrQuantityCount || 1);
      });
      transList = Object.entries(vehicleCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    }
    const maxTransBookings = Math.max(...transList.map((t) => t.count), 1);

    // 4. Stationery
    let stationeryList = [];
    if (isNoneDeptSelected) {
      stationeryList = [];
    } else if (!isDeptFiltered) {
      stationeryList = (reportData?.stationeryItems || []).slice(0, 7);
    } else {
      const statRecords = (reportData?.detailedRecords || []).filter(
        (r) => r.serviceKey === 'STATIONERY' && facilitySelectedDepts.includes(r.department)
      );
      const itemMap = {};
      statRecords.forEach((r) => {
        const item = r.resource || 'Stationery Item';
        if (!itemMap[item]) {
          itemMap[item] = { name: item, totalQuantity: 0, requestCount: 0, unit: 'units' };
        }
        itemMap[item].totalQuantity += (r.guestOrQuantityCount || 1);
        itemMap[item].requestCount += 1;
      });
      stationeryList = Object.values(itemMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 7);
    }
    const maxStationeryQty = Math.max(...stationeryList.map((s) => s.totalQuantity || 0), 1);

    // 5. Snacks & Meals Headcount
    let mealList = [];
    if (isNoneDeptSelected) {
      mealList = [
        { name: 'Lunch', count: 0, color: 'bg-emerald-500', barColor: '#10B981' },
        { name: 'Dinner', count: 0, color: 'bg-blue-500', barColor: '#3B82F6' },
        { name: 'Snacks', count: 0, color: 'bg-amber-500', barColor: '#F59E0B' },
        { name: 'Breakfast', count: 0, color: 'bg-indigo-500', barColor: '#6366F1' },
        { name: 'Tea / Coffee', count: 0, color: 'bg-rose-500', barColor: '#F43F5E' }
      ];
    } else if (!isDeptFiltered) {
      const meals = reportData?.mealsHeadcount || {};
      mealList = [
        { name: 'Lunch', count: meals.lunch || 0, color: 'bg-emerald-500', barColor: '#10B981' },
        { name: 'Dinner', count: meals.dinner || 0, color: 'bg-blue-500', barColor: '#3B82F6' },
        { name: 'Snacks', count: meals.snacks || 0, color: 'bg-amber-500', barColor: '#F59E0B' },
        { name: 'Breakfast', count: meals.breakfast || 0, color: 'bg-indigo-500', barColor: '#6366F1' },
        { name: 'Tea / Coffee', count: meals.teaCoffee || 0, color: 'bg-rose-500', barColor: '#F43F5E' }
      ];
    } else {
      const mealRecords = (reportData?.detailedRecords || []).filter(
        (r) => r.serviceKey === 'MEALS' && facilitySelectedDepts.includes(r.department)
      );
      let lunch = 0, dinner = 0, snacks = 0, breakfast = 0, teaCoffee = 0;
      mealRecords.forEach((r) => {
        const text = `${r.resource || ''} ${r.details || ''} ${r.purpose || ''}`.toUpperCase();
        const count = r.guestOrQuantityCount || 1;
        if (text.includes('LUNCH')) lunch += count;
        if (text.includes('DINNER')) dinner += count;
        if (text.includes('SNACK')) snacks += count;
        if (text.includes('BREAKFAST')) breakfast += count;
        if (text.includes('TEA') || text.includes('COFFEE')) teaCoffee += count;
      });
      mealList = [
        { name: 'Lunch', count: lunch, color: 'bg-emerald-500', barColor: '#10B981' },
        { name: 'Dinner', count: dinner, color: 'bg-blue-500', barColor: '#3B82F6' },
        { name: 'Snacks', count: snacks, color: 'bg-amber-500', barColor: '#F59E0B' },
        { name: 'Breakfast', count: breakfast, color: 'bg-indigo-500', barColor: '#6366F1' },
        { name: 'Tea / Coffee', count: teaCoffee, color: 'bg-rose-500', barColor: '#F43F5E' }
      ];
    }
    const maxMealCount = Math.max(...mealList.map((m) => m.count), 1);

    return {
      halls: displayHalls,
      maxHallHours,
      maxHallBookings,
      isSpecificHall,
      accommodation: accRoomsList,
      totalAccGuests,
      maxAccBookings,
      transport: transList,
      totalTransPassengers,
      maxTransBookings,
      stationery: stationeryList,
      maxStationeryQty,
      meals: mealList,
      maxMealCount
    };
  }, [reportData, selectedHall, facilitySelectedDepts, availableDeptOptions]);

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
    <div className="space-y-8 pt-2">
      {/* Analytics Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
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

      {/* ========================================================= */}
      {/* 1. UNIFIED SERVICE & STATUS ANALYTICS (FOUR BAR CHARTS)   */}
      {/* ========================================================= */}
      <div className={`status-bar-chart-section rounded-2xl p-6 shadow-xl space-y-6 border transition-colors ${
        isLight ? 'bg-white border-slate-200 shadow-slate-100' : 'bg-slate-900/90 border-slate-800'
      }`}>
        {/* Header: Section Title + Multi-Select Filters */}
        <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b ${
          isLight ? 'border-slate-200' : 'border-slate-800/80'
        }`}>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Unified Service & Status Analytics
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Comparative vertical bar distributions of Approved, Pending, Rejected, and Cancelled requisitions across college services
            </p>
          </div>

          {/* Filters: Service Multi-Select, Department Multi-Select & Filtered Total */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Service Multi-Select */}
            <div className="w-48 sm:w-56">
              <MultiSelectDropdown
                label="Filter Services"
                options={PIE_SERVICE_OPTIONS}
                selectedValues={pieSelectedServices}
                onChange={setPieSelectedServices}
                placeholder="Select Services..."
                allSelectedLabel="All Services"
                icon={Layers}
                className="text-xs"
              />
            </div>

            {/* Department Multi-Select */}
            <div className="w-48 sm:w-56">
              <MultiSelectDropdown
                label="Filter Departments"
                options={availableDeptOptions}
                selectedValues={pieSelectedDepts}
                onChange={setPieSelectedDepts}
                placeholder="Select Depts..."
                allSelectedLabel="All Departments"
                icon={Building}
                searchable={true}
                className="text-xs"
              />
            </div>

            {/* Total Filtered Records Indicator */}
            <div className="flex flex-col justify-end">
              <span className="text-[11px] font-semibold text-slate-400 mb-1 opacity-0 hidden sm:block">Total</span>
              <span className={`text-xs font-mono font-semibold px-3 py-2 rounded-xl border whitespace-nowrap flex items-center gap-1.5 shadow-sm ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}>
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Filtered: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{pieChartsData.totalFiltered}</strong> Reqs
              </span>
            </div>
          </div>
        </div>

        {/* Single Shared Hint Banner for all Status Chart Cards */}
        <div className={`status-bar-chart-hint flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-850/60 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Hover over any vertical bar or service item below for exact request counts and percentages.</span>
          </div>
          <div className={`hidden sm:flex items-center gap-1.5 text-[11px] font-mono shrink-0 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>{pieSelectedServices.length} Services Compared</span>
          </div>
        </div>

        {/* Four Status Vertical Bar Charts Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* 1. Approved Requests Vertical Bar Chart */}
          <StatusBarChartCard
            title="Approved Requests"
            icon={CheckCircle2}
            statusKey="APPROVED"
            accentColor={isLight ? 'text-emerald-700' : 'text-emerald-400'}
            accentBg={isLight ? 'bg-emerald-50' : 'bg-emerald-500/10'}
            accentBorder={isLight ? 'border-emerald-200' : 'border-emerald-500/20'}
            barColor={isLight ? '#059669' : '#10B981'}
            barHoverColor={isLight ? '#10B981' : '#34D399'}
            total={pieChartsData.approved.total}
            slices={pieChartsData.approved.slices}
            hoveredService={hoveredPieSlice}
            setHoveredService={setHoveredPieSlice}
            isLight={isLight}
          />

          {/* 2. Pending Requests Vertical Bar Chart (includes AO Admin Forwarding count) */}
          <StatusBarChartCard
            title="Pending Requests"
            icon={Clock}
            statusKey="PENDING"
            accentColor={isLight ? 'text-amber-800' : 'text-amber-400'}
            accentBg={isLight ? 'bg-amber-50' : 'bg-amber-500/10'}
            accentBorder={isLight ? 'border-amber-200' : 'border-amber-500/20'}
            barColor={isLight ? '#D97706' : '#F59E0B'}
            barHoverColor={isLight ? '#F59E0B' : '#FBBF24'}
            total={pieChartsData.pending.total}
            slices={pieChartsData.pending.slices}
            aoCount={pieChartsData.pending.aoCount}
            hoveredService={hoveredPieSlice}
            setHoveredService={setHoveredPieSlice}
            isLight={isLight}
          />

          {/* 3. Rejected Requests Vertical Bar Chart */}
          <StatusBarChartCard
            title="Rejected Requests"
            icon={XCircle}
            statusKey="REJECTED"
            accentColor={isLight ? 'text-rose-700' : 'text-rose-400'}
            accentBg={isLight ? 'bg-rose-50' : 'bg-rose-500/10'}
            accentBorder={isLight ? 'border-rose-200' : 'border-rose-500/20'}
            barColor={isLight ? '#E11D48' : '#F43F5E'}
            barHoverColor={isLight ? '#F43F5E' : '#FB7185'}
            total={pieChartsData.rejected.total}
            slices={pieChartsData.rejected.slices}
            hoveredService={hoveredPieSlice}
            setHoveredService={setHoveredPieSlice}
            isLight={isLight}
          />

          {/* 4. Cancelled Requests Vertical Bar Chart */}
          <StatusBarChartCard
            title="Cancelled Requests"
            icon={AlertCircle}
            statusKey="CANCELLED"
            accentColor={isLight ? 'text-slate-700' : 'text-slate-400'}
            accentBg={isLight ? 'bg-slate-100' : 'bg-slate-800/40'}
            accentBorder={isLight ? 'border-slate-300' : 'border-slate-700/60'}
            barColor={isLight ? '#475569' : '#64748B'}
            barHoverColor={isLight ? '#64748B' : '#94A3B8'}
            total={pieChartsData.cancelled.total}
            slices={pieChartsData.cancelled.slices}
            hoveredService={hoveredPieSlice}
            setHoveredService={setHoveredPieSlice}
            isLight={isLight}
          />
        </div>

        {/* Section 1 Footer */}
        <div className="pt-3.5 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Approval Rate across filtered criteria:{' '}
            <strong className="text-emerald-400 font-mono">
              {pieChartsData.totalFiltered > 0
                ? ((pieChartsData.approved.total / pieChartsData.totalFiltered) * 100).toFixed(1)
                : '0.0'}
              %
            </strong>
          </span>
          <span className="text-slate-400 font-mono text-[10px]">
            Synchronized with active global & service filters
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. RESOURCE & FACILITY UTILIZATION                        */}
      {/* ========================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <div>
          {/* Header: Title + Department Filter + Sub-Service Tabs */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                Resource & Facility Utilization
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Capacity metrics, booking volume, and resource demand filtered by department
              </p>
            </div>

            {/* Controls: Department Multi-Select & Sub-Service Tabs */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Department Multi-Select Filter */}
              <div className="w-48 sm:w-56">
                <MultiSelectDropdown
                  label="Filter by Department"
                  options={availableDeptOptions}
                  selectedValues={facilitySelectedDepts}
                  onChange={setFacilitySelectedDepts}
                  placeholder="Select Depts..."
                  allSelectedLabel="All Departments"
                  icon={Building}
                  searchable={true}
                  className="text-xs"
                />
              </div>

              {/* Sub-Service Tab Selector when Multiple Services are Active */}
              {activeServicesList.length > 1 && (
                <div className="flex flex-col justify-end">
                  <span className="text-[11px] font-semibold text-slate-400 mb-1">Active Facility</span>
                  <div className="flex items-center bg-slate-850 rounded-xl p-1 border border-slate-800 overflow-x-auto max-w-full">
                    {activeServicesList.map((srv) => {
                      const IconComp = srv.icon;
                      const isActive = currentFacilityTab === srv.id;
                      return (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => setActiveFacilityTab(srv.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition whitespace-nowrap ${
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
                </div>
              )}
            </div>
          </div>

          {/* TAB CONTENT: SEMINAR HALLS */}
          {currentFacilityTab === 'SEMINAR_HALL' && (
            <div className="space-y-4 pt-1">
              {facilityData.isSpecificHall && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
                  <span>
                    Filtering resource: <strong>{selectedHall}</strong>
                  </span>
                  <span className="font-mono text-white">Specific Venue View</span>
                </div>
              )}

              {facilityData.halls.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {facilityData.halls.map((hall) => {
                    const hours = hall.totalBookedHours || 0;
                    const pct = Math.min(
                      100,
                      Math.round((hours / Math.max(facilityData.maxHallHours, 1)) * 100)
                    );

                    return (
                      <div key={hall.hallId} className="space-y-2 p-3.5 rounded-xl bg-slate-850/50 border border-slate-800/70 hover:border-slate-700/80 transition shadow-sm">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <span className="text-slate-200 font-medium flex items-center gap-1.5 flex-wrap">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            {hall.hallName}
                            <span className="text-[10px] text-slate-500 font-mono">({hall.hallId})</span>
                            <span className="text-[10px] text-slate-400 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/60 font-normal" title="Physical seating capacity (Facility-level information)">
                              Cap: {hall.capacity} (Facility-level)
                            </span>
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            <strong className="text-white">{hours} hrs</strong> ({hall.total} bookings)
                          </span>
                        </div>
                        {/* Progress Bar with Slot Distribution */}
                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            style={{ width: `${(hall.forenoonCount / Math.max(hall.total, 1)) * pct}%` }}
                            className="bg-blue-500 h-full"
                            title={`Forenoon (3h): ${hall.forenoonCount}`}
                          />
                          <div
                            style={{ width: `${(hall.afternoonCount / Math.max(hall.total, 1)) * pct}%` }}
                            className="bg-indigo-500 h-full"
                            title={`Afternoon (4h): ${hall.afternoonCount}`}
                          />
                          <div
                            style={{ width: `${(hall.fullDayCount / Math.max(hall.total, 1)) * pct}%` }}
                            className="bg-emerald-500 h-full"
                            title={`Full Day (7h): ${hall.fullDayCount}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No seminar hall bookings found for selected department(s) or criteria.
                </div>
              )}

              {/* Slot Color Legend */}
              <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-400 pt-3 border-t border-slate-800/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> Forenoon (3h)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span> Afternoon (4h)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Full Day (7h)
                </span>
                <span className="text-slate-500 text-[11px]">| Seating Capacity is Facility-level information</span>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ACCOMMODATION */}
          {currentFacilityTab === 'ACCOMMODATION' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/60">
                <span>Hostel / Room Allocation</span>
                <span>
                  Total Guests across selected departments:{' '}
                  <strong className="text-white font-mono">
                    {facilityData.totalAccGuests}
                  </strong>
                </span>
              </div>

              {facilityData.accommodation.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {facilityData.accommodation.map((room) => {
                    const pct = Math.round((room.count / facilityData.maxAccBookings) * 100);
                    return (
                      <div key={room.name} className="space-y-1.5 p-3 rounded-xl bg-slate-850/50 border border-slate-800/70">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium truncate">{room.name}</span>
                          <span className="font-mono text-emerald-400 font-bold text-xs shrink-0">{room.count} stays</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No guest house bookings found for selected department(s).
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: TRANSPORT */}
          {currentFacilityTab === 'TRANSPORT' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/60">
                <span>Fleet Vehicle Deployment</span>
                <span>
                  Total Passengers across selected departments:{' '}
                  <strong className="text-white font-mono">
                    {facilityData.totalTransPassengers}
                  </strong>
                </span>
              </div>

              {facilityData.transport.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {facilityData.transport.map((v) => {
                    const pct = Math.round((v.count / facilityData.maxTransBookings) * 100);
                    return (
                      <div key={v.name} className="space-y-1.5 p-3 rounded-xl bg-slate-850/50 border border-slate-800/70">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium truncate">{v.name}</span>
                          <span className="font-mono text-amber-400 font-bold text-xs shrink-0">{v.count} trips</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No fleet journeys recorded for selected department(s).
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: STATIONERY */}
          {currentFacilityTab === 'STATIONERY' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/60">
                <span>Top Requested Consumables</span>
                <span>
                  Items Tracked: <strong className="text-white font-mono">{facilityData.stationery.length}</strong>
                </span>
              </div>

              {facilityData.stationery.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {facilityData.stationery.map((item) => {
                    const pct = Math.round((item.totalQuantity / facilityData.maxStationeryQty) * 100);
                    return (
                      <div key={item.name} className="space-y-1.5 p-3 rounded-xl bg-slate-850/50 border border-slate-800/70">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium truncate">{item.name}</span>
                          <span className="font-mono text-indigo-400 font-bold text-xs shrink-0">
                            {item.totalQuantity} {item.unit}{' '}
                            <span className="text-slate-500 font-normal">({item.requestCount} reqs)</span>
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
                <div className="py-12 text-center text-slate-500 text-xs">
                  No stationery requisitions found for selected department(s).
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: SNACKS & MEALS */}
          {currentFacilityTab === 'MEALS' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/60">
                <span>Catering Headcount Breakdown</span>
                <span>Approved Servings for Selected Department(s)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {facilityData.meals.map((meal) => {
                  const pct = Math.round((meal.count / facilityData.maxMealCount) * 100);
                  return (
                    <div key={meal.name} className="space-y-1.5 p-3 rounded-xl bg-slate-850/50 border border-slate-800/70">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{meal.name}</span>
                        <span className="font-mono text-white font-bold text-xs">{meal.count}</span>
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
        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 mt-4">
          <span>
            Active Resource:{' '}
            <strong className="text-slate-300 font-semibold">{currentFacilityTab.replace('_', ' ')}</strong>
          </span>
          <span>Department-filtered capacity metrics updated</span>
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

          {/* Controls: Sorting Controls (Top Legend removed per requirement) */}
          <div className="flex flex-wrap items-center gap-3">

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
