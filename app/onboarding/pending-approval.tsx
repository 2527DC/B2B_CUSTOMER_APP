import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Clock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Building2,
  Phone,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  MessageCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react-native';
import { useAuth, hasDefaultCustomerName } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch {
      // Refresh error handled silently; auth state remains consistent
    } finally {
      setRefreshing(false);
    }
  };

  const handleSupportCall = () => {
    Linking.openURL('tel:+919876543210').catch(() => {
      Alert.alert('Support Helpline', 'Please call our support desk at +91 98765 43210');
    });
  };

  const handleSupportWhatsApp = () => {
    Linking.openURL('https://wa.me/919876543210?text=Hi%20Dhatri%20Team%2C%20checking%20my%20store%20verification%20status').catch(() => {
      Alert.alert('WhatsApp Support', 'Reach us at +91 98765 43210');
    });
  };

  const isRejected = user?.approval_status === 'REJECTED';
  const hasStoreProfile = Boolean(user?.warehouse_id && user?.store_name?.trim() && !hasDefaultCustomerName(user?.name));
  const hasDocs = Boolean(user?.shop_image_url || user?.document_url);
  const displayStoreName = user?.store_name?.trim() || (!hasDefaultCustomerName(user?.name) ? user?.name : 'Pending store details');
  const displayWarehouse = user?.warehouse?.name || (user?.warehouse_id ? `Warehouse #${user.warehouse_id}` : 'Not selected yet');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Sparkles size={14} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>Dhatri Wholesale</Text>
        </View>

        <TouchableOpacity
          onPress={logout}
          activeOpacity={0.7}
          style={styles.logoutButton}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <LogOut size={15} color="#64748b" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Hero Status Card */}
        <View style={[styles.heroCard, isRejected && styles.heroCardRejected]}>
          <View style={[styles.heroIconOuter, isRejected && styles.heroIconOuterRejected]}>
            <View style={[styles.heroIconInner, isRejected && styles.heroIconInnerRejected]}>
              {isRejected ? (
                <AlertTriangle size={36} color="#dc2626" strokeWidth={2.4} />
              ) : (
                <Clock size={36} color="#d97706" strokeWidth={2.4} />
              )}
            </View>
          </View>

          <View style={[styles.statusBadge, isRejected && styles.statusBadgeRejected]}>
            <View style={[styles.statusDot, isRejected && styles.statusDotRejected]} />
            <Text style={[styles.statusBadgeText, isRejected && styles.statusBadgeTextRejected]}>
              {isRejected ? 'Action Required' : 'Verification In Progress'}
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            {isRejected ? 'Application Needs Attention' : 'Under Admin Review'}
          </Text>

          <Text style={styles.heroDescription}>
            {isRejected
              ? user?.rejection_reason ||
                'Your application could not be verified with the submitted documents. Please re-submit your business details.'
              : 'We have received your business details and store documents. Our operations team verifies applications within 2 to 4 business hours.'}
          </Text>

          <View style={styles.slaPill}>
            <Clock size={13} color="#92400e" />
            <Text style={styles.slaPillText}>Average turnaround: 2 - 4 business hours</Text>
          </View>
        </View>

        {/* Verification Steps Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Verification Progress</Text>
          <View style={styles.timeline}>
            {/* Step 1 */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineIconActive}>
                <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.5} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStepTitle}>Mobile Verification</Text>
                <Text style={styles.timelineStepSubtitle}>OTP verified for {user?.phone || 'account'}</Text>
              </View>
            </View>
            <View style={styles.timelineConnectorActive} />

            {/* Step 2 */}
            <View style={styles.timelineItem}>
              <View style={hasStoreProfile ? styles.timelineIconActive : styles.timelineIconPending}>
                {hasStoreProfile ? (
                  <CheckCircle2 size={16} color={Colors.textWhite} strokeWidth={2.5} />
                ) : (
                  <Clock size={15} color="#b45309" strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineStepTitle, !hasStoreProfile && styles.timelineStepTitlePending]}>
                  Store Profile
                </Text>
                <Text style={styles.timelineStepSubtitle}>
                  {displayStoreName}
                </Text>
              </View>
            </View>
            <View style={hasStoreProfile ? styles.timelineConnectorActive : styles.timelineConnectorPending} />

            {/* Step 3 */}
            <View style={styles.timelineItem}>
              <View style={hasDocs ? styles.timelineIconActive : styles.timelineIconPending}>
                {hasDocs ? (
                  <CheckCircle2 size={16} color={Colors.textWhite} strokeWidth={2.5} />
                ) : (
                  <Clock size={15} color="#b45309" strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineStepTitle, !hasDocs && styles.timelineStepTitlePending]}>
                  {hasDocs ? 'Documents Submitted' : 'Documents Pending'}
                </Text>
                <Text style={styles.timelineStepSubtitle}>
                  {hasDocs ? 'Shop & business documents uploaded' : 'Shop & business KYC upload required'}
                </Text>
              </View>
            </View>
            <View style={styles.timelineConnectorPending} />

            {/* Step 4 */}
            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineIconPending,
                  isRejected && styles.timelineIconRejected,
                ]}
              >
                {isRejected ? (
                  <AlertTriangle size={15} color="#ffffff" strokeWidth={2.5} />
                ) : (
                  <Clock size={15} color="#b45309" strokeWidth={2.5} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineStepTitle,
                    isRejected ? styles.timelineStepTitleRejected : styles.timelineStepTitlePending,
                  ]}
                >
                  {isRejected ? 'Admin Review: Rejected' : 'Admin Review & Activation'}
                </Text>
                <Text style={styles.timelineStepSubtitle}>
                  {isRejected
                    ? 'Please review feedback and update details'
                    : 'Unlocks wholesale catalogue & wholesale checkout'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Business Summary Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Application Summary</Text>
          <View style={styles.summaryList}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconWrap}>
                <Building2 size={16} color={Colors.primary} />
              </View>
              <View style={styles.summaryTextCol}>
                <Text style={styles.summaryLabel}>Store / Business Name</Text>
                <Text style={styles.summaryValue}>{displayStoreName}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryIconWrap}>
                <Phone size={16} color={Colors.primary} />
              </View>
              <View style={styles.summaryTextCol}>
                <Text style={styles.summaryLabel}>Registered Mobile</Text>
                <Text style={styles.summaryValue}>{user?.phone || '—'}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryIconWrap}>
                <FileCheck2 size={16} color={Colors.primary} />
              </View>
              <View style={styles.summaryTextCol}>
                <Text style={styles.summaryLabel}>Fulfilment Hub</Text>
                <Text style={styles.summaryValue}>
                  {displayWarehouse}
                </Text>
              </View>
            </View>

            {user?.gst_number ? (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIconWrap}>
                    <ShieldCheck size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.summaryTextCol}>
                    <Text style={styles.summaryLabel}>GSTIN / Tax ID</Text>
                    <Text style={styles.summaryValue}>{user.gst_number}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isRejected ? (
            <TouchableOpacity
              onPress={() => router.push('/onboarding/documents')}
              activeOpacity={0.85}
              style={styles.primaryButton}
            >
              <FileCheck2 size={18} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.primaryButtonText}>Update Documents</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              activeOpacity={0.85}
              style={styles.primaryButton}
            >
              {refreshing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <RefreshCw size={17} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.primaryButtonText}>Check Verification Status</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Support Helpline Box */}
          <View style={styles.supportCard}>
            <View style={styles.supportHeader}>
              <HelpCircle size={16} color="#64748b" />
              <Text style={styles.supportTitle}>Need urgent onboarding assistance?</Text>
            </View>
            <View style={styles.supportButtonsRow}>
              <TouchableOpacity
                onPress={handleSupportWhatsApp}
                style={[styles.supportBtn, styles.supportBtnWhatsapp]}
                activeOpacity={0.8}
              >
                <MessageCircle size={15} color="#15803d" />
                <Text style={styles.supportBtnWhatsappText}>WhatsApp Us</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSupportCall}
                style={[styles.supportBtn, styles.supportBtnPhone]}
                activeOpacity={0.8}
              >
                <Phone size={15} color="#1e293b" />
                <Text style={styles.supportBtnPhoneText}>Call Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fef3c7',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroCardRejected: {
    borderColor: '#fee2e2',
    shadowColor: '#dc2626',
  },
  heroIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  heroIconOuterRejected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  heroIconInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconInnerRejected: {
    backgroundColor: '#fee2e2',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 12,
  },
  statusBadgeRejected: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#d97706',
  },
  statusDotRejected: {
    backgroundColor: '#dc2626',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 0.2,
  },
  statusBadgeTextRejected: {
    color: '#991b1b',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  slaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  slaPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  timeline: {
    paddingLeft: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineIconActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconPending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconRejected: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
  },
  timelineConnectorActive: {
    width: 2,
    height: 22,
    backgroundColor: '#16a34a',
    marginLeft: 13,
    marginVertical: 3,
  },
  timelineConnectorPending: {
    width: 2,
    height: 22,
    backgroundColor: '#cbd5e1',
    marginLeft: 13,
    marginVertical: 3,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 3,
  },
  timelineStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  timelineStepTitlePending: {
    color: '#b45309',
  },
  timelineStepTitleRejected: {
    color: '#dc2626',
  },
  timelineStepSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  summaryList: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
  },
  actionsContainer: {
    gap: 14,
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  supportCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  supportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  supportTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  supportButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  supportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  supportBtnWhatsapp: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  supportBtnWhatsappText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803d',
  },
  supportBtnPhone: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  supportBtnPhoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
});
