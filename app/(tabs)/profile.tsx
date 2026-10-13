import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, RefreshControl, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Bell, HelpCircle, LogOut, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { Colors, getComponentTheme } from '@/constants/theme';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import ProfileHeader from '@/components/profile/ProfileHeader';
import {
  BusinessDetailsCard,
  DropLocationCard,
  SalesRepCard,
  SectionTitle,
  ShopFilesCard,
  StatTiles,
  WalletCard,
  isPdfUrl,
  type DropLocationStatus,
  type DropLocationSummary,
  type SalesRep,
} from '@/components/profile/ProfileCards';
import MenuGroup from '@/components/profile/MenuGroup';
import HelpSheet from '@/components/profile/HelpSheet';
import FilePreviewModal from '@/components/profile/FilePreviewModal';

const badge = getComponentTheme(Colors).badge;
const TAB_BAR_HEIGHT = 85;
/** order_status values from the orders API that mean "still on its way". */
const ACTIVE_ORDER_STATUSES = new Set([1, 2, 3]);

interface ProfileData {
  orderCount: number | null;
  activeOrderCount: number;
  returnCount: number | null;
  walletBalance: number | null;
  location: DropLocationSummary | null;
  rep: SalesRep | null;
}

const EMPTY: ProfileData = {
  orderCount: null,
  activeOrderCount: 0,
  returnCount: null,
  walletBalance: null,
  location: null,
  rep: null,
};

