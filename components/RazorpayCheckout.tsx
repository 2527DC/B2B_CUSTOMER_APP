import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

// Razorpay Standard Checkout rendered inside a WebView.
// The Razorpay order is created server-side (dhatri_web_nextjs), so no key secret ever lives in the app.

export interface RazorpayOptions {
  keyId: string;
  razorpayOrderId: string;
  amount: number; // in paise, as returned by create-order
  currency?: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface Props {
  visible: boolean;
  options: RazorpayOptions | null;
  onSuccess: (data: RazorpaySuccess) => void;
  onFailure: (message: string) => void;
  onDismiss: () => void;
}

type CheckoutMessage =
  | { type: 'success'; data: RazorpaySuccess }
  | { type: 'failed'; message: string }
  | { type: 'dismiss' };

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

function buildCheckoutConfig(options: RazorpayOptions) {
  return {
    key: options.keyId,
    order_id: options.razorpayOrderId,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || 'Dhatri',
    description: options.description || '',
    prefill: options.prefill || {},
    theme: { color: Colors.primary },
    // Lets Razorpay hand UPI payments to installed UPI apps from inside a WebView
    webview_intent: true,
  };
}

function buildHtml(options: RazorpayOptions) {
  const config = JSON.stringify(buildCheckoutConfig(options));
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="${CHECKOUT_SCRIPT}"></script>
</head>
<body style="margin:0;background:${Colors.background};">
<script>
  function send(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
  try {
    var config = ${config};
    config.handler = function (res) { send({ type: 'success', data: res }); };
    config.modal = { ondismiss: function () { send({ type: 'dismiss' }); }, escape: false };
    var rzp = new Razorpay(config);
    rzp.on('payment.failed', function (res) {
      send({ type: 'failed', message: (res && res.error && res.error.description) || 'Payment failed' });
    });
    rzp.open();
  } catch (e) {
    send({ type: 'failed', message: 'Unable to load Razorpay checkout' });
  }
</script>
</body>
</html>`;
}

// Web build: load checkout.js into the page directly instead of a WebView.
function openOnWeb(options: RazorpayOptions, props: Props) {
  const w = window as any;
  const launch = () => {
    const rzp = new w.Razorpay({
      ...buildCheckoutConfig(options),
      handler: (res: RazorpaySuccess) => props.onSuccess(res),
      modal: { ondismiss: () => props.onDismiss() },
    });
    rzp.on('payment.failed', (res: any) => props.onFailure(res?.error?.description || 'Payment failed'));
    rzp.open();
  };
  if (w.Razorpay) return launch();
  const script = document.createElement('script');
  script.src = CHECKOUT_SCRIPT;
  script.onload = launch;
  script.onerror = () => props.onFailure('Unable to load Razorpay checkout');
  document.body.appendChild(script);
}

export default function RazorpayCheckout(props: Props) {
  const { visible, options, onSuccess, onFailure, onDismiss } = props;
  const html = useMemo(() => (options ? buildHtml(options) : ''), [options]);

  useEffect(() => {
    if (Platform.OS === 'web' && visible && options) openOnWeb(options, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, options]);

  if (Platform.OS === 'web' || !options) return null;

  const handleMessage = (event: WebViewMessageEvent) => {
    let msg: CheckoutMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'success') onSuccess(msg.data);
    else if (msg.type === 'failed') onFailure(msg.message);
    else onDismiss();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Payment processing. Please don't close this until payment is complete.</Text>
            </View>
          )}
          onShouldStartLoadWithRequest={(req) => {
            // UPI / bank app deep links (upi://, intent://, tez://, phonepe:// ...) must open outside the WebView
            if (/^(https?|about|data|blob):/i.test(req.url)) return true;
            Linking.openURL(req.url).catch(() => onFailure('No app found to complete this payment'));
            return false;
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.surface,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
