import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

const formatYMD = (year, monthIndex, day) => {
  const y = year;
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const QuickCalendar = ({
  selectedDate,
  onSelectDate,
  events = [],
  showLegend = true,
  title = 'Quick Calendar',
  showEventsList = true,
}) => {
  // Parse initial selected date or default to local today
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [displayMonth, setDisplayMonth] = useState(
    isNaN(initialDate.getTime()) ? new Date() : initialDate
  );

  // Keep display month synchronized when selectedDate changes from parent
  useEffect(() => {
    if (selectedDate) {
      const parsed = new Date(selectedDate + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        setDisplayMonth(parsed);
      }
    }
  }, [selectedDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  const prevMonth = (e) => {
    if (e) e.stopPropagation();
    setDisplayMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = (e) => {
    if (e) e.stopPropagation();
    setDisplayMonth(new Date(year, month + 1, 1));
  };

  const todayStr = (() => {
    const now = new Date();
    return formatYMD(now.getFullYear(), now.getMonth(), now.getDate());
  })();

  const activeSelectedDateStr = selectedDate || todayStr;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  const days = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = prevMonthDays - i;
    const dateStr = formatYMD(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, dNum);
    days.push({ day: dNum, currentMonth: false, dateStr, targetMonth: month - 1 });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = formatYMD(year, month, i);
    days.push({ day: i, currentMonth: true, dateStr, targetMonth: month });
  }

  const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
  for (let i = 1; i <= remaining; i++) {
    const dateStr = formatYMD(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, i);
    days.push({ day: i, currentMonth: false, dateStr, targetMonth: month + 1 });
  }

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDayClick = (d) => {
    if (!d.currentMonth) {
      setDisplayMonth(new Date(year, d.targetMonth, 1));
    }
    if (onSelectDate) {
      onSelectDate(d.dateStr);
    }
  };

  // Find events for currently selected date
  const selectedDateEvents = events.filter((ev) => ev.date === activeSelectedDateStr);

  return (
    <div className="card-panel calendar-card">
      {/* Header */}
      <div className="calendar-header">
        <span className="calendar-title">
          <CalendarIcon size={17} color="var(--arctic-blue)" />
          {title}
        </span>
        <span className="calendar-active-date-badge">
          {activeSelectedDateStr}
        </span>
      </div>

      {/* Month Navigation */}
      <div className="calendar-nav-bar">
        <button
          type="button"
          onClick={prevMonth}
          className="calendar-nav-btn"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="calendar-month-title">
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="calendar-nav-btn"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day of Week Headers */}
      <div className="calendar-weekdays-grid">
        {dayHeaders.map((dh) => (
          <div key={dh} className="calendar-weekday-cell">
            {dh}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="calendar-days-grid">
        {days.map((d, index) => {
          const isSelected = d.dateStr === activeSelectedDateStr;
          const isToday = d.dateStr === todayStr;

          // Find events for this day
          const dayEvents = events.filter((ev) => ev.date === d.dateStr);
          const hasEvent = dayEvents.length > 0;

          // Event dot color determination
          let eventDotClass = 'approved';
          if (dayEvents.some((e) => e.status === 'REJECTED' || e.status === 'UNAVAILABLE')) {
            eventDotClass = 'rejected';
          } else if (dayEvents.some((e) => e.status === 'PENDING')) {
            eventDotClass = 'pending';
          } else if (dayEvents.some((e) => e.status === 'APPROVED' || e.status === 'BOOKED' || e.status === 'AVAILABLE')) {
            eventDotClass = 'approved';
          }

          return (
            <div
              key={index}
              onClick={() => handleDayClick(d)}
              className={`calendar-day-btn ${!d.currentMonth ? 'outside-month' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
              title={`${d.dateStr}${hasEvent ? ` (${dayEvents.length} event/booking)` : ''}`}
            >
              <span>{d.day}</span>
              {hasEvent && !isSelected && (
                <span className={`calendar-event-dot ${eventDotClass}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Date Events Mini-Section */}
      {showEventsList && (
        <div className="calendar-events-section">
          <div className="calendar-events-header">
            <span className="calendar-events-title">
              <Clock size={13} color="var(--arctic-blue)" />
              Events for {activeSelectedDateStr}
            </span>
            <span className="calendar-events-count">
              {selectedDateEvents.length} item{selectedDateEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {selectedDateEvents.length === 0 ? (
            <div className="calendar-events-empty">
              No scheduled events on this date.
            </div>
          ) : (
            <div className="calendar-events-list">
              {selectedDateEvents.map((ev, i) => (
                <div
                  key={i}
                  className="calendar-event-item"
                >
                  <span className="calendar-event-title">
                    {ev.title || ev.name || 'Event'}
                  </span>
                  {ev.status && <StatusBadge status={ev.status} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="calendar-legend-container">
          <div className="calendar-legend-item">
            <span className="calendar-legend-dot approved" />
            <span>Approved/Available</span>
          </div>
          <div className="calendar-legend-item">
            <span className="calendar-legend-dot pending" />
            <span>Pending</span>
          </div>
          <div className="calendar-legend-item">
            <span className="calendar-legend-dot rejected" />
            <span>Booked/Rejected</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickCalendar;
