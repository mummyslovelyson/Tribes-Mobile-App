import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginApi,
  registerApi,
  googleAuthApi,
  verifyEmailApi,
  resendVerificationApi,
  forgotPasswordApi,
  resetPasswordApi,
  changePasswordApi,
  logoutApi,
  getProfileApi,
  updateProfileApi,
} from '../api/auth';

const AuthContext = createContext({
  user: null,
  token: null,
  refreshToken: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  isOrganizer: false,
  isAttendee: false,
  persistAuth: () => {},
  clearAuth: () => {},
  login: async () => {},
  register: async () => {},
  verifyOtp: async () => {},
  resendOtp: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  changePassword: async () => {},
  updateProfile: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to persist auth tokens & user across standard tc_* and legacy keys
  const persistAuth = useCallback(async (accessToken, refreshTok, userData) => {
    const pairs = [];
    if (accessToken) {
      setToken(accessToken);
      pairs.push(['tc_token', accessToken], ['@auth_token', accessToken]);
    }
    if (refreshTok) {
      setRefreshToken(refreshTok);
      pairs.push(['tc_refresh', refreshTok], ['@refresh_token', refreshTok]);
    }
    if (userData) {
      setUser(userData);
      const userStr = JSON.stringify(userData);
      pairs.push(['tc_user', userStr], ['@auth_user', userStr]);
    }
    if (pairs.length > 0) {
      try {
        await AsyncStorage.multiSet(pairs);
      } catch (err) {
        console.warn('[AuthProvider] Failed to persist session:', err);
      }
    }
  }, []);

  const clearAuth = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        'tc_token',
        'tc_refresh',
        'tc_user',
        '@auth_token',
        '@refresh_token',
        '@auth_user',
      ]);
    } catch (err) {
      console.warn('[AuthProvider] Clear auth storage warning:', err);
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  // Restore session from AsyncStorage on app boot
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken =
          (await AsyncStorage.getItem('tc_token')) ||
          (await AsyncStorage.getItem('@auth_token'));
        const storedRefreshToken =
          (await AsyncStorage.getItem('tc_refresh')) ||
          (await AsyncStorage.getItem('@refresh_token'));
        const storedUser =
          (await AsyncStorage.getItem('tc_user')) ||
          (await AsyncStorage.getItem('@auth_user'));

        if (storedToken) {
          setToken(storedToken);
          if (storedRefreshToken) {
            setRefreshToken(storedRefreshToken);
          }
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (parseErr) {
              console.warn('[AuthProvider] Failed to parse cached user:', parseErr);
            }
          }

          // Fetch fresh user profile in background
          try {
            const profileData = await getProfileApi();
            if (profileData?.user) {
              setUser(profileData.user);
              const userStr = JSON.stringify(profileData.user);
              await AsyncStorage.multiSet([
                ['tc_user', userStr],
                ['@auth_user', userStr],
              ]);
            }
          } catch (profileErr) {
            console.warn('[AuthProvider] Profile fetch check on boot:', profileErr?.message);
          }
        }
      } catch (err) {
        console.error('[AuthProvider] Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email, password) => {
    const data = await loginApi(email, password);
    const accessToken = data.accessToken || data.token;
    const refreshTok = data.refreshToken;
    const authUser = data.user;

    if (accessToken) {
      await persistAuth(accessToken, refreshTok, authUser);
    }

    return data;
  };

  const googleLogin = async (payload) => {
    const data = await googleAuthApi(payload);
    const accessToken = data.accessToken || data.token;
    const refreshTok = data.refreshToken;
    const authUser = data.user;

    if (accessToken) {
      await persistAuth(accessToken, refreshTok, authUser);
    }

    return data;
  };

  const register = async (formData) => {
    const data = await registerApi(formData);
    const accessToken = data.accessToken || data.token;
    const refreshTok = data.refreshToken;
    const authUser = data.user;

    if (accessToken) {
      await persistAuth(accessToken, refreshTok, authUser);
    }

    return data;
  };

  const verifyOtp = async ({ registrationId, otp, email, phone }) => {
    const data = await verifyEmailApi({ registrationId, otp, email, phone });
    const accessToken = data.accessToken || data.token;
    const refreshTok = data.refreshToken;
    const authUser = data.user;

    if (accessToken) {
      await persistAuth(accessToken, refreshTok, authUser);
    }

    return data;
  };

  const resendOtp = async ({ registrationId, email, phone }) => {
    return await resendVerificationApi({ registrationId, email, phone });
  };

  const forgotPassword = async (email) => {
    return await forgotPasswordApi(email);
  };

  const resetPassword = async ({ email, otp, newPassword }) => {
    return await resetPasswordApi({ email, otp, newPassword });
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    return await changePasswordApi({ currentPassword, newPassword });
  };

  const updateProfile = async (userData) => {
    const data = await updateProfileApi(userData);
    if (data?.user) {
      setUser(data.user);
      const userStr = JSON.stringify(data.user);
      await AsyncStorage.multiSet([
        ['tc_user', userStr],
        ['@auth_user', userStr],
      ]);
    }
    return data;
  };

  const logout = async () => {
    try {
      const storedRefresh = refreshToken || (await AsyncStorage.getItem('tc_refresh'));
      await logoutApi(storedRefresh);
    } catch (err) {
      console.warn('[AuthProvider] Backend logout call warning:', err);
    } finally {
      await clearAuth();
    }
  };

  const refreshProfile = async () => {
    try {
      const data = await getProfileApi();
      if (data?.user) {
        setUser(data.user);
        const userStr = JSON.stringify(data.user);
        await AsyncStorage.multiSet([
          ['tc_user', userStr],
          ['@auth_user', userStr],
        ]);
      }
      return data;
    } catch (err) {
      console.warn('[AuthProvider] refreshProfile error:', err);
      throw err;
    }
  };

  const isAdmin = Boolean(
    user?.role === 'admin' ||
    user?.role === 'system_admin' ||
    user?.role === 'superadmin'
  );
  const isOrganizer = Boolean(user?.role === 'organizer');
  const isAttendee = Boolean(!user?.role || user?.role === 'attendee');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        loading,
        isAuthenticated: Boolean(token),
        isAdmin,
        isOrganizer,
        isAttendee,
        persistAuth,
        clearAuth,
        login,
        googleLogin,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        changePassword,
        updateProfile,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
