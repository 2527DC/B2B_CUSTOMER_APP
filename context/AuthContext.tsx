import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { setAuthToken } from '../config/api';
import { URLs } from '../config/urls';

export interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  warehouse_id?: number | null;
}

interface AuthContextType {
  isOnboarded: boolean;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  completeOnboarding: () => void;
  login: (phone: string, password: string) => Promise<boolean>;
  sendOtp: (phone: string, otp: number) => Promise<boolean>;
  loginWithOtp: (phone: string, otp: number) => Promise<boolean>;
  register: (name: string, email: string, password: string, phone: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from AsyncStorage on startup
  useEffect(() => {
    async function loadSession() {
      try {
        const storedOnboarded = await AsyncStorage.getItem('@is_onboarded');
        const storedToken = await AsyncStorage.getItem('@auth_token');
        const storedUser = await AsyncStorage.getItem('@auth_user');

        if (storedOnboarded === 'true') {
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
     console.log(" The login method invoked ");
    try {
      const response = await apiClient.post(URLs.LOGIN, {
        phone,
        password,
        device_token: 'RN_B2B_DEVICE', // placeholder device token
      });

      if (response.data && response.data.token) {
        const { token, user: userData } = response.data;
        
        await AsyncStorage.setItem('@auth_token', token);
        await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
        
        setAuthToken(token);
        setUser(userData);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error('Login error:', error?.response?.data || error.message);
      setIsLoading(false);
      throw new Error(error?.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  const sendOtp = async (phone: string, otp: number): Promise<boolean> => {
    try {
      const response = await apiClient.post(URLs.OTP_SEND, {
        phone,
        type: 'login_with_otp_only',
        code: otp,
      });
      console.log(" The login method invoked ");
      
      return response.status === 200;
    } catch (error: any) {
      console.error('Send OTP error:', error?.response?.data || error.message);
      throw new Error(error?.response?.data?.message || 'Failed to send OTP.');
    }
  };

  const loginWithOtp = async (phone: string, otp: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(URLs.LOGIN, {
        phone,
        code: otp,
        device_token: 'RN_B2B_DEVICE',
      });

      if (response.data && response.data.token) {
        const { token, user: userData } = response.data;
        
        await AsyncStorage.setItem('@auth_token', token);
        await AsyncStorage.setItem('@auth_user', JSON.stringify(userData));
        
        setAuthToken(token);
        setUser(userData);
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error('Login with OTP error:', error?.response?.data || error.message);
      setIsLoading(false);
      throw new Error(error?.response?.data?.message || 'OTP verification failed.');
    }
  };

  const register = async (name: string, email: string, password: string, phone: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(URLs.REGISTER, {
        name,
        email,
        password,
        password_confirmation: password,
        phone,
      });

      if (response.status === 201 || response.status === 200) {
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error: any) {
      console.error('Registration error:', error?.response?.data || error.message);
      setIsLoading(false);
      throw new Error(error?.response?.data?.message || 'Registration failed.');
    }
  };

  const logout = async () => {
    try {
      // Call logout API optionally
      await apiClient.post(URLs.LOGOUT).catch(() => {});
    } catch (e) {
      // ignore
    }
    try {
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@auth_user');
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
