import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Send,
  Wrench,
  ShieldCheck,
  MapPin,
  User,
  Users,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { seminarInspectionApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { downloadOrOpenPdf } from '../../utils/fileDownloader';
import SeminarInspectionModal, { canPerformPostEventInspection } from '../../components/seminar/SeminarInspectionModal';

export default function SeminarInspectionsTab({ halls = [], assignedHallIds = [], isSuperAdmin = false }) {
  const { addToast } = useNotifications();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sub Navigation: 'UPCOMING_PRE' | 'PENDING_POST' | 'COMPLETED'
  const [subTab, setSubTab] = useState('UPCOMING_PRE');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHall, setSelectedHall] = useState('ALL');

  // Modal State
  const [activeModal, setActiveModal] = useState(false);
  const [modalInspection, setModalInspection] = useState(null);
  const [modalMode, setModalMode] = useState('PRE_EVENT'); // 'PRE_EVENT' | 'POST_EVENT' | 'VIEW'
  const [downloadingId, setDownloadingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const fetchInspections = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await seminarInspectionApi.getInspections();
      const list = Array.isArray(res.data) ? res.data : [];
      setInspections(list);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to fetch inspections', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  // Filtered lists
  const filteredList = useMemo(() => {
    return inspections.filter((insp) => {
      // Sub-tab partition
      if (subTab === 'UPCOMING_PRE') {
        if (insp.preEventStatus === 'COMPLETED' || insp.overallStatus === 'CANCELLED') return false;
      } else if (subTab === 'PENDING_POST') {
        if (insp.preEventStatus !== 'COMPLETED' || insp.postEventStatus === 'COMPLETED' || insp.overallStatus === 'CANCELLED') return false;
      } else if (subTab === 'COMPLETED') {
        if (insp.overallStatus !== 'COMPLETED') return false;
      }

      // Hall filter
      if (selectedHall !== 'ALL' && insp.hallId !== selectedHall) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const eventTitle = (insp.eventTitle || '').toLowerCase();
        const bookingId = (insp.bookingId || '').toLowerCase();
        const dept = (insp.department || '').toLowerCase();
        const hall = (insp.hallName || '').toLowerCase();
        const date = (insp.occurrenceDate || '').toLowerCase();
        if (!eventTitle.includes(q) && !bookingId.includes(q) && !dept.includes(q) && !hall.includes(q) && !date.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [inspections, subTab, selectedHall, searchQuery]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const upcomingPre = inspections.filter((i) => i.preEventStatus !== 'COMPLETED' && i.overallStatus !== 'CANCELLED').length;
    const pendingPost = inspections.filter((i) => i.preEventStatus === 'COMPLETED' && i.postEventStatus !== 'COMPLETED' && i.overallStatus !== 'CANCELLED').length;
    const completed = inspections.filter((i) => i.overallStatus === 'COMPLETED').length;
    return { upcomingPre, pendingPost, completed };
  }, [inspections]);

  const handleOpenInspection = (insp, mode) => {
    setModalInspection(insp);
    setModalMode(mode);
    setActiveModal(true);
  };

  const handleDownloadPdf = async (insp) => {
    try {
      setDownloadingId(insp.id);
      const res = await seminarInspectionApi.downloadPdf(insp.id);
      const filename = `NEC_Inspection_Report_${insp.bookingId}_${insp.occurrenceDate}.pdf`;
      await downloadOrOpenPdf(new Blob([res.data], { type: 'application/pdf' }), filename);
      addToast('Event inspection report downloaded successfully', 'success');
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to download inspection PDF', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRetryDistribution = async (insp) => {
    try {
      setRetryingId(insp.id);
      await seminarInspectionApi.retryDistribution(insp.id);
      addToast('Report distribution re-sent to Coordinator, Technician, and Department!', 'success');
      fetchInspections();
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to retry distribution', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar & Metrics */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSubTab('UPCOMING_PRE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              subTab === 'UPCOMING_PRE'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Wrench className="w-4 h-4 text-cyan-300" />
            <span>Upcoming Pre-Event</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/80 text-cyan-200 font-mono">
              {tabCounts.upcomingPre}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('PENDING_POST')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              subTab === 'PENDING_POST'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Pending Post-Event</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/80 text-amber-200 font-mono">
              {tabCounts.pendingPost}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('COMPLETED')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              subTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Completed & Reports</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/80 text-emerald-200 font-mono">
              {tabCounts.completed}
            </span>
          </button>
        </div>

        <button
          onClick={() => fetchInspections(true)}
          disabled={refreshing}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event title, booking ID, venue, or department..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedHall}
            onChange={(e) => setSelectedHall(e.target.value)}
            className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Seminar Halls</option>
            {halls.map((h) => {
              const id = h.hallId || h.id;
              return (
                <option key={id} value={id}>
                  {h.name || id}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Inspection Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
          <span>Loading seminar event inspections...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center">
          <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No inspections in this view</p>
          <p className="text-xs text-slate-500 mt-1">
            {subTab === 'UPCOMING_PRE'
              ? 'No bookings currently awaiting pre-event inspection.'
              : subTab === 'PENDING_POST'
              ? 'No events currently awaiting post-event inspection.'
              : 'No completed inspection reports recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredList.map((insp) => {
            const hasIssues =
              insp.preEventInspection?.issuesIdentified ||
              insp.postEventInspection?.issuesIdentified ||
              insp.finalSummary?.damageIdentified;

            const timeCheck = canPerformPostEventInspection(insp);

            return (
              <div
                key={insp.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 transition-all shadow-lg space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                        {insp.bookingId}
                      </span>
                      {insp.occurrenceIndex && (
                        <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-400">
                          Session #{insp.occurrenceIndex}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-300">
                        {insp.department}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5 truncate">
                      {insp.eventTitle}
                    </h3>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      insp.preEventStatus === 'COMPLETED'
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                        : 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      Pre: {insp.preEventStatus}
                    </span>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      insp.postEventStatus === 'COMPLETED'
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                    }`}>
                      Post: {insp.postEventStatus}
                    </span>

                    {hasIssues && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-950/70 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Issues Detected
                      </span>
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">{insp.hallName} ({insp.hallLocation})</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{insp.occurrenceDate} • <strong className="text-amber-200">{insp.slot}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Coord: {insp.coordinatorName || 'Assigned'}</span>
                  </div>
                </div>

                {/* Time warning for post-event if event has not concluded yet */}
                {subTab === 'PENDING_POST' && !timeCheck.allowed && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{timeCheck.reason}</span>
                  </div>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-500">
                    {insp.reportMetadata?.reportDistributed && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Official report delivered via email & in-app alerts
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Pre-Event Button */}
                    {insp.preEventStatus !== 'COMPLETED' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenInspection(insp, 'PRE_EVENT')}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 transition active:scale-95"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Start Pre-Event Inspection</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenInspection(insp, 'VIEW')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>View Pre-Event</span>
                      </button>
                    )}

                    {/* Post-Event Button */}
                    {insp.preEventStatus === 'COMPLETED' && insp.postEventStatus !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => handleOpenInspection(insp, 'POST_EVENT')}
                        disabled={!timeCheck.allowed}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition active:scale-95 disabled:opacity-50"
                        title={timeCheck.allowed ? 'Conduct post-event inspection' : timeCheck.reason}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Start Post-Event Inspection</span>
                      </button>
                    )}

                    {/* Completed PDF & View Details */}
                    {insp.overallStatus === 'COMPLETED' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenInspection(insp, 'VIEW')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Inspection Audit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(insp)}
                          disabled={downloadingId === insp.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingId === insp.id ? 'Exporting...' : 'Download Report (PDF)'}</span>
                        </button>

                        {/* Retry distribution */}
                        <button
                          type="button"
                          onClick={() => handleRetryDistribution(insp)}
                          disabled={retryingId === insp.id}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                          title="Resend Inspection Report Email & Notifications"
                        >
                          <Send className={`w-3.5 h-3.5 ${retryingId === insp.id ? 'animate-pulse text-cyan-400' : ''}`} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {activeModal && modalInspection && (
        <SeminarInspectionModal
          isOpen={activeModal}
          onClose={() => {
            setActiveModal(false);
            setModalInspection(null);
          }}
          inspection={modalInspection}
          mode={modalMode}
          onSuccess={() => fetchInspections()}
        />
      )}
    </div>
  );
}

