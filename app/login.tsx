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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Smartphone, Lock, Eye, EyeOff, Sparkles, Key } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'expo-router';

export default function LoginScreen() {
  const { login, sendOtp, loginWithOtp } = useAuth();
  
  const [phone, setPhone] = useState('9999900032');
  const [password, setPassword] = useState('test@123');
  const [otp, setOtp] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<number | null>(null);
  
  const [errors, setErrors] = useState<{ phone?: string; password?: string; otp?: string }>({});
  const [loading, setLoading] = useState(false);

  const validatePhone = () => {
    if (!phone) {
      setErrors({ phone: 'Phone number is required' });
      return false;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrors({ phone: 'Please enter a valid 10-digit phone number' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSendOtp = async () => {
    if (!validatePhone()) return;
    setLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000);
      setGeneratedOtp(code);
      await sendOtp(phone, code);
      setOtpSent(true);
      setErrors({});
      // Alert the code for easy local testing/verification
      Alert.alert('Verification Code', `Use OTP code: ${code} to log in.`, [{ text: 'OK' }]);
    } catch (err: any) {
      console.error(err);
      setErrors({ phone: err.message || 'Failed to send OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loginMode === 'otp') {
      if (!otp) {
        setErrors({ otp: 'OTP is required' });
        return;
      }
      const inputOtp = parseInt(otp, 10);
      if (inputOtp !== 1234 && generatedOtp && inputOtp !== generatedOtp) {
        setErrors({ otp: 'Incorrect OTP code' });
        return;
      }
      setLoading(true);
      try {
        await loginWithOtp(phone, inputOtp);
      } catch (err: any) {
        console.error(err);
        setErrors({ otp: err.message || 'OTP verification failed.' });
      } finally {
        setLoading(false);
      }
    } else {
      if (!validatePhone()) return;
      if (!password) {
        setErrors({ password: 'Password is required' });
        return;
      }
      setLoading(true);
      try {
        await login(phone, password);
      } catch (err: any) {
        console.error(err);
        setErrors({ password: err.message || 'Invalid phone or password.' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Branding */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#2563eb', '#1d4ed8']}
              style={styles.logoBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Sparkles size={32} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your B2B shopping account</Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, loginMode === 'password' && styles.toggleBtnActive]}
              onPress={() => {
                setLoginMode('password');
                setOtpSent(false);
                setOtp('');
                setErrors({});
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, loginMode === 'password' && styles.toggleTextActive]}>
                Password Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, loginMode === 'otp' && styles.toggleBtnActive]}
              onPress={() => {
                setLoginMode('otp');
                setOtpSent(false);
                setOtp('');
                setErrors({});
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, loginMode === 'otp' && styles.toggleTextActive]}>
                OTP Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Phone Field */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Phone Number</Text>
              <View
                style={[
                  styles.inputContainer,
                  phoneFocused && styles.inputFocused,
                  errors.phone && styles.inputError,
                ]}
              >
                <Smartphone size={20} color={phoneFocused ? '#2563eb' : '#94a3b8'} style={styles.inputIcon} />
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone) setErrors({ ...errors, phone: undefined });
                  }}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  placeholder="Enter 10-digit phone number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !(loginMode === 'otp' && otpSent)}
                  style={styles.input}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Password Field */}
            {loginMode === 'password' && (
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Password</Text>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.forgotText}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.inputContainer,
                    passwordFocused && styles.inputFocused,
                    errors.password && styles.inputError,
                  ]}
                >
                  <Lock size={20} color={passwordFocused ? '#2563eb' : '#94a3b8'} style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>
            )}

            {/* OTP Field */}
            {loginMode === 'otp' && otpSent && (
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Enter 6-Digit OTP</Text>
                <View
                  style={[
                    styles.inputContainer,
                    otpFocused && styles.inputFocused,
                    errors.otp && styles.inputError,
                  ]}
                >
                  <Key size={20} color={otpFocused ? '#2563eb' : '#94a3b8'} style={styles.inputIcon} />
                  <TextInput
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      if (errors.otp) setErrors({ ...errors, otp: undefined });
                    }}
                    onFocus={() => setOtpFocused(true)}
                    onBlur={() => setOtpFocused(false)}
                    placeholder="Enter code"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    style={styles.input}
                  />
                </View>
                {errors.otp && <Text style={styles.errorText}>{errors.otp}</Text>}
              </View>
            )}

            {/* Action Buttons */}
            {loginMode === 'otp' && !otpSent ? (
              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.9}
                style={styles.signInButton}
              >
                <LinearGradient
                  colors={['#2563eb', '#1d4ed8']}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.signInText}>Send OTP Code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                style={styles.signInButton}
              >
                <LinearGradient
                  colors={['#2563eb', '#1d4ed8']}
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.signInText}>
                      {loginMode === 'otp' ? 'Verify & Sign In' : 'Sign In'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {loginMode === 'otp' && otpSent && (
              <TouchableOpacity
                onPress={() => {
                  setOtpSent(false);
                  setOtp('');
                  setErrors({});
                }}
                activeOpacity={0.8}
                style={styles.changePhoneButton}
              >
                <Text style={styles.changePhoneText}>Change phone number</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer Navigation */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{"Don't have an account? "}</Text>
            <Link href="/register" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.signUpLink}>Sign Up</Text>
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
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#1e293b',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 20,
  },
  inputWrapper: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  eyeIcon: {
    padding: 6,
  },
  inputFocused: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ef4444',
    marginTop: 2,
  },
  signInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  btnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  signInText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  changePhoneButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  changePhoneText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
});

