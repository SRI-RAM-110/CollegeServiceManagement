import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading, getDefaultRouteForRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoles = [
    ...(user?.role ? [user.role] : []),
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ];

  if (allowedRoles && !userRoles.includes('CREATOR') && !allowedRoles.some(r => userRoles.includes(r))) {
    // If user's role is not allowed, redirect to their proper dashboard
    const redirectUrl = getDefaultRouteForRole(user?.role || (userRoles.length > 0 ? userRoles[0] : 'DEPARTMENT_USER'));
    return <Navigate to={redirectUrl} replace />;
  }

  return children;
};
