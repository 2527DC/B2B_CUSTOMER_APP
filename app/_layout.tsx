import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/lib/notifications';

function RootLayoutNav() {
  const { isOnboarded, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Initialize push notifications and get permission/token
    registerForPushNotificationsAsync().catch((err) => {
      console.warn('Failed to initialize push notifications:', err);
    });

    // 2. Listener for foreground notification received
    const notificationSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Foreground Notification Received:', notification.request.content);
    });

    // 3. Listener for notification tapped by user
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📲 Notification Clicked:', response.notification.request.content);
      const data = response.notification.request.content.data;
      if (data?.orderId || data?.order_id) {
        const id = data.orderId || data.order_id;
        router.push(`/order/${id}` as any);
      } else if (data?.productId || data?.product_id) {
        const id = data.productId || data.product_id;
        router.push(`/product/${id}` as any);
      } else if (data?.route) {
        router.push(data.route as any);
      } else {
        router.push('/notifications' as any);
      }
    });

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Check if the current route is in the auth flow or welcome screen
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'welcome';

    if (!isOnboarded) {
      // If not onboarded, redirect to welcome page
      if (segments[0] !== 'welcome') {
        router.replace('/welcome');
      }
    } else if (!isAuthenticated) {
      // If onboarded but not authenticated, redirect to login unless already on login or register
      if (segments[0] !== 'login' && segments[0] !== 'register') {
        router.replace('/login');
      }
    } else if (isAuthenticated && inAuthGroup) {
      // If authenticated and trying to access welcome/login/register, redirect to tabs (home)
      router.replace('/(tabs)');
    }
  }, [isOnboarded, isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="brands" options={{ headerShown: false }} />
      <Stack.Screen name="brand/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <View style={styles.container}>
              <RootLayoutNav />
              <StatusBar style="auto" />
            </View>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

