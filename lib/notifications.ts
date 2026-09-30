import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/api';
import { URLs } from '../config/urls';

// Configure notification presentation when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PUSH_TOKEN_KEY = '@push_device_token';

/**
 * Request notification permissions and register for push notifications.
 * Works on both Android (including Android 13+ POST_NOTIFICATIONS) and iOS.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Dhatri Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#059669',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Additional high-priority order update channel
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#2563EB',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      return cached || 'SIMULATOR_TOKEN';
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission was denied');
      return null;
    }

    // Retrieve Expo Push Token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = pushTokenData.data;
      console.log('✅ Registered Expo Push Token:', token);
    } catch (expoTokenErr) {
      console.warn('Failed to get Expo push token, falling back to device push token:', expoTokenErr);
      try {
        const deviceTokenData = await Notifications.getDevicePushTokenAsync();
        token = typeof deviceTokenData.data === 'string' ? deviceTokenData.data : JSON.stringify(deviceTokenData.data);
        console.log('✅ Registered Native Device Push Token:', token);
      } catch (deviceTokenErr) {
        console.error('Failed to get device push token:', deviceTokenErr);
      }
    }

    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error during push notification registration:', error);
  }

  return token;
}

/**
 * Retrieve cached token from local storage
 */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export interface NotificationItem {
  id: number | string;
  eventKey?: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Send registered push token to server for customer/driver updates
 */
export async function syncPushTokenWithBackend(token?: string | null): Promise<void> {
  const activeToken = token || (await getStoredPushToken());
  if (!activeToken) return;

  try {
    const authToken =
      (await AsyncStorage.getItem('@auth_token')) ||
      (await AsyncStorage.getItem('authToken'));

    if (!authToken) {
      console.log('Skipping push token sync: user not authenticated');
      return;
    }

    // Register token on backend
    await apiClient.post(URLs.DEVICE_TOKEN_REGISTER, {
      token: activeToken,
      platform: Platform.OS,
    });
    console.log('✅ Device push token synced successfully with backend');
  } catch (err) {
    console.log('Token sync notice:', err);
  }
}

/**
 * Fetch paginated in-app notifications
 */
export async function fetchCustomerNotifications(page: number = 1): Promise<NotificationsListResponse> {
  const response = await apiClient.get<NotificationsListResponse>(URLs.NOTIFICATIONS_LIST, {
    params: { page, limit: 20 },
  });
  return response.data;
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<{ message: string; updatedCount?: number }> {
  const response = await apiClient.put(URLs.NOTIFICATIONS_READ_ALL);
  return response.data;
}

/**
 * Mark a single notification as read by ID
 */
export async function markNotificationAsRead(id: string | number): Promise<{ message: string; id: number; isRead: boolean }> {
  const response = await apiClient.put(URLs.notificationRead(id));
  return response.data;
}

