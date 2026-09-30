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
  Alert,
  Modal,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  UserCheck,
  MapPin,
  Phone,
  ShieldCheck,
  AlertCircle,
  Calendar,
  CreditCard,
  Building2,
  AlertTriangle,
} from 'lucide-react-native';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';

const assetUrl = (path?: string): string => URLs.assetUrl(path);

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

interface OrderItem {
  id: number;
  product_title: string;
  variant_name?: string;
  sku_code?: string;
  qty: number;
  unit_price: number;
  total_price: number;
  thumbnail?: string;
}

interface DeliveryState {
  id: number;
  date: string;
  note?: string;
  process_name: string;
}

interface SalesmanInfo {
  id: number;
  name: string;
  phone?: string;
  email?: string | null;
  salesman_code?: string | null;
}

interface OrderDetails {
  id: number;
  order_number: string;
  status: string;
  order_status: number;
  is_confirmed: boolean;
  is_completed: boolean;
  is_cancelled: boolean;
  is_rto: boolean;
  payment_method: string;
  payment_status: string;
  grand_total: number;
  sub_total: number;
  tax_amount: number;
  delivery_charge: number;
  discount_amount: number;
  delivery_address?: any;
  placed_at: string;
  delivered_at?: string | null;
  created_at: string;
  updated_at: string;
  salesman_name?: string | null;
  salesman_phone?: string | null;
  salesman?: SalesmanInfo | null;
  driver?: { name: string; phone?: string; vehicle_number?: string } | null;
  warehouse?: { id: number; name: string; code: string } | null;
  cancel_reason?: string | null;
  can_cancel: boolean;
  cancellation_window_minutes?: number;
  cancellation_window_expires_at?: string | null;
  can_return: boolean;
  return_window_hours?: number;
  return_window_expires_at?: string | null;
  items: OrderItem[];
  delivery_states?: DeliveryState[];
  rvp_requests?: any[];
}

