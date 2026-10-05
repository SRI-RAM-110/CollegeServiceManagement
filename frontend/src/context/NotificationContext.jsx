import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../services/api';
import { useAuth } from './AuthContext';
import {
  isPushSupported,
  getPermissionState,
  getExistingSubscription,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  sendTestPushNotification,
} from '../services/pushService';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  // Web Push State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const checkPushStatus = useCallback(async () => {
    const supported = isPushSupported();
    setPushSupported(supported);
    if (!supported) return;

    const perm = getPermissionState();
    setPushPermission(perm);

    if (perm === 'granted') {
      const existing = await getExistingSubscription();
      setIsPushSubscribed(!!existing);
      // Auto-register subscription on backend if already granted
      if (!existing && isAuthenticated) {
        try {
          await subscribeUserToPush();
          setIsPushSubscribed(true);
        } catch (e) {
          // ignore auto-subscribe failure
        }
      }
    } else {
      setIsPushSubscribed(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkPushStatus();
  }, [checkPushStatus]);

  const enablePush = async () => {
    setPushLoading(true);
    try {
      await subscribeUserToPush();
      setIsPushSubscribed(true);
      setPushPermission('granted');
      showToast('Browser Push Notifications enabled successfully!', 'success');
      return true;
    } catch (err) {
      setPushPermission(getPermissionState());
      showToast(err.message || 'Failed to enable push notifications', 'error');
      return false;
    } finally {
      setPushLoading(false);
    }
  };

  const disablePush = async () => {
    setPushLoading(true);
    try {
      await unsubscribeUserFromPush();
      setIsPushSubscribed(false);
      showToast('Browser Push Notifications disabled', 'info');
      return true;
    } catch (err) {
      showToast(err.message || 'Failed to disable push notifications', 'error');
      return false;
    } finally {
      setPushLoading(false);
    }
  };

  const testPush = async () => {
    try {
      await sendTestPushNotification();
      showToast('Test push notification dispatched! Check your desktop.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to send test push notification', 'error');
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationApi.getAll();
      if (res.data) {
        setNotifications(res.data);
        const unread = res.data.filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      // silently fail polling
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // 15s refresh
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const clearNotifications = async () => {
    try {
      await notificationApi.clearAll();
      setNotifications([]);
      setUnreadCount(0);
      showToast('Notifications cleared', 'success');
      return true;
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      showToast(err.response?.data?.message || err.message || 'Failed to clear notifications', 'error');
      throw err;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        showToast,
        addToast: showToast,
        // Web Push Exports
        pushSupported,
        pushPermission,
        isPushSubscribed,
        pushLoading,
        enablePush,
        disablePush,
        testPush,
      }}
    >
      {children}
      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
