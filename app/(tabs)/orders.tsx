import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import {
  Package,
  RotateCcw,
  Truck,
  UserCheck,
  ShieldAlert,
  ChevronRight,
  Search,
  X,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';
import OrderCard from '@/components/orders/OrderCard';
import { OfflineView } from '@/components';
import { getFriendlyErrorMessage, FormattedError } from '@/lib/network';

// ─── Base URL and Asset Helper ──────────────────────────────────────────────
const assetUrl = (path?: string): string => URLs.assetUrl(path);

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

// ─── Type Definitions ────────────────────────────────────────────────────────
type TabType = 'orders' | 'returns';

interface ProductDetails {
  id: number;
  product_name: string;
  thum_img?: string;
  product?: {
    thumbnail_image_source?: string;
    product_name?: string;
  };
}

interface SkuDetails {
  id: number;
  selling_price: number;
  product?: ProductDetails;
}

interface OrderProductItem {
  id: number;
  qty: number;
  price: number;
  total_price: number;
  seller_product_sku?: SkuDetails;
}

interface OrderPackage {
  id: number;
  package_code: string;
  delivery_status: string | number;
  products: OrderProductItem[];
}

interface ApiOrder {
  id: number;
  order_number: string;
  grand_total: number | string;
  created_at: string;
  status?: string;
  order_status?: number;
  is_rto?: boolean;
  rto_reason?: string | null;
  note?: string | null;
  cancel_reason?: string | null;
  packages?: OrderPackage[];
  items?: OrderProductItem[];
  salesman_name?: string | null;
  salesman_phone?: string | null;
  salesman?: { id: number; name: string; phone?: string; salesman_code?: string } | null;
  can_cancel?: boolean;
  can_return?: boolean;
}

// Refund / Return Request Types
interface ApiRefundProductItem {
  id: number;
  product_sku_id?: number;
  product_name: string;
  product_image?: string;
  sku?: string;
  unit?: string;
  return_qty: number;
  return_amount: number | string;
  reason?: string;
}

interface RefundProduct {
  id: number;
  return_qty: number;
  return_amount: number | string;
  seller_product_sku?: SkuDetails;
}

interface RefundDetail {
  id: number;
  processing_state: string | number;
  refund_products: RefundProduct[];
}

interface ApiRefund {
  id: number;
  order_id: number;
  order_number?: string;
  order_date?: string;
  order_status?: string;
  payment_method?: string;
  warehouse_name?: string;
  status?: string;
  total_amount?: number | string;
  total_return_amount?: number | string;
  created_at: string;
  rejection_note?: string;
  driver?: {
    id?: number;
    name: string;
    phone: string;
    vehicle_number?: string;
  } | null;
  items?: ApiRefundProductItem[];
  // Legacy backward compat fields
  refund_state?: string | number;
  is_confirmed?: number;
  is_refunded?: number;
  is_completed?: number;
  refund_details?: RefundDetail[];
}

interface StatusChip {
  id: number;
  label: string;
  dotColor: string;
}

const ORDER_STATUS_CHIPS: StatusChip[] = [
  { id: 0, label: 'All', dotColor: '#64748b' },
  { id: 1, label: 'Pending', dotColor: '#f59e0b' },
  { id: 2, label: 'Confirmed', dotColor: '#0284c7' },
  { id: 3, label: 'Out for Delivery', dotColor: '#6366f1' },
  { id: 5, label: 'Delivered', dotColor: '#10b981' },
  { id: 6, label: 'RTO / Returned', dotColor: '#f97316' },
  { id: 4, label: 'Cancelled', dotColor: '#ef4444' },
];

interface ReturnStatusChip {
  id: string;
  label: string;
  dotColor: string;
}

const RETURN_STATUS_CHIPS: ReturnStatusChip[] = [
  { id: 'ALL', label: 'All Returns', dotColor: '#64748b' },
  { id: 'REQUESTED', label: 'Requested', dotColor: '#f59e0b' },
  { id: 'DRIVER_ASSIGNED', label: 'Driver Assigned', dotColor: '#0284c7' },
  { id: 'PICKED_UP', label: 'Picked Up', dotColor: '#6366f1' },
  { id: 'RECEIVED_AT_WAREHOUSE', label: 'At Warehouse', dotColor: '#8b5cf6' },
  { id: 'COMPLETED', label: 'Refunded', dotColor: '#10b981' },
  { id: 'REJECTED', label: 'Rejected', dotColor: '#ef4444' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tab, status: statusParam } = useLocalSearchParams<{ tab?: string; status?: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>(tab === 'returns' ? 'returns' : 'orders');

  useEffect(() => {
    if (tab === 'returns') {
      setActiveTab('returns');
    } else if (tab === 'orders') {
      setActiveTab('orders');
    }
  }, [tab]);

  const [selectedStatus, setSelectedStatus] = useState<number>(() => {
    if (statusParam !== undefined && statusParam !== null) {
      const s = parseInt(statusParam, 10);
      if (!isNaN(s)) return s;
    }
    return 0; // Default to 'All'
  });

  useEffect(() => {
    if (statusParam !== undefined && statusParam !== null) {
      const s = parseInt(statusParam, 10);
      if (!isNaN(s)) setSelectedStatus(s);
    }
  }, [statusParam]);

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [refunds, setRefunds] = useState<ApiRefund[]>([]);

  // Search and return filter states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReturnStatus, setSelectedReturnStatus] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorInfo, setErrorInfo] = useState<FormattedError | null>(null);

  // Active in-transit orders counter
  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      const isRto = o.is_rto || o.status === 'RTO_INITIATED' || o.status === 'RTO_COMPLETED';
      if (isRto || o.status === 'CANCELLED') return false;
      const raw = o.packages?.[0]?.delivery_status ?? o.order_status ?? 1;
      const s = typeof raw === 'string' ? parseInt(raw, 10) : raw;
      return s === 1 || s === 2 || s === 3;
    }).length;
  }, [orders]);

  // Client-side search filtering
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      if (o.order_number?.toLowerCase().includes(q)) return true;
      if (String(o.id).includes(q)) return true;
      if (o.salesman_name?.toLowerCase().includes(q)) return true;
      const inItems = (o.items || []).some((item) => {
        const name = item.seller_product_sku?.product?.product_name || '';
        return name.toLowerCase().includes(q);
      });
      if (inItems) return true;
      const inPackages = (o.packages || []).some((pkg) =>
        (pkg.products || []).some((p) => {
          const name = p.seller_product_sku?.product?.product_name || '';
          return name.toLowerCase().includes(q);
        })
      );
      return inPackages;
    });
  }, [orders, searchQuery]);

  const filteredRefunds = useMemo(() => {
    let list = refunds;
    if (selectedReturnStatus !== 'ALL') {
      list = list.filter((r) => {
        const st = (r.status || '').toUpperCase();
        if (selectedReturnStatus === 'COMPLETED') {
          return st === 'REFUNDED' || r.is_completed === 1 || r.is_refunded === 1;
        }
        return st === selectedReturnStatus;
      });
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((r) => {
      if (String(r.id).includes(q)) return true;
      if (r.order_number?.toLowerCase().includes(q)) return true;
      return (r.items || []).some((i) => (i.product_name || '').toLowerCase().includes(q));
    });
  }, [refunds, selectedReturnStatus, searchQuery]);

  // ─── Fetching Logic ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (isRefreshed = false) => {
    if (!isAuthenticated) return;
    if (!isRefreshed) setLoading(true);
    setErrorInfo(null);
    try {
      const url = selectedStatus === 0
        ? `${URLs.API_URL}/order-by-delivery-status?lang=en`
        : `${URLs.API_URL}/order-by-delivery-status?status=${selectedStatus}&lang=en`;
      console.log('[Orders] Loading URL:', url);
      const response = await apiClient.get(url);
      if (response.status === 200 && response.data?.orders) {
        setOrders(response.data.orders);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setOrders([]);
      } else {
        console.error('[Orders] Fetch orders failed:', err?.message, err?.response?.status);
        setErrorInfo(getFriendlyErrorMessage(err, 'Failed to fetch orders.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, selectedStatus]);

  const fetchRefunds = useCallback(async (isRefreshed = false) => {
    if (!isAuthenticated) return;
    if (!isRefreshed) setLoading(true);
    setErrorInfo(null);
    try {
      const url = URLs.ALL_ORDER_REFUND_LIST;
      console.log('[Orders] Loading Refunds URL:', url);
      const response = await apiClient.get(url);
      if (response.status === 200 && response.data?.refundOrders) {
        setRefunds(response.data.refundOrders);
      } else {
        setRefunds([]);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setRefunds([]);
      } else {
        console.error('[Orders] Fetch refunds failed:', err?.message, err?.response?.status);
        setErrorInfo(getFriendlyErrorMessage(err, 'Failed to fetch return requests.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  const loadData = useCallback((isRefreshed = false) => {
    if (activeTab === 'orders') {
      fetchOrders(isRefreshed);
    } else {
      fetchRefunds(isRefreshed);
    }
  }, [activeTab, fetchOrders, fetchRefunds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // ─── Return Status Helpers ─────────────────────────────────────────────────
  const getRefundStatusInfo = (refund: ApiRefund) => {
    const raw = (refund.status || '').toUpperCase();
    if (raw === 'REQUESTED') {
      return { text: 'Return Requested', bg: '#fef3c7', textCol: '#b45309' };
    }
    if (raw === 'DRIVER_ASSIGNED') {
      return { text: 'Driver Assigned', bg: '#dbeafe', textCol: '#1e40af' };
    }
    if (raw === 'PICKED_UP') {
      return { text: 'Picked Up', bg: '#ede9fe', textCol: '#5b21b6' };
    }
    if (raw === 'RECEIVED_AT_WAREHOUSE') {
      return { text: 'Received at WH', bg: '#f3e8ff', textCol: '#6b21a8' };
    }
    if (raw === 'REFUND_PENDING') {
      return { text: 'Refund in Progress', bg: '#ffedd5', textCol: '#c2410c' };
    }
    if (raw === 'REFUNDED') {
      return { text: 'Refund Completed', bg: '#d1fae5', textCol: '#065f46' };
    }
    if (raw === 'REJECTED') {
      return { text: 'Rejected', bg: '#fee2e2', textCol: '#991b1b' };
    }

    // Legacy fallback
    if (refund.is_completed === 1 || refund.is_refunded === 1) return { text: 'Refund Completed', bg: '#d1fae5', textCol: '#065f46' };
    if (refund.is_confirmed === 1) return { text: 'Approved', bg: '#dbeafe', textCol: '#1e40af' };
    const state = typeof refund.refund_state === 'string' ? parseInt(refund.refund_state, 10) : refund.refund_state;
    if (state === 0) return { text: 'Pending', bg: '#fef3c7', textCol: '#b45309' };
    if (state === 2) return { text: 'Processing', bg: '#dbeafe', textCol: '#1e40af' };
    if (state === 3) return { text: 'Completed', bg: '#d1fae5', textCol: '#065f46' };
    if (state === 4) return { text: 'Rejected', bg: '#fee2e2', textCol: '#991b1b' };
    return { text: 'Pending', bg: '#fef3c7', textCol: '#b45309' };
  };

  // ─── Loading Screen ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ─── Unauthenticated Screen ────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSurface, { paddingTop: Math.max(insets.top, 14), paddingBottom: 16 }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleColumn}>
              <Text style={styles.title}>My Orders</Text>
              <Text style={styles.subtitle}>Track your wholesale purchases and refunds</Text>
            </View>
          </View>
        </View>
        <View style={styles.unauthContent}>
          <View style={styles.unauthIconBg}>
            <UserCheck size={48} color={Colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.unauthTitle}>Sign in to view orders</Text>
          <Text style={styles.unauthSubtitle}>
            Please log in to check your order statuses, tracking updates, and return requests.
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginBtnText}>Log In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Top Navigation & Header Surface ── */}
      <View style={[styles.headerSurface, { paddingTop: Math.max(insets.top, 14) }]}>
        {/* Row 1: Title, Dynamic Status, and Quick Action Buttons */}
        <View style={styles.headerTopRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.title}>My Orders</Text>
            <View style={styles.subtitleRow}>
              <View
                style={[
                  styles.statusPulseDot,
                  { backgroundColor: activeOrdersCount > 0 ? '#10b981' : '#94a3b8' },
                ]}
              />
              <Text style={styles.subtitle}>
                {activeTab === 'orders'
                  ? activeOrdersCount > 0
                    ? `${activeOrdersCount} in transit • ${orders.length} total`
                    : `${orders.length} order${orders.length === 1 ? '' : 's'} recorded`
                  : `${refunds.length} return request${refunds.length === 1 ? '' : 's'}`}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerActionButton, isSearchOpen && styles.headerActionButtonActive]}
              onPress={() => {
                setIsSearchOpen((prev) => !prev);
                if (isSearchOpen) setSearchQuery('');
              }}
              activeOpacity={0.7}
              accessibilityLabel="Search orders"
            >
              <Search
                size={18}
                color={isSearchOpen ? Colors.primary : '#475569'}
                strokeWidth={2.2}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => onRefresh()}
              disabled={refreshing}
              activeOpacity={0.7}
              accessibilityLabel="Refresh list"
            >
              <RefreshCw
                size={17}
                color={refreshing ? Colors.primary : '#475569'}
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: Search Input (Expandable) */}
        {isSearchOpen && (
          <View style={styles.searchBarWrapper}>
            <Search size={16} color="#94a3b8" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'orders'
                  ? 'Search by order # or product...'
                  : 'Search by return # or product...'
              }
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.searchClearBtn}
              >
                <X size={14} color="#64748b" strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Row 3: Segmented Switcher (Orders vs Returns) */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'orders' && styles.segmentTabActive]}
            onPress={() => {
              setActiveTab('orders');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <Package
              size={16}
              color={activeTab === 'orders' ? Colors.primary : '#64748b'}
              strokeWidth={activeTab === 'orders' ? 2.2 : 1.8}
            />
            <Text
              style={[
                styles.segmentTabText,
                activeTab === 'orders' && styles.segmentTabTextActive,
              ]}
            >
              Orders
            </Text>
            {orders.length > 0 && (
              <View
                style={[
                  styles.segmentBadge,
                  activeTab === 'orders' && styles.segmentBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentBadgeText,
                    activeTab === 'orders' && styles.segmentBadgeTextActive,
                  ]}
                >
                  {orders.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'returns' && styles.segmentTabActive]}
            onPress={() => {
              setActiveTab('returns');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <RotateCcw
              size={16}
              color={activeTab === 'returns' ? Colors.primary : '#64748b'}
              strokeWidth={activeTab === 'returns' ? 2.2 : 1.8}
            />
            <Text
              style={[
                styles.segmentTabText,
                activeTab === 'returns' && styles.segmentTabTextActive,
              ]}
            >
              Returns & Claims
            </Text>
            {refunds.length > 0 && (
              <View
                style={[
                  styles.segmentBadge,
                  activeTab === 'returns' && styles.segmentBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentBadgeText,
                    activeTab === 'returns' && styles.segmentBadgeTextActive,
                  ]}
                >
                  {refunds.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Row 4: Status Filter Chips */}
        {activeTab === 'orders' ? (
          <View style={styles.chipsOuterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContentContainer}
            >
              {ORDER_STATUS_CHIPS.map((chip) => {
                const isSelected = selectedStatus === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[styles.statusChip, isSelected && styles.statusChipActive]}
                    onPress={() => setSelectedStatus(chip.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isSelected ? '#ffffff' : chip.dotColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusChipTxt,
                        isSelected && styles.statusChipTxtActive,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.chipsOuterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsContentContainer}
            >
              {RETURN_STATUS_CHIPS.map((chip) => {
                const isSelected = selectedReturnStatus === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[styles.statusChip, isSelected && styles.statusChipActive]}
                    onPress={() => setSelectedReturnStatus(chip.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isSelected ? '#ffffff' : chip.dotColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusChipTxt,
                        isSelected && styles.statusChipTxtActive,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching details...</Text>
        </View>
      ) : errorInfo ? (
        <OfflineView
          onRetry={() => loadData()}
          isRetrying={loading || refreshing}
          isOffline={errorInfo.isOffline}
          title={errorInfo.title}
          message={errorInfo.message}
        />
      ) : activeTab === 'orders' && filteredOrders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.emptyIconContainer}>
            <Package size={42} color="#94a3b8" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching orders' : 'No orders found'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No orders match "${searchQuery}". Check the order number or search terms.`
              : selectedStatus === 0
              ? 'You have not placed any orders yet.'
              : `No orders listed under "${ORDER_STATUS_CHIPS.find((c) => c.id === selectedStatus)?.label || 'this'}" status.`}
          </Text>
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
            >
              <Text style={styles.clearSearchBtnText}>Clear Search</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : activeTab === 'returns' && filteredRefunds.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.emptyIconContainer}>
            <RotateCcw size={42} color="#94a3b8" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching returns' : 'No returns found'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No return requests match "${searchQuery}".`
              : selectedReturnStatus === 'ALL'
              ? "You haven't requested any order returns or refunds yet."
              : `No return requests currently in "${RETURN_STATUS_CHIPS.find((c) => c.id === selectedReturnStatus)?.label || 'this'}" state.`}
          </Text>
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearSearchBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
            >
              <Text style={styles.clearSearchBtnText}>Clear Search</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {activeTab === 'orders'
            ? filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() =>
                    router.push({
                      pathname: '/order/[id]',
                      params: { id: String(order.id) },
                    })
                  }
                />
              ))
            : filteredRefunds.map((refund) => {
                const statusInfo = getRefundStatusInfo(refund);
                const itemsList = (refund.items && refund.items.length > 0)
                  ? refund.items
                  : (refund.refund_details && refund.refund_details[0]?.refund_products)
                    ? refund.refund_details[0].refund_products.map((rp: any) => ({
                        id: rp.id,
                        product_name: rp.seller_product_sku?.product?.product_name || 'Returned Product',
                        product_image: rp.seller_product_sku?.product?.thum_img || '',
                        return_qty: rp.return_qty,
                        return_amount: rp.return_amount,
                      }))
                    : [];

                const totalClaim = parseFloat(String(refund.total_amount || refund.total_return_amount || 0));

                return (
                  <TouchableOpacity
                    key={refund.id}
                    style={styles.orderCard}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/return/${refund.id}`)}
                  >
                    {/* Refund Card Header */}
                    <View style={styles.orderCardHeader}>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={styles.orderNumber}>Return #{refund.id}</Text>
                          {!!refund.order_number && (
                            <View style={styles.orderTag}>
                              <Text style={styles.orderTagText}>Order: {refund.order_number}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.orderDate}>{formatDate(refund.created_at)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusText, { color: statusInfo.textCol }]}>
                          {statusInfo.text}
                        </Text>
                      </View>
                    </View>

                    {/* Driver info if assigned */}
                    {!!refund.driver && (
                      <View style={styles.returnDriverRow}>
                        <Truck size={13} color="#4338ca" />
                        <Text style={styles.returnDriverText}>
                          Pickup Driver: {refund.driver.name} ({refund.driver.phone})
                        </Text>
                      </View>
                    )}

                    {/* Refund Items */}
                    <View style={styles.orderCardBody}>
                      {itemsList.map((rProd: any, pIdx: number) => {
                        const prodImg = rProd.product_image || '';
                        return (
                          <View key={rProd.id || pIdx} style={styles.productRow}>
                            <Image
                              source={
                                prodImg
                                  ? { uri: assetUrl(prodImg) }
                                  : require('@/assets/images/icon.png')
                              }
                              style={styles.productImage}
                            />
                            <View style={styles.productInfo}>
                              <Text style={styles.productName} numberOfLines={2}>
                                {rProd.product_name}
                              </Text>
                              <View style={styles.productMeta}>
                                <Text style={styles.productQty}>Return Qty: {rProd.return_qty}</Text>
                                <Text style={styles.productPrice}>
                                  Refund: ₹{parseFloat(String(rProd.return_amount || 0)).toLocaleString('en-IN')}
                                </Text>
                              </View>
                              {!!rProd.reason && (
                                <Text style={styles.returnReasonText}>Reason: {rProd.reason}</Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {/* Refund Footer */}
                    <View style={styles.refundFooter}>
                      <View>
                        <Text style={styles.totalRefundLabel}>Total Refund Amount</Text>
                        <Text style={styles.totalRefundPrice}>
                          ₹{totalClaim.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.viewReturnBtn}>
                        <Text style={styles.viewReturnBtnText}>Tracking & Details</Text>
                        <ChevronRight size={14} color={Colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  headerSurface: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionButtonActive: {
    backgroundColor: Colors.primary10,
    borderColor: Colors.primary,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 40,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  segmentedContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 13,
    padding: 3.5,
    marginTop: 6,
    marginBottom: 10,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8.5,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  segmentBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBadgeActive: {
    backgroundColor: Colors.primary10,
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentBadgeTextActive: {
    color: Colors.primary,
  },
  chipsOuterContainer: {
    marginBottom: 10,
  },
  chipsContentContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusChipTxtActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  clearSearchBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  clearSearchBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  unauthContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  unauthIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  unauthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    backgroundColor: '#fafbfd',
  },
  salesmanCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  salesmanCardText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '600',
  },
  salesmanCardName: {
    fontWeight: '800',
    color: '#0284c7',
  },
  rtoCardNotice: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffedd5',
  },
  rtoCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rtoCardNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
  },
  rtoCardNoticeText: {
    fontSize: 11,
    color: '#9a3412',
    marginTop: 2,
    fontWeight: '500',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  totalBlock: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  orderCardBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  packageContainer: {
    marginBottom: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 4,
  },
  packageCode: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productQty: {
    fontSize: 11,
    color: '#64748b',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderActions: {
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    padding: 12,
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  refundDetailBlock: {
    marginBottom: 8,
  },
  refundFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafbfd',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalRefundLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  totalRefundPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  orderTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  orderTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  returnDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ff',
  },
  returnDriverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730a3',
  },
  returnReasonText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  viewReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.primary10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewReturnBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
