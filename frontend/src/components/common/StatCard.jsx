import React from 'react';

export const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  color = 'blue',
  onClick,
}) => {
  const displaySubtitle = subtitle || trend;

  return (
    <div
      className={`stat-card-gradient stat-card-${color} ${onClick ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-card-content">
        {title && (
          <span className="stat-card-title">
            {title}
          </span>
        )}
        <span className="stat-card-value">
          {value !== undefined ? value : 0}
        </span>
        {displaySubtitle && (
          <span className="stat-card-subtitle">
            {displaySubtitle}
          </span>
        )}
      </div>

      {Icon && (
        <div className="stat-card-icon-container">
          <Icon size={22} color="#ffffff" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
