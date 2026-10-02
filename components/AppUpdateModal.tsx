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

export interface AppVersionInfo {
  latest_version: string;
  min_supported_version?: string;
  force_update?: boolean;
  update_title?: string;
  update_notes?: string;
  play_store_url?: string;
  app_store_url?: string;
}

/**
 * Compares two semantic version strings: e.g. "1.0.9" vs "1.0.8"
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [visible, setVisible] = useState(false);

  const currentVersion = Constants.expoConfig?.version ?? '1.0.8';

  useEffect(() => {
    let isMounted = true;
    const checkAppVersion = async () => {
      try {
        const res = await apiClient.get(URLs.APP_CONFIG);
        if (res.data && res.data.latest_version && isMounted) {
          const remoteVersion = res.data.latest_version;
          const isOlder = compareVersions(remoteVersion, currentVersion) > 0;
          if (isOlder) {
            setUpdateInfo(res.data);
            setVisible(true);
          }
        }
      } catch (err) {
        // Silent catch: network errors should not interrupt app experience
      }
    };

    checkAppVersion();
    return () => {
      isMounted = false;
    };
  }, [currentVersion]);

  if (!visible || !updateInfo) return null;

  const handleUpdate = () => {
    const storeUrl =
      Platform.OS === 'ios'
        ? updateInfo.app_store_url || 'https://apps.apple.com'
        : updateInfo.play_store_url || 'https://play.google.com/store/apps/details?id=com.dhatri.store';

    Linking.canOpenURL(storeUrl).then((supported) => {
      if (supported) {
        Linking.openURL(storeUrl);
      } else {
        Linking.openURL('https://dhatri.store');
      }
    });
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
