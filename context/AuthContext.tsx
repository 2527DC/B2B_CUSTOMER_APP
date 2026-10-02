import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import apiClient, { setAuthToken } from '../config/api';
import { URLs, DRIVERS_API_URL } from '../config/urls';
import { getStoredPushToken, registerForPushNotificationsAsync, syncPushTokenWithBackend } from '../lib/notifications';

// Furthest step completed in the phone+OTP registration wizard (see app/onboarding/*.tsx).
export type OnboardingStatus = 'PHONE_VERIFIED' | 'WAREHOUSE_SELECTED' | 'DETAILS_COMPLETED' | 'COMPLETED';
export type ApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  warehouse_id?: number | null;
  store_name?: string | null;
  role?: string;
  gst_number?: string | null;
  shop_image_url?: string | null;
  document_url?: string | null;
  onboarding_status?: OnboardingStatus;
  approval_status?: ApprovalStatus;
  rejection_reason?: string | null;
  // Whether an admin currently requires shop-document verification for new customers
  // (read at the moment of the last login/onboarding response; see GeneralSetting.customerApprovalRequired).
  requires_documents?: boolean;
}

// devMode: the backend has no SMS provider active yet and returns the test OTP instead of sending it
export interface SendOtpResult {
  devMode: boolean;
  otp?: number;
  expiresInMinutes?: number;
}

export interface WarehouseOption {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export type OnboardingStepPayload =
  | { step: 'warehouse'; warehouseId: number }
  | { step: 'details'; name: string; storeName?: string; email?: string; gstNumber?: string }
  | { step: 'documents'; shopImageUrl?: string; documentUrl?: string; gstNumber?: string; skip?: boolean };

// Builds a normalized User from whatever shape the backend's `user` object comes back as
// (login, register, and onboarding all return the same fields; this keeps them in sync).
function normalizeUser(rawUser: any, fallbackPhone: string): User {
  return {
    id: Number(rawUser?.id ?? 1),
    name: rawUser?.name || `Customer ${fallbackPhone.slice(-4)}`,
    email: rawUser?.email ?? null,
    phone: rawUser?.phone ?? fallbackPhone,
    warehouse_id: rawUser?.warehouse_id ?? null,
    store_name: rawUser?.store_name ?? null,
    gst_number: rawUser?.gst_number ?? null,
    shop_image_url: rawUser?.shop_image_url ?? null,
    document_url: rawUser?.document_url ?? null,
    onboarding_status: rawUser?.onboarding_status ?? 'COMPLETED',
    approval_status: rawUser?.approval_status ?? 'NOT_REQUIRED',
    rejection_reason: rawUser?.rejection_reason ?? null,
    requires_documents: rawUser?.requires_documents ?? false,
  };
}

interface AuthContextType {
  isOnboarded: boolean;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  completeOnboarding: () => void;
  login: (phone: string, password: string) => Promise<boolean>;
  sendOtp: (phone: string, type?: 'login' | 'register') => Promise<SendOtpResult>;
  loginWithOtp: (phone: string, otp: number, mode?: 'login' | 'register') => Promise<boolean>;
  register: (name: string, email: string, password: string, phone: string) => Promise<boolean>;
  logout: () => void;
  submitOnboardingStep: (payload: OnboardingStepPayload) => Promise<User>;
  fetchWarehouses: (search?: string) => Promise<WarehouseOption[]>;
  uploadDocument: (fileUri: string, fileName: string, mimeType: string) => Promise<string>;
  refreshUser: () => Promise<User | null>;
  updateProfile: (payload: {
    name: string;
    email?: string;
    store_name?: string;
    gst_number?: string;
    shop_image_url?: string;
    document_url?: string;
  }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isOnboarded, setIsOnboarded] = useState(false);
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
    syncPushTokenWithBackend().catch(() => {});
  };

