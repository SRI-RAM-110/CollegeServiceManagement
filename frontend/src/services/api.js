import axios from 'axios';

/**
 * Resolves the API Base URL from Vite's centralized environment variable:
 * - Local PC: VITE_API_URL=http://localhost:8080/api (from .env or .env.development)
 * - Mobile / Forwarded: VITE_API_URL=https://<your-forwarded-backend-url>/api (from .env.forward)
 */
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1';

    // 1. If running on PC browser (localhost / 127.0.0.1):
    if (isLocal) {
      return 'http://localhost:8080/api';
    }

    // 2. If running on Mobile / Remote / Tunnel (non-localhost):
    // NEVER call localhost from a mobile browser!
    const envUrl = import.meta.env.VITE_API_URL;

    // Check if VITE_API_URL is explicitly set to an external URL (NOT localhost and not a placeholder)
    if (
      envUrl &&
      typeof envUrl === 'string' &&
      envUrl.trim() !== '' &&
      !envUrl.includes('localhost') &&
      !envUrl.includes('127.0.0.1') &&
      !envUrl.includes('YOUR_FORWARDED_BACKEND_URL') &&
      !envUrl.includes('<')
    ) {
      return envUrl.trim().replace(/\/+$/, '');
    }

    // Automatically resolve VS Code Dev Tunnels backend (port 5173 -> port 8080)
    if (host.includes('-5173.') && host.includes('devtunnels.ms')) {
      const backendHost = host.replace('-5173.', '-8080.');
      return `${window.location.protocol}//${backendHost}/api`;
    }

    // Automatically resolve GitHub Codespaces tunnel backend (port 5173 -> port 8080)
    if (host.includes('-5173.') && (host.includes('.app.github.dev') || host.includes('.preview.app.github.dev'))) {
      const backendHost = host.replace('-5173.', '-8080.');
      return `${window.location.protocol}//${backendHost}/api`;
    }

    // Fallback: use relative /api (proxied via Vite server to http://localhost:8080 on PC)
    return '/api';
  }

  return 'http://localhost:8080/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: automatically ensures base URL and attaches JWT token
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto logout on 401 and descriptive error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    let message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    if (error.message === 'Network Error' && !error.response) {
      message = `Cannot reach backend API at ${getApiBaseUrl()}. Please verify Spring Boot (port 8080) is running and accessible.`;
    }
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const seminarApi = {
  getHalls: (assignedOnly = false) => api.get('/seminar/halls', { params: assignedOnly ? { assignedOnly: true } : {} }),
  getMyAssignedHalls: () => api.get('/seminar/halls/my'),
  getAvailability: (hallId, date) => api.get(`/seminar/availability?hallId=${hallId}&date=${date}`),
  checkBulkAvailability: (data) => api.post('/seminar/check-bulk-availability', data),
  createBooking: (data) => api.post('/seminar/requests', data),
  getRequests: (params = {}) => api.get('/seminar/requests', { params }),
  getMyRequests: (params = {}) => api.get('/seminar/requests/my', { params }),
  getRequestById: (id) => api.get(`/seminar/requests/${id}`),
  getSeriesBookings: (seriesId) => api.get(`/seminar/series/${seriesId}`),
  getBookings: (params = {}) => api.get('/seminar/bookings', { params }),
  approve: (id) => api.put(`/seminar/requests/${id}/approve`),
  reject: (id, reason) => api.put(`/seminar/requests/${id}/reject`, { reason }),
  cancelRequest: (id, data) => api.post(`/seminar/requests/${id}/cancel`, data),
  approveCancellation: (id) => api.put(`/seminar/requests/${id}/approve-cancellation`),
  rejectCancellation: (id, reason) => api.put(`/seminar/requests/${id}/reject-cancellation`, { reason }),
  rescheduleRequest: (id, data) => api.post(`/seminar/requests/${id}/reschedule`, data),
  approveReschedule: (id) => api.put(`/seminar/requests/${id}/approve-reschedule`),
  rejectReschedule: (id, reason) => api.put(`/seminar/requests/${id}/reject-reschedule`, { reason }),
  updateHallStatus: (hallId, status) => api.put(`/seminar/halls/${hallId}/status`, { status }),
  updateHall: (hallId, data) => api.put(`/seminar/halls/${hallId}`, data),
  assignCoordinators: (hallId, coordinators) => api.post(`/seminar/halls/${hallId}/coordinators`, { coordinators }),
};

export const adminUserApi = {
  getStats: () => api.get('/admin/users/stats'),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  registerUser: (data) => api.post('/admin/users', data),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  toggleStatus: (userId, active) => api.patch(`/admin/users/${userId}/status`, { active }),
  resetPassword: (userId, data = {}) => api.post(`/admin/users/${userId}/reset-password`, data),
  removeUser: (userId) => api.delete(`/admin/users/${userId}`),
};

