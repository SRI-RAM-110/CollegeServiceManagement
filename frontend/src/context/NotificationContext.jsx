import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
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
import { registerFcmForUser, setNotificationHandlers } from '../services/fcmService';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  // Setup FCM handlers (tap navigation & foreground toasts)
  useEffect(() => {
    setNotificationHandlers({
      onNavigate: (url) => {
        if (url) {
          navigate(url);
        }
      },
      onToast: (msg, type, dur) => {
        showToast(msg, type, dur);
      },
    });
  }, [navigate, showToast]);

  // Request & register FCM on signed-in user flow
  useEffect(() => {
    if (isAuthenticated && user && Capacitor.isNativePlatform()) {
      registerFcmForUser(user);
    }
  }, [isAuthenticated, user?.userId, user?.email]);

  // Web Push State
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Foreground notification tracking refs (prevent initial spam or repeated alerts)
  const initialFetchDoneRef = useRef(false);
  const seenNotificationIdsRef = useRef(new Set());

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    if (!message) return;
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => {
      // Prevent duplicate identical toast from rendering simultaneously
      if (prev.some((t) => t.message === message && t.type === type)) {
        return prev;
      }
      return [...prev, { id, message, type }];
    });
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
      if (res.data && Array.isArray(res.data)) {
        const fetchedList = res.data;
        setNotifications(fetchedList);
        const unread = fetchedList.filter((n) => !n.read).length;
        setUnreadCount(unread);

        if (!initialFetchDoneRef.current) {
          // Initial load: show in-app alert if there are unread notifications
          const initialUnread = fetchedList.filter((n) => !n.read && (n.id || n._id));
          if (initialUnread.length === 1) {
            const item = initialUnread[0];
            showToast(`${item.title || 'Notification'}: ${item.message || ''}`, 'info', 5000);
          } else if (initialUnread.length > 1) {
            showToast(`You have ${initialUnread.length} unread notifications.`, 'info', 5000);
          }
          fetchedList.forEach((n) => {
            const notifId = n.id || n._id;
            if (notifId) seenNotificationIdsRef.current.add(String(notifId));
          });
          initialFetchDoneRef.current = true;
        } else {
          // Subsequent polling / resume cycle: identify genuinely NEW unread notifications
          const newUnreadItems = fetchedList.filter((n) => {
            const notifId = n.id || n._id;
            return !n.read && notifId && !seenNotificationIdsRef.current.has(String(notifId));
          });

          // Show visible foreground in-app toast for new arrival(s)
          if (newUnreadItems.length === 1) {
            const item = newUnreadItems[0];
            showToast(`${item.title || 'New Notification'}: ${item.message || ''}`, 'info', 5000);
          } else if (newUnreadItems.length > 1) {
            showToast(`You have ${newUnreadItems.length} new notifications.`, 'info', 5000);
          }

          // Mark all fetched items as seen so they won't trigger repeated toasts
          fetchedList.forEach((n) => {
            const notifId = n.id || n._id;
            if (notifId) seenNotificationIdsRef.current.add(String(notifId));
          });
        }
      }
    } catch (e) {
      // silently fail polling
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // 15s refresh

      // Resume polling immediately when app/tab becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchNotifications();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Listen to Capacitor native app state changes (resume from background)
      let appListener = null;
      if (Capacitor.isNativePlatform()) {
        CapApp.addListener('appStateChange', (state) => {
          if (state && state.isActive) {
            fetchNotifications();
          }
        }).then((handle) => {
          appListener = handle;
        }).catch(() => {});
      }

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (appListener && typeof appListener.remove === 'function') {
          appListener.remove();
        }
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      initialFetchDoneRef.current = false;
      seenNotificationIdsRef.current.clear();
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
