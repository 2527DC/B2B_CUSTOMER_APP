import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, KeyRound, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'expo-router';
import { Colors } from '@/constants/theme';
import { WEBSITE_URL } from '@/config/urls';

const logo = require('@/assets/images/logo.jpeg');

// Registration is phone + OTP only — no password, no upfront form. A customer row is created the
// moment the phone is verified (see AuthContext.loginWithOtp / backend auth/login auto-register),
// with defaults for everything else; app/_layout.tsx then routes to whichever step of the
// warehouse/details/[documents] wizard isn't finished yet. Coming back later without finishing
// just means verifying the OTP again — there's no separate "draft" to resume.
export default function RegisterScreen() {
  const { sendOtp, loginWithOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleLogoPress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(WEBSITE_URL);
      if (canOpen) {
        await Linking.openURL(WEBSITE_URL);
      }
    } catch (e) {
      console.error('Error opening URL:', e);
    }
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setError(null);
    setSendingOtp(true);
    try {
      const result = await sendOtp(cleanPhone, 'register');
      setOtpSent(true);
      setDevHint(result.devMode ? `Dev mode — use OTP ${result.otp ?? 1234}` : null);
      if (!result.devMode) {
        Alert.alert('OTP Sent', `Valid for ${result.expiresInMinutes ?? 5} minutes.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerify = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!otp.trim() || otp.trim().length < 4) {
      setError('Please enter the OTP sent to your phone');
      return;
    }

    setError(null);
    setVerifying(true);
    try {
      // On success this updates AuthContext's user/isAuthenticated; app/_layout.tsx picks up the
      // change and routes to the next onboarding step (or home) — no navigation needed here.
      await loginWithOtp(cleanPhone, parseInt(otp.trim(), 10), 'register');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleLogoPress}
              activeOpacity={0.7}
              style={styles.logoBadge}
            >
              <Image source={logo} style={styles.logoImage} resizeMode="contain" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>Register with your phone number — no password needed</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.inputContainer, otpSent && styles.inputDisabled]}>
                <Smartphone size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (error) setError(null);
                  }}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!otpSent}
                  style={styles.input}
                />
              </View>
            </View>

            {otpSent && (
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Verification Code (OTP)</Text>
                <View style={styles.inputContainer}>
                  <KeyRound size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      if (error) setError(null);
                    }}
                    placeholder="6-digit code"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    maxLength={6}
                    style={styles.input}
                  />
                </View>
                {devHint && <Text style={styles.devHint}>{devHint}</Text>}
                <TouchableOpacity onPress={handleSendOtp} activeOpacity={0.7} style={styles.resendRow} disabled={sendingOtp}>
                  <RotateCcw size={13} color={Colors.primary} />
                  <Text style={styles.resendText}>Didn't receive it? Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              onPress={otpSent ? handleVerify : handleSendOtp}
              disabled={sendingOtp || verifying}
              activeOpacity={0.9}
              style={styles.submitButton}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {sendingOtp || verifying ? (
                  <ActivityIndicator size="small" color={Colors.textWhite} />
                ) : (
                  <Text style={styles.submitText}>{otpSent ? 'Verify & Continue' : 'Send OTP'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 16,
  },
  inputWrapper: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  devHint: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning,
    marginTop: 2,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.danger,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  btnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  submitText: {
    color: Colors.textWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