function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, isAuthenticated, refreshUser } = useAuth();
  const { wishlistCount } = useWishlist();

  const [data, setData] = useState<ProfileData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // Fades in a solid bar behind the status bar once the green header has scrolled away.
  const [scrollY] = useState(() => new Animated.Value(0));
  const statusBarScrim = scrollY.interpolate({ inputRange: [140, 200], outputRange: [0, 1], extrapolate: 'clamp' });

  const mounted = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const appVersion = Constants.expoConfig?.version ?? '';

  /** Loads every card in parallel. Each source fails independently and loading always ends. */
  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;

    const [ordersRes, refundsRes, walletRes, locationRes] = await Promise.allSettled([
      apiClient.get(`${URLs.API_URL}/order-by-delivery-status?lang=en`),
      apiClient.get(URLs.ALL_ORDER_REFUND_LIST),
      apiClient.get(URLs.WALLET),
      apiClient.get(URLs.CUSTOMER_DROP_LOCATION_CURRENT),
    ]);

    if (!mounted.current || id !== requestId.current) return;

    setData((prev) => {
      const next: ProfileData = { ...prev };

      if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data?.orders)) {
        const orders: any[] = ordersRes.value.data.orders;
        next.orderCount = orders.length;
        next.activeOrderCount = orders.filter((o) => ACTIVE_ORDER_STATUSES.has(Number(o?.order_status))).length;
        // Orders are newest first; the API falls back to the store's assigned salesman.
        const withRep = orders.find((o) => o?.salesman?.name || o?.salesman_name);
        next.rep = withRep
          ? {
              name: withRep.salesman?.name || withRep.salesman_name,
              phone: withRep.salesman?.phone || withRep.salesman_phone || null,
              code: withRep.salesman?.salesman_code || null,
            }
          : prev.rep;
      } else if (prev.orderCount === null) {
        next.orderCount = 0;
      }

      if (refundsRes.status === 'fulfilled' && Array.isArray(refundsRes.value.data?.refundOrders)) {
        next.returnCount = refundsRes.value.data.refundOrders.length;
      } else if (prev.returnCount === null) {
        next.returnCount = 0;
      }

      if (walletRes.status === 'fulfilled') {
        const raw = walletRes.value.data?.wallet?.balance ?? walletRes.value.data?.balance;
        if (raw !== undefined && raw !== null && !Number.isNaN(Number(raw))) next.walletBalance = Number(raw);
        else if (prev.walletBalance === null) next.walletBalance = 0;
      } else if (prev.walletBalance === null) {
        next.walletBalance = 0;
      }

      if (locationRes.status === 'fulfilled' && locationRes.value.data?.success !== false) {
        const info = locationRes.value.data;
        next.location = {
          status: (info?.status as DropLocationStatus) || 'NONE',
          address: info?.activeLocation?.address || null,
          pendingAddress: info?.pendingLocation?.address || null,
          rejectionReason: info?.rejectionReason || null,
        };
      }

      return next;
    });
    setLoading(false);
  }, [isAuthenticated]);

  // First load also refreshes the user, so hub and verification status are current.
  useEffect(() => {
    refreshUser().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload counts whenever the tab regains focus (e.g. after placing an order).
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([loadData(), refreshUser()]);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  };

  const openEdit = () => router.push('/edit-profile');
  const openOrders = () => router.push('/(tabs)/orders');
  const openReturns = () => router.push({ pathname: '/(tabs)/orders', params: { tab: 'returns' } } as any);

  const callRep = () => {
    if (!data.rep?.phone) return;
    Linking.openURL(`tel:${data.rep.phone}`).catch(() => Alert.alert('Unable to call', 'Please try again from your phone dialler.'));
  };
  const whatsAppRep = () => {
    if (!data.rep?.phone) return;
    const url = `https://wa.me/${toWhatsAppNumber(data.rep.phone)}?text=${encodeURIComponent(
      `Hi ${data.rep.name}, this is ${user?.store_name || user?.name || 'a Dhatri store'}.`,
    )}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp unavailable', 'Please install WhatsApp or call instead.'));
  };
  const shopPhoto = user?.shop_image_url ? URLs.assetUrl(user.shop_image_url) : null;
  const shopDocument = user?.document_url ? URLs.assetUrl(user.document_url) : null;
  // Images open full screen in the app; a PDF needs the browser's viewer
  const viewFile = (url: string) => {
    if (!isPdfUrl(url)) {
      setPreviewUri(url);
      return;
    }
    WebBrowser.openBrowserAsync(url).catch(() =>
      Alert.alert('Unable to open', 'Please check your connection and try again.'),
    );
  };

  const openPrivacy = () => {
    WebBrowser.openBrowserAsync(`${URLs.HOST}/privacy-policy`).catch(() =>
      Alert.alert('Unable to open', 'Please check your connection and try again.'),
    );
  };

  const confirmLogout = () => {
    Alert.alert('Log out of Dhatri?', 'You will need to verify your mobile number again to sign in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <ProfileHeader user={user} topInset={insets.top} onEdit={openEdit} />

        <View style={styles.body}>
          <View style={styles.overlap}>
            <WalletCard balance={data.walletBalance} loading={loading} onPress={() => router.push('/wallet')} />
          </View>

          <StatTiles
            tiles={[
              {
                key: 'orders',
                label: 'Orders',
                value: data.orderCount,
                icon: 'orders',
                chip: data.activeOrderCount > 0 ? `${data.activeOrderCount} active` : null,
                onPress: openOrders,
              },
              { key: 'wishlist', label: 'Wishlist', value: wishlistCount ?? 0, icon: 'wishlist', onPress: () => router.push('/wishlist') },
              { key: 'returns', label: 'Returns', value: data.returnCount, icon: 'returns', onPress: openReturns },
            ]}
          />

          <SectionTitle>Delivery</SectionTitle>
          <DropLocationCard location={data.location} loading={loading && !data.location} onPress={() => router.push('/location/select' as any)} />

          {data.rep ? (
            <>
              <SectionTitle>Your Dhatri contact</SectionTitle>
              <SalesRepCard rep={data.rep} onCall={callRep} onWhatsApp={whatsAppRep} />
            </>
          ) : null}

          <SectionTitle>Business details</SectionTitle>
          <BusinessDetailsCard gstNumber={user?.gst_number} hubName={user?.warehouse?.name} onEdit={openEdit} />

          <SectionTitle>Shop photo & documents</SectionTitle>
          <ShopFilesCard shopImageUrl={shopPhoto} documentUrl={shopDocument} onView={viewFile} onEdit={openEdit} />

          <SectionTitle>Settings & support</SectionTitle>
          <MenuGroup
            rows={[
              { key: 'notifications', icon: Bell, title: 'Notifications', subtitle: 'Order updates and offers', onPress: () => router.push('/notifications') },
              {
                key: 'help',
                icon: HelpCircle,
                title: 'Help & support',
                subtitle: data.rep ? `Talk to ${data.rep.name}` : 'Order issues and contact options',
                onPress: () => setHelpOpen(true),
              },
              { key: 'privacy', icon: ShieldCheck, title: 'Privacy policy', onPress: openPrivacy },
            ]}
          />

          <TouchableOpacity style={styles.logout} onPress={confirmLogout} activeOpacity={0.8} accessibilityRole="button">
            <LogOut size={18} color={badge.dangerText} strokeWidth={2.4} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Dhatri B2B{appVersion ? `  ·  Version ${appVersion}` : ''}</Text>
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[styles.statusBarScrim, { height: insets.top, opacity: statusBarScrim }]}
      />

      <FilePreviewModal uri={previewUri} topInset={insets.top} onClose={() => setPreviewUri(null)} />

      <HelpSheet
        visible={helpOpen}
        bottomInset={insets.bottom}
        rep={data.rep}
        onClose={() => setHelpOpen(false)}
        onCallRep={() => {
          setHelpOpen(false);
          callRep();
        }}
        onWhatsAppRep={() => {
          setHelpOpen(false);
          whatsAppRep();
        }}
        onOpenOrders={() => {
          setHelpOpen(false);
          openOrders();
        }}
        onOpenPrivacy={() => {
          setHelpOpen(false);
          openPrivacy();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    paddingHorizontal: 16,
  },
  statusBarScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  overlap: {
    marginTop: -40,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: badge.dangerBg,
    backgroundColor: Colors.surface,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: badge.dangerText,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 16,
  },
});
