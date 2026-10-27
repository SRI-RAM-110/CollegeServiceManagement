import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Department Pages
import DepartmentDashboard from './pages/department/DepartmentDashboard';
import SeminarBooking from './pages/department/SeminarBooking';
import Accommodation from './pages/department/Accommodation';
import Transport from './pages/department/Transport';
import Stationery from './pages/department/Stationery';
import SnacksMeals from './pages/department/SnacksMeals';
import MyRequests from './pages/department/MyRequests';

// Admin Pages
import AOAdminDashboard from './pages/admin/AOAdminDashboard';
import AOCreateRequest from './pages/admin/AOCreateRequest';
import UserManagement from './pages/admin/UserManagement';
import SeminarAdmin from './pages/admin/SeminarAdmin';
import AccommodationAdmin from './pages/admin/AccommodationAdmin';
import TransportAdmin from './pages/admin/TransportAdmin';
import StationeryAdmin from './pages/admin/StationeryAdmin';
import MealsAdmin from './pages/admin/MealsAdmin';
import SeminarTechnicianDashboard from './pages/technician/SeminarTechnicianDashboard';
import GeneratorOperatorDashboard from './pages/operator/GeneratorOperatorDashboard';
import ForcedPasswordChangeModal from './components/common/ForcedPasswordChangeModal';
import Reports from './pages/Reports';

const ROOT_PATHS = [
  '/login',
  '/dashboard',
  '/admin/ao',
  '/admin/seminar',
  '/admin/accommodation',
  '/admin/transport',
  '/admin/stationery',
  '/admin/meals',
  '/technician/seminar',
  '/operator/generator',
];

function NativeBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;

    const setupListener = async () => {
      listenerHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        // 1. Check for open dismissible modals / overlays
        const activeBackdrop = document.querySelector('.modal-backdrop:not(.forced-password-modal)');
        if (activeBackdrop) {
          // Trigger Escape key event to invoke standard modal close handlers
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
          // If a close button exists, click it as well
          const closeBtn = activeBackdrop.querySelector('.modal-close-btn, button[aria-label*="Close"], button[aria-label*="close"]');
          if (closeBtn) {
            closeBtn.click();
            return;
          }
          return;
        }

        // 2. Check if currently on a root / landing screen
        const currentPath = locationRef.current.pathname;
        const isRoot = ROOT_PATHS.includes(currentPath) || currentPath === '/';

        if (isRoot) {
          // At root screen, safe predictable behavior: exit app
          CapApp.exitApp();
          return;
        }

        // 3. For nested pages, navigate backward within the app
        if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
          navigate(-1);
        } else if (canGoBack) {
          navigate(-1);
        } else {
          // Fallback to role-based root redirect if history is exhausted
          navigate('/', { replace: true });
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [navigate]);

  return null;
}

function RootRedirect() {
  const { user, isAuthenticated, getDefaultRouteForRole } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getDefaultRouteForRole(user?.role, user)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <NativeBackButtonHandler />
            <ForcedPasswordChangeModal />
            <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Root path dynamic redirection based on role */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Portal Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Department Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['DEPARTMENT_USER', 'DEPARTMENT_HOD']}>
                    <DepartmentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seminar-booking"
                element={
                  <ProtectedRoute allowedRoles={['DEPARTMENT_USER', 'DEPARTMENT_HOD', 'AO_ADMIN', 'CREATOR']}>
                    <SeminarBooking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accommodation"
                element={
                  <ProtectedRoute allowedRoles={['DEPARTMENT_USER', 'DEPARTMENT_HOD', 'AO_ADMIN', 'CREATOR']}>
                    <Accommodation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transport"
                element={
                  <ProtectedRoute allowedRoles={['DEPARTMENT_USER', 'DEPARTMENT_HOD', 'AO_ADMIN', 'CREATOR']}>
                    <Transport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stationery"
                element={
                  <ProtectedRoute allowedRoles={['DEPARTMENT_USER', 'DEPARTMENT_HOD', 'AO_ADMIN', 'CREATOR']}>
                    <Stationery />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snacks-meals"
                element={
                  <ProtectedRoute allowedRoles={['DEPARTMENT_USER', 'DEPARTMENT_HOD', 'AO_ADMIN', 'CREATOR']}>
                    <SnacksMeals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-requests"
                element={
                  <ProtectedRoute allowedRoles={['DEPARTMENT_USER', 'DEPARTMENT_HOD', 'AO_ADMIN', 'CREATOR']}>
                    <MyRequests />
                  </ProtectedRoute>
                }
              />

              {/* AO Admin Personal Requesting & Personal Tracker */}
              <Route
                path="/admin/create-request"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN']}>
                    <AOCreateRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/my-requests"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN']}>
                    <MyRequests />
                  </ProtectedRoute>
                }
              />

              {/* AO Super Admin Dashboard & Aliases */}
              <Route
                path="/admin/ao"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN']}>
                    <AOAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN']}>
                    <AOAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/ao/*"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN']}>
                    <AOAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />

              {/* Seminar Admin */}
              <Route
                path="/admin/seminar"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR']}>
                    <SeminarAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/seminar/*"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_COORDINATOR']}>
                    <SeminarAdmin />
                  </ProtectedRoute>
                }
              />

              {/* Seminar Equipment Technician */}
              <Route
                path="/technician/seminar"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_TECHNICIAN']}>
                    <SeminarTechnicianDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/technician/seminar/*"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'SEMINAR_TECHNICIAN']}>
                    <SeminarTechnicianDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Generator Operator */}
              <Route
                path="/operator/generator"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'GENERATOR_OPERATOR']}>
                    <GeneratorOperatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/operator/generator/*"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'SEMINAR_ADMIN', 'GENERATOR_OPERATOR']}>
                    <GeneratorOperatorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Accommodation Admin */}
              <Route
                path="/admin/accommodation"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN', 'BOYS_HOSTEL_ADMIN', 'GIRLS_HOSTEL_ADMIN']}>
                    <AccommodationAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/accommodation/*"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'ACCOMMODATION_ADMIN', 'BOYS_HOSTEL_ADMIN', 'GIRLS_HOSTEL_ADMIN']}>
                    <AccommodationAdmin />
                  </ProtectedRoute>
                }
              />

              {/* Transport Admin */}
              <Route
                path="/admin/transport"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'TRANSPORT_ADMIN']}>
                    <TransportAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/transport/*"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'TRANSPORT_ADMIN']}>
                    <TransportAdmin />
                  </ProtectedRoute>
                }
              />

              {/* Stationery Admin */}
              <Route
                path="/admin/stationery"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'STATIONERY_ADMIN']}>
                    <StationeryAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/stationery/*"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'STATIONERY_ADMIN']}>
                    <StationeryAdmin />
                  </ProtectedRoute>
                }
              />

              {/* Snacks & Meals Admin */}
              <Route
                path="/admin/meals"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'MEALS_ADMIN']}>
                    <MealsAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/meals/*"
                element={
                  <ProtectedRoute allowedRoles={['CREATOR', 'AO_ADMIN', 'MEALS_ADMIN']}>
                    <MealsAdmin />
                  </ProtectedRoute>
                }
              />

              {/* Reports & Analytics - Role-adaptive with backend-enforced permissions */}
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all redirect to root */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
  );
}
