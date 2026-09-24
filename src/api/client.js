import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const getHostFromExpo = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || Constants.manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return null;
};

const getHostFromUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const match = urlStr.match(/^https?:\/\/([^:/]+)/);
  return match ? match[1] : null;
};

// Backend API URL:
// 1. Explicit EXPO_PUBLIC_API_URL env var
// 2. Dynamic host IP from Expo Metro bundler (for physical phones on Wi-Fi)
// 3. Android emulator fallback (10.0.2.2) or localhost fallback
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const expoHost = getHostFromExpo();
  if (expoHost) {
    return `http://${expoHost}:5000/api`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getBaseUrl();

// Helper to rewrite localhost or relative URLs in backend image responses to the correct backend origin
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url;

  const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

  // If already full https:// or non-local URL, return as is
  if (url.startsWith('https://') || (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('10.0.2.2'))) {
    return url;
  }

  // If url is relative like /uploads/xyz.png
  if (url.startsWith('/uploads/')) {
    return `${backendOrigin}${url}`;
  }

  // If url was saved with localhost:5000, 127.0.0.1:5000, or 10.0.2.2:5000
  if (/^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:5000)?\/uploads\//.test(url)) {
    const path = url.replace(/^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:5000)?/, '');
    return `${backendOrigin}${path}`;
  }

  const host = getHostFromUrl(process.env.EXPO_PUBLIC_API_URL) || getHostFromExpo();
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return url.replace('localhost:5000', `${host}:5000`).replace('127.0.0.1:5000', `${host}:5000`).replace('10.0.2.2:5000', `${host}:5000`);
  }

  return url;
};

// Safe resolution of Axios across Hermes ESM / CJS module wrappers
const axiosModule = axios?.default || axios;

const client = axiosModule.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically attach JWT access token
client.interceptors.request.use(
  async (config) => {
    try {
      const token =
        (await AsyncStorage.getItem('tc_token')) ||
        (await AsyncStorage.getItem('@auth_token'));
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[API Client] Error reading auth token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthorized 401s with automatic token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const storedRefreshToken =
          (await AsyncStorage.getItem('tc_refresh')) ||
          (await AsyncStorage.getItem('@refresh_token'));
        if (storedRefreshToken) {
          const res = await axiosModule.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: storedRefreshToken,
          });
          const newAccessToken = res.data?.accessToken || res.data?.token;
          if (newAccessToken) {
            await AsyncStorage.multiSet([
              ['tc_token', newAccessToken],
              ['@auth_token', newAccessToken],
            ]);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return client(originalRequest);
          }
        }
      } catch (refreshErr) {
        console.warn('[API Client] Refresh token failed:', refreshErr?.message);
        // Only clear tokens if the refresh token is genuinely rejected as invalid/expired (400, 401, 403)
        const isAuthRejection = refreshErr?.response?.status && [400, 401, 403].includes(refreshErr.response.status);
        if (isAuthRejection) {
          try {
            await AsyncStorage.multiRemove([
              'tc_token',
              'tc_refresh',
              'tc_user',
              '@auth_token',
              '@refresh_token',
              '@auth_user',
            ]);
          } catch (clearErr) {
            console.warn('[API Client] Error clearing tokens on 401:', clearErr);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;