  // Updates the signed-in user's profile (e.g. after an onboarding step) without touching the
  // token or auth state.
  const persistUserOnly = async (userData: User) => {
    const serialized = JSON.stringify(userData);
    await AsyncStorage.setItem('@auth_user', serialized);
    await AsyncStorage.setItem('userData', serialized);
    setUser(userData);
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

        // On fresh install, storedOnboarded is null, so isOnboarded remains false and welcome screen is displayed!
        setIsOnboarded(storedOnboarded === 'true');

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
    const pushToken = (await getStoredPushToken()) || (await registerForPushNotificationsAsync()) || 'RN_B2B_DEVICE';

    // 1. Try primary configured endpoint
    try {
      const response = await apiClient.post(URLs.LOGIN, {
        phone: cleanPhone,
        password,
        device_token: pushToken,
      });

      if (response.data && (response.data.token || response.data.status === true)) {
        const token = response.data.token;
        const rawUser = response.data.user || response.data.driver || response.data.customer;
        const normalizedUser: User = {
          ...normalizeUser(rawUser, cleanPhone),
          name: rawUser?.name || rawUser?.first_name || `User ${cleanPhone.slice(-4)}`,
          warehouse_id: rawUser?.warehouse_id ?? rawUser?.seller_id ?? null,
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
            ...normalizeUser(driver, cleanPhone),
            name: driver.name || `User ${cleanPhone.slice(-4)}`,
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

  const sendOtp = async (phone: string, type: 'login' | 'register' = 'login'): Promise<SendOtpResult> => {
    try {
      const response = await apiClient.post(URLs.OTP_SEND, {
        phone: phone.trim(),
        type,
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

  const loginWithOtp = async (phone: string, otp: number, mode: 'login' | 'register' = 'login'): Promise<boolean> => {
    setIsLoading(true);
    const cleanPhone = phone.trim();
    const pushToken = (await getStoredPushToken()) || (await registerForPushNotificationsAsync()) || 'RN_B2B_DEVICE';
    try {
      const response = await apiClient.post(URLs.LOGIN, {
        phone: cleanPhone,
        code: otp,
        type: mode,
        device_token: pushToken,
      });

      if (response.data && response.data.token) {
        const token = response.data.token;
        const rawUser = response.data.user || response.data.customer;
        const normalizedUser: User = normalizeUser(rawUser, cleanPhone);

        // When logging in from login screen: existing users who already have a warehouse or account
        // should never be redirected to the onboarding wizard
        if (mode === 'login' && (normalizedUser.warehouse_id != null || normalizedUser.onboarding_status === 'PHONE_VERIFIED')) {
          normalizedUser.onboarding_status = 'COMPLETED';
        }

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
    const pushToken = (await getStoredPushToken()) || (await registerForPushNotificationsAsync()) || 'RN_B2B_DEVICE';
    try {
      const response = await apiClient.post(URLs.REGISTER, {
        name,
        email,
        password,
        phone,
        device_token: pushToken,
      });

      if (response.data && response.data.token) {
        const token = response.data.token;
        const rawUser = response.data.user || response.data.customer;
        const normalizedUser: User = {
          ...normalizeUser(rawUser, phone),
          name: rawUser?.name || name,
          email: rawUser?.email || email,
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

  // Advances the registration wizard by one step (warehouse -> details -> [documents]). The
  // customer already has a token from the phone+OTP verify, so this is just a profile update.
  const submitOnboardingStep = async (payload: OnboardingStepPayload): Promise<User> => {
    try {
      const response = await apiClient.post(URLs.ONBOARDING_STEP, payload);
      const updatedUser = normalizeUser(response.data.user, user?.phone || '');
      await persistUserOnly(updatedUser);
      return updatedUser;
    } catch (error: any) {
      console.error('Onboarding step error:', error?.response?.data || error.message);
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to save your details. Please try again.';
      throw new Error(msg);
    }
  };

  const fetchWarehouses = async (search?: string): Promise<WarehouseOption[]> => {
    try {
      const response = await apiClient.get(URLs.WAREHOUSES_SEARCH, {
        params: search?.trim() ? { search: search.trim() } : undefined,
      });
      return response.data?.warehouses || [];
    } catch (error: any) {
      console.error('Fetch warehouses error:', error?.response?.data || error.message);
      return [];
    }
  };

  // Uploads a picked image (shop photo / ID document) and returns its URL for use in
  // submitOnboardingStep({ step: 'documents', ... }).
  const uploadDocument = async (fileUri: string, fileName: string, mimeType: string): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);

      const response = await apiClient.post(URLs.UPLOAD_DOCUMENT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.url;
    } catch (error: any) {
      console.error('Upload document error:', error?.response?.data || error.message);
      const msg = error?.response?.data?.error || error?.response?.data?.message || 'Failed to upload file. Please try again.';
      throw new Error(msg);
    }
  };

  // Re-fetches the signed-in customer's profile, used to check whether an admin has approved
  // a pending registration since the app was last opened.
  const refreshUser = async (): Promise<User | null> => {
    try {
      const response = await apiClient.get(URLs.GET_USER);
      const rawUser = response.data?.user;
      if (!rawUser) return null;
      const updatedUser = normalizeUser(rawUser, user?.phone || '');
      await persistUserOnly(updatedUser);
      return updatedUser;
    } catch (error: any) {
      console.error('Refresh user error:', error?.response?.data || error.message);
      return null;
    }
  };

  const updateProfile = async (payload: {
    name: string;
    email?: string;
    store_name?: string;
    gst_number?: string;
    shop_image_url?: string;
    document_url?: string;
  }): Promise<User> => {
    const res = await apiClient.post(URLs.UPDATE_USER_PROFILE, payload);
    const rawUser = res.data?.user;
    if (!rawUser) {
      throw new Error(res.data?.error || res.data?.message || 'Failed to update profile');
    }
    const updatedUser = normalizeUser(rawUser, user?.phone || '');
    await persistUserOnly(updatedUser);
    return updatedUser;
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
        submitOnboardingStep,
        fetchWarehouses,
        uploadDocument,
        refreshUser,
        updateProfile,
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
