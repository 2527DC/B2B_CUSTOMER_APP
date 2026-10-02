import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { User, HelpCircle, LogOut, ChevronRight, ShoppingBag, Heart, Package, Store, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { Colors } from '@/constants/theme';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { wishlistCount } = useWishlist();

  const [orderCount, setOrderCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.8';

  const loadCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      // 1. Fetch orders count
      const ordersRes = await apiClient.get(`${URLs.API_URL}/order-by-delivery-status?lang=en`);
      if (ordersRes.data?.orders && Array.isArray(ordersRes.data.orders)) {
        setOrderCount(ordersRes.data.orders.length);
      }
    } catch (e) {
      // ignore
    }

    try {
      // 2. Fetch returns count
      const refundsRes = await apiClient.get(URLs.ALL_ORDER_REFUND_LIST);
      if (refundsRes.data?.refundOrders && Array.isArray(refundsRes.data.refundOrders)) {
        setReturnCount(refundsRes.data.refundOrders.length);
      }
    } catch (e) {
      // ignore
    }

    try {
      // 3. Fetch wallet balance
      const walletRes = await apiClient.get(URLs.WALLET);
      if (walletRes.data?.wallet?.balance !== undefined) {
        setWalletBalance(Number(walletRes.data.wallet.balance));
      }
    } catch (e) {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCounts();
    setRefreshing(false);
  };

  const menuItems = [
    {
      icon: ShoppingBag,
      title: 'My Orders',
      subtitle: 'Track and manage orders',
      onPress: () => router.push('/(tabs)/orders'),
    },
    {
      icon: Heart,
      title: 'Wishlist',
      subtitle: 'Your saved items',
      onPress: () => router.push('/wishlist'),
    },
    {
      icon: Package,
      title: 'Returns',
      subtitle: 'Return and exchange items',
      onPress: () => router.push({ pathname: '/(tabs)/orders', params: { tab: 'returns' } } as any),
    },
    {
      icon: HelpCircle,
      title: 'Help & Support',
      subtitle: 'Get help from us',
      onPress: () => router.push('/(tabs)'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push('/edit-profile')}
          activeOpacity={0.8}
        >
          <View style={styles.avatarContainer}>
            {user?.store_name ? (
              <Store size={32} color="#ffffff" strokeWidth={2} />
            ) : (
              <User size={36} color="#ffffff" strokeWidth={2} />
            )}
          </View>
          <View style={styles.profileInfo}>
            {user?.store_name ? (
              <>
                <Text style={styles.profileStoreTitle} numberOfLines={2}>
                  {user.store_name}
                </Text>
                <Text style={styles.profileUserNameSmall} numberOfLines={1}>
                  {user?.name || 'Customer'}
                </Text>
              </>
            ) : (
              <Text style={styles.profileStoreTitle} numberOfLines={2}>
                {user?.name || 'Customer'}
              </Text>
            )}
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email || (user?.phone ? `+91 ${user.phone}` : '')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/edit-profile')}
            activeOpacity={0.7}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Prominent Wallet Card */}
        <TouchableOpacity
          style={styles.walletCard}
          onPress={() => router.push('/wallet')}
          activeOpacity={0.85}
        >
          <View style={styles.walletCardLeft}>
            <View style={styles.walletIconCircle}>
              <Wallet size={20} color="#ffffff" strokeWidth={2.2} />
            </View>
            <View>
              <Text style={styles.walletCardTitle}>Dhatri Wallet</Text>
              <Text style={styles.walletCardSubtitle}>Refunds & balance</Text>
            </View>
          </View>
          <View style={styles.walletCardRight}>
            <Text style={styles.walletBalanceAmount}>₹{walletBalance.toFixed(2)}</Text>
            <View style={styles.walletActionRow}>
              <Text style={styles.walletActionText}>History</Text>
              <ChevronRight size={13} color="#059669" strokeWidth={2.5} />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/(tabs)/orders')}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{orderCount}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/wishlist')}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{wishlistCount}</Text>
            <Text style={styles.statLabel}>Wishlist</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push({ pathname: '/(tabs)/orders', params: { tab: 'returns' } } as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{returnCount}</Text>
            <Text style={styles.statLabel}>Returns</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  <Icon size={22} color={Colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={20} color="#cbd5e1" strokeWidth={2.5} />
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.logoutItem} onPress={logout} activeOpacity={0.7}>
            <View style={styles.logoutIconContainer}>
              <LogOut size={22} color="#ef4444" strokeWidth={2} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Version {appVersion}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileStoreTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  profileUserNameSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary10,
  },
  editButtonText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  logoutIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 14,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  walletCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  walletCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  walletCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  walletCardRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  walletBalanceAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  walletActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2,
  },
  walletActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 24,
  },
});
