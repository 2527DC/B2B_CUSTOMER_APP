import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLs } from '@/config/urls';

/**
 * Downloads the official tax invoice PDF for an order and presents
 * the native iOS/Android share/save sheet so the customer can
 * save to Files/Downloads, print, or share.
 */
export async function downloadOrderInvoice(
  orderId: string | number,
  orderNumber: string
): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const cleanNumber = (orderNumber || String(orderId)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const invoiceUrl = URLs.ORDER_INVOICE(orderId);

    // Retrieve active customer auth token
    const token =
      (await AsyncStorage.getItem('@auth_token')) ||
      (await AsyncStorage.getItem('authToken'));

    // On Web, simply trigger standard browser download
    if (Platform.OS === 'web') {
      window.open(invoiceUrl, '_blank');
      return { success: true };
    }

    const filename = `Invoice_${cleanNumber}.pdf`;
    const destination = new File(Paths.document, filename);

    const headers: Record<string, string> = {
      Accept: 'application/pdf',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const downloadedFile = await File.downloadFileAsync(invoiceUrl, destination, {
      headers,
      idempotent: true,
    });

    // Verify sharing is available on this device
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(downloadedFile.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Tax Invoice - #${orderNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Fallback to opening system viewer / linking
      await Linking.openURL(downloadedFile.uri);
    }

    return { success: true, uri: downloadedFile.uri };
  } catch (error: any) {
    console.error('downloadOrderInvoice error:', error);
    const msg = error?.message || 'Could not download invoice. Please try again.';
    Alert.alert('Invoice Download', msg);
    return { success: false, error: msg };
  }
}
