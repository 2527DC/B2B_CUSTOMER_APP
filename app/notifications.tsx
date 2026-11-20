import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { goBack } from '@/lib/navigation';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Sparkles,
  Percent,
  Package,
  FileText,
  Truck,
  CheckCircle2,
  PackageCheck,
  XCircle,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { URLs } from '@/config/urls';
import {
  fetchCustomerNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationItem,
} from '@/lib/notifications';

type FilterTab = 'all' | 'orders' | 'products_offers';

interface NotificationVisuals {
  typeTag: string;
  tagColor: string;
  tagBg: string;
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  actionText?: string;
  productImage?: string | null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  // Determine dynamic event visuals for modern B2B clarity
  const getNotificationVisuals = (item: NotificationItem): NotificationVisuals => {
    const event = (item.eventKey || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const body = (item.body || '').toLowerCase();
    const data = item.data || {};

    const textToMatch = `${event} ${title} ${body}`;

    // 1. Tax Invoice / GST Billing
    if (
      textToMatch.includes('invoice') ||
      textToMatch.includes('tax') ||
      textToMatch.includes('bill') ||
      textToMatch.includes('#bom') ||
      textToMatch.includes('gst')
    ) {
      return {
        typeTag: 'TAX INVOICE',
        tagColor: '#7c3aed',
        tagBg: '#f5f3ff',
        icon: <FileText size={20} color="#7c3aed" strokeWidth={2.2} />,
        iconBg: '#f5f3ff',
        iconBorder: '#ddd6fe',
        actionText: 'View Invoice ›',
      };
    }

    // 2. Out for Delivery / Dispatch in-transit
    if (
      textToMatch.includes('out for delivery') ||
      textToMatch.includes('dispatched') ||
      textToMatch.includes('in transit') ||
      textToMatch.includes('on the way')
    ) {
      return {
        typeTag: 'IN TRANSIT',
        tagColor: '#2563eb',
        tagBg: '#eff6ff',
        icon: <Truck size={20} color="#2563eb" strokeWidth={2.2} />,
        iconBg: '#eff6ff',
        iconBorder: '#bfdbfe',
        actionText: 'Track Delivery ›',
      };
    }

    // 3. Delivered
    if (textToMatch.includes('delivered') || textToMatch.includes('delivered successfully')) {
      return {
        typeTag: 'DELIVERED',
        tagColor: '#16a34a',
        tagBg: '#dcfce7',
        icon: <PackageCheck size={20} color="#16a34a" strokeWidth={2.2} />,
        iconBg: '#f0fdf4',
        iconBorder: '#bbf7d0',
        actionText: 'View Order ›',
      };
    }

    // 4. Confirmed / Received
    if (
      textToMatch.includes('confirmed') ||
      textToMatch.includes('order received') ||
      textToMatch.includes('order placed')
    ) {
      return {
        typeTag: 'ORDER CONFIRMED',
        tagColor: '#059669',
        tagBg: '#ecfdf5',
        icon: <CheckCircle2 size={20} color="#059669" strokeWidth={2.2} />,
        iconBg: '#ecfdf5',
        iconBorder: '#a7f3d0',
        actionText: 'Track Order ›',
      };
    }

    // 5. Cancelled / Rejected
    if (textToMatch.includes('cancel') || textToMatch.includes('reject') || textToMatch.includes('failed')) {
      return {
        typeTag: 'ORDER CANCELLED',
        tagColor: '#dc2626',
        tagBg: '#fef2f2',
        icon: <XCircle size={20} color="#dc2626" strokeWidth={2.2} />,
        iconBg: '#fef2f2',
        iconBorder: '#fecaca',
        actionText: 'View Details ›',
      };
    }

    // 6. Offers / Coupons / Discounts
    if (
      textToMatch.includes('coupon') ||
      textToMatch.includes('offer') ||
      textToMatch.includes('discount') ||
      textToMatch.includes('deal') ||
      textToMatch.includes('cashback')
    ) {
      return {
        typeTag: 'SPECIAL DEAL',
        tagColor: '#d97706',
        tagBg: '#fef3c7',
        icon: <Percent size={20} color="#d97706" strokeWidth={2.2} />,
        iconBg: '#fffbeb',
        iconBorder: '#fde68a',
        actionText: 'Claim Offer ›',
      };
    }

    // 7. Product Drops / Catalog launches
    const productImg = data.thumbnail_image_source || data.image_url || data.product_image;
    if (
      textToMatch.includes('product') ||
      textToMatch.includes('launch') ||
      textToMatch.includes('new arrival') ||
      textToMatch.includes('stock')
    ) {
      return {
        typeTag: 'NEW IN STOCK',
        tagColor: '#059669',
        tagBg: '#ecfdf5',
        icon: <Sparkles size={20} color="#059669" strokeWidth={2.2} />,
        iconBg: '#ecfdf5',
        iconBorder: '#a7f3d0',
        productImage: productImg ? URLs.assetUrl(productImg) : null,
        actionText: 'Explore Catalog ›',
      };
    }

    // Default Order Update fallback
    if (data.order_id || data.orderId || textToMatch.includes('order')) {
      return {
        typeTag: 'ORDER UPDATE',
        tagColor: '#059669',
        tagBg: '#ecfdf5',
        icon: <Package size={20} color="#059669" strokeWidth={2.2} />,
        iconBg: '#ecfdf5',
        iconBorder: '#a7f3d0',
        actionText: 'View Order ›',
      };
    }

    // 8. General Notification
    return {
      typeTag: 'UPDATE',
      tagColor: '#475569',
      tagBg: '#f1f5f9',
      icon: <Bell size={20} color="#475569" strokeWidth={2.2} />,
      iconBg: '#f8fafc',
      iconBorder: '#e2e8f0',
      actionText: 'View Notice ›',
    };
  };

  const getNotificationCategory = (item: NotificationItem): 'order' | 'product' | 'offer' => {
    const event = (item.eventKey || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const body = (item.body || '').toLowerCase();
    const data = item.data || {};

    if (
      event.includes('order') ||
      event.includes('delivery') ||
      event.includes('dispatch') ||
      event.includes('invoice') ||
      data.order_id ||
      data.orderId ||
      title.includes('order') ||
      title.includes('invoice') ||
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
    const visuals = getNotificationVisuals(item);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUnread && styles.notificationCardUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.85}
      >
        {/* Card Top Row: Type Tag + Relative Time + Unread Dot */}
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, { backgroundColor: visuals.tagBg }]}>
            <Text style={[styles.typeBadgeText, { color: visuals.tagColor }]}>
              {visuals.typeTag}
            </Text>
          </View>

          <View style={styles.timeWrap}>
            <Text style={styles.timestampText}>{getRelativeTime(item.createdAt)}</Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>

        {/* Card Body: Icon/Image + Content */}
        <View style={styles.cardBodyRow}>
          {/* Dynamic Modern Icon / Product Thumbnail */}
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: visuals.iconBg, borderColor: visuals.iconBorder },
            ]}
          >
            {visuals.productImage ? (
              <Image
                source={{ uri: visuals.productImage }}
                style={styles.productThumb}
                resizeMode="cover"
              />
            ) : (
              visuals.icon
            )}
          </View>

          {/* Title & Body */}
          <View style={styles.contentWrapper}>
            <Text
              style={[
                styles.notificationTitle,
                isUnread && styles.notificationTitleUnread,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text style={styles.notificationBody} numberOfLines={3}>
              {item.body}
            </Text>

            {/* Action hint link */}
            {visuals.actionText && (
              <View style={styles.actionRow}>
                <Text style={styles.actionText}>{visuals.actionText}</Text>
              </View>
            )}
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
          onPress={() => goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0f172a" strokeWidth={2.4} />
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
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View style={styles.markAllInner}>
              <CheckCheck size={16} color={unreadCount > 0 ? Colors.primary : '#94a3b8'} strokeWidth={2.4} />
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
          <ActivityIndicator size="large" color={Colors.primary} />
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
            { paddingBottom: Math.max(insets.bottom + 16, 28) },
            filteredNotifications.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.listFooterLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={40} color={Colors.primary} strokeWidth={1.5} />
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
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
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerUnreadBadge: {
    backgroundColor: Colors.primary10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  headerUnreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
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
    fontWeight: '700',
    color: Colors.primary,
  },
  markAllTextDisabled: {
    color: '#94a3b8',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
    color: '#64748b',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    borderColor: '#cbd5e1',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productThumb: {
    width: '100%',
    height: '100%',
  },
  contentWrapper: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 19,
    marginBottom: 3,
  },
  notificationTitleUnread: {
    color: '#0f172a',
    fontWeight: '800',
  },
  notificationBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
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
    backgroundColor: Colors.primary10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
