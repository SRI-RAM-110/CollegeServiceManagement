import React, { useState } from 'react';
import { Calendar, CalendarDays, AlertCircle, AlertTriangle } from 'lucide-react';
import { getTodayStr, getDateOffsetStr } from '../../utils/dateUtils';

/**
 * Reusable Service Date Range Viewer Component.
 * Supports date range selection, validation, loading/empty/error states,
 * result counts, and service-specific result table rendering.
 */
export const ServiceDateRangeViewer = ({
  title = 'View Records in Date Range',
  buttonLabel = 'Show Records',
  countLabel = 'Total Records',
  loadingMessage = 'Loading records...',
  errorMessage = 'Unable to load records. Please try again.',
  emptyMessage = 'No records found for the selected date range.',
  defaultFromDate,
  defaultToDate,
  onFetch,
  renderResults,
}) => {
  const [fromDate, setFromDate] = useState(defaultFromDate || getTodayStr());
  const [toDate, setToDate] = useState(defaultToDate || getDateOffsetStr(7));
  const [validationError, setValidationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleDateChange = (type, value) => {
    setValidationError(null);
    if (type === 'from') {
      setFromDate(value);
    } else {
      setToDate(value);
    }
  };

  const handleSearch = async () => {
    setValidationError(null);
    setError(null);

    // Validate 1: From Date required
    if (!fromDate || fromDate.trim() === '') {
      setValidationError('From date is required.');
      return;
    }

    // Validate 2: To Date required
    if (!toDate || toDate.trim() === '') {
      setValidationError('To date is required.');
      return;
    }

    // Validate 3: To Date cannot be earlier than From Date
    // String comparison on ISO 'YYYY-MM-DD' is timezone-safe and accurate
    if (toDate < fromDate) {
      setValidationError('To date cannot be earlier than From date.');
      return;
    }

    // Trigger API request
    setLoading(true);
    try {
      const data = await onFetch({ fromDate, toDate });
      setRecords(data || []);
      setHasSearched(true);
    } catch (err) {
      console.error('ServiceDateRangeViewer fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="date-range-viewer-card">
      <div className="card-header" style={{ marginBottom: '10px' }}>
        <span className="card-title">
          <Calendar size={18} color="var(--arctic-blue)" />
          {title}
        </span>
      </div>

      {/* Date Controls Row */}
      <div className="date-range-controls-row">
        <div className="date-range-field-group">
          <label className="form-label" htmlFor="date-range-from">
            From Date
          </label>
          <input
            id="date-range-from"
            type="date"
            value={fromDate}
            onChange={(e) => handleDateChange('from', e.target.value)}
          />
        </div>

        <div className="date-range-field-group">
          <label className="form-label" htmlFor="date-range-to">
            To Date
          </label>
          <input
            id="date-range-to"
            type="date"
            value={toDate}
            onChange={(e) => handleDateChange('to', e.target.value)}
          />
        </div>

        <div className="date-range-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading}
          >
            <CalendarDays size={16} />
            {loading ? 'Loading...' : buttonLabel}
          </button>
        </div>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="date-range-alert-error" role="alert">
          <AlertTriangle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Results / Status Section */}
      {loading && (
        <div className="date-range-status-box" role="status">
          <div className="date-range-spinner" />
          <span>{loadingMessage}</span>
        </div>
      )}

      {!loading && error && (
        <div className="date-range-status-box error" role="alert">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && hasSearched && records && (
        <div className="date-range-results-section">
          <div className="date-range-results-header">
            <span className="date-range-count-badge">
              {countLabel}: {records.length}
            </span>
          </div>

          {records.length === 0 ? (
            <div className="date-range-status-box">
              <span>{emptyMessage}</span>
            </div>
          ) : (
            <div className="custom-table-container">
              {renderResults ? renderResults(records) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServiceDateRangeViewer;
