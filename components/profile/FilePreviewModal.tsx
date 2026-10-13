import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

const SCRIM = `${Colors.text}f2`;
const WHITE_15 = `${Colors.textWhite}26`;
const WHITE_80 = `${Colors.textWhite}cc`;

interface FilePreviewModalProps {
  /** Image to show full screen; null hides the modal. */
  uri: string | null;
  topInset: number;
  onClose: () => void;
}

/** Full-screen view of a shop photo or an image document. PDFs are opened in the browser instead. */
export default function FilePreviewModal({ uri, topInset, onClose }: FilePreviewModalProps) {
  // Keyed by uri so opening a different file starts in the loading state again
  const [state, setState] = useState<{ uri: string | null; status: 'loaded' | 'failed' } | null>(null);
  const status = state?.uri === uri ? state.status : 'loading';

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={() => setState({ uri, status: 'loaded' })}
            onError={() => setState({ uri, status: 'failed' })}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        {status === 'loading' ? <ActivityIndicator style={styles.center} size="large" color={Colors.textWhite} /> : null}
        {status === 'failed' ? (
          <Text style={[styles.center, styles.error]}>This file could not be loaded. Check your connection and try again.</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.close, { top: topInset + 12 }]}
          onPress={onClose}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Close preview"
        >
          <X size={22} color={Colors.textWhite} strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: SCRIM,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '80%',
  },
  center: {
    position: 'absolute',
    alignSelf: 'center',
  },
  error: {
    paddingHorizontal: 32,
    fontSize: 14,
    fontWeight: '600',
    color: WHITE_80,
    textAlign: 'center',
  },
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHITE_15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
