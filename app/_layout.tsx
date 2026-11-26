import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { View, StyleSheet, ActivityIndicator, BackHandler, Platform, ToastAndroid } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth, getOnboardingTargetPath } from '@/context/AuthContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartProvider } from '@/context/CartContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AppUpdateModal } from '@/components';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/lib/notifications';

// Keep the splash screen (with app logo) visible until resources and auth are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { isOnboarded, isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const lastBackPressRef = useRef(0);

  // Root level back handler for Android to prevent accidental app exits
  useEffect(() => {
    const onHardwareBack = () => {
      const inTabs = segments[0] === '(tabs)';
      if (inTabs && !router.canGoBack()) {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressRef.current = now;
        if (Platform.OS === 'android') {
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        }
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [segments, router]);

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
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (!isOnboarded) {
      // If not onboarded, redirect to welcome page
      if (segments[0] !== 'welcome') {
        router.replace('/welcome');
      }
      return;
    }

    if (!isAuthenticated) {
      // If onboarded but not authenticated, redirect to login unless already on login or register
      if (segments[0] !== 'login' && segments[0] !== 'register') {
        router.replace('/login');
      }
      return;
    }

    // Authenticated: route to whichever wizard step isn't finished yet, or home once it is.
    const targetPath = getOnboardingTargetPath(user);

    if (targetPath) {
      const currentPath = `/${segments.join('/')}`;
      if (!inOnboardingGroup) {
        // Incoming from outside onboarding (e.g. login or cold start): redirect to required step
        router.replace(targetPath as any);
      } else {
        // User is currently inside the onboarding group. Allow backward navigation to previous steps.
        const stepRank: Record<string, number> = {
          '/onboarding/warehouse': 1,
          '/onboarding/details': 2,
          '/onboarding/documents': 3,
          '/onboarding/pending-approval': 4,
        };
        const currentRank = stepRank[currentPath] || 0;
        const targetRank = stepRank[targetPath] || 0;

        if (targetPath === '/onboarding/pending-approval' && currentPath !== '/onboarding/pending-approval') {
          router.replace('/onboarding/pending-approval');
        } else if (currentRank > targetRank) {
          // Attempted to skip ahead to an uncompleted future step; redirect back to target
          router.replace(targetPath as any);
        }
        // If currentRank <= targetRank, user is allowed to navigate and edit previous steps freely.
      }
    } else if (inAuthGroup || inOnboardingGroup) {
      // Registration/onboarding is fully done: leave the wizard and land on the home tabs.
      router.replace('/(tabs)');
    }
  }, [isOnboarded, isAuthenticated, isLoading, user, segments]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/warehouse" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/details" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/documents" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/pending-approval" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="brands" options={{ headerShown: false }} />
      <Stack.Screen name="brand/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="checkout" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="wishlist" options={{ headerShown: false }} />
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
          <WishlistProvider>
            <CartProvider>
              <View style={styles.container}>
                <RootLayoutNav />
                <AppUpdateModal />
                <StatusBar style="auto" />
              </View>
            </CartProvider>
          </WishlistProvider>
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

