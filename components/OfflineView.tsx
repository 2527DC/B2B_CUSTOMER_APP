import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { WifiOff, AlertCircle, RefreshCw, ArrowLeft, Signal, Wifi } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

export interface OfflineViewProps {
  /** Callback triggered when user taps Retry or pulls down to refresh */
  onRetry: () => void | Promise<void>;
  /** Optional loading state during retry */
  isRetrying?: boolean;
  /** Custom headline */
  title?: string;
  /** Custom description */
  message?: string;
  /** Whether the error is specifically a network/offline error */
  isOffline?: boolean;
  /** Whether to show connection checklist hints */
  showTroubleshooting?: boolean;
  /** Optional back button for detail screens */
  onGoBack?: () => void;
  /** Optional custom container style */
  style?: StyleProp<ViewStyle>;
}

export function OfflineView({
  onRetry,
  isRetrying: externalRetrying,
  title,
  message,
  isOffline = true,
  showTroubleshooting = true,
  onGoBack,
  style,
}: OfflineViewProps) {
  const [internalRetrying, setInternalRetrying] = useState(false);
  const isRetrying = externalRetrying ?? internalRetrying;

  const handleRetry = async () => {
    if (isRetrying) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // Haptics optional
    }

    setInternalRetrying(true);
    try {
      await onRetry();
    } finally {
      setInternalRetrying(false);
    }
  };

  const displayTitle =
    title || (isOffline ? 'No Internet Connection' : 'Something Went Wrong');
  const displayMessage =
    message ||
    (isOffline
      ? 'Please check your internet connection or mobile data and try again. Your content will appear once you are back online.'
      : 'We encountered an error loading this information. Please tap Retry to try again.');

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, style]}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={true}
      refreshControl={
        <RefreshControl
          refreshing={isRetrying}
          onRefresh={handleRetry}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Optional Top Back Button */}
      {onGoBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onGoBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#334155" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      )}

      {/* Hero Icon Badge */}
      <View style={styles.iconOuterRing}>
        <View style={styles.iconInnerCircle}>
          {isOffline ? (
            <WifiOff size={42} color={Colors.primary} strokeWidth={2.2} />
          ) : (
            <AlertCircle size={42} color="#e11d48" strokeWidth={2.2} />
          )}
        </View>
        <View style={[styles.badgeDot, !isOffline && styles.badgeDotAlert]}>
          {isOffline ? (
            <Signal size={12} color="#ffffff" strokeWidth={2.5} />
          ) : (
            <AlertCircle size={12} color="#ffffff" strokeWidth={2.5} />
          )}
        </View>
      </View>

      {/* Title & Description */}
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>

      {/* Troubleshooting Tips Box */}
      {isOffline && showTroubleshooting && (
        <View style={styles.tipsCard}>
          <Text style={styles.tipsHeader}>Quick Troubleshooting</Text>
          <View style={styles.tipRow}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>Check your Wi-Fi or mobile data toggle</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>Turn Airplane Mode on for 5s, then turn it off</Text>
          </View>
          <View style={styles.tipRow}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText}>Ensure mobile data is enabled for Dhatri Store</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={handleRetry}
          disabled={isRetrying}
          activeOpacity={0.8}
        >
          {isRetrying ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.retryButtonText}>Connecting...</Text>
            </>
          ) : (
            <>
              <RefreshCw size={18} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.pullHint}>Or swipe down to refresh</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    backgroundColor: Colors.background,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  iconOuterRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.primary10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.primary20,
  },
  iconInnerCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeDotAlert: {
    backgroundColor: '#e11d48',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 340,
  },
  tipsCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  tipsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  tipText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    lineHeight: 18,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  retryButtonDisabled: {
    opacity: 0.75,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pullHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
