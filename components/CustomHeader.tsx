import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Search, Bell, SlidersHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface CustomHeaderProps {
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  showSearch?: boolean;
  showNotification?: boolean;
  unreadCount?: number;
}

export function CustomHeader({
  onSearchPress,
  onNotificationPress,
  showSearch = true,
  showNotification = true,
  unreadCount = 0,
}: CustomHeaderProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Darker shade for gradient depth
  const gradientEnd = theme.primaryDark || theme.primary;

  return (
    <LinearGradient
      colors={[theme.primary, gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}
    >
      {/* Top Row: Logo badge, Title, B2B Tag, Notification */}
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('@/assets/images/logo.jpeg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.titleColumn}>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>Dhatri</Text>
              <View style={styles.b2bBadge}>
                <Text style={styles.b2bBadgeText}>B2B</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>Wholesale Marketplace</Text>
          </View>
        </View>

        {showNotification && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            activeOpacity={0.75}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#ffffff" strokeWidth={2.2} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Row: Executive B2B Search Bar */}
      {showSearch && (
        <TouchableOpacity
          style={styles.searchBar}
          onPress={onSearchPress}
          activeOpacity={0.92}
        >
          <Search size={18} color={theme.primary} strokeWidth={2.4} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Search products, brands & categories...
          </Text>
          <View style={[styles.searchActionBadge, { backgroundColor: `${theme.primary}15` }]}>
            <SlidersHorizontal size={14} color={theme.primary} strokeWidth={2.2} />
          </View>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoWrapper: {
    width: 36,
    height: 36,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleColumn: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  b2bBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  b2bBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.82)',
    fontWeight: '500',
    marginTop: 1,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  searchActionBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
