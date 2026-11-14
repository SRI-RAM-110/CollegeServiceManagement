import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  FileText,
} from 'lucide-react';
import { seminarInspectionApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { downloadOrOpenPdf } from '../../utils/fileDownloader';
import SeminarInspectionModal from './SeminarInspectionModal';

export default function SeminarInspectionReportsSection({ halls = [], isCoordinatorOnly = false, assignedHallIds = [] }) {
  const { addToast } = useNotifications();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [hallFilter, setHallFilter] = useState('ALL');

  // Modal
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [activeModal, setActiveModal] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchInspections = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await seminarInspectionApi.getInspections();
      const list = Array.isArray(res.data) ? res.data : [];
      setInspections(list);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to load inspection records', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const filteredInspections = useMemo(() => {
    return inspections.filter((insp) => {
      // Coordinator hall filtering
      if (isCoordinatorOnly && assignedHallIds.length > 0) {
        if (!assignedHallIds.includes(insp.hallId)) return false;
      }

      if (hallFilter !== 'ALL' && insp.hallId !== hallFilter) return false;

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'COMPLETED' && insp.overallStatus !== 'COMPLETED') return false;
        if (statusFilter === 'ISSUES_DETECTED') {
          const hasIssues =
            insp.preEventInspection?.issuesIdentified ||
            insp.postEventInspection?.issuesIdentified ||
            insp.finalSummary?.damageIdentified;
          if (!hasIssues) return false;
        }
        if (statusFilter === 'IN_PROGRESS' && insp.overallStatus === 'COMPLETED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (insp.eventTitle || '').toLowerCase();
        const bId = (insp.bookingId || '').toLowerCase();
        const hall = (insp.hallName || '').toLowerCase();
        const dept = (insp.department || '').toLowerCase();
        if (!title.includes(q) && !bId.includes(q) && !hall.includes(q) && !dept.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [inspections, isCoordinatorOnly, assignedHallIds, hallFilter, statusFilter, searchQuery]);

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

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="card-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Event Inspection Reports & Audits</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative Pre-Event and Post-Event equipment condition logs, damage reports, and certified PDF inspection documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchInspections(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by event title, booking ID, department, or venue..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/70 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={hallFilter}
              onChange={(e) => setHallFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Halls</option>
              {halls.map((h) => {
                const id = h.hallId || h.id;
                return <option key={id} value={id}>{h.name || id}</option>;
              })}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed Reports</option>
              <option value="ISSUES_DETECTED">Issues / Damages Detected</option>
              <option value="IN_PROGRESS">Inspections In-Progress</option>
            </select>
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400 mb-2" />
            <span>Loading inspection records...</span>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No inspection records found for the selected criteria.
          </div>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="py-3 px-3">Booking / Event</th>
                  <th className="py-3 px-3">Hall & Location</th>
                  <th className="py-3 px-3">Date & Slot</th>
                  <th className="py-3 px-3">Pre-Event</th>
                  <th className="py-3 px-3">Post-Event</th>
                  <th className="py-3 px-3">Overall Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((insp) => {
                  const hasIssues =
                    insp.preEventInspection?.issuesIdentified ||
                    insp.postEventInspection?.issuesIdentified ||
                    insp.finalSummary?.damageIdentified;

                  return (
                    <tr key={insp.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3">
                        <span className="font-mono text-cyan-300 font-bold block">{insp.bookingId}</span>
                        <span className="text-white font-medium block truncate max-w-[200px]">{insp.eventTitle}</span>
                        <span className="text-[11px] text-slate-400 block">{insp.department}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-white font-medium block">{insp.hallName}</span>
                        <span className="text-[11px] text-slate-400 block">{insp.hallLocation}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-200 block font-medium">{insp.occurrenceDate}</span>
                        <span className="text-[11px] text-amber-300 block">{insp.slot}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          insp.preEventStatus === 'COMPLETED'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {insp.preEventStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          insp.postEventStatus === 'COMPLETED'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {insp.postEventStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            insp.overallStatus === 'COMPLETED'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {insp.overallStatus}
                          </span>
                          {hasIssues && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/30">
                              Issues Logged
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInspection(insp);
                              setActiveModal(true);
                            }}
                            className="btn btn-outline table-action-btn flex items-center gap-1"
                            title="View Checklist Details & Sign-offs"
                          >
                            <Eye size={12} />
                            <span>Audit</span>
                          </button>

                          {insp.overallStatus === 'COMPLETED' && (
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(insp)}
                              disabled={downloadingId === insp.id}
                              className="btn btn-primary table-action-btn flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 border-emerald-500"
                              title="Download Official Inspection Report PDF"
                            >
                              <Download size={12} />
                              <span>{downloadingId === insp.id ? '...' : 'PDF'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {activeModal && selectedInspection && (
        <SeminarInspectionModal
          isOpen={activeModal}
          onClose={() => {
            setActiveModal(false);
            setSelectedInspection(null);
          }}
          inspection={selectedInspection}
          mode="VIEW"
        />
      )}
    </div>
  );
}

