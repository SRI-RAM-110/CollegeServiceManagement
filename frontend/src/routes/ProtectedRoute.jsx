import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserRoles } from '../utils/authUtils';
import SessionLoader from '../components/common/SessionLoader';

export const ProtectedRoute = ({ children, allowedRoles, strictRoles = false }) => {
  const { user, isAuthenticated, loading, getDefaultRouteForRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <SessionLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRoles = getUserRoles(user);

  // When strictRoles is true, only roles explicitly listed in allowedRoles have access (no automatic CREATOR bypass)
  const isAllowed = allowedRoles
    ? (userRoles.some(r => allowedRoles.includes(r)) || (!strictRoles && userRoles.includes('CREATOR')))
    : true;

  if (!isAllowed) {
    // If user's role is not allowed, redirect to their proper dashboard
    const redirectUrl = getDefaultRouteForRole(user?.role || (userRoles.length > 0 ? userRoles[0] : 'DEPARTMENT_USER'), user);
    // Guard against infinite self-redirect loops if already on target route:
    if (redirectUrl === location.pathname) {
      return children;
    }
    return <Navigate to={redirectUrl} replace />;
  }

  return children;
};
