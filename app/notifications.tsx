import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  ShoppingBag,
  Sparkles,
  Percent,
  Gift,
  Tag,
  Clock,
  Package,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import {
  fetchCustomerNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationItem,
} from '@/lib/notifications';

type FilterTab = 'all' | 'orders' | 'products_offers';

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format relative time helper
  const getRelativeTime = (isoString?: string): string => {
    if (!isoString) return 'Recently';
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return past.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Determine category & theme styling based on notification content
  const getNotificationCategory = (item: NotificationItem): 'order' | 'product' | 'offer' => {
    const event = (item.eventKey || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const body = (item.body || '').toLowerCase();
    const data = item.data || {};

    if (
      event.includes('order') ||
      event.includes('delivery') ||
      event.includes('dispatch') ||
      data.order_id ||
      data.orderId ||
      title.includes('order') ||
      body.includes('order')
    ) {
      return 'order';
    }

    if (
      event.includes('coupon') ||
      event.includes('offer') ||
      event.includes('deal') ||
      event.includes('discount') ||
      title.includes('offer') ||
      title.includes('discount') ||
      title.includes('deal') ||
      body.includes('coupon') ||
      body.includes('cashback')
    ) {
      return 'offer';
    }

    return 'product';
  };

  const loadNotifications = async (pageNum = 1, isPull = false) => {
    if (isPull) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      setError(null);
      const data = await fetchCustomerNotifications(pageNum);
      const newItems = data.notifications || [];

      if (pageNum === 1) {
        setNotifications(newItems);
      } else {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => String(n.id)));
          const filtered = newItems.filter((n) => !existingIds.has(String(n.id)));
          return [...prev, ...filtered];
        });
      }

      setPage(pageNum);
      setHasMore(pageNum < (data.totalPages || 1));
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadNotifications(1);
  }, []);

  const onRefresh = useCallback(() => {
    loadNotifications(1, true);
  }, []);

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadNotifications(page + 1);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || notifications.every((n) => n.isRead)) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // 1. Mark as read on backend & locally
    if (!item.isRead) {
      try {
        await markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // 2. Deep linking navigation
    const data = item.data || {};
    const orderId = data.order_id || data.orderId;
    const productId = data.product_id || data.productId;
    const route = data.route;

    if (orderId) {
      router.push(`/order/${orderId}` as any);
    } else if (productId) {
      router.push(`/product/${productId}` as any);
    } else if (route) {
      router.push(route as any);
    }
  };

  // Filter items based on active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'orders') {
      return notifications.filter((item) => getNotificationCategory(item) === 'order');
    }
    // 'products_offers'
    return notifications.filter((item) => {
      const cat = getNotificationCategory(item);
      return cat === 'product' || cat === 'offer';
    });
  }, [notifications, activeTab]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    const category = getNotificationCategory(item);

    // Style token determination
    let icon = <ShoppingBag size={20} color="#2563EB" />;
    let iconBg = '#EFF6FF'; // light blue

    if (category === 'order') {
      icon = <Package size={20} color="#059669" />;
      iconBg = '#ECFDF5'; // light emerald
    } else if (category === 'offer') {
      icon = <Percent size={20} color="#D97706" />;
      iconBg = '#FEF3C7'; // light amber
    } else {
      // product launch
      icon = <Sparkles size={20} color="#059669" />;
      iconBg = '#ECFDF5';
    }

    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread && styles.notificationCardUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeaderRow}>
          {/* Category Icon */}
          <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
            {icon}
          </View>

          {/* Title & Body */}
          <View style={styles.contentWrapper}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  isUnread && styles.notificationTitleUnread,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>

            <Text style={styles.notificationBody} numberOfLines={3}>
              {item.body}
            </Text>

            {/* Relative Timestamp */}
            <View style={styles.metaRow}>
              <Clock size={12} color="#94a3b8" />
              <Text style={styles.timestampText}>{getRelativeTime(item.createdAt)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>{unreadCount} new</Text>
            </View>
          )}
        </View>

        {/* Mark all as read button */}
        <TouchableOpacity
          style={[styles.markAllButton, unreadCount === 0 && styles.markAllButtonDisabled]}
          onPress={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
          activeOpacity={0.7}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : (
            <View style={styles.markAllInner}>
              <CheckCheck size={16} color={unreadCount > 0 ? '#059669' : '#94a3b8'} />
              <Text
                style={[
                  styles.markAllText,
                  unreadCount === 0 && styles.markAllTextDisabled,
                ]}
              >
                Read all
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products_offers' && styles.tabButtonActive]}
          onPress={() => setActiveTab('products_offers')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'products_offers' && styles.tabTextActive,
            ]}
          >
            Products & Offers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Notification List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Fetching notifications...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <BellOff size={48} color="#94a3b8" strokeWidth={1.5} />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadNotifications(1)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderNotificationItem}
          contentContainerStyle={[
            styles.listContent,
            filteredNotifications.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.listFooterLoading}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={40} color="#059669" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No Notifications Yet</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'all'
                  ? "You're all caught up! New order updates, promotional deals, and stock alerts will appear here."
                  : activeTab === 'orders'
                  ? 'No order updates currently available.'
                  : 'No product drops or promotional offers at this time.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerUnreadBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerUnreadText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllButtonDisabled: {
    opacity: 0.5,
  },
  markAllInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  markAllTextDisabled: {
    color: '#94A3B8',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: '#059669', // Emerald brand
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listFooterLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationCardUnread: {
    backgroundColor: '#ECFDF5', // Subtle Emerald highlight
    borderColor: '#A7F3D0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  notificationTitleUnread: {
    color: '#064E3B', // Deep emerald dark
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginLeft: 6,
  },
  notificationBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
