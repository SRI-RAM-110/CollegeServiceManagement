import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { pushApi } from './api';

const FCM_TOKEN_KEY = 'fcm_device_token';
const FCM_TOKEN_OWNER_KEY = 'fcm_token_owner';
export const NOTIFICATION_CHANNEL_ID = 'college_services_channel';

let listenersInitialized = false;
let navigationHandler = null;
let foregroundToastHandler = null;

export const setNotificationHandlers = ({ onNavigate, onToast }) => {
  if (onNavigate) navigationHandler = onNavigate;
  if (onToast) foregroundToastHandler = onToast;
};

export const getLocalDeviceToken = () => {
  try {
    return localStorage.getItem(FCM_TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

export const getLocalTokenOwner = () => {
  try {
    return localStorage.getItem(FCM_TOKEN_OWNER_KEY);
  } catch (e) {
    return null;
  }
};

export const setupNotificationChannel = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await PushNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'College Services Alerts',
      description: 'Instant alerts for booking approvals, reschedules, cancellations, and duty assignments',
      importance: 5, // High importance (heads-up banner and sound)
      visibility: 1, // Public
      sound: 'default',
      vibration: true,
    });
  } catch (err) {
    console.warn('Failed to create notification channel:', err);
  }
};

export const initPushListeners = () => {
  if (!Capacitor.isNativePlatform() || listenersInitialized) return;

  PushNotifications.addListener('registration', async (token) => {
    const tokenVal = token?.value;
    if (!tokenVal) return;
    try {
      localStorage.setItem(FCM_TOKEN_KEY, tokenVal);
      // If user is currently signed in, register token with backend
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const currentUserId = currentUser?.userId || currentUser?.email;
      const lastOwner = localStorage.getItem(FCM_TOKEN_OWNER_KEY);

      if (currentUserId && (lastOwner !== currentUserId || !lastOwner)) {
        await pushApi.registerDeviceToken({
          token: tokenVal,
          platform: 'ANDROID',
          deviceModel: navigator.userAgent,
        });
        localStorage.setItem(FCM_TOKEN_OWNER_KEY, currentUserId);
      }
    } catch (e) {
      console.warn('Failed to sync FCM registration token with backend:', e);
    }
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.warn('FCM registration error:', error);
  });

  // Handle notifications received when app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const title = notification.title || 'New Notification';
    const body = notification.body || '';
    if (foregroundToastHandler) {
      foregroundToastHandler(`${title}: ${body}`, 'info', 5000);
    }
  });

  // Handle user tapping on a notification in the system notification tray
  PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
    const data = notificationAction.notification?.data || {};
    const targetUrl = data.url || '/notifications';
    if (navigationHandler) {
      navigationHandler(targetUrl);
    }
  });

  listenersInitialized = true;
};

export const registerFcmForUser = async (user) => {
  if (!Capacitor.isNativePlatform()) return;
  if (!user) return;
  const currentUserId = user.userId || user.email;
  if (!currentUserId) return;

  try {
    await setupNotificationChannel();
    initPushListeners();

    // Check existing permissions first (avoids repeated prompt)
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return;
    }

    // Register with FCM to ensure fresh token
    await PushNotifications.register();

    // If we have a cached token, register or update ownership on backend
    const cachedToken = getLocalDeviceToken();
    const lastOwner = getLocalTokenOwner();

    if (cachedToken && (lastOwner !== currentUserId || !lastOwner)) {
      await pushApi.registerDeviceToken({
        token: cachedToken,
        platform: 'ANDROID',
        deviceModel: navigator.userAgent,
      });
      localStorage.setItem(FCM_TOKEN_OWNER_KEY, currentUserId);
    }
  } catch (err) {
    console.warn('Failed to register FCM for user:', err);
  }
};

export const unregisterFcmOnLogout = async () => {
  if (!Capacitor.isNativePlatform()) {
    try {
      localStorage.removeItem(FCM_TOKEN_OWNER_KEY);
    } catch (e) {}
    return;
  }

  try {
    const cachedToken = getLocalDeviceToken();
    if (cachedToken) {
      // Unregister token from backend using current authenticated session
      await pushApi.unregisterDeviceToken(cachedToken).catch(() => {});
    }
  } catch (err) {
    console.warn('Error during FCM unregister on logout:', err);
  } finally {
    try {
      localStorage.removeItem(FCM_TOKEN_OWNER_KEY);
    } catch (e) {}
  }
};

