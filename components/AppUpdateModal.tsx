import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { DownloadCloud, Sparkles, X } from 'lucide-react-native';
import Constants from 'expo-constants';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export interface AppVersionInfo {
  latest_version: string;
  min_supported_version?: string;
  force_update?: boolean;
  update_title?: string;
  update_notes?: string;
  play_store_url?: string;
  app_store_url?: string;
}

const APP_PACKAGE_ID = 'com.dhatri.store';
const APP_STORE_ID = '6777317003';

/**
 * Compares two semantic version strings: e.g. "1.0.9" vs "1.0.8"
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').split('+')[0].trim();
  const clean2 = (v2 || '').split('+')[0].trim();
  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Direct Store Query (like Flutter's upgrader package)
 * Queries iTunes API (iOS) or Google Play Store (Android) directly without requiring backend servers.
 */
async function fetchStoreVersion(): Promise<AppVersionInfo | null> {
  try {
    if (Platform.OS === 'ios') {
      const itunesUrl = `https://itunes.apple.com/lookup?bundleId=${APP_PACKAGE_ID}&t=${Date.now()}`;
      const response = await fetch(itunesUrl);
      if (response.ok) {
        const json = await response.json();
        if (json?.resultCount > 0 && json.results?.[0]) {
          const item = json.results[0];
          return {
            latest_version: (item.version || '').split('+')[0].trim(),
            app_store_url: item.trackViewUrl || `https://apps.apple.com/app/id${APP_STORE_ID}`,
            update_title: 'New Version Available!',
            update_notes: item.releaseNotes || 'A new update is available on the App Store. Please update for the best experience.',
            force_update: false,
          };
        }
      }
    } else if (Platform.OS === 'android') {
      const playUrl = `https://play.google.com/store/apps/details?id=${APP_PACKAGE_ID}&hl=en`;
      const response = await fetch(playUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (response.ok) {
        const html = await response.text();
        const match = html.match(/\[\[\["([0-9]+\.[0-9]+(?:\.[0-9]+)?)"\]\]/);
        if (match && match[1]) {
          return {
            latest_version: match[1],
            play_store_url: `https://play.google.com/store/apps/details?id=${APP_PACKAGE_ID}`,
            update_title: 'New Version Available!',
            update_notes: 'A new update is available on Google Play Store. Please update to enjoy the latest features.',
            force_update: false,
          };
        }
      }
    }
  } catch (err) {
    // Network errors during store check should fail silently
  }
  return null;
}

export function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [visible, setVisible] = useState(false);

  const currentVersion = Constants.expoConfig?.version ?? '1.0.8';

  useEffect(() => {
    let isMounted = true;

    const checkAppVersion = async () => {
      let resolvedInfo: AppVersionInfo | null = null;

      // 1. First attempt: Try Next.js backend API config endpoint
      try {
        const res = await apiClient.get(URLs.APP_CONFIG);
        if (res.data?.latest_version) {
          resolvedInfo = res.data;
        }
      } catch (e) {
        // Backend API check failed, continue to next fallback
      }

      // 2. Second attempt: Try Supabase app_config table (if credentials configured)
      if (!resolvedInfo && supabase) {
        try {
          const { data, error } = await supabase
            .from('app_config')
            .select('*')
            .eq('id', 'dhatri_customer')
            .maybeSingle();

          if (!error && data?.latest_version) {
            resolvedInfo = data;
          }
        } catch (e) {
          // Supabase check failed, continue to next fallback
        }
      }

      // 3. Third attempt: Query App Store / Play Store directly (like Flutter upgrader)
      if (!resolvedInfo) {
        resolvedInfo = await fetchStoreVersion();
      }

      if (resolvedInfo && resolvedInfo.latest_version && isMounted) {
        const remoteVersion = resolvedInfo.latest_version;
        const isOlder = compareVersions(remoteVersion, currentVersion) > 0;

        // Check if this update must be forced
        const minSupported = resolvedInfo.min_supported_version;
        const isBelowMin = minSupported ? compareVersions(minSupported, currentVersion) > 0 : false;
        const shouldForce = resolvedInfo.force_update === true || isBelowMin;

        if (isOlder || shouldForce) {
          setUpdateInfo({
            ...resolvedInfo,
            force_update: shouldForce,
          });
          setVisible(true);
        }
      }
    };

    checkAppVersion();
    return () => {
      isMounted = false;
    };
  }, [currentVersion]);

  if (!visible || !updateInfo) return null;

  const handleUpdate = async () => {
    if (Platform.OS === 'ios') {
      const nativeAppStoreUrl = `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}`;
      const webAppStoreUrl =
        updateInfo.app_store_url || `https://apps.apple.com/us/app/dhatri/id${APP_STORE_ID}`;

      const canOpen = await Linking.canOpenURL(nativeAppStoreUrl).catch(() => false);
      if (canOpen) {
        Linking.openURL(nativeAppStoreUrl);
      } else {
        Linking.openURL(webAppStoreUrl);
      }
    } else {
      const nativePlayStoreUrl = `market://details?id=${APP_PACKAGE_ID}`;
      const webPlayStoreUrl =
        updateInfo.play_store_url || `https://play.google.com/store/apps/details?id=${APP_PACKAGE_ID}`;

      const canOpen = await Linking.canOpenURL(nativePlayStoreUrl).catch(() => false);
      if (canOpen) {
        Linking.openURL(nativePlayStoreUrl);
      } else {
        Linking.openURL(webPlayStoreUrl);
      }
    }
  };

  const isForceUpdate = updateInfo.force_update === true;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {
        if (!isForceUpdate) setVisible(false);
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {!isForceUpdate && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setVisible(false)}
              activeOpacity={0.7}
            >
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <View style={styles.iconCircle}>
            <DownloadCloud size={32} color={Colors.primary} strokeWidth={2.2} />
          </View>

          <Text style={styles.title}>{updateInfo.update_title || 'New Version Available!'}</Text>
          <View style={styles.versionBadge}>
            <Sparkles size={13} color={Colors.primary} />
            <Text style={styles.versionText}>
              v{currentVersion} ➔ v{updateInfo.latest_version}
            </Text>
          </View>

          <Text style={styles.message}>
            {updateInfo.update_notes ||
              'A new update is available with performance improvements and new features. Please update to enjoy the latest experience.'}
          </Text>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>

          {!isForceUpdate && (
            <TouchableOpacity
              style={styles.laterButton}
              onPress={() => setVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  updateButton: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  laterButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  laterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
});
