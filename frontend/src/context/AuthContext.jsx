import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists, optionally verify with backend
    if (token) {
      authApi.getMe()
        .then((res) => {
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password, rememberMe = true) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const res = await authApi.login({ email: cleanEmail, userId: cleanEmail, password });
    if (res.success && res.data) {
      const { token: jwtToken, ...userData } = res.data;
      setToken(jwtToken);
      setUser(userData);
      localStorage.setItem('token', jwtToken);
      localStorage.setItem('user', JSON.stringify(userData));
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', cleanEmail);
        localStorage.setItem('rememberedUserId', cleanEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedUserId');
      }
      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const getDefaultRouteForRole = (role) => {
    switch (role) {
      case 'CREATOR':
      case 'AO_ADMIN':
        return '/admin/ao';
      case 'SEMINAR_ADMIN':
      case 'SEMINAR_COORDINATOR':
        return '/admin/seminar';
      case 'ACCOMMODATION_ADMIN':
        return '/admin/accommodation';
      case 'TRANSPORT_ADMIN':
        return '/admin/transport';
      case 'STATIONERY_ADMIN':
        return '/admin/stationery';
      case 'MEALS_ADMIN':
        return '/admin/meals';
      case 'DEPARTMENT_USER':
      default:
        return '/dashboard';
    }
  };

  const userRoles = [
    ...(user?.role ? [user.role] : []),
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ];

  const updateCurrentUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    mustChangePassword: !!user?.mustChangePassword,
    login,
    logout,
    updateCurrentUser,
    getDefaultRouteForRole,
    isCreator: userRoles.includes('CREATOR'),
    isAOAdmin: userRoles.includes('CREATOR') || userRoles.includes('AO_ADMIN'),
    isDepartmentHOD: userRoles.includes('DEPARTMENT_HOD'),
    isSeminarAdmin: userRoles.includes('SEMINAR_ADMIN'),
    isSeminarCoordinator: userRoles.includes('SEMINAR_COORDINATOR'),
    isAccommodationAdmin: userRoles.includes('ACCOMMODATION_ADMIN'),
    isTransportAdmin: userRoles.includes('TRANSPORT_ADMIN'),
    isStationeryAdmin: userRoles.includes('STATIONERY_ADMIN'),
    isMealsAdmin: userRoles.includes('MEALS_ADMIN'),
    isServiceAdmin: userRoles.includes('SERVICE_ADMIN') || userRoles.some((r) => r.endsWith('_ADMIN') && r !== 'AO_ADMIN'),
    isDepartmentUser: userRoles.includes('DEPARTMENT_USER'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
