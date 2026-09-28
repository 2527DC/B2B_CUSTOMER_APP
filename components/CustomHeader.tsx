import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Search, Bell, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

interface CustomHeaderProps {
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  showSearch?: boolean;
  showNotification?: boolean;
}

export function CustomHeader({
  onSearchPress,
  onNotificationPress,
  showSearch = true,
  showNotification = true,
}: CustomHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Row: Menu, Logo badge, Title, Notification */}
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.menuButton} activeOpacity={0.7}>
            <Menu size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.logoWrapper}>
            <Image
              source={require('@/assets/images/logo.jpeg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>Dhatri Mart</Text>
        </View>

        {showNotification && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Bell size={24} color="#ffffff" strokeWidth={2} />
            <View style={styles.notificationBadge}>
              <View style={styles.badgeDot} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Row: Pill Search Bar */}
      {showSearch && (
        <TouchableOpacity style={styles.searchBar} onPress={onSearchPress} activeOpacity={0.9}>
          <Search size={18} color="#94a3b8" strokeWidth={2.5} />
          <Text style={styles.searchPlaceholder}>Search products, brands & more...</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary, // #4f7942
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  logoWrapper: {
    width: 32,
    height: 32,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  notificationButton: {
    padding: 6,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24, // Rounded pill shape
    paddingHorizontal: 16,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
