import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WifiOff, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

export interface OfflineBannerProps {
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  message?: string;
}

export function OfflineBanner({
  onRetry,
  isRetrying = false,
  message = "You're offline • Showing saved data",
}: OfflineBannerProps) {
  const handleRetry = () => {
    if (isRetrying || !onRetry) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // Haptics optional
    }
    onRetry();
  };

  return (
    <View style={styles.banner}>
      <View style={styles.leftContent}>
        <View style={styles.iconCircle}>
          <WifiOff size={14} color="#92400e" strokeWidth={2.4} />
        </View>
        <Text style={styles.bannerText} numberOfLines={1}>
          {message}
        </Text>
      </View>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryChip}
          onPress={handleRetry}
          disabled={isRetrying}
          activeOpacity={0.7}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color="#92400e" />
          ) : (
            <>
              <RotateCcw size={12} color="#92400e" strokeWidth={2.5} />
              <Text style={styles.retryChipText}>Retry</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fde68a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    flex: 1,
  },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 4,
  },
  retryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
});
