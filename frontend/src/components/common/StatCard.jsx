import React from 'react';

export const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  color = 'blue',
  onClick,
}) => {
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
        {subtitle && (
          <span className="stat-card-subtitle">
            {subtitle}
          </span>
        )}
      </div>

      {Icon && (
        <div className="stat-card-icon-container">
          <Icon size={24} color="#ffffff" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
