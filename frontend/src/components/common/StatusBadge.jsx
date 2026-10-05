import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toUpperCase();

  let className = 'badge-neutral';
  let label = status;

  if (normalized === 'APPROVED' || normalized === 'AVAILABLE' || normalized === 'COMPLETED') {
    className = 'badge-approved';
    label = normalized === 'AVAILABLE' ? 'Available' : (normalized === 'COMPLETED' ? 'Completed' : 'Approved');
  } else if (normalized === 'READY_FOR_COLLECTION' || normalized === 'READY FOR COLLECTION' || normalized === 'READY') {
    className = 'badge-ready';
    label = 'Ready for Collection';
  } else if (normalized === 'COLLECTED') {
    className = 'badge-collected';
    label = 'Collected';
  } else if (normalized === 'UNDER_REVIEW' || normalized === 'UNDER REVIEW') {
    className = 'badge-review';
    label = 'Under Review';
  } else if (normalized === 'CANCELLED' || normalized === 'CANCELED') {
    className = 'badge-cancelled';
    label = 'Cancelled';
  } else if (normalized === 'PENDING' || normalized === 'PARTIALLY BOOKED' || normalized === 'ON_TRIP' || normalized === 'ON TRIP' || normalized === 'ONGOING') {
    className = 'badge-pending';
    label = normalized === 'PENDING' ? 'Pending' : (normalized.includes('TRIP') ? 'On Trip' : 'Pending');
  } else if (normalized === 'REJECTED' || normalized === 'BOOKED' || normalized === 'OCCUPIED' || normalized === 'UNDER_MAINTENANCE' || normalized === 'UNDER MAINTENANCE') {
    className = 'badge-rejected';
    label = normalized === 'REJECTED' ? 'Rejected' : (normalized === 'BOOKED' ? 'Booked' : (normalized === 'OCCUPIED' ? 'Occupied' : 'Maintenance'));
  }

  return <span className={`badge ${className}`}>{label}</span>;
};

export default StatusBadge;
