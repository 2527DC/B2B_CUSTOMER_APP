import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Package, RotateCcw, Truck, CheckCircle, Clock, UserCheck, ShieldAlert, XCircle, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';

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
}

const ORDER_STATUS_CHIPS: StatusChip[] = [
  { id: 0, label: 'All' },
  { id: 1, label: 'Pending' },
  { id: 2, label: 'Confirmed' },
  { id: 3, label: 'Out for Delivery' },
  { id: 5, label: 'Delivered' },
  { id: 6, label: 'RTO / Returned' },
  { id: 4, label: 'Cancelled' },
];

export default function OrdersScreen() {
  const router = useRouter();
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
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetching Logic ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (isRefreshed = false) => {
    if (!isAuthenticated) return;
    if (!isRefreshed) setLoading(true);
    setError(null);
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
        setError('Failed to fetch orders. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, selectedStatus]);

  const fetchRefunds = useCallback(async (isRefreshed = false) => {
    if (!isAuthenticated) return;
    if (!isRefreshed) setLoading(true);
    setError(null);
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
        setError('Failed to fetch return requests. Please try again.');
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

  // ─── Status Helpers ────────────────────────────────────────────────────────
  const getStatusIcon = (status: string | number, order?: ApiOrder) => {
    if (order?.is_rto || order?.status === 'RTO_INITIATED' || order?.status === 'RTO_COMPLETED') {
      return <RotateCcw size={15} color="#c2410c" strokeWidth={2.5} />;
    }
    if (order?.status === 'CANCELLED') {
      return <XCircle size={15} color="#dc2626" strokeWidth={2.5} />;
    }
    const s = typeof status === 'string' ? parseInt(status, 10) : status;
    if (s === 6) return <RotateCcw size={15} color="#c2410c" strokeWidth={2.5} />;
    if (s === 4) return <XCircle size={15} color="#dc2626" strokeWidth={2.5} />;
    if (s <= 1) return <Clock size={15} color="#d97706" strokeWidth={2.5} />;
    if (s === 2) return <CheckCircle size={15} color={Colors.primary} strokeWidth={2.5} />;
    if (s === 3) return <Truck size={15} color="#7c3aed" strokeWidth={2.5} />;
    if (s >= 5) return <CheckCircle size={15} color="#059669" strokeWidth={2.5} />;
    return <Package size={15} color="#4b5563" strokeWidth={2.5} />;
  };

  const getStatusText = (status: string | number, order?: ApiOrder) => {
    if (order?.is_rto || order?.status === 'RTO_INITIATED' || order?.status === 'RTO_COMPLETED') {
      return order?.status === 'RTO_COMPLETED' ? 'RTO Completed' : 'RTO Initiated';
    }
    if (order?.status === 'CANCELLED') return 'Cancelled';
    const s = typeof status === 'string' ? parseInt(status, 10) : status;
    if (s === 6) return 'RTO';
    if (s === 4) return 'Cancelled';
    if (s <= 1) return 'Pending';
    if (s === 2) return 'Confirmed';
    if (s === 3) return 'Out for Delivery';
    if (s >= 5) return 'Delivered';
    return 'Pending';
  };

  const getStatusColor = (status: string | number, order?: ApiOrder) => {
    if (order?.is_rto || order?.status === 'RTO_INITIATED' || order?.status === 'RTO_COMPLETED') {
      return { bg: '#ffedd5', text: '#c2410c' }; // Orange RTO
    }
    if (order?.status === 'CANCELLED') {
      return { bg: '#fee2e2', text: '#991b1b' }; // Red Cancelled
    }
    const s = typeof status === 'string' ? parseInt(status, 10) : status;
    if (s === 6) return { bg: '#ffedd5', text: '#c2410c' };
    if (s === 4) return { bg: '#fee2e2', text: '#991b1b' };
    if (s <= 1) return { bg: '#fef3c7', text: '#b45309' };
    if (s === 2) return { bg: '#dbeafe', text: '#1e40af' };
    if (s === 3) return { bg: '#ede9fe', text: '#5b21b6' };
    if (s >= 5) return { bg: '#d1fae5', text: '#065f46' };
    return { bg: '#f3f4f6', text: '#374151' };
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
        <View style={styles.header}>
          <Text style={styles.title}>My Orders</Text>
          <Text style={styles.subtitle}>Track your purchases and refunds</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>Track and manage your order history</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.7}
        >
          <Package
            size={18}
            color={activeTab === 'orders' ? Colors.primary : '#64748b'}
            strokeWidth={2}
          />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            My Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'returns' && styles.tabActive]}
          onPress={() => setActiveTab('returns')}
          activeOpacity={0.7}
        >
          <RotateCcw
            size={18}
            color={activeTab === 'returns' ? Colors.primary : '#64748b'}
            strokeWidth={2}
          />
          <Text style={[styles.tabText, activeTab === 'returns' && styles.tabTextActive]}>
            Returns
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Status Chips for Orders */}
      {activeTab === 'orders' && (
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
                  <Text style={[styles.statusChipTxt, isSelected && styles.statusChipTxtActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching details...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <ShieldAlert size={48} color="#ef4444" strokeWidth={1.5} />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'orders' && orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.emptyIconContainer}>
            <Package size={42} color="#94a3b8" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptySubtitle}>
            There are no orders listed under this delivery status.
          </Text>
        </ScrollView>
      ) : activeTab === 'returns' && refunds.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          <View style={styles.emptyIconContainer}>
            <RotateCcw size={42} color="#94a3b8" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No returns yet</Text>
          <Text style={styles.emptySubtitle}>
            You haven{"'"}t requested any order returns or refunds yet.
          </Text>
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
            ? orders.map((order) => {
                const salesmanName = order.salesman_name || order.salesman?.name;
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.orderCard}
                    activeOpacity={0.9}
                    onPress={() =>
                      router.push({
                        pathname: '/order/[id]',
                        params: { id: String(order.id) },
                      })
                    }
                  >
                    {/* Order Card Header */}
                    <View style={styles.orderCardHeader}>
                      <View>
                        <Text style={styles.orderNumber}>#{order.order_number}</Text>
                        <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                      </View>
                      <View style={styles.totalBlock}>
                        <Text style={styles.totalLabel}>Grand Total</Text>
                        <Text style={styles.grandTotalValue}>
                          ₹{parseFloat(String(order.grand_total)).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {/* Salesman Badge - ONLY SHOWN IF SALESMAN IS ATTACHED */}
                    {salesmanName ? (
                      <View style={styles.salesmanCardBadge}>
                        <UserCheck size={13} color="#0284c7" strokeWidth={2.2} />
                        <Text style={styles.salesmanCardText}>
                          Salesman: <Text style={styles.salesmanCardName}>{salesmanName}</Text>
                        </Text>
                      </View>
                    ) : null}

                    {/* RTO Notice Card */}
                    {(order.is_rto || order.status === 'RTO_INITIATED' || order.status === 'RTO_COMPLETED') ? (
                      <View style={styles.rtoCardNotice}>
                        <View style={styles.rtoCardHeaderRow}>
                          <RotateCcw size={13} color="#c2410c" strokeWidth={2.5} />
                          <Text style={styles.rtoCardNoticeTitle}>
                            {order.status === 'RTO_COMPLETED' ? 'Return to Origin (Completed)' : 'Return to Origin (In Transit)'}
                          </Text>
                        </View>
                        {(order.rto_reason || order.cancel_reason || order.note) ? (
                          <Text style={styles.rtoCardNoticeText}>
                            Reason: {order.rto_reason || order.cancel_reason || order.note}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Order Card Body (Packages & Items) */}
                    <View style={styles.orderCardBody}>
                      {order.packages && order.packages.length > 0 ? (
                        order.packages.map((pkg, pIdx) => {
                          const statusColors = getStatusColor(pkg.delivery_status, order);
                          return (
                            <View key={pkg.id || pIdx} style={styles.packageContainer}>
                              <View style={styles.packageHeader}>
                                <Text style={styles.packageCode}>
                                  Package: {pkg.package_code || `PKG-${pkg.id}`}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                  {getStatusIcon(pkg.delivery_status, order)}
                                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                                    {getStatusText(pkg.delivery_status, order)}
                                  </Text>
                                </View>
                              </View>

                              {/* Products inside Package */}
                              {pkg.products &&
                                pkg.products.map((item, iIdx) => {
                                  const prod = item.seller_product_sku?.product;
                                  const prodName =
                                    prod?.product_name ??
                                    prod?.product?.product_name ??
                                    (item as any).product_title ??
                                    'Product Item';
                                  const prodImg =
                                    prod?.thum_img ??
                                    prod?.product?.thumbnail_image_source ??
                                    (item as any).thumbnail ??
                                    '';
                                  return (
                                    <View key={item.id || iIdx} style={styles.productRow}>
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
                                          {prodName}
                                        </Text>
                                        <View style={styles.productMeta}>
                                          <Text style={styles.productQty}>Qty: {item.qty}</Text>
                                          <Text style={styles.productPrice}>
                                            ₹{parseFloat(String(item.price)).toLocaleString('en-IN')}
                                          </Text>
                                        </View>
                                      </View>
                                    </View>
                                  );
                                })}
                            </View>
                          );
                        })
                      ) : order.items && order.items.length > 0 ? (
                        <View style={styles.packageContainer}>
                          {order.items.map((item: any, iIdx: number) => {
                            const prodName =
                              item.product_title ||
                              item.seller_product_sku?.product?.product_name ||
                              'Product Item';
                            const prodImg =
                              item.thumbnail || item.seller_product_sku?.product?.thum_img || '';
                            return (
                              <View key={item.id || iIdx} style={styles.productRow}>
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
                                    {prodName}
                                  </Text>
                                  <View style={styles.productMeta}>
                                    <Text style={styles.productQty}>Qty: {item.qty}</Text>
                                    <Text style={styles.productPrice}>
                                      ₹{parseFloat(String(item.price || item.unit_price)).toLocaleString('en-IN')}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>

                    {/* Actions */}
                    <View style={styles.orderActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/order/[id]',
                            params: { id: String(order.id) },
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            : refunds.map((refund) => {
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.primary10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  chipsOuterContainer: {
    marginBottom: 12,
  },
  chipsContentContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  statusChip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusChipTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  statusChipTxtActive: {
    color: '#ffffff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 110,
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
