import React, { useState } from 'react';
import { Ban, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { requestsApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';

export const CancelApprovedModal = ({
  isOpen,
  onClose,
  targetRequest,
  onSuccess,
}) => {
  const { addToast } = useNotifications();
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !targetRequest) return null;

  const targetId = targetRequest.requestId || targetRequest.bookingId || targetRequest.id;
  const serviceName = targetRequest.service || 'Request';
  const dept = targetRequest.department || 'N/A';
  const requester = targetRequest.requestedBy || targetRequest.requesterUserId || targetRequest.submittedByName || 'Faculty';
  const details = targetRequest.details || 
                  targetRequest.eventTitle || 
                  targetRequest.eventName || 
                  (targetRequest.destination ? `Trip to ${targetRequest.destination}` : '') ||
                  (targetRequest.guestName ? `Guest: ${targetRequest.guestName}` : '') ||
                  'No details provided';

  const handleReasonChange = (e) => {
    const val = e.target.value;
    setReason(val);
    if (val.trim()) {
      setValidationError('');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setValidationError('Please enter a cancellation reason.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestsApi.cancelApproved(targetId, cleanReason);
      addToast(`Approved ${serviceName} request (${targetId}) was cancelled successfully.`, 'success');
      setReason('');
      setValidationError('');
      onClose();
      if (onSuccess) {
        onSuccess(res.data || { ...targetRequest, status: 'CANCELLED', cancellationReason: cleanReason });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to cancel request';
      addToast(errMsg, 'error');
      setValidationError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const isReasonValid = reason.trim().length > 0;

  return (
    <Modal
      isOpen={true}
      onClose={() => {
        if (!loading) {
          setReason('');
          setValidationError('');
          onClose();
        }
      }}
      title="Cancel Approved Request (AO Super Admin)"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-300">
        <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-100">Confirm Cancellation of Approved Request</p>
            <p className="leading-relaxed">
              You are about to cancel this approved <strong>{serviceName}</strong> request (<span className="font-mono">{targetId}</span>). 
              This will release reserved facilities and resources, update the status to CANCELLED, and notify the department requester. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div>
            <span className="text-slate-500 block">Department</span>
            <span className="text-white font-medium">{dept}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Requester</span>
            <span className="text-white font-medium">{requester}</span>
          </div>
          <div className="col-span-2 mt-1">
            <span className="text-slate-500 block">Details</span>
            <span className="text-slate-300 line-clamp-2">{details}</span>
          </div>
        </div>

        <div>
          <label 
            htmlFor="cancel-approved-reason" 
            className="text-xs font-semibold text-slate-200 block mb-1"
          >
            Cancellation Reason (Required) <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="cancel-approved-reason"
            required
            rows={3}
            value={reason}
            onChange={handleReasonChange}
            placeholder="Please enter a cancellation reason (e.g., Facility required for urgent college inspection, faculty requested cancellation...)"
            className={`w-full bg-slate-950 border ${
              validationError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-800 focus:border-rose-500'
            } rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none transition`}
          />
          {validationError && (
            <p className="text-xs text-rose-400 flex items-center gap-1 mt-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{validationError}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setReason('');
              setValidationError('');
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Keep Request
          </button>
          <button
            type="submit"
            disabled={!isReasonValid || loading}
            id="btn-confirm-cancel-approved"
            className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition shadow-md flex items-center gap-1.5 ${
              !isReasonValid || loading
                ? 'bg-rose-900/50 text-rose-300/50 cursor-not-allowed border border-rose-900/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-3.5 h-3.5" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span>Confirm Cancellation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CancelApprovedModal;