export const accommodationApi = {
  getRooms: (hostel) => api.get('/accommodation/rooms', { params: hostel ? { hostel } : {} }),
  updateRoomStatus: (roomId, status) => api.put(`/accommodation/rooms/${roomId}/status`, { status }),
  getRoomAvailability: (roomId, params) => api.get(`/accommodation/rooms/${roomId}/availability`, { params }),
  createRequest: (data) => api.post('/accommodation/requests', data),
  getRequests: (params = {}) => api.get('/accommodation/requests', { params }),
  getRequestById: (id) => api.get(`/accommodation/requests/${id}`),
  approve: (id) => api.put(`/accommodation/requests/${id}/approve`),
  reject: (id, reason) => api.put(`/accommodation/requests/${id}/reject`, { reason }),
  cancelRequest: (id, dataOrReason) => {
    const payload = typeof dataOrReason === 'string' ? { reason: dataOrReason } : (dataOrReason || { reason: 'Cancelled by user' });
    return api.post(`/accommodation/requests/${id}/cancel`, payload);
  },
  approveCancellation: (id) => api.put(`/accommodation/requests/${id}/cancel/approve`),
  rejectCancellation: (id, reason) => api.put(`/accommodation/requests/${id}/cancel/reject`, { reason }),
  rescheduleRequest: (id, data) => api.post(`/accommodation/requests/${id}/reschedule`, data),
  approveReschedule: (id) => api.put(`/accommodation/requests/${id}/reschedule/approve`),
  rejectReschedule: (id, reason) => api.put(`/accommodation/requests/${id}/reschedule/reject`, { reason }),
};

export const transportApi = {
  getVehicles: (date) => api.get('/transport/vehicles', { params: date ? { date } : {} }),
  getTrips: (date) => api.get('/transport/trips', { params: date ? { date } : {} }),
  addVehicle: (data) => api.post('/transport/vehicles/add', data),
  createRequest: (data) => api.post('/transport/requests', data),
  getRequests: (params = {}) => api.get('/transport/requests', { params }),
  approve: (id) => api.put(`/transport/requests/${id}/approve`),
  reject: (id, reason) => api.put(`/transport/requests/${id}/reject`, { reason }),
};

export const stationeryApi = {
  getItems: () => api.get('/stationery/items'),
  createRequest: (data) => api.post('/stationery/requests', data),
  getRequests: (params = {}) => api.get('/stationery/requests', { params }),
  getRequestById: (id) => api.get(`/stationery/requests/${id}`),
  markReview: (id, comments) => api.put(`/stationery/requests/${id}/review`, { comments }),
  approve: (id, comments) => api.put(`/stationery/requests/${id}/approve`, { comments }),
  markReady: (id, comments) => api.put(`/stationery/requests/${id}/ready`, { comments }),
  markCollected: (id, comments) => api.put(`/stationery/requests/${id}/collect`, { comments }),
  reject: (id, reason) => api.put(`/stationery/requests/${id}/reject`, { reason }),
  updateStatus: (id, status, comments) => api.patch(`/stationery/requests/${id}/status`, { status, comments }),
};

export const mealsApi = {
  getOptions: () => api.get('/meals/options'),
  createRequest: (data) => api.post('/meals/requests', data),
  getRequests: (params = {}) => api.get('/meals/requests', { params }),
  getRequestById: (id) => api.get(`/meals/requests/${id}`),
  updateRequest: (id, data) => api.put(`/meals/requests/${id}`, data),
  approve: (id) => api.put(`/meals/requests/${id}/approve`),
  reject: (id, reason) => api.put(`/meals/requests/${id}/reject`, { reason }),
};

export const requestsApi = {
  getMyRequests: (params = {}) => api.get('/requests/my', { params }),
  getAllRequests: (params = {}) => api.get('/requests/all', { params }),
  getRequestDetails: (id) => api.get(`/requests/${id}`),
  getRequestPdfBlob: (id) =>
    api.get(`/requests/${id}/pdf`, {
      responseType: 'blob',
    }),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
};

export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  clearAll: () => api.delete('/notifications'),
};

export const announcementApi = {
  getAll: () => api.get('/announcements'),
  create: (data) => api.post('/announcements', data),
};

export const pushApi = {
  getPublicKey: () => api.get('/push/public-key'),
  subscribe: (data) => api.post('/push/subscribe', data),
  unsubscribe: (data) => api.post('/push/unsubscribe', data),
  sendTest: () => api.post('/push/test'),
};

export const reportsApi = {
  getPermissions: () => api.get('/reports/permissions'),
  getData: (filters = {}) => api.post('/reports/data', filters),
  exportPdf: (filters = {}) =>
    api.post('/reports/export/pdf', filters, {
      responseType: 'blob',
    }),
  exportExcel: (filters = {}) =>
    api.post('/reports/export/excel', filters, {
      responseType: 'blob',
    }),
};

export default api;
