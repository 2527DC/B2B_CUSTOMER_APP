import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { URLs } from './urls';

// ─── Axios client instance ───────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: URLs.API_URL,
  timeout: 30_000, // 30s – matches Flutter AppLimit.REQUEST_TIME_OUT
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor ─────────────────────────────────────────────────────
// Attach the Bearer token whenever it is available in the app.
// Call `setAuthToken(token)` after a successful login.
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (_authToken) {
      config.headers.Authorization = `Bearer ${_authToken}`;
      console.log('─── API REQUEST ───');
      console.log(`Method: ${config.method?.toUpperCase()}`);
      console.log(`URL: ${config.baseURL ?? ''}${config.url ?? ''}`);
      console.log(`Bearer Token: ${_authToken}`);
    } else {
      console.log('─── API REQUEST (NO AUTH) ───');
      console.log(`Method: ${config.method?.toUpperCase()}`);
      console.log(`URL: ${config.baseURL ?? ''}${config.url ?? ''}`);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response interceptor ────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('─── API RESPONSE SUCCESS ───');
    console.log(`URL: ${response.config.url}`);
    console.log(`Status: ${response.status}`);
    console.log(`Data:`, JSON.stringify(response.data));
    console.log('────────────────────────────');
    return response;
  },
  (error: AxiosError) => {
    if (__DEV__) {
      if (error.response?.status === 404) {
        console.log('─── API RESPONSE 404 (Graceful) ───');
        console.log(`URL: ${error.config?.url}`);
        console.log(`Status: 404 (Resource not found / Empty state)`);
        console.log(`Data:`, JSON.stringify(error.response?.data));
        console.log('────────────────────────────────────');
      } else {
        console.error('─── API RESPONSE ERROR ───');
        console.error(`URL: ${error.config?.url}`);
        console.error(`Status: ${error.response?.status}`);
        console.error(`Message: ${error.message}`);
        console.error(`Data:`, JSON.stringify(error.response?.data));
        console.error('──────────────────────────');
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