interface ReasonOption {
  id: number;
  name?: string;
  reason?: string;
  description?: string | null;
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReasons, setCancelReasons] = useState<ReasonOption[]>([]);
  const [selectedCancelReasonId, setSelectedCancelReasonId] = useState<number | null>(null);
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Return Modal State
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnReasons, setReturnReasons] = useState<ReasonOption[]>([]);
  const [selectedReturnReasonId, setSelectedReturnReasonId] = useState<number | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const fetchOrderDetails = useCallback(async (isRefreshed = false) => {
    if (!orderId) return;
    if (!isRefreshed) setLoading(true);
    setError(null);

    try {
      const url = URLs.ORDER_DETAILS(orderId);
      const res = await apiClient.get(url);

      if (res.status === 200 && res.data?.order) {
        setOrder(res.data.order);
      } else {
        throw new Error(res.data?.message || 'Order could not be loaded');
      }
    } catch (err: any) {
      console.error('Fetch order details error:', err?.message);
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderDetails(true);
  };

  // Fetch cancel reasons
  const openCancelModal = async () => {
    setCancelModalVisible(true);
    try {
      const res = await apiClient.get(URLs.CANCEL_REASONS);
      const reasonsList = res.data?.reasons || res.data?.cancel_reasons || [];
      setCancelReasons(reasonsList);
      if (reasonsList.length > 0) {
        setSelectedCancelReasonId(reasonsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load cancel reasons', err);
    }
  };

  // Submit cancellation
  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      setCancelLoading(true);
      const res = await apiClient.post(URLs.ORDER_CANCEL_STORE, {
        order_id: order.id,
        reason_id: selectedCancelReasonId,
        reason: customCancelReason,
      });

      if (res.data?.success) {
        setCancelModalVisible(false);
        Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
        fetchOrderDetails(true);
      } else {
        throw new Error(res.data?.error || res.data?.message || 'Failed to cancel order');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Unable to cancel order.';
      Alert.alert('Cancellation Error', errMsg);
    } finally {
      setCancelLoading(false);
    }
  };

  // Fetch return reasons
  const openReturnModal = async () => {
    setReturnModalVisible(true);
    try {
      const res = await apiClient.get(URLs.REFUND_REASONS_LIST);
      const reasonsList = res.data?.reasons || res.data?.refund_reasons || [];
      setReturnReasons(reasonsList);
      if (reasonsList.length > 0) {
        setSelectedReturnReasonId(reasonsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load return reasons', err);
    }
  };

  // Submit return request
  const handleReturnOrder = async () => {
    if (!order) return;
    try {
      setReturnLoading(true);
      const res = await apiClient.post(URLs.REFUND_STORE, {
        order_id: order.id,
        reason_id: selectedReturnReasonId,
        additional_info: returnNote,
      });

      if (res.data?.success) {
        setReturnModalVisible(false);
        Alert.alert(
          'Return Requested',
          'Your return request has been submitted. Our team will verify and arrange pickup.'
        );
        fetchOrderDetails(true);
      } else {
        throw new Error(res.data?.error || res.data?.message || 'Failed to request return');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Unable to submit return request.';
      Alert.alert('Return Error', errMsg);
    } finally {
      setReturnLoading(false);
    }
  };

  // Helper for delivery status styling
  const getStatusBadge = (status: string, orderStatusNum: number) => {
    if (status === 'CANCELLED' || orderStatusNum === 4) {
      return { label: 'Cancelled', bg: '#fee2e2', text: '#991b1b', icon: XCircle };
    }
    if (status === 'DELIVERED' || orderStatusNum === 5) {
      return { label: 'Delivered', bg: '#dcfce7', text: '#15803d', icon: CheckCircle };
    }
    if (status === 'RTO_INITIATED' || status === 'RTO_COMPLETED') {
      return { label: 'Return Initiated', bg: '#ffedd5', text: '#c2410c', icon: RotateCcw };
    }
    if (status === 'OUT_FOR_DELIVERY') {
      return { label: 'Out for Delivery', bg: '#fef3c7', text: '#b45309', icon: Truck };
    }
    if (status === 'PROCESSING') {
      return { label: 'Processing', bg: '#e0e7ff', text: '#4338ca', icon: Package };
    }
    if (status === 'CONFIRMED' || orderStatusNum === 2) {
      return { label: 'Confirmed', bg: '#dbeafe', text: '#1d4ed8', icon: CheckCircle };
    }
    return { label: 'Pending', bg: '#fef3c7', text: '#b45309', icon: Clock };
  };

interface TimelineStep {
  label: string;
  completed: boolean;
  isAlert?: boolean;
  date?: string | null;
}

  // Timeline step calculation
  const timelineSteps: TimelineStep[] = useMemo(() => {
    if (!order) return [];
    const isCancelled = order.is_cancelled || order.status === 'CANCELLED';
    if (isCancelled) {
      return [
        { label: 'Order Placed', completed: true, date: order.placed_at },
        { label: 'Cancelled', completed: true, isAlert: true, date: order.updated_at },
      ];
    }
    const currentCode = order.order_status || 1;
    return [
      { label: 'Order Placed', completed: true, date: order.placed_at },
      { label: 'Confirmed', completed: currentCode >= 2 },
      { label: 'Processing', completed: currentCode >= 3 },
      { label: 'Out for Delivery', completed: currentCode >= 3 && order.status === 'OUT_FOR_DELIVERY' },
      { label: 'Delivered', completed: currentCode >= 5, date: order.delivered_at },
    ];
  }, [order]);

  // Remaining cancellation time in minutes
  const remainingCancelMinutes = useMemo(() => {
    if (!order?.cancellation_window_expires_at) return 0;
    const expiresMs = new Date(order.cancellation_window_expires_at).getTime();
    const diff = Math.max(0, Math.floor((expiresMs - Date.now()) / (1000 * 60)));
    return diff;
  }, [order?.cancellation_window_expires_at]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.errorBox}>
          <AlertCircle size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Could not load order</Text>
          <Text style={styles.errorSubtitle}>{error || 'The requested order was not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchOrderDetails()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusBadge = getStatusBadge(order.status, order.order_status);
  const StatusIcon = statusBadge.icon;
  const salesmanData: SalesmanInfo | null =
    order.salesman ||
    (order.salesman_name
      ? {
          id: 0,
          name: order.salesman_name,
          phone: order.salesman_phone || undefined,
          salesman_code: null,
        }
      : null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>Order Details</Text>
          <Text style={styles.topBarOrderNo}>#{order.order_number}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Status Header Banner */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadgeLarge, { backgroundColor: statusBadge.bg }]}>
              <StatusIcon size={16} color={statusBadge.text} strokeWidth={2.5} />
              <Text style={[styles.statusBadgeTextLarge, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>

            <View style={styles.paymentBadge}>
              <CreditCard size={13} color="#475569" />
              <Text style={styles.paymentBadgeText}>
                {order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online Payment'} &bull;{' '}
                {order.payment_status}
              </Text>
            </View>
          </View>

          <Text style={styles.orderDateTxt}>Placed on {formatDate(order.placed_at || order.created_at)}</Text>
          {order.cancel_reason ? (
            <View style={styles.cancelReasonNotice}>
              <AlertTriangle size={14} color="#991b1b" />
              <Text style={styles.cancelReasonNoticeTxt}>Reason: {order.cancel_reason}</Text>
            </View>
          ) : null}
        </View>

        {/* Delivery Timeline Stepper */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <View style={styles.timelineContainer}>
            {timelineSteps.map((step, idx) => (
              <View key={idx} style={styles.timelineStep}>
                <View style={styles.timelineNodeContainer}>
                  <View
                    style={[
                      styles.timelineDot,
                      step.completed && styles.timelineDotActive,
                      step.isAlert && styles.timelineDotAlert,
                    ]}
                  >
                    {step.completed ? (
                      <CheckCircle size={12} color="#ffffff" strokeWidth={3} />
                    ) : (
                      <View style={styles.timelineDotInner} />
                    )}
                  </View>
                  {idx < timelineSteps.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        timelineSteps[idx + 1].completed && styles.timelineLineActive,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineTextContainer}>
                  <Text
                    style={[
                      styles.timelineStepTitle,
                      step.completed && styles.timelineStepTitleActive,
                      step.isAlert && { color: '#dc2626' },
                    ]}
                  >
                    {step.label}
                  </Text>
                  {step.date ? (
                    <Text style={styles.timelineStepDate}>{formatDate(step.date)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Salesman Info Card - ONLY DISPLAYED IF SALESMAN IS ATTACHED */}
        {salesmanData && salesmanData.name ? (
          <View style={styles.salesmanCard}>
            <View style={styles.salesmanHeader}>
              <View style={styles.salesmanIconCircle}>
                <UserCheck size={20} color="#0284c7" strokeWidth={2} />
              </View>
              <View style={styles.salesmanInfo}>
                <Text style={styles.salesmanRoleTag}>YOUR ASSIGNED SALES REPRESENTATIVE</Text>
                <Text style={styles.salesmanName}>{salesmanData.name}</Text>
                {salesmanData.salesman_code ? (
                  <Text style={styles.salesmanCode}>Code: {salesmanData.salesman_code}</Text>
                ) : null}
              </View>
            </View>

            {salesmanData.phone ? (
              <TouchableOpacity
                style={styles.callSalesmanBtn}
                onPress={() => Linking.openURL(`tel:${salesmanData.phone}`)}
                activeOpacity={0.8}
              >
                <Phone size={15} color="#0284c7" />
                <Text style={styles.callSalesmanBtnText}>Call Salesman ({salesmanData.phone})</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Delivery Address */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <MapPin size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          {order.delivery_address ? (
            <View style={styles.addressBox}>
              <Text style={styles.recipientName}>
                {order.delivery_address.name || order.delivery_address.recipientName || 'Buyer'}
              </Text>
              {order.delivery_address.phone ? (
                <Text style={styles.recipientPhone}>Phone: {order.delivery_address.phone}</Text>
              ) : null}
              <Text style={styles.addressLine}>
                {order.delivery_address.addressLine1 || order.delivery_address.address || 'Standard Delivery Location'}
              </Text>
              <Text style={styles.addressCity}>
                {[
                  order.delivery_address.city,
                  order.delivery_address.state,
                  order.delivery_address.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          ) : (
            <Text style={styles.noAddressTxt}>Standard warehouse registered buyer address</Text>
          )}
        </View>

        {/* Ordered Items List */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Package size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Ordered Products ({order.items.length})</Text>
          </View>

          <View style={styles.itemsList}>
            {order.items.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <Image
                  source={
                    item.thumbnail
                      ? { uri: assetUrl(item.thumbnail) }
                      : require('@/assets/images/icon.png')
                  }
                  style={styles.itemImage}
                />
                <View style={styles.itemDetails}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.product_title}
                  </Text>
                  {item.variant_name ? (
                    <Text style={styles.itemVariant}>Variant: {item.variant_name}</Text>
                  ) : null}
                  <View style={styles.itemPriceRow}>
                    <Text style={styles.itemQty}>Qty: {item.qty}</Text>
                    <Text style={styles.itemUnitPrice}>&times; ₹{item.unit_price.toLocaleString('en-IN')}</Text>
                    <Text style={styles.itemTotalPrice}>₹{item.total_price.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bill & Cost Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Items Subtotal</Text>
            <Text style={styles.billValue}>₹{order.sub_total.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Tax / GST</Text>
            <Text style={styles.billValue}>₹{order.tax_amount.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>
              {order.delivery_charge > 0 ? `₹${order.delivery_charge.toLocaleString('en-IN')}` : 'FREE'}
            </Text>
          </View>

          {order.discount_amount > 0 ? (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#16a34a' }]}>Discount</Text>
              <Text style={[styles.billValue, { color: '#16a34a' }]}>
                -₹{order.discount_amount.toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}

          <View style={styles.billDivider} />

          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>Grand Total</Text>
            <Text style={styles.billTotalValue}>₹{order.grand_total.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Cancellation Section & Window Notice */}
        {order.can_cancel ? (
          <View style={styles.actionCardNotice}>
            <View style={styles.actionCardNoticeHeader}>
              <Clock size={16} color="#d97706" />
              <Text style={styles.actionCardNoticeTitle}>Cancellation Window Active</Text>
            </View>
            <Text style={styles.actionCardNoticeDesc}>
              You can cancel this order within the cancellation window. Remaining time:{' '}
              <Text style={{ fontWeight: '700', color: '#b45309' }}>
                {remainingCancelMinutes > 0 ? `${remainingCancelMinutes} mins` : 'Expiring shortly'}
              </Text>
              .
            </Text>
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={openCancelModal}
              activeOpacity={0.8}
            >
              <XCircle size={16} color="#dc2626" />
              <Text style={styles.cancelActionBtnText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        ) : !order.is_cancelled && (order.order_status <= 2) ? (
          <View style={styles.infoCardNotice}>
            <ShieldCheck size={16} color="#64748b" />
            <Text style={styles.infoCardNoticeText}>
              The cancellation window of 60 minutes has elapsed. This order has been forwarded to the warehouse for fulfillment.
            </Text>
          </View>
        ) : null}

        {/* Return / RVP Request Section & Window Notice */}
        {order.order_status === 5 || order.status === 'DELIVERED' ? (
          order.can_return ? (
            <View style={[styles.actionCardNotice, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <View style={styles.actionCardNoticeHeader}>
                <RotateCcw size={16} color="#15803d" />
                <Text style={[styles.actionCardNoticeTitle, { color: '#15803d' }]}>
                  Eligible for Return / Replacement
                </Text>
              </View>
              <Text style={[styles.actionCardNoticeDesc, { color: '#166534' }]}>
                This delivered order is eligible for return within 48 hours of delivery.
              </Text>
              <TouchableOpacity
                style={[styles.cancelActionBtn, { borderColor: '#16a34a', backgroundColor: '#ffffff' }]}
                onPress={openReturnModal}
                activeOpacity={0.8}
              >
                <RotateCcw size={16} color="#16a34a" />
                <Text style={[styles.cancelActionBtnText, { color: '#16a34a' }]}>Request Return</Text>
              </TouchableOpacity>
            </View>
          ) : order.rvp_requests && order.rvp_requests.length > 0 ? (
            <View style={[styles.infoCardNotice, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <RotateCcw size={16} color="#2563eb" />
              <Text style={[styles.infoCardNoticeText, { color: '#1e40af' }]}>
                Return Request has already been submitted for this order (Status: {order.rvp_requests[0].status}).
              </Text>
            </View>
          ) : (
            <View style={styles.infoCardNotice}>
              <Clock size={16} color="#64748b" />
              <Text style={styles.infoCardNoticeText}>
                The return window of 48 hours has closed for this delivered order.
              </Text>
            </View>
          )
        ) : null}
      </ScrollView>

      {/* CANCEL MODAL */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order #{order.order_number}</Text>
            <Text style={styles.modalSubtitle}>Please choose a reason for cancelling this order:</Text>

            <ScrollView style={{ maxHeight: 220, marginVertical: 10 }}>
              {cancelReasons.map((reason) => {
                const isSelected = selectedCancelReasonId === reason.id;
                return (
                  <TouchableOpacity
                    key={reason.id}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedCancelReasonId(reason.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextSelected]}>
                      {reason.name || reason.reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              placeholder="Additional comments (optional)..."
              placeholderTextColor="#94a3b8"
              value={customCancelReason}
              onChangeText={setCustomCancelReason}
              multiline
            />

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
                disabled={cancelLoading}
              >
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCancelOrder}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RETURN / RVP MODAL */}
      <Modal visible={returnModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Return for #{order.order_number}</Text>
            <Text style={styles.modalSubtitle}>Please choose a reason for returning this order:</Text>

            <ScrollView style={{ maxHeight: 200, marginVertical: 10 }}>
              {returnReasons.map((reason) => {
                const isSelected = selectedReturnReasonId === reason.id;
                return (
                  <TouchableOpacity
                    key={reason.id}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedReturnReasonId(reason.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextSelected]}>
                      {reason.name || reason.reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              placeholder="Tell us more about the reason for return..."
              placeholderTextColor="#94a3b8"
              value={returnNote}
              onChangeText={setReturnNote}
              multiline
            />

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReturnModalVisible(false)}
                disabled={returnLoading}
              >
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#15803d' }]}
                onPress={handleReturnOrder}
                disabled={returnLoading}
              >
                {returnLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Submit Return</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  topBarOrderNo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeTextLarge: {
    fontSize: 13,
    fontWeight: '700',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  orderDateTxt: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  cancelReasonNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelReasonNoticeTxt: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  timelineContainer: {
    paddingLeft: 6,
    marginTop: 4,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 46,
  },
  timelineNodeContainer: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotActive: {
    backgroundColor: '#16a34a',
  },
  timelineDotAlert: {
    backgroundColor: '#dc2626',
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  timelineLineActive: {
    backgroundColor: '#16a34a',
  },
  timelineTextContainer: {
    marginLeft: 12,
    justifyContent: 'flex-start',
    paddingTop: 1,
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  timelineStepTitleActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  timelineStepDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  salesmanCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  salesmanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salesmanIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  salesmanInfo: {
    flex: 1,
  },
  salesmanRoleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    letterSpacing: 0.5,
  },
  salesmanName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  salesmanCode: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  callSalesmanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  callSalesmanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  addressBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  recipientPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  addressLine: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
    lineHeight: 18,
  },
  addressCity: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  noAddressTxt: {
    fontSize: 13,
    color: '#64748b',
  },
  itemsList: {
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 18,
  },
  itemVariant: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  itemQty: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  itemUnitPrice: {
    fontSize: 12,
    color: '#64748b',
  },
  itemTotalPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 'auto',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  billTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  actionCardNotice: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  actionCardNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  actionCardNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
  },
  actionCardNoticeDesc: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
    marginBottom: 12,
  },
  cancelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 10,
  },
  cancelActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  infoCardNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoCardNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 10,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  reasonOptionSelected: {
    backgroundColor: '#f1f5f9',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  reasonOptionText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  reasonOptionTextSelected: {
    fontWeight: '700',
    color: '#0f172a',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    minWidth: 110,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
