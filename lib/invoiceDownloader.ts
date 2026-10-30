import { Platform, Linking, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLs } from '@/config/urls';

// Safe lazy accessor for ExpoSharing to avoid crash when native binary is not recompiled
function getExpoSharing(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-sharing');
    if (mod && typeof mod.isAvailableAsync === 'function') {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}

// Safe lazy accessor for ExpoFileSystem to avoid crash when native binary is not recompiled
function getExpoFileSystem(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-file-system');
    if (mod && mod.File && mod.Paths) {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Downloads or views the official tax invoice PDF for an order.
 * Works seamlessly whether ExpoSharing/FileSystem are compiled into the native binary or not.
 */
export async function downloadOrderInvoice(
  orderId: string | number,
  orderNumber: string
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const rawUrl = URLs.ORDER_INVOICE(orderId);

    // Retrieve active customer auth token
    const token =
      (await AsyncStorage.getItem('@auth_token')) ||
      (await AsyncStorage.getItem('authToken'));

    // Append token query param so authenticated downloads work in in-app Safari/Chrome tabs
    const separator = rawUrl.includes('?') ? '&' : '?';
    const invoiceUrlWithToken = token
      ? `${rawUrl}${separator}token=${encodeURIComponent(token)}`
      : rawUrl;

    // 1. Web Platform
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(invoiceUrlWithToken, '_blank');
      }
      return { success: true, uri: invoiceUrlWithToken };
    }

    // 2. Try native FileSystem + Sharing if compiled in this build
    const Sharing = getExpoSharing();
    const FileSystem = getExpoFileSystem();

    if (Sharing && FileSystem) {
      try {
        const cleanNumber = (orderNumber || String(orderId)).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Invoice_${cleanNumber}.pdf`;
        const destination = new FileSystem.File(FileSystem.Paths.document, filename);

        const headers: Record<string, string> = {
          Accept: 'application/pdf',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const downloadedFile = await FileSystem.File.downloadFileAsync(
          rawUrl,
          destination,
          { headers, idempotent: true }
        );

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadedFile.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Tax Invoice - #${orderNumber}`,
            UTI: 'com.adobe.pdf',
          });
          return { success: true, uri: downloadedFile.uri };
        }
      } catch (nativeErr) {
        // Native module or write failure: log and smoothly fall through to in-app WebBrowser
        console.warn('Native sharing/download failed, falling back to WebBrowser:', nativeErr);
      }
    }

    // 3. Guaranteed In-App Browser Fallback (Safari / Chrome Custom Tabs)
    // Has native iOS/Android PDF reader, print, and share sheet built-in
    try {
      await WebBrowser.openBrowserAsync(invoiceUrlWithToken);
      return { success: true, uri: invoiceUrlWithToken };
    } catch {
      // If WebBrowser fails, try standard system Linking
      await Linking.openURL(invoiceUrlWithToken);
      return { success: true, uri: invoiceUrlWithToken };
    }
  } catch (error: any) {
    console.error('Failed to open or download tax invoice:', error);
    Alert.alert(
      'Invoice Download',
      'Unable to open the tax invoice PDF right now. Please check your connection and try again.'
    );
    return { success: false, error: error?.message || 'Download failed' };
  }
}
