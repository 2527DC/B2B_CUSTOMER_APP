import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import apiClient, { setAuthToken } from '../config/api';
import { URLs, DRIVERS_API_URL } from '../config/urls';

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  warehouse_id?: number | null;
  store_name?: string | null;
  role?: string;
}

// devMode: the backend has no SMS provider active yet and returns the test OTP instead of sending it
export interface SendOtpResult {
  devMode: boolean;
  otp?: number;
  expiresInMinutes?: number;
}

interface AuthContextType {
  isOnboarded: boolean;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  completeOnboarding: () => void;
  login: (phone: string, password: string) => Promise<boolean>;
  sendOtp: (phone: string) => Promise<SendOtpResult>;
  loginWithOtp: (phone: string, otp: number) => Promise<boolean>;
  register: (name: string, email: string, password: string, phone: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isOnboarded, setIsOnboarded] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to persist session keys across both naming formats
  const persistSession = async (token: string, userData: any) => {
    await AsyncStorage.setItem('@auth_token', token);
    await AsyncStorage.setItem('authToken', token);
    if (userData) {
      const serialized = JSON.stringify(userData);
      await AsyncStorage.setItem('@auth_user', serialized);
      await AsyncStorage.setItem('userData', serialized);
    }
    setAuthToken(token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Load session from AsyncStorage on startup
  useEffect(() => {
    async function loadSession() {
      try {
        const storedOnboarded = await AsyncStorage.getItem('@is_onboarded');
        const storedToken =
          (await AsyncStorage.getItem('@auth_token')) ||
          (await AsyncStorage.getItem('authToken'));
        const storedUser =
          (await AsyncStorage.getItem('@auth_user')) ||
          (await AsyncStorage.getItem('userData'));

        if (storedOnboarded === 'false') {
          setIsOnboarded(false);
        } else {
          setIsOnboarded(true);
        }

        if (storedToken && storedUser) {
          setAuthToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load auth session:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@is_onboarded', 'true');
      setIsOnboarded(true);
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  };

  const login = async (phone: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    console.log('🚀 Login attempt for:', phone);

    const cleanPhone = phone.trim();

    // 1. Try primary configured endpoint
    try {
      const response = await apiClient.post(URLs.LOGIN, {
        phone: cleanPhone,
        password,
        device_token: 'RN_B2B_DEVICE',
      });

      if (response.data && (response.data.token || response.data.status === true)) {
        const token = response.data.token;
        const rawUser = response.data.user || response.data.driver || response.data.customer;
        const normalizedUser: User = {
          id: Number(rawUser?.id ?? 1),
          name: rawUser?.name || rawUser?.first_name || `User ${cleanPhone.slice(-4)}`,
          email: rawUser?.email ?? null,
          phone: rawUser?.phone ?? cleanPhone,
          warehouse_id: rawUser?.warehouse_id ?? rawUser?.seller_id ?? null,
          store_name: rawUser?.store_name ?? null,
        };

        await persistSession(token, normalizedUser);
        setIsLoading(false);
        return true;
      }
    } catch (primaryErr: any) {
      console.log('Primary login endpoint response:', primaryErr?.response?.data || primaryErr.message);

      // If Next.js returned a specific error like deactivated, throw that
      const primaryErrorMsg =
        primaryErr?.response?.data?.error || primaryErr?.response?.data?.message;

      // 2. Fallback attempt: if test credentials from dhatri-driver are used or primary failed,
      // try drivers API endpoint on test.dhatri.store as fallback
      try {
        console.log('Attempting driver login fallback on test.dhatri.store...');
        const driverRes = await axios.post(`${DRIVERS_API_URL}/login`, {
          phone: cleanPhone,
          password,
          deviceInfo: {
            platform: 'mobile',
            timestamp: new Date().toISOString(),
          },
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });

        if (driverRes.data && (driverRes.data.status === true || driverRes.data.token)) {
          const token = driverRes.data.token;
          const driver = driverRes.data.driver || {};
          const normalizedUser: User = {
            id: Number(driver.id ?? 1),
            name: driver.name || `User ${cleanPhone.slice(-4)}`,
            email: driver.email ?? null,
            phone: driver.phone ?? cleanPhone,
            warehouse_id: driver.seller_id ?? null,
            store_name: driver.seller_name ?? null,
            role: 'driver_b2b',
          };

          await persistSession(token, normalizedUser);
          setIsLoading(false);
          return true;
        }
      } catch (fallbackErr) {
        // Fallback also didn't succeed, throw primary error
      }

      setIsLoading(false);
      throw new Error(primaryErrorMsg || 'Login failed. Please check your credentials.');
    }

    setIsLoading(false);
    return false;
  };

  const sendOtp = async (phone: string): Promise<SendOtpResult> => {
    try {
      const response = await apiClient.post(URLs.OTP_SEND, {
        phone: phone.trim(),
        type: 'login_with_otp_only',
      });
      return {
        devMode: response.data?.devMode === true,
        otp: response.data?.otp,
        expiresInMinutes: response.data?.expiresInMinutes,
      };
    } catch (error: any) {
      console.error('Send OTP error:', error?.response?.data || error.message);
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to send OTP.';
      throw new Error(msg);
    }
  };

  const loginWithOtp = async (phone: string, otp: number): Promise<boolean> => {
    setIsLoading(true);
    const cleanPhone = phone.trim();
    try {
      const response = await apiClient.post(URLs.LOGIN, {
        phone: cleanPhone,
        code: otp,
        device_token: 'RN_B2B_DEVICE',
      });

      if (response.data && response.data.token) {
        const token = response.data.token;
        const rawUser = response.data.user || response.data.customer;
        const normalizedUser: User = {
          id: Number(rawUser?.id ?? 1),
          name: rawUser?.name || `Customer ${cleanPhone.slice(-4)}`,
          email: rawUser?.email ?? null,
          phone: rawUser?.phone ?? cleanPhone,
          warehouse_id: rawUser?.warehouse_id ?? null,
          store_name: rawUser?.store_name ?? null,
        };

        await persistSession(token, normalizedUser);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error('Login with OTP error:', error?.response?.data || error.message);
      setIsLoading(false);
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'OTP verification failed.';
      throw new Error(msg);
    }
  };

  const register = async (name: string, email: string, password: string, phone: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(URLs.REGISTER, {
        name,
        email,
        password,
        phone,
        device_token: 'RN_B2B_DEVICE',
      });

      if (response.data && response.data.token) {
        const token = response.data.token;
        const rawUser = response.data.user || response.data.customer;
        const normalizedUser: User = {
          id: Number(rawUser?.id ?? 1),
          name: rawUser?.name || name,
          email: rawUser?.email || email,
          phone: rawUser?.phone || phone,
          warehouse_id: rawUser?.warehouse_id ?? null,
        };

        await persistSession(token, normalizedUser);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error('Register error:', error?.response?.data || error.message);
      setIsLoading(false);
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Registration failed.';
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post(URLs.LOGOUT).catch(() => {});
    } catch (e) {
      // ignore
    }
    try {
      await AsyncStorage.multiRemove(['@auth_token', '@auth_user', 'authToken', 'userData']);
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isOnboarded,
        isAuthenticated,
        user,
        isLoading,
        completeOnboarding,
        login,
        sendOtp,
        loginWithOtp,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
