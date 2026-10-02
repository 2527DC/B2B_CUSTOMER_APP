import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  RotateCcw,
  Truck,
  CheckCircle,
  PackageCheck,
  DollarSign,
  XCircle,
  Clock,
  Phone,
  Store,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react-native';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';

interface ReturnItem {
  id: number;
  product_name: string;
  product_image?: string;
  sku?: string;
  unit?: string;
  return_qty: number;
  return_amount: number | string;
  reason?: string;
}

interface ReturnDetail {
  id: number;
  order_id: number;
  order_number: string;
  order_date?: string | null;
  payment_method?: string;
  warehouse_name?: string;
  status: string; // 'REQUESTED' | 'DRIVER_ASSIGNED' | 'PICKED_UP' | 'RECEIVED_AT_WAREHOUSE' | 'REFUND_PENDING' | 'REFUNDED' | 'REJECTED'
  total_amount: number;
  additional_info?: string;
  rejection_note?: string;
  refund_created_at?: string | null;
  created_at: string;
  driver?: {
    id?: number;
    name: string;
    phone: string;
    vehicle_number?: string;
  } | null;
  items: ReturnItem[];
}

export default function ReturnDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [returnDetail, setReturnDetail] = useState<ReturnDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReturnDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(URLs.ORDER_REFUND_DETAILS(id));
      if (res.data?.refundOrder) {
        setReturnDetail(res.data.refundOrder);
      } else {
        setError('Return details could not be found.');
      }
    } catch (err: any) {
      console.error('Fetch return details error:', err);
      setError(err?.response?.data?.error || 'Failed to load return details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReturnDetail();
    }
  }, [id]);

  const handleCallDriver = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call to driver.');
    });
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Return Details...</Text>
      </View>
    );
  }

  if (error || !returnDetail) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <AlertTriangle size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Return request not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = (returnDetail.status || '').toUpperCase();
  const isRejected = status === 'REJECTED';
  const isRefunded = status === 'REFUNDED';

  // Stepper milestones
  // 1: Requested
  // 2: Driver Assigned / Picked Up
  // 3: Received at WH / Processing
  // 4: Refund Completed
  let currentStep = 1;
  if (status === 'DRIVER_ASSIGNED' || status === 'PICKED_UP') currentStep = 2;
  else if (status === 'RECEIVED_AT_WAREHOUSE' || status === 'REFUND_PENDING') currentStep = 3;
  else if (status === 'REFUNDED') currentStep = 4;

  const steps = [
    {
      step: 1,
      title: 'Return Requested',
      desc: formatDate(returnDetail.created_at),
      active: currentStep >= 1,
      completed: currentStep > 1 || isRefunded,
    },
    {
      step: 2,
      title: status === 'PICKED_UP' ? 'Picked Up by Driver' : 'Pickup Driver Dispatched',
      desc: returnDetail.driver
        ? `${returnDetail.driver.name} (${returnDetail.driver.phone})`
        : 'Awaiting driver assignment',
      active: currentStep >= 2,
      completed: currentStep > 2 || isRefunded,
    },
    {
      step: 3,
      title: 'Received at Warehouse',
      desc:
        currentStep >= 3
          ? 'Items verified in warehouse'
          : 'Pending arrival at warehouse',
      active: currentStep >= 3,
      completed: currentStep > 3 || isRefunded,
    },
    {
      step: 4,
      title: isRefunded ? 'Refund Completed' : 'Refund Process',
      desc: isRefunded
        ? `₹${Number(returnDetail.total_amount).toFixed(2)} refunded`
        : 'Initiated after warehouse quality check',
      active: isRefunded,
      completed: isRefunded,
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Return #{returnDetail.id}</Text>
          <Text style={styles.headerSubtitle}>Order #{returnDetail.order_number}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <View
          style={[
            styles.bannerCard,
            isRejected
              ? styles.bannerRejected
              : isRefunded
              ? styles.bannerSuccess
              : styles.bannerActive,
          ]}
        >
          <View style={styles.bannerIcon}>
            {isRejected ? (
              <XCircle size={28} color="#dc2626" />
            ) : isRefunded ? (
              <CheckCircle size={28} color="#059669" />
            ) : (
              <Clock size={28} color="#d97706" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.bannerTitle,
                isRejected
                  ? styles.textRejected
                  : isRefunded
                  ? styles.textSuccess
                  : styles.textActive,
              ]}
            >
              {isRejected
                ? 'Return Request Rejected'
                : isRefunded
                ? 'Refund Completed'
                : status === 'DRIVER_ASSIGNED'
                ? 'Driver Assigned for Pickup'
                : status === 'PICKED_UP'
                ? 'Picked Up by Driver'
                : status === 'RECEIVED_AT_WAREHOUSE'
                ? 'Received at Warehouse'
                : status === 'REFUND_PENDING'
                ? 'Refund in Progress'
                : 'Return Request Under Review'}
            </Text>
            <Text style={styles.bannerDesc}>
              {isRejected
                ? returnDetail.rejection_note || 'This return request has been rejected by the admin.'
                : isRefunded
                ? `Full refund of ₹${Number(returnDetail.total_amount).toFixed(2)} has been credited.`
                : 'Our operations team is managing your return and reverse pickup.'}
            </Text>
          </View>
        </View>

        {/* Stepper Progress Card */}
        {!isRejected && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Return Progress</Text>
            <View style={styles.stepperContainer}>
              {steps.map((st, idx) => {
                const isCurrent = currentStep === st.step && !isRefunded;
                const isPast = st.completed;

                return (
                  <View key={st.step} style={styles.stepRow}>
                    <View style={styles.stepIndicatorCol}>
                      <View
                        style={[
                          styles.stepDot,
                          isPast
                            ? styles.stepDotCompleted
                            : isCurrent
                            ? styles.stepDotCurrent
                            : styles.stepDotPending,
                        ]}
                      >
                        {isPast ? (
                          <CheckCircle size={14} color="#ffffff" strokeWidth={3} />
                        ) : (
                          <Text
                            style={[
                              styles.stepNumber,
                              isCurrent ? styles.stepNumberCurrent : styles.stepNumberPending,
                            ]}
                          >
                            {st.step}
                          </Text>
                        )}
                      </View>
                      {idx < steps.length - 1 && (
                        <View
                          style={[
                            styles.stepLine,
                            isPast ? styles.stepLineCompleted : styles.stepLinePending,
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.stepContentCol}>
                      <Text
                        style={[
                          styles.stepTitle,
                          isCurrent
                            ? styles.stepTitleCurrent
                            : isPast
                            ? styles.stepTitleCompleted
                            : styles.stepTitlePending,
                        ]}
                      >
                        {st.title}
                      </Text>
                      <Text style={styles.stepDesc}>{st.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Assigned Driver Card */}
        {!!returnDetail.driver && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Truck size={20} color={Colors.primary} />
                <Text style={styles.sectionTitleNoMargin}>Assigned Pickup Driver</Text>
              </View>
              {!!returnDetail.driver.phone && (
                <TouchableOpacity
                  style={styles.callDriverBtn}
                  onPress={() => handleCallDriver(returnDetail.driver!.phone)}
                >
                  <Phone size={14} color="#ffffff" />
                  <Text style={styles.callDriverText}>Call Driver</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.driverInfoBlock}>
              <Text style={styles.driverName}>{returnDetail.driver.name}</Text>
              <Text style={styles.driverPhone}>Mobile: {returnDetail.driver.phone}</Text>
              {!!returnDetail.driver.vehicle_number && (
                <Text style={styles.driverVehicle}>Vehicle: {returnDetail.driver.vehicle_number}</Text>
              )}
            </View>
          </View>
        )}

        {/* Returned Products */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Returned Items ({returnDetail.items.length})</Text>
          {returnDetail.items.map((item, index) => {
            const imgSrc = URLs.assetUrl(item.product_image);
            return (
              <View key={item.id || index} style={styles.productRow}>
                {imgSrc ? (
                  <Image source={{ uri: imgSrc }} style={styles.productImage} resizeMode="contain" />
                ) : (
                  <View style={[styles.productImage, { backgroundColor: '#f1f5f9' }]} />
                )}
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.product_name}
                  </Text>
                  {!!item.unit && <Text style={styles.productUnit}>Pack: {item.unit}</Text>}
                  <View style={styles.productMetaRow}>
                    <Text style={styles.productQty}>Return Qty: {item.return_qty}</Text>
                    <Text style={styles.productAmount}>
                      ₹{Number(item.return_amount).toFixed(2)}
                    </Text>
                  </View>
                  {!!item.reason && (
                    <View style={styles.reasonBadge}>
                      <Text style={styles.reasonText}>Reason: {item.reason}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Reference Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Number</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              onPress={() => router.push(`/order/${returnDetail.order_id}`)}
            >
              <Text style={styles.infoValueLink}>#{returnDetail.order_number}</Text>
              <ExternalLink size={13} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>{formatDate(returnDetail.order_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Mode</Text>
            <Text style={styles.infoValue}>{returnDetail.payment_method || 'COD'}</Text>
          </View>
          {!!returnDetail.warehouse_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fulfilling Warehouse</Text>
              <Text style={styles.infoValue}>{returnDetail.warehouse_name}</Text>
            </View>
          )}
          {!!returnDetail.additional_info && (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Your Notes</Text>
              <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                {returnDetail.additional_info}
              </Text>
            </View>
          )}
        </View>

        {/* Refund Total Summary */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Refund Claim</Text>
            <Text style={styles.totalAmount}>₹{Number(returnDetail.total_amount).toFixed(2)}</Text>
          </View>
          <View style={styles.refundMethodNote}>
            <ShieldCheck size={16} color="#059669" />
            <Text style={styles.refundMethodNoteText}>
              {isRefunded
                ? 'Refund credited. Check your profile wallet or bank balance.'
                : 'Approved refunds are credited directly to your Digital Wallet or settled on pickup.'}
            </Text>
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 14,
  },
  bannerActive: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bannerSuccess: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  bannerRejected: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  textActive: {
    color: '#b45309',
  },
  textSuccess: {
    color: '#065f46',
  },
  textRejected: {
    color: '#991b1b',
  },
  bannerDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  sectionTitleNoMargin: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  callDriverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callDriverText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  driverInfoBlock: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  driverPhone: {
    fontSize: 13,
    color: '#475569',
  },
  driverVehicle: {
    fontSize: 12,
    color: '#64748b',
  },
  stepperContainer: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 30,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotCompleted: {
    backgroundColor: '#059669',
  },
  stepDotCurrent: {
    backgroundColor: Colors.primary,
  },
  stepDotPending: {
    backgroundColor: '#e2e8f0',
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepNumberCurrent: {
    color: '#ffffff',
  },
  stepNumberPending: {
    color: '#94a3b8',
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 3,
  },
  stepLineCompleted: {
    backgroundColor: '#059669',
  },
  stepLinePending: {
    backgroundColor: '#e2e8f0',
  },
  stepContentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepTitleCompleted: {
    color: '#059669',
  },
  stepTitleCurrent: {
    color: Colors.primary,
  },
  stepTitlePending: {
    color: '#94a3b8',
  },
  stepDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  productUnit: {
    fontSize: 11,
    color: '#64748b',
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  productQty: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  productAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  reasonBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  reasonText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoValueLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  totalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
  },
  refundMethodNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
  },
  refundMethodNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
    lineHeight: 16,
  },
});
