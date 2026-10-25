import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, CalendarDays, AlertCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { getTodayStr, getDateOffsetStr } from '../../utils/dateUtils';

/**
 * Multi-Select Dropdown Filter for ServiceDateRangeViewer.
 * Supports mutually exclusive All Option, stable IDs, readable summaries, and multi-check without closing.
 */
const MultiSelectFilter = ({
  id,
  value = ['ALL'],
  options = [],
  onChange,
  allOptionValue = 'ALL',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const selectedArray = Array.isArray(value) ? value : [value];
  const isAllSelected = selectedArray.length === 0 || selectedArray.includes(allOptionValue);

  const handleToggle = (optValue) => {
    if (optValue === allOptionValue) {
      if (onChange) onChange([allOptionValue]);
      return;
    }

    if (isAllSelected) {
      if (onChange) onChange([optValue]);
      return;
    }

    if (selectedArray.includes(optValue)) {
      const next = selectedArray.filter((v) => v !== optValue);
      if (next.length === 0) {
        if (onChange) onChange([allOptionValue]);
      } else {
        if (onChange) onChange(next);
      }
    } else {
      if (onChange) onChange([...selectedArray, optValue]);
    }
  };

  const summaryText = useMemo(() => {
    if (isAllSelected) {
      const allOpt = options.find((o) => o.value === allOptionValue);
      return allOpt ? allOpt.label : 'All Halls';
    }
    if (selectedArray.length === 1) {
      const opt = options.find((o) => o.value === selectedArray[0]);
      return opt ? opt.label : selectedArray[0];
    }
    if (selectedArray.length === 2) {
      const o1 = options.find((o) => o.value === selectedArray[0])?.label || selectedArray[0];
      const o2 = options.find((o) => o.value === selectedArray[1])?.label || selectedArray[1];
      return `${o1}, ${o2}`;
    }
    return `${selectedArray.length} Halls Selected`;
  }, [isAllSelected, selectedArray, options, allOptionValue]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`date-range-multi-btn ${isOpen ? 'open' : ''}`}
      >
        <span className="date-range-multi-label" title={summaryText}>
          {summaryText}
        </span>
        <ChevronDown
          size={15}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen && (
        <div className="date-range-multi-dropdown" role="listbox">
          {options.map((opt) => {
            const isSelected =
              opt.value === allOptionValue
                ? isAllSelected
                : !isAllSelected && selectedArray.includes(opt.value);

            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(opt.value);
                }}
                className={`date-range-multi-option ${isSelected ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="date-range-multi-checkbox"
                />
                <span className="date-range-multi-label" title={opt.label}>
                  {opt.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Reusable Service Date Range Viewer Component.
 * Supports date range selection, optional extra filters (e.g., hall dropdown),
 * validation, loading/empty/error states, result counts, and service-specific result table rendering.
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
  extraFilters,
}) => {
  const [fromDate, setFromDate] = useState(defaultFromDate || getTodayStr());
  const [toDate, setToDate] = useState(defaultToDate || getDateOffsetStr(7));
  const [validationError, setValidationError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const isMounted = useRef(false);

  const executeSearch = async (from = fromDate, to = toDate) => {
    setValidationError(null);
    setError(null);

    // Validate 1: From Date required
    if (!from || from.trim() === '') {
      setValidationError('From date is required.');
      return;
    }

    // Validate 2: To Date required
    if (!to || to.trim() === '') {
      setValidationError('To date is required.');
      return;
    }

    // Validate 3: To Date cannot be earlier than From Date
    // String comparison on ISO 'YYYY-MM-DD' is timezone-safe and accurate
    if (to < from) {
      setValidationError('To date cannot be earlier than From date.');
      return;
    }

    // Trigger API request
    setLoading(true);
    try {
      const data = await onFetch({ fromDate: from, toDate: to });
      setRecords(data || []);
      setHasSearched(true);
    } catch (err) {
      console.error('ServiceDateRangeViewer fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (type, value) => {
    setValidationError(null);
    const newFrom = type === 'from' ? value : fromDate;
    const newTo = type === 'to' ? value : toDate;
    if (type === 'from') {
      setFromDate(value);
    } else {
      setToDate(value);
    }

    if (hasSearched) {
      if (!newFrom || !newTo) return;
      if (newTo < newFrom) {
        setValidationError('To date cannot be earlier than From date.');
        return;
      }
      executeSearch(newFrom, newTo);
    }
  };

  const handleSearch = () => {
    executeSearch(fromDate, toDate);
  };

  const extraFiltersKey = Array.isArray(extraFilters)
    ? extraFilters
        .map((f) => {
          const valStr = Array.isArray(f.value)
            ? f.value.slice().sort().join(',')
            : String(f.value ?? '');
          return `${f.id}:${valStr}`;
        })
        .join('|')
    : undefined;

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    // Automatically refresh results when extra filter values change
    executeSearch(fromDate, toDate);
  }, [extraFiltersKey]);

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

        {/* Extra Filters (e.g. Seminar Hall Dropdown) */}
        {Array.isArray(extraFilters)
          ? extraFilters.map((filter) => (
              <div key={filter.id || filter.label} className="date-range-field-group">
                <label className="form-label" htmlFor={filter.id}>
                  {filter.label}
                </label>
                {filter.type === 'multi-select' ? (
                  <MultiSelectFilter
                    id={filter.id}
                    value={filter.value}
                    options={filter.options}
                    onChange={filter.onChange}
                    allOptionValue={filter.allOptionValue || 'ALL'}
                  />
                ) : (
                  <select
                    id={filter.id}
                    value={filter.value}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      if (filter.onChange) filter.onChange(newVal);
                    }}
                  >
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))
          : extraFilters}

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
