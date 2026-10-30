import { Platform, Linking, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLs } from '@/config/urls';

/**
 * Opens or downloads the official tax invoice PDF for an order.
 * Uses WebBrowser (native in-app Safari / Chrome Custom Tabs) which has
 * native PDF viewing, pinch-to-zoom, system Share sheet (WhatsApp, AirDrop),
 * Save to Files, and Print built-in without requiring unlinked native modules.
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

    // Append token query param for authenticated in-app browser streaming
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

    // 2. Mobile Platform (iOS & Android)
    // Opens native in-app Safari/Chrome tab which renders the PDF with full native share sheet & save controls
    await WebBrowser.openBrowserAsync(invoiceUrlWithToken, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      toolbarColor: '#4f7942',
      controlsColor: '#ffffff',
    });

    return { success: true, uri: invoiceUrlWithToken };
  } catch (error: any) {
    console.warn('WebBrowser failed to open invoice, falling back to Linking:', error);
    try {
      const rawUrl = URLs.ORDER_INVOICE(orderId);
      const token =
        (await AsyncStorage.getItem('@auth_token')) ||
        (await AsyncStorage.getItem('authToken'));
      const separator = rawUrl.includes('?') ? '&' : '?';
      const invoiceUrlWithToken = token
        ? `${rawUrl}${separator}token=${encodeURIComponent(token)}`
        : rawUrl;

      await Linking.openURL(invoiceUrlWithToken);
      return { success: true, uri: invoiceUrlWithToken };
    } catch (fallbackError: any) {
      console.error('Failed to open invoice:', fallbackError);
      Alert.alert(
        'Invoice Download',
        'Unable to open the tax invoice PDF right now. Please check your connection and try again.'
      );
      return { success: false, error: fallbackError?.message || 'Download failed' };
    }
  }
}
