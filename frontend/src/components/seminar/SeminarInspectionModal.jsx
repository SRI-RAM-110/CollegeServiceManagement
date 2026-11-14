import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Wrench,
  Camera,
  FileText,
  Clock,
  ShieldCheck,
  Calendar,
  Building2,
  User,
  Sparkles,
  Download,
  AlertOctagon,
  Layers,
} from 'lucide-react';
import { seminarInspectionApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { downloadOrOpenPdf } from '../../utils/fileDownloader';

const CONDITION_OPTIONS = [
  { value: 'WORKING', label: 'Satisfactory / Working', short: 'Working', color: 'emerald', icon: CheckCircle2 },
  { value: 'NOT_WORKING', label: 'Defective / Not Working', short: 'Defective', color: 'rose', icon: XCircle },
  { value: 'NOT_AVAILABLE', label: 'Not Available', short: 'Missing', color: 'amber', icon: AlertTriangle },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', short: 'N/A', color: 'slate', icon: HelpCircle },
];

export const canPerformPostEventInspection = (inspection) => {
  if (!inspection) return { allowed: false, reason: 'No inspection record provided.' };
  if (inspection.preEventStatus !== 'COMPLETED') {
    return { allowed: false, reason: 'Pre-event inspection must be completed before performing post-event inspection.' };
  }

  const occDate = inspection.occurrenceDate?.trim();
  if (!occDate) return { allowed: true };

  // Current time in Asia/Kolkata
  const now = new Date();
  const kolkataDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const kolkataTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);

  if (kolkataDate < occDate) {
    return {
      allowed: false,
      reason: `Event is scheduled for ${occDate}. Post-event inspection cannot be conducted prior to the event date.`,
    };
  }

  let sessionEndTime = '16:00';
  const slotUpper = (inspection.slot || '').toUpperCase();
  if (slotUpper.includes('FORENOON')) {
    sessionEndTime = '12:00';
  } else if (slotUpper.includes('AFTERNOON') || slotUpper.includes('FULL_DAY')) {
    sessionEndTime = '16:00';
  }

  if (kolkataDate === occDate && kolkataTime < sessionEndTime) {
    return {
      allowed: false,
      reason: `Event is currently underway. Post-event inspection unlocks after scheduled conclusion at ${sessionEndTime} IST (Current time: ${kolkataTime} IST).`,
      sessionEndTime,
      currentTime: kolkataTime,
    };
  }

  return { allowed: true };
};

