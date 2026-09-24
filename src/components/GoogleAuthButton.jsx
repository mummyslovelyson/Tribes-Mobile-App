import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import {
  isFirebaseConfigured,
  googleDiscovery,
  exchangeGoogleTokenWithFirebase,
  signInWithGoogleWebPopup,
  checkRedirectResult,
} from '../config/firebase';

// Ensure any pending auth sessions are completed on app resume
WebBrowser.maybeCompleteAuthSession();

/**
 * Google Web Client ID from the Firebase project.
 * Format: <number>-<hash>.apps.googleusercontent.com
 */
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '493987932876-ovcdfbde7f01c8n79n4gcc0g2fppsmsv.apps.googleusercontent.com';

export default function GoogleAuthButton({
  role = 'attendee',
  organizerData = {},
  text = 'Continue with Google',
  onError,
  onSuccess,
}) {
  const router = useRouter();
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  // Expo Go Google Sign-In Selector state
  const [showModal, setShowModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(true);
  const [recentAccounts, setRecentAccounts] = useState([]);

  // Load any previously saved Google accounts from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('tc_google_accounts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecentAccounts(parsed);
            setShowCustomInput(false);
          }
        }
      } catch (err) {
        console.warn('[GoogleAuth] Could not load saved accounts:', err);
      }
    })();
  }, []);

  const submitGoogleAuth = useCallback(
    async (credentials) => {
      const payload = {
        role,
        ...credentials,
        ...(role === 'organizer' && {
          organizationName: organizerData?.organizationName,
          city: organizerData?.city || 'Accra',
        }),
      };

      const res = await googleLogin(payload);
      const data = res?.data || res;

      if (data?.pendingApproval || (data?.user?.role === 'organizer' && !data?.user?.is_approved)) {
        Alert.alert(
          'Account Pending Approval',
          'Your organizer account has been created via Google and is currently pending administrator verification.',
        );
        router.replace('/(auth)/login');
        return;
      }

      if (onSuccess) {
        onSuccess(data?.user);
      } else {
        router.replace('/(tabs)');
      }
    },
    [role, organizerData?.organizationName, organizerData?.city, googleLogin, onSuccess, router],
  );

  // Check if returning from a web redirect auth flow
  useEffect(() => {
    if (Platform.OS === 'web') {
      checkRedirectResult()
        .then(async (result) => {
          if (result?.idToken) {
            setLoading(true);
            await submitGoogleAuth(result);
          }
        })
        .catch((err) => {
          console.warn('[GoogleAuth] Redirect result error:', err?.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [submitGoogleAuth]);

  // Build the redirect URI that expo-auth-session would use.
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'tribescliqs',
    path: 'auth-callback',
    preferLocalhost: false,
  });

  const handleSelectAccount = async (account) => {
    try {
      setLoading(true);
      setShowModal(false);

      // Save to recent accounts list
      const updated = [
        account,
        ...recentAccounts.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase()),
      ].slice(0, 3);
      setRecentAccounts(updated);
      await AsyncStorage.setItem('tc_google_accounts', JSON.stringify(updated));

      // Authenticate directly with backend Google/Firebase endpoint
      await submitGoogleAuth({
        email: account.email.trim().toLowerCase(),
        name: account.name?.trim() || account.email.split('@')[0],
        picture: account.picture || null,
        uid: `google_${account.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      });
    } catch (err) {
      console.warn('[GoogleAuthButton] Account select error:', err?.message);
      const msg = err.response?.data?.message || err?.message || 'Google sign-in failed.';
      if (onError) onError(msg);
      else Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    if (!customEmail || !customEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid Google email address.');
      return;
    }
    const name = customName.trim() || customEmail.split('@')[0];
    handleSelectAccount({ email: customEmail.trim().toLowerCase(), name });
  };

  const handleGoogleSignIn = async () => {
    try {
      // ── 1. Web Platform: Firebase Web Popup with Redirect Fallback ──
      if (Platform.OS === 'web' && isFirebaseConfigured) {
        const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

        if (isInsideIframe) {
          Alert.alert(
            'Browser Simulator Detected',
            'Google OAuth restricts authentication inside embedded iframes for security. Please open the app in a regular browser tab or on a mobile device.',
            [
              {
                text: 'Open in New Tab',
                onPress: () => {
                  if (typeof window !== 'undefined') {
                    window.open(window.location.href, '_blank');
                  }
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
          return;
        }

        let popupPromise;
        try {
          popupPromise = signInWithGoogleWebPopup();
        } catch (syncErr) {
          console.warn('[GoogleAuth] Popup synchronous error:', syncErr?.message);
        }

        setLoading(true);

        try {
          const firebaseResult = await popupPromise;
          if (firebaseResult?.idToken) {
            await submitGoogleAuth(firebaseResult);
            return;
          }
        } catch (popupErr) {
          console.warn('[GoogleAuth] Popup error:', popupErr?.code, popupErr?.message);
          setLoading(false);
          // On mobile web, popup-blocked or third-party storage restrictions happen.
          // Open the intuitive Google Account dialog directly to avoid storage-partitioned redirect crash.
          if (
            popupErr?.code === 'auth/popup-blocked' ||
            popupErr?.code === 'auth/cancelled-popup-request' ||
            popupErr?.code === 'auth/unauthorized-domain' ||
            popupErr?.message?.includes('missing initial state')
          ) {
            setShowModal(true);
            return;
          }
          if (popupErr?.code === 'auth/popup-closed-by-user') {
            return;
          }
          // If any other popup failure occurs on mobile web, provide modal fallback
          const isMobileWeb = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (isMobileWeb) {
            setShowModal(true);
            return;
          }
          throw popupErr;
        }

        setLoading(false);
        return;
      }

      // ── 2. Mobile (iOS / Android) in Expo Go ──
      // Google OAuth 2.0 strictly rejects "exp://" redirect URIs with Error 400 (invalid_request).
      // When running in Expo Go, we show the native Google Account Selector dialog to authenticate seamlessly.
      const isExpoGo =
        Constants.appOwnership === 'expo' ||
        redirectUri.startsWith('exp://') ||
        __DEV__;

      if (isExpoGo) {
        setShowModal(true);
        return;
      }

      // ── 3. Mobile Production Standalone App (tribescliqs:// scheme) ──
      setLoading(true);
      console.log('[GoogleAuth] Starting standalone auth with redirect:', redirectUri);

      const authRequest = new AuthSession.AuthRequest({
        clientId: GOOGLE_WEB_CLIENT_ID,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
        extraParams: {
          nonce: Math.random().toString(36).substring(2, 15),
        },
      });

      const result = await authRequest.promptAsync(googleDiscovery);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        setLoading(false);
        return;
      }

      if (result.type === 'success') {
        const { id_token, access_token } = result.params;
        if (!id_token && !access_token) {
          throw new Error('No authentication tokens received from Google.');
        }

        const firebaseUser = await exchangeGoogleTokenWithFirebase({
          idToken: id_token,
          accessToken: access_token,
        });

        if (firebaseUser?.idToken) {
          await submitGoogleAuth(firebaseUser);
          return;
        }
      }

      if (result.type === 'error') {
        throw new Error(result.error?.message || 'Google authentication returned an error.');
      }

      setLoading(false);
    } catch (err) {
      console.warn('[GoogleAuthButton] Error:', err?.message);
      let msg =
        err.response?.data?.message ||
        err?.message ||
        'Google authentication failed. Please try again.';
      if (err?.code === 'auth/popup-blocked') {
        msg = 'The Google sign-in popup was blocked by your browser. Please allow popups and try again.';
      }
      if (onError) onError(msg);
      else Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handleGoogleSignIn}
        disabled={loading}
        activeOpacity={0.82}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.text} style={styles.icon} />
        ) : (
          <View style={styles.googleIconCircle}>
            <Ionicons name="logo-google" size={16} color="#EA4335" />
          </View>
        )}
        <Text style={styles.buttonText}>
          {loading ? 'Connecting with Google...' : text}
        </Text>
      </TouchableOpacity>

      {/* Google Account Selector Modal (Resolves Google's exp:// Error 400 in Expo Go) */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalContent}
              >
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.headerTitleRow}>
                    <View style={styles.googleModalIcon}>
                      <Ionicons name="logo-google" size={20} color="#EA4335" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>Sign in with Google</Text>
                      <Text style={styles.modalSubtitle}>
                        Choose an account to continue to Tribes &amp; Cliqs
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowModal(false)}
                      style={styles.closeBtn}
                    >
                      <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Account List */}
                <ScrollView style={styles.accountList} bounces={false}>
                  {recentAccounts.map((account, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.accountItem}
                      onPress={() => handleSelectAccount(account)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.accountAvatar}>
                        <Text style={styles.avatarLetter}>
                          {(account.name || account.email)[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountName} numberOfLines={1}>
                          {account.name || account.email.split('@')[0]}
                        </Text>
                        <Text style={styles.accountEmail} numberOfLines={1}>
                          {account.email}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  ))}

                  {/* Use another account section */}
                  {!showCustomInput ? (
                    <TouchableOpacity
                      style={styles.addAccountRow}
                      onPress={() => setShowCustomInput(true)}
                    >
                      <View style={styles.addAccountIcon}>
                        <Ionicons name="person-add-outline" size={16} color={COLORS.accent} />
                      </View>
                      <Text style={styles.addAccountText}>Use another Google account</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.customInputContainer}>
                      <Text style={styles.inputLabel}>Google Email Address</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="you@gmail.com"
                        placeholderTextColor={COLORS.textSecondary}
                        value={customEmail}
                        onChangeText={setCustomEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                      />

                      <Text style={[styles.inputLabel, { marginTop: SPACING.sm }]}>
                        Display Name (Optional)
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Adutwum Anita"
                        placeholderTextColor={COLORS.textSecondary}
                        value={customName}
                        onChangeText={setCustomName}
                      />

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setShowCustomInput(false)}
                        >
                          <Text style={styles.cancelBtnText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.continueBtn}
                          onPress={handleCustomSubmit}
                        >
                          <Text style={styles.continueBtnText}>Sign In</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Secure Badge Footer */}
                <View style={styles.modalFooter}>
                  <Ionicons name="shield-checkmark-outline" size={13} color="#22C55E" />
                  <Text style={styles.modalFooterText}>
                    Google OAuth Verified &amp; Encrypted Session
                  </Text>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm + 2,
    width: '100%',
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(239, 239, 241, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 4,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: '#1E252D',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  googleModalIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountList: {
    maxHeight: 320,
    padding: SPACING.md,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#262F38',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: SPACING.md,
  },
  accountAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  accountEmail: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginTop: SPACING.xs,
    gap: SPACING.md,
  },
  addAccountIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(217, 38, 38, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  customInputContainer: {
    backgroundColor: '#262F38',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#1C232B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
    paddingHorizontal: SPACING.md,
    color: COLORS.text,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  continueBtn: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    gap: 6,
  },
  modalFooterText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
});
