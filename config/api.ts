import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { URLs } from './urls';

// ─── Axios client instance ───────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: URLs.API_URL,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

// ─── Request interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      if (!_authToken) {
        const storedToken =
          (await AsyncStorage.getItem('@auth_token')) ||
          (await AsyncStorage.getItem('authToken'));
        if (storedToken) {
          _authToken = storedToken;
        } else {
          const userJson =
            (await AsyncStorage.getItem('@auth_user')) ||
            (await AsyncStorage.getItem('userData'));
          if (userJson) {
            const parsed = JSON.parse(userJson);
            if (parsed?.token) {
              _authToken = parsed.token;
            }
          }
        }
      }

      if (_authToken) {
        config.headers.Authorization = `Bearer ${_authToken}`;
      }

      console.log('🚀 [API Request]:', {
        method: config.method?.toUpperCase(),
        url: `${config.baseURL ?? ''}${config.url ?? ''}`,
        hasAuth: !!_authToken,
      });

      return config;
    } catch (error) {
      console.error('❌ Request Interceptor Error:', error);
      return config;
    }
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response interceptor ────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ [API Response Success]:', {
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    console.error('❌ [API Response Error]:', {
      url: error.config?.url,
      status,
      message: error.message,
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export default apiClient;
