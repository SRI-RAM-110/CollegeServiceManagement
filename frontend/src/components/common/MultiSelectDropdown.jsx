import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, RotateCcw } from 'lucide-react';

/**
 * Modern dark-themed Multi-Select Dropdown with checkboxes, 
 * Select All, Clear Selection, search filtering, and overflow protection.
 */
export function MultiSelectDropdown({
  label,
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'Select options...',
  allSelectedLabel = 'All Selected',
  icon: Icon,
  disabled = false,
  disabledMessage,
  searchable = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const totalOptions = options.length;
  const isAllSelected = totalOptions > 0 && selectedValues.length === totalOptions;
  const isNoneSelected = selectedValues.length === 0;

  // Filtered options for searchable dropdowns
  const visibleOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q) || opt.id.toLowerCase().includes(q));
  }, [options, searchable, searchQuery]);

  // Select All handler
  const handleSelectAll = (e) => {
    e.stopPropagation();
    onChange(options.map((opt) => opt.id));
  };

  // Clear Selection handler
  const handleClear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  // Toggle single item
  const handleToggleOption = (id) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter((v) => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  // Generate readable summary text
  const summaryText = useMemo(() => {
    if (disabled && disabledMessage) return disabledMessage;
    if (isAllSelected) return `${allSelectedLabel} (${totalOptions})`;
    if (isNoneSelected) return 'All (Unfiltered)';
    if (selectedValues.length === 1) {
      const found = options.find((o) => o.id === selectedValues[0]);
      return found ? found.label : selectedValues[0];
    }
    if (selectedValues.length === 2) {
      const found1 = options.find((o) => o.id === selectedValues[0]);
      const found2 = options.find((o) => o.id === selectedValues[1]);
      const l1 = found1 ? found1.label : selectedValues[0];
      const l2 = found2 ? found2.label : selectedValues[1];
      return `${l1}, ${l2}`;
    }
    return `${selectedValues.length} of ${totalOptions} Selected`;
  }, [disabled, disabledMessage, isAllSelected, isNoneSelected, selectedValues, options, allSelectedLabel, totalOptions]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            {Icon && <Icon className="w-3.5 h-3.5 text-blue-400" />}
            {label}
          </span>
          {!disabled && totalOptions > 0 && (
            <span className="text-[10px] text-slate-500 font-mono">
              {isNoneSelected ? 'All Active' : `${selectedValues.length}/${totalOptions}`}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border transition text-left focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
          disabled
            ? 'bg-slate-800/50 border-slate-700/50 text-slate-500 cursor-not-allowed'
            : isOpen
            ? 'bg-slate-800 border-blue-500/80 text-white shadow-lg shadow-blue-500/10'
            : 'bg-slate-800/90 border-slate-700 hover:border-slate-600 text-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`truncate font-medium ${
              isNoneSelected ? 'text-blue-300/90' : isAllSelected ? 'text-white font-semibold' : 'text-blue-200'
            }`}
            title={summaryText}
          >
            {summaryText}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 min-w-[220px]">
          {/* Controls: Select All & Clear */}
          <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-800">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-1 rounded-md hover:bg-slate-800 transition flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Select All
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-400 px-2 py-1 rounded-md hover:bg-slate-800 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear Selection
            </button>
          </div>

          {/* Search bar inside dropdown if enabled */}
          {searchable && options.length > 6 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search options..."
                className="w-full text-[11px] py-1.5 pl-8 pr-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5 no-scrollbar">
            {visibleOptions.length === 0 ? (
              <div className="text-[11px] text-slate-500 text-center py-3">No matching options</div>
            ) : (
              visibleOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.id);
                const ItemIcon = opt.icon;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggleOption(opt.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition select-none ${
                      isSelected
                        ? 'bg-blue-600/20 text-white font-medium border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="w-3.5 h-3.5 rounded border-slate-600 text-blue-600 focus:ring-0 focus:ring-offset-0 bg-slate-800 cursor-pointer pointer-events-none"
                      />
                      {ItemIcon && <ItemIcon className={`w-3.5 h-3.5 ${opt.color || 'text-blue-400'} shrink-0`} />}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {opt.badge && (
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded ml-1 shrink-0 font-mono">
                        {opt.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note when 0 selected */}
          {isNoneSelected && (
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between px-1">
              <span>None selected &bull; All active</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-blue-400 hover:underline font-medium"
              >
                Restore All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MultiSelectDropdown;