export default function SeminarInspectionModal({
  isOpen,
  onClose,
  inspection,
  mode = 'PRE_EVENT', // 'PRE_EVENT' | 'POST_EVENT' | 'VIEW'
  onSuccess,
}) {
  const { addToast } = useNotifications();
  const [items, setItems] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [maintenanceRequestId, setMaintenanceRequestId] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoUrls, setPhotoUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Post-Event specific summary fields
  const [eventConducted, setEventConducted] = useState(true);
  const [damageIdentified, setDamageIdentified] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');

  const isViewMode = mode === 'VIEW';
  const isPostEvent = mode === 'POST_EVENT';

  // Initialize checklist items when modal opens
  useEffect(() => {
    if (!isOpen || !inspection) return;

    let sourceItems = [];
    if (mode === 'PRE_EVENT') {
      sourceItems = inspection.preEventInspection?.items || [];
      setGeneralNotes(inspection.preEventInspection?.generalNotes || '');
      setPhotoUrls(inspection.preEventInspection?.photoUrls || []);
      setMaintenanceRequestId(inspection.preEventInspection?.maintenanceRequestId || '');
    } else if (mode === 'POST_EVENT') {
      sourceItems = inspection.postEventInspection?.items || [];
      setGeneralNotes(inspection.postEventInspection?.generalNotes || '');
      setPhotoUrls(inspection.postEventInspection?.photoUrls || []);
      setMaintenanceRequestId(inspection.postEventInspection?.maintenanceRequestId || '');
      setEventConducted(inspection.finalSummary?.eventConducted ?? true);
      setDamageIdentified(inspection.finalSummary?.damageIdentified ?? false);
      setDamageDescription(inspection.finalSummary?.damageDescription || '');
    } else {
      // VIEW mode: combine or display both
      sourceItems = inspection.preEventInspection?.items || [];
      setGeneralNotes(inspection.finalSummary?.handoverNotes || inspection.postEventInspection?.generalNotes || '');
      setPhotoUrls([
        ...(inspection.preEventInspection?.photoUrls || []),
        ...(inspection.postEventInspection?.photoUrls || []),
      ]);
    }

    // Deep clone items so user can edit locally
    setItems(
      sourceItems.map((it) => ({
        ...it,
        condition: it.condition || 'WORKING',
        remarks: it.remarks || '',
        maintenanceRequired: Boolean(it.maintenanceRequired),
      }))
    );
  }, [isOpen, inspection, mode]);

  if (!isOpen || !inspection) return null;

  // Group items by category
  const categoriesMap = items.reduce((acc, it) => {
    const cat = it.category || 'General Checklist';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(it);
    return acc;
  }, {});

  const handleConditionChange = (itemKey, newCondition) => {
    if (isViewMode) return;
    setItems((prev) =>
      prev.map((it) => {
        const key = it.itemKey || it.itemName;
        if (key === itemKey) {
          const maintenanceReq = newCondition === 'NOT_WORKING' ? it.maintenanceRequired : false;
          return { ...it, condition: newCondition, maintenanceRequired: maintenanceReq };
        }
        return it;
      })
    );
  };

  const handleRemarkChange = (itemKey, remarks) => {
    if (isViewMode) return;
    setItems((prev) =>
      prev.map((it) => {
        const key = it.itemKey || it.itemName;
        if (key === itemKey) {
          return { ...it, remarks };
        }
        return it;
      })
    );
  };

  const handleMaintenanceToggle = (itemKey) => {
    if (isViewMode) return;
    setItems((prev) =>
      prev.map((it) => {
        const key = it.itemKey || it.itemName;
        if (key === itemKey) {
          return { ...it, maintenanceRequired: !it.maintenanceRequired };
        }
        return it;
      })
    );
  };

  const handleSetAllWorking = () => {
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        condition: 'WORKING',
        maintenanceRequired: false,
      }))
    );
    addToast('All checklist items set to Satisfactory / Working', 'info');
  };

  const handleAddPhoto = () => {
    if (!photoUrlInput.trim()) return;
    setPhotoUrls((prev) => [...prev, photoUrlInput.trim()]);
    setPhotoUrlInput('');
  };

  const handleRemovePhoto = (idx) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const timeCheck = isPostEvent ? canPerformPostEventInspection(inspection) : { allowed: true };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    if (isPostEvent && !timeCheck.allowed) {
      addToast(timeCheck.reason, 'error');
      return;
    }

    // Validation: Any item marked NOT_WORKING or NOT_AVAILABLE must have remarks
    const missingRemarks = items.filter(
      (it) =>
        (it.condition === 'NOT_WORKING' || it.condition === 'NOT_AVAILABLE') &&
        (!it.remarks || !it.remarks.trim())
    );

    if (missingRemarks.length > 0) {
      addToast(
        `Remarks are mandatory for ${missingRemarks.length} defective or unavailable item(s). Please specify details.`,
        'error'
      );
      return;
    }

    if (isPostEvent && damageIdentified && (!damageDescription || !damageDescription.trim())) {
      addToast('Please provide a description of the damages identified during event conclusion.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        items,
        generalNotes: generalNotes.trim() || null,
        photoUrls: photoUrls.length > 0 ? photoUrls : null,
        maintenanceRequestId: maintenanceRequestId.trim() || null,
        eventConducted,
        damageIdentified,
        damageDescription: damageIdentified ? damageDescription.trim() : null,
        remarks: generalNotes.trim() || null,
      };

      if (mode === 'PRE_EVENT') {
        await seminarInspectionApi.submitPreEvent(inspection.id, payload);
        addToast('Pre-event inspection successfully completed & recorded!', 'success');
      } else {
        await seminarInspectionApi.submitPostEvent(inspection.id, payload);
        addToast('Post-event inspection completed! Official PDF report has been generated & distributed to Coordinator, Technician, and Department.', 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to submit inspection', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await seminarInspectionApi.downloadPdf(inspection.id);
      const filename = `NEC_Inspection_Report_${inspection.bookingId}_${inspection.occurrenceDate}.pdf`;
      await downloadOrOpenPdf(new Blob([res.data], { type: 'application/pdf' }), filename);
      addToast('Inspection report downloaded successfully', 'success');
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to download inspection PDF', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const defectCount = items.filter((i) => i.condition === 'NOT_WORKING').length;
  const missingCount = items.filter((i) => i.condition === 'NOT_AVAILABLE').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              isPostEvent ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
              isViewMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
              'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
            }`}>
              {isPostEvent ? <ShieldCheck className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2 truncate">
                <span>{isViewMode ? 'Event Inspection Audit' : isPostEvent ? 'Post-Event Hall & Equipment Inspection' : 'Pre-Event Hall & Equipment Inspection'}</span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {inspection.bookingId}
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {inspection.eventTitle} • {inspection.hallName} • {inspection.occurrenceDate} ({inspection.slot})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {inspection.overallStatus === 'COMPLETED' && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingPdf ? 'Exporting...' : 'PDF Report'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Metadata Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-200 truncate block">{inspection.department || '—'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Coordinator</span>
              <span className="font-semibold text-slate-200 truncate block">{inspection.coordinatorName || inspection.coordinatorUserId || '—'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Technician</span>
              <span className="font-semibold text-slate-200 truncate block">{inspection.technicianName || inspection.technicianUserId || 'Assigned'}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Pre / Post Status</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  inspection.preEventStatus === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  Pre: {inspection.preEventStatus}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  inspection.postEventStatus === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  Post: {inspection.postEventStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Time Lock Notice for Post-Event */}
          {isPostEvent && !timeCheck.allowed && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-300">Post-Event Inspection Locked</p>
                <p className="text-amber-200/80 mt-1">{timeCheck.reason}</p>
                <p className="text-slate-400 mt-2 text-[11px]">
                  Institutional compliance requires that post-event equipment check and room closure happen after event conclusion.
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions & Statistics Bar */}
          {!isViewMode && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">Items: <strong className="text-white">{items.length}</strong></span>
                <span className="text-rose-400">Defects: <strong>{defectCount}</strong></span>
                <span className="text-amber-400">Missing: <strong>{missingCount}</strong></span>
              </div>

              <button
                type="button"
                onClick={handleSetAllWorking}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/30 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark All Satisfactory / Working</span>
              </button>
            </div>
          )}

          {/* Categorized Checklist Items */}
          <div className="space-y-6">
            {Object.entries(categoriesMap).map(([category, catItems]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{category}</h3>
                  <span className="text-[10px] text-slate-500">({catItems.length} checkpoints)</span>
                </div>

                <div className="space-y-2.5">
                  {catItems.map((item) => {
                    const key = item.itemKey || item.itemName;
                    const isDefective = item.condition === 'NOT_WORKING' || item.condition === 'NOT_AVAILABLE';

                    return (
                      <div
                        key={key}
                        className={`p-3.5 rounded-xl border transition-all ${
                          item.condition === 'NOT_WORKING'
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : item.condition === 'NOT_AVAILABLE'
                            ? 'bg-amber-950/20 border-amber-500/40'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-white block">{item.itemName}</span>
                            {item.remarks && isViewMode && (
                              <span className="text-[11px] text-amber-300 block mt-1">
                                Note: {item.remarks}
                              </span>
                            )}
                          </div>

                          {/* Condition Selectors */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {CONDITION_OPTIONS.map((opt) => {
                              const isSelected = item.condition === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  disabled={isViewMode}
                                  onClick={() => handleConditionChange(key, opt.value)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                    isSelected
                                      ? opt.value === 'WORKING'
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                        : opt.value === 'NOT_WORKING'
                                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                                        : opt.value === 'NOT_AVAILABLE'
                                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                                        : 'bg-slate-700 text-white'
                                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 border border-slate-700/50'
                                  }`}
                                >
                                  <opt.icon className="w-3.5 h-3.5" />
                                  <span>{opt.short}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Defect or Missing Remarks Input */}
                        {!isViewMode && isDefective && (
                          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-rose-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>Specific Issue / Action Needed <span className="text-red-400">*</span></span>
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.maintenanceRequired)}
                                  onChange={() => handleMaintenanceToggle(key)}
                                  className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                                />
                                <span>Requires Maintenance Ticket</span>
                              </label>
                            </div>
                            <input
                              type="text"
                              value={item.remarks || ''}
                              onChange={(e) => handleRemarkChange(key, e.target.value)}
                              placeholder={`Describe exact problem with ${item.itemName}...`}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-rose-500/50 focus:border-rose-400 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Post-Event Summary Toggles */}
          {isPostEvent && !isViewMode && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Post-Event Conclusion Summary</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-200 block">Event Conducted</span>
                    <span className="text-[11px] text-slate-400">Did the scheduled event take place?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEventConducted(!eventConducted)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      eventConducted ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {eventConducted ? 'Yes, Conducted' : 'No / Cancelled'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-200 block">Structural / Asset Damage</span>
                    <span className="text-[11px] text-slate-400">Any facility damage observed?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDamageIdentified(!damageIdentified)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      damageIdentified ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {damageIdentified ? 'Damage Detected' : 'No Damage'}
                  </button>
                </div>
              </div>

              {damageIdentified && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-rose-300">
                    Damage Description & Responsible Department <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={damageDescription}
                    onChange={(e) => setDamageDescription(e.target.value)}
                    placeholder="Specify damages to furniture, walls, wiring, or AV equipment..."
                    className="w-full px-3 py-2 bg-slate-900 border border-rose-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* General Inspection Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>General Inspection Remarks / Notes</span>
            </label>
            <textarea
              rows={3}
              disabled={isViewMode}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Any additional observations, instructions for coordinators, or handoff details..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none disabled:opacity-75"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <div className="text-xs text-slate-400">
            {isViewMode ? (
              <span>Inspection record finalized.</span>
            ) : isPostEvent ? (
              <span className="text-amber-300 font-medium">Completing will generate official PDF report & send emails.</span>
            ) : (
              <span className="text-cyan-300 font-medium">Completing records pre-event readiness.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>

            {!isViewMode && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || (isPostEvent && !timeCheck.allowed)}
                className={`flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50 ${
                  isPostEvent
                    ? 'bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 shadow-amber-600/20'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/20'
                }`}
              >
                {submitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isPostEvent ? 'Complete Post-Event & Generate Report' : 'Complete Pre-Event Inspection'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

