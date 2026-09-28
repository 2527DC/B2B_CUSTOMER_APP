import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { WEBSITE_URL } from '@/config/urls';
import { Colors } from '@/constants/theme';

const logo = require('@/assets/images/logo.jpeg');

export default function LoginScreen() {
  const router = useRouter();
  const { login, sendOtp, loginWithOtp } = useAuth();

  // Test credentials matching dhatri-driver
  const [phone, setPhone] = useState('9632728795');
  const [password, setPassword] = useState('admin@123');
  const [otp, setOtp] = useState('');

  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);

  const [errors, setErrors] = useState<{ phone?: string; password?: string; otp?: string }>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Color theme - Extracted from https://dhatri.store/
  const PRIMARY_COLOR = Colors.primary;       // #4f7942
  const DARK_GREEN = Colors.primaryDark;      // #3b5c31
  const SUBTEXT_COLOR = Colors.textSecondary; // #64748b
  const WHITE_COLOR = '#ffffff';

  const handleLogoPress = async () => {
    try {
      const canOpen = await Linking.canOpenURL(WEBSITE_URL);
      if (canOpen) {
        await Linking.openURL(WEBSITE_URL);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { phone?: string; password?: string; otp?: string } = {};
    let isValid = true;

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'Phone number must be 10 digits';
      isValid = false;
    }

    if (loginMode === 'password') {
      if (!password.trim()) {
        newErrors.password = 'Password is required';
        isValid = false;
      } else if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
        isValid = false;
      }
    } else {
      if (!otp.trim()) {
        newErrors.otp = 'OTP is required';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrors({ phone: 'Please enter a valid 10-digit phone number' });
      return;
    }

    setLoading(true);
    try {
      const result = await sendOtp(cleanPhone);
      setOtpSent(true);
      setErrors({});
      if (result.devMode) {
        Alert.alert('Test Mode', `SMS is not set up yet. Use OTP ${result.otp ?? 1234} to log in.`, [{ text: 'OK' }]);
      } else {
        Alert.alert(
          'OTP Sent',
          `We sent a 6-digit code to ${cleanPhone}. It is valid for ${result.expiresInMinutes ?? 5} minutes.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      setErrors({ otp: error?.message || 'Failed to send OTP.' });
      Alert.alert('Could Not Send OTP', error?.message || 'Please try again in a moment.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loading || isSubmitting) {
      return;
    }

    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setIsSubmitting(true);

    try {
      if (loginMode === 'otp') {
        const inputOtp = parseInt(otp.trim(), 10);
        await loginWithOtp(phone.trim(), inputOtp);
      } else {
        await login(phone.trim(), password.trim());
      }

      // Successful login navigates directly to main app tabs
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error details:', error);
      const errorMessage = error?.message || 'Login failed. Please check your credentials.';

      Alert.alert('Login Failed', errorMessage, [{ text: 'OK' }]);

      if (errorMessage.toLowerCase().includes('phone')) {
        setErrors((prev) => ({ ...prev, phone: errorMessage }));
      } else if (errorMessage.toLowerCase().includes('password')) {
        setErrors((prev) => ({ ...prev, password: errorMessage }));
      } else if (errorMessage.toLowerCase().includes('otp')) {
        setErrors((prev) => ({ ...prev, otp: errorMessage }));
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: WHITE_COLOR }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Logo */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleLogoPress}
              activeOpacity={0.7}
              style={styles.logoButton}
            >
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </TouchableOpacity>

            <Text style={[styles.title, { color: DARK_GREEN }]}>Dhatri Mart</Text>
            <Text style={[styles.subtitle, { color: SUBTEXT_COLOR }]}>
              Sign in to your wholesale B2B account
            </Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                loginMode === 'password' && styles.modeButtonActive,
              ]}
              onPress={() => {
                setLoginMode('password');
                setOtpSent(false);
                setOtp('');
                setErrors({});
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  loginMode === 'password' && styles.modeButtonTextActive,
                ]}
              >
                Password Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                loginMode === 'otp' && styles.modeButtonActive,
              ]}
              onPress={() => {
                setLoginMode('otp');
                setOtpSent(false);
                setOtp('');
                setErrors({});
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  loginMode === 'otp' && styles.modeButtonTextActive,
                ]}
              >
                OTP Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Phone Number"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="Enter 10 digit phone number"
              keyboardType="phone-pad"
              error={errors.phone}
              editable={!loading}
              maxLength={10}
              backgroundColor={WHITE_COLOR}
            />

            {loginMode === 'password' ? (
              <Input
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Enter your password"
                secureTextEntry
                error={errors.password}
                editable={!loading}
                backgroundColor={WHITE_COLOR}
              />
            ) : (
              <View>
                {!otpSent ? (
                  <Button
                    title={loading ? 'Sending OTP...' : 'Send Verification OTP'}
                    onPress={handleSendOtp}
                    style={styles.sendOtpButton}
                    disabled={loading}
                    primaryColor={PRIMARY_COLOR}
                  />
                ) : (
                  <>
                    <Input
                      label="Verification Code (OTP)"
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text);
                        if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                      }}
                      placeholder="Enter 4 or 6 digit code (use 1234)"
                      keyboardType="numeric"
                      error={errors.otp}
                      editable={!loading}
                      maxLength={6}
                      backgroundColor={WHITE_COLOR}
                    />
                    <TouchableOpacity
                      onPress={handleSendOtp}
                      disabled={loading}
                      style={styles.resendContainer}
                    >
                      <Text style={[styles.resendText, { color: DARK_GREEN }]}>
                        Didn't receive code? Resend
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {(loginMode === 'password' || otpSent) && (
              <Button
                title={loading ? 'Logging in...' : 'Login'}
                onPress={handleLogin}
                style={styles.loginButton}
                disabled={loading}
                primaryColor={PRIMARY_COLOR}
              />
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                <Text style={[styles.loadingText, { color: DARK_GREEN }]}>
                  Authenticating...
                </Text>
              </View>
            )}

            {/* Quick Login Info Hint */}
            <View style={styles.hintBox}>
              <Text style={styles.hintTitle}>Preloaded Demo Credentials:</Text>
              <Text style={styles.hintBody}>
                Phone: <Text style={styles.hintBold}>9632728795</Text> | Pass: <Text style={styles.hintBold}>admin@123</Text>
              </Text>
            </View>

            {/* Registration link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={[styles.registerLink, { color: DARK_GREEN }]}>Register Now</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 130,
    height: 130,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modeButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  form: {
    width: '100%',
  },
  loginButton: {
    marginTop: 18,
  },
  sendOtpButton: {
    marginTop: 8,
  },
  resendContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
    marginTop: -8,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  hintBox: {
    marginTop: 24,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  hintTitle: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    marginBottom: 2,
  },
  hintBody: {
    fontSize: 13,
    color: '#15803d',
  },
  hintBold: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
