import React, { useState, useEffect } from 'react';
import { Eye, Download, X, FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { COLLEGE_LOGO } from '../../constants/branding';
import { requestsApi } from '../../services/api';
import { StatusBadge } from './StatusBadge';
import { PdfPreviewModal } from './PdfPreviewModal';

export const RequestDetailsModal = ({
  isOpen,
  onClose,
  request,
  onRefresh = null,
}) => {
  const [details, setDetails] = useState(request);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [cachedPdfBlob, setCachedPdfBlob] = useState(null);

  const reqId = request?.requestId || request?.bookingId || request?.id;

  useEffect(() => {
    if (!isOpen || !reqId) {
      setCachedPdfBlob(null);
      return;
    }

    setDetails(request);

    // Fetch full request details if raw object or deep fields are missing
    let isCancelled = false;
    const fetchFullDetails = async () => {
      try {
        setLoading(true);
        const res = await requestsApi.getRequestDetails(reqId);
        if (!isCancelled && res?.data) {
          setDetails(res.data);
        }
      } catch (err) {
        console.warn('Could not fetch expanded request details, using passed object:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchFullDetails();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, reqId]);

  if (!isOpen || !details) return null;

  const status = details.status ? details.status.toUpperCase() : 'PENDING';
  const isApproved =
    status === 'APPROVED' ||
    status === 'BOOKED' ||
    status === 'READY_FOR_COLLECTION' ||
    status === 'COLLECTED';

  const service = details.service || 'Service';
  const raw = details.rawObject || details;

  // Format filename: <Service>_Request_<RequestID>.pdf
  const getCleanFilename = () => {
    let cleanService = service.replace(/[^a-zA-Z0-9]/g, '_');
    if (cleanService === 'Seminar_Hall') cleanService = 'Seminar';
    if (cleanService.includes('Meals')) cleanService = 'Meals';
    const cleanId = reqId ? reqId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'DOC';
    return `${cleanService}_Request_${cleanId}.pdf`;
  };

  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      let blob = cachedPdfBlob;
      if (!blob) {
        const fetched = await requestsApi.getRequestPdfBlob(reqId);
        blob = new Blob([fetched], { type: 'application/pdf' });
        setCachedPdfBlob(blob);
      }

      const filename = getCleanFilename();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert(err.message || 'Unable to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenPreview = async () => {
    setShowPreviewModal(true);
  };

  // Helper date formatter: YYYY-MM-DD -> DD-MM-YYYY
  const formatDate = (val) => {
    if (!val) return '—';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      return `${d}-${m}-${y}`;
    }
    return val;
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-dialog request-details-dialog animate-fade-in"
          style={{ '--modal-max-width': '820px', width: '92vw', maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <FileText size={18} color="var(--arctic-blue)" />
              <h3 className="modal-title">Request Details: {reqId}</h3>
            </div>
            <button onClick={onClose} className="modal-close-btn" aria-label="Close request details">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body request-doc-modal-body">
            {/* College Document Header */}
            <div className="doc-view-college-header">
              <img
                src={COLLEGE_LOGO}
                alt="Narasaraopeta Engineering College Logo"
                className="doc-view-college-logo"
                style={{ objectFit: 'contain' }}
              />
              <div className="doc-view-college-text">
                <h2 className="doc-view-college-name">NARASARAOPETA ENGINEERING COLLEGE</h2>
                <p className="doc-view-college-sub">
                  (Autonomous) • Approved by AICTE • Permanently Affiliated to JNTUK • Accredited by NAAC with 'A+' Grade
                </p>
                <div className="doc-view-system-title">COLLEGE DEPARTMENT SERVICES MANAGEMENT SYSTEM</div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="doc-view-banner">
              <div className="doc-view-banner-title">
                <span>SERVICE REQUEST DOCUMENT</span>
              </div>
              <div className="doc-view-banner-meta">
                <span className="doc-view-req-badge">Request ID: <strong>{reqId}</strong></span>
                <StatusBadge status={status} />
              </div>
            </div>

            {/* SECTION 1: REQUEST INFORMATION */}
            <div className="doc-view-section">
              <div className="doc-view-section-title">1. REQUEST INFORMATION</div>
              <div className="doc-view-grid">
                <div className="doc-view-cell">
                  <span className="doc-view-label">Request ID</span>
                  <span className="doc-view-value font-mono font-semibold">{reqId}</span>
                </div>
                <div className="doc-view-cell">
                  <span className="doc-view-label">Service Category</span>
                  <span className="doc-view-value">{service}</span>
                </div>
                <div className="doc-view-cell">
                  <span className="doc-view-label">Department</span>
                  <span className="doc-view-value font-semibold">{details.department || '—'}</span>
                </div>
                <div className="doc-view-cell">
                  <span className="doc-view-label">Requested By</span>
                  <span className="doc-view-value">{details.requestedBy || `${details.department || ''} Department`}</span>
                </div>
                <div className="doc-view-cell">
                  <span className="doc-view-label">Submitted Date</span>
                  <span className="doc-view-value">
                    {details.createdAt ? details.createdAt.split('T')[0].split('-').reverse().join('-') : formatDate(details.date)}
                  </span>
                </div>
                <div className="doc-view-cell">
                  <span className="doc-view-label">Current Status</span>
                  <div className="mt-0.5">
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: SERVICE DETAILS */}
            <div className="doc-view-section">
              <div className="doc-view-section-title">2. SERVICE DETAILS — {service.toUpperCase()}</div>

              {/* SEMINAR DETAILS */}
              {(details.serviceCategory === 'SEMINAR' || service === 'Seminar Hall') && (
                <div className="doc-view-grid">
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Hall Name</span>
                    <span className="doc-view-value font-semibold">{raw.hallName || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Hall Location</span>
                    <span className="doc-view-value font-medium text-slate-200">{raw.hallLocation || raw.location || raw.hallId || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Booking Date</span>
                    <span className="doc-view-value font-semibold">{formatDate(raw.date || details.date)}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Time Slot</span>
                    <span className="doc-view-value font-semibold text-emerald-400">{raw.slot || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Booking Type</span>
                    <span className="doc-view-value text-blue-400 font-semibold">
                      {raw.bookingType ? raw.bookingType.replace('_', ' ') : 'ONE TIME'}
                    </span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Expected Participants</span>
                    <span className="doc-view-value">{raw.expectedParticipants || '—'}</span>
                  </div>

                  {(raw.seriesId || raw.occurrenceIndex) && (
                    <>
                      <div className="doc-view-cell">
                        <span className="doc-view-label">Series ID</span>
                        <span className="doc-view-value font-mono text-cyan-300">{raw.seriesId || '—'}</span>
                      </div>
                      <div className="doc-view-cell">
                        <span className="doc-view-label">Occurrence</span>
                        <span className="doc-view-value font-bold text-amber-300">
                          {raw.occurrenceIndex && raw.totalOccurrences ? `${raw.occurrenceIndex} of ${raw.totalOccurrences}` : 'Series Booking'}
                        </span>
                      </div>
                    </>
                  )}

                  {raw.startDate && raw.endDate && (
                    <div className="doc-view-cell doc-view-span-2">
                      <span className="doc-view-label">Date Range / Span</span>
                      <span className="doc-view-value">{formatDate(raw.startDate)} to {formatDate(raw.endDate)}</span>
                    </div>
                  )}

                  {raw.recurrenceDays && raw.recurrenceDays.length > 0 && (
                    <div className="doc-view-cell doc-view-span-2">
                      <span className="doc-view-label">Recurring Days</span>
                      <span className="doc-view-value">{raw.recurrenceDays.join(', ')}</span>
                    </div>
                  )}

                  <div className="doc-view-cell doc-view-span-full">
                    <span className="doc-view-label">Event Title</span>
                    <span className="doc-view-value font-semibold text-white">{raw.eventTitle || '—'}</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-full">
                    <span className="doc-view-label">Purpose of Booking</span>
                    <span className="doc-view-value">{raw.purpose || '—'}</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-full">
                    <span className="doc-view-label">Additional Requirements</span>
                    <span className="doc-view-value">{raw.additionalRequirements || 'None'}</span>
                  </div>

                  {/* Cancellation Reason if present */}
                  {raw.cancellationReason && (
                    <div className="doc-view-cell doc-view-span-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                      <span className="doc-view-label text-rose-300">Cancellation Info ({raw.cancellationScope || 'THIS_OCCURRENCE'})</span>
                      <span className="doc-view-value text-rose-200">
                        Requested by {raw.cancellationRequestedBy || 'Department'}: {raw.cancellationReason}
                      </span>
                    </div>
                  )}

                  {/* Reschedule Reason if present */}
                  {raw.rescheduleReason && (
                    <div className="doc-view-cell doc-view-span-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                      <span className="doc-view-label text-blue-300">Reschedule Request Target</span>
                      <span className="doc-view-value text-blue-200">
                        Target: {raw.rescheduledHallName} on {raw.rescheduledDate} ({raw.rescheduledSlot}) • Reason: {raw.rescheduleReason}
                      </span>
                    </div>
                  )}

                  {raw.rescheduledToBookingId && (
                    <div className="doc-view-cell doc-view-span-full" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                      <span className="doc-view-label text-emerald-300">Rescheduled Confirmed Reservation</span>
                      <span className="doc-view-value text-emerald-200 font-mono">
                        New Booking ID: {raw.rescheduledToBookingId}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ACCOMMODATION DETAILS */}
              {(details.serviceCategory === 'ACCOMMODATION' || service === 'Accommodation') && (
                <div className="doc-view-grid">
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Hostel</span>
                    <span className="doc-view-value font-semibold">{raw.hostel || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Room Type</span>
                    <span className="doc-view-value">{raw.roomType || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Allocated Room ID</span>
                    <span className="doc-view-value font-mono">{raw.roomId || 'Pending Allocation'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Number of Guests</span>
                    <span className="doc-view-value font-semibold">{raw.guestsCount || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Check-in Date</span>
                    <span className="doc-view-value">{formatDate(raw.checkInDate)}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Check-out Date</span>
                    <span className="doc-view-value">{formatDate(raw.checkOutDate)}</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-2">
                    <span className="doc-view-label">Faculty / Guest Name</span>
                    <span className="doc-view-value">{raw.facultyOrGuestName || 'Department Guest'}</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-full">
                    <span className="doc-view-label">Purpose of Stay</span>
                    <span className="doc-view-value">{raw.purpose || '—'}</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-full">
                    <span className="doc-view-label">Additional Notes</span>
                    <span className="doc-view-value">{raw.additionalNotes || 'None'}</span>
                  </div>
                </div>
              )}

              {/* TRANSPORT DETAILS */}
              {(details.serviceCategory === 'TRANSPORT' || service === 'Transport') && (
                <div className="doc-view-grid">
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Trip / Vehicle Type</span>
                    <span className="doc-view-value font-semibold">{raw.tripType || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Trip Nature</span>
                    <span className="doc-view-value">{raw.roundTrip ? 'Round Trip (Two Way)' : 'One Way Trip'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Trip Date</span>
                    <span className="doc-view-value">{formatDate(raw.tripDate || details.date)}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Passenger Count</span>
                    <span className="doc-view-value font-semibold">{raw.expectedPassengers || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Departure Time</span>
                    <span className="doc-view-value">{raw.departureTime || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Return Time</span>
                    <span className="doc-view-value">{raw.returnTime || 'N/A'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Pickup Location</span>
                    <span className="doc-view-value">{raw.pickupLocation || '—'}</span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Destination</span>
                    <span className="doc-view-value font-semibold">{raw.destination || '—'}</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-2">
                    <span className="doc-view-label">Allocated Vehicle</span>
                    <span className="doc-view-value">{raw.vehicleName || 'To be assigned by Transport Admin'}</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-full">
                    <span className="doc-view-label">Purpose of Travel</span>
                    <span className="doc-view-value">{raw.purpose || '—'}</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-full">
                    <span className="doc-view-label">Special Requirements</span>
                    <span className="doc-view-value">{raw.additionalNotes || 'None'}</span>
                  </div>
                </div>
              )}

              {/* STATIONERY DETAILS */}
              {(details.serviceCategory === 'STATIONERY' || service === 'Stationery') && (
                <div>
                  <div className="doc-view-grid mb-3">
                    <div className="doc-view-cell doc-view-span-full">
                      <span className="doc-view-label">Purpose of Request</span>
                      <span className="doc-view-value">{raw.purpose || '—'}</span>
                    </div>
                    {raw.additionalNotes && (
                      <div className="doc-view-cell doc-view-span-full">
                        <span className="doc-view-label">Special Notes / Instructions</span>
                        <span className="doc-view-value">{raw.additionalNotes}</span>
                      </div>
                    )}
                  </div>

                  <div className="doc-view-table-wrapper">
                    <div className="doc-view-table-title">Requested Stationery Items</div>
                    <table className="doc-view-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px', textAlign: 'center' }}>S.No.</th>
                          <th>Item Name</th>
                          <th style={{ width: '160px', textAlign: 'center' }}>Requested Quantity</th>
                          <th style={{ width: '100px', textAlign: 'center' }}>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raw.itemsRequested && raw.itemsRequested.length > 0 ? (
                          raw.itemsRequested.map((item, idx) => (
                            <tr key={item.itemId || idx}>
                              <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                              <td className="font-semibold text-white">{item.name}</td>
                              <td style={{ textAlign: 'center' }} className="font-mono text-cyan-300 font-bold">
                                {item.quantity}
                              </td>
                              <td style={{ textAlign: 'center' }} className="text-muted">
                                {item.unit || 'pcs'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="text-center text-muted py-3">
                              {details.details || 'No items listed'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SNACKS & MEALS DETAILS */}
              {(details.serviceCategory === 'MEALS' || service === 'Snacks & Meals') && (
                <div>
                  <div className="doc-view-grid mb-3">
                    <div className="doc-view-cell doc-view-span-2">
                      <span className="doc-view-label">Event / Occasion</span>
                      <span className="doc-view-value font-semibold">{raw.eventTitle || '—'}</span>
                    </div>
                    <div className="doc-view-cell">
                      <span className="doc-view-label">Event Date</span>
                      <span className="doc-view-value">
                        {raw.dates && raw.dates.length > 1
                          ? `${formatDate(raw.startDate || raw.dates[0])} to ${formatDate(raw.endDate || raw.dates[raw.dates.length - 1])} (${raw.dates.length} days)`
                          : formatDate(raw.date || details.date)}
                      </span>
                    </div>
                    <div className="doc-view-cell">
                      <span className="doc-view-label">Total Guest Count</span>
                      <span className="doc-view-value font-bold text-cyan-300">{raw.totalGuests || '—'}</span>
                    </div>
                    <div className="doc-view-cell doc-view-span-2">
                      <span className="doc-view-label">Venue / Location</span>
                      <span className="doc-view-value">{raw.venue || '—'}</span>
                    </div>
                    <div className="doc-view-cell doc-view-span-2">
                      <span className="doc-view-label">Selected Meal Types</span>
                      <span className="doc-view-value">
                        {raw.mealTypes ? raw.mealTypes.join(', ') : '—'}
                      </span>
                    </div>
                    {raw.serviceTime && (
                      <div className="doc-view-cell doc-view-span-2">
                        <span className="doc-view-label">Refreshments Service Time</span>
                        <span className="doc-view-value font-semibold text-amber-300">
                          Service: {raw.serviceTime}
                        </span>
                      </div>
                    )}
                    <div className="doc-view-cell doc-view-span-full">
                      <span className="doc-view-label">Dietary Requirements</span>
                      <span className="doc-view-value">{raw.specialRequirements || 'Standard catering required'}</span>
                    </div>
                    {raw.additionalNotes && (
                      <div className="doc-view-cell doc-view-span-full">
                        <span className="doc-view-label">Additional Instructions</span>
                        <span className="doc-view-value">{raw.additionalNotes}</span>
                      </div>
                    )}
                  </div>

                  {raw.mealItems && raw.mealItems.length > 0 && (
                    <div className="doc-view-table-wrapper">
                      <div className="doc-view-table-title">Meal Schedule & Menu Breakdown</div>
                      <table className="doc-view-table">
                        <thead>
                          <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>S.No.</th>
                            <th>Meal Type</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Guests</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Service / Time</th>
                            <th>Menu / Items Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {raw.mealItems.map((item, idx) => {
                            const isRef = item.mealType && (item.mealType.toLowerCase().includes('snack') || item.mealType.toLowerCase().includes('tea') || item.mealType.toLowerCase().includes('coffee'));
                            const displayTime = isRef && raw.serviceTime
                              ? `Service: ${raw.serviceTime}`
                              : (item.preferredTime ? ((item.preferredTime === 'FORENOON' || item.preferredTime === 'AFTERNOON') ? `Service: ${item.preferredTime}` : item.preferredTime) : 'Scheduled');

                            return (
                              <tr key={idx}>
                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                <td className="font-semibold text-white">{item.mealType}</td>
                                <td style={{ textAlign: 'center' }} className="font-mono text-cyan-300 font-bold">
                                  {item.guestCount || raw.totalGuests}
                                </td>
                                <td style={{ textAlign: 'center' }}>{displayTime}</td>
                                <td className="text-muted">{item.description || 'Standard College Menu'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 3: APPROVAL INFORMATION */}
            <div className="doc-view-section">
              <div className="doc-view-section-title">3. APPROVAL INFORMATION</div>
              <div className="doc-view-approval-box">
                <div className="doc-view-grid">
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Approval Status</span>
                    <div className="mt-1">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Approved By</span>
                    <span className="doc-view-value font-semibold">
                      {details.approvedBy || (isApproved ? 'Administrative Officer' : 'Pending Administrative Review')}
                    </span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Approved Date</span>
                    <span className="doc-view-value">
                      {details.approvedAt
                        ? details.approvedAt.replace('T', ' ').substring(0, 16)
                        : (isApproved && details.createdAt ? details.createdAt.split('T')[0] : '—')}
                    </span>
                  </div>
                  <div className="doc-view-cell">
                    <span className="doc-view-label">Authority Level</span>
                    <span className="doc-view-value">Institutional Administrator</span>
                  </div>
                  <div className="doc-view-cell doc-view-span-full">
                    <span className="doc-view-label">Administrator Remarks</span>
                    <span className="doc-view-value text-slate-200">
                      {details.adminRemarks || (isApproved ? 'Approved as requested. Authorized for official service delivery.' : 'Pending administrator processing.')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: AUDIT LOG & STATUS HISTORY */}
            {raw.statusHistory && raw.statusHistory.length > 0 && (
              <div className="doc-view-section">
                <div className="doc-view-section-title">4. LIFECYCLE AUDIT TRAIL & STATUS HISTORY</div>
                <div className="custom-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="custom-table" style={{ fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 8px' }}>Status</th>
                        <th style={{ padding: '6px 8px' }}>Action By</th>
                        <th style={{ padding: '6px 8px' }}>Timestamp</th>
                        <th style={{ padding: '6px 8px' }}>Remarks / Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raw.statusHistory.map((h, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '6px 8px' }}>
                            <StatusBadge status={h.status} />
                          </td>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{h.actor || 'System'}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                            {h.timestamp ? h.timestamp.replace('T', ' ').substring(0, 16) : '—'}
                          </td>
                          <td style={{ padding: '6px 8px' }}>{h.comment || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Non-approved informative note */}
            {!isApproved && (
              <div className="doc-view-non-approved-notice">
                <Clock size={18} color="var(--warning)" />
                <div>
                  <div className="font-semibold text-warning">Approval Required for Official Document</div>
                  <div className="text-xs text-muted">
                    This request currently has status <strong>{status}</strong>. Official PDF document generation and download are activated once an administrator approves the request.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-xs text-muted">Document:</span>
              <span className="text-xs font-mono text-cyan-300">{getCleanFilename()}</span>
            </div>

            <div className="flex items-center gap-2">
              {isApproved && (
                <>
                  <button
                    onClick={handleOpenPreview}
                    className="btn btn-outline flex items-center gap-2"
                    id="btn-preview-pdf-details"
                  >
                    <Eye size={16} />
                    <span>Preview PDF</span>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="btn btn-primary flex items-center gap-2"
                    id="btn-download-pdf-details"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>
                </>
              )}

              <button onClick={onClose} className="btn btn-outline" id="btn-close-details">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Actual PDF Preview Modal */}
      {showPreviewModal && (
        <PdfPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          requestId={reqId}
          service={service}
          existingBlob={cachedPdfBlob}
        />
      )}
    </>
  );
};

export default RequestDetailsModal;
