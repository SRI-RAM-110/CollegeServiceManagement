// Web Push Client Service
import { pushApi } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const getPermissionState = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

export const getExistingSubscription = async () => {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('Error checking existing push subscription:', err);
    return null;
  }
};

export const subscribeUserToPush = async () => {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission for notifications was denied by user.');
  }

  // Register service worker
  const reg = await registerServiceWorker();
  if (!reg) {
    throw new Error('Could not register service worker.');
  }

  await navigator.serviceWorker.ready;

  // Retrieve VAPID public key from backend
  const keyRes = await pushApi.getPublicKey();
  const vapidPublicKey = keyRes.data?.publicKey;
  if (!vapidPublicKey) {
    throw new Error('Failed to retrieve VAPID public key from server.');
  }

  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

  // Subscribe with PushManager
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  });

  const subJson = subscription.toJSON();

  // Send subscription to backend
  await pushApi.subscribe({
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys?.p256dh,
      auth: subJson.keys?.auth,
    },
  });

  return subscription;
};

export const unsubscribeUserFromPush = async () => {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      try {
        await pushApi.unsubscribe({ endpoint });
      } catch (ignored) {}
      return true;
    }
  } catch (err) {
    console.warn('Error unsubscribing:', err);
  }
  return false;
};

export const sendTestPushNotification = async () => {
  return await pushApi.sendTest();
};
