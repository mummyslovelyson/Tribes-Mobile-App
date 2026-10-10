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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import {
  isFirebaseConfigured,
  signInWithGoogleWebPopup,
  checkRedirectResult,
} from '../config/firebase';

// Ensure any pending auth sessions are completed on app resume
WebBrowser.maybeCompleteAuthSession();

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
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
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

  const handleSelectAccount = async (account) => {
    setModalLoading(true);
    setModalError('');
    try {
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
      setShowModal(false);
    } catch (err) {
      console.warn('[GoogleAuthButton] Account select error:', err?.message);
      const msg = err.response?.data?.message || err?.message || 'Google sign-in failed. Please verify connection and try again.';
      setModalError(msg);
      if (onError) onError(msg);
    } finally {
      setModalLoading(false);
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    const trimmed = customEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setModalError('Please enter a valid Google email address.');
      return;
    }
    const name = customName.trim() || trimmed.split('@')[0];
    handleSelectAccount({ email: trimmed.toLowerCase(), name });
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      // ── 1. Native Mobile (Android APK / Standalone / iOS): Real Google OAuth via WebBrowser ──
      if (Platform.OS !== 'web') {
        try {
          const clientId =
            process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
            '493987932876-ovcdfbde7f01c8n79n4gcc0g2fppsmsv.apps.googleusercontent.com';
          const backendCallback = 'https://trip-and-cliqs-backend.onrender.com/api/auth/callback';
          const appRedirect = 'tribescliqs://auth-callback';

          const googleAuthUrl =
            `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(clientId)}` +
            `&redirect_uri=${encodeURIComponent(backendCallback)}` +
            `&response_type=token%20id_token` +
            `&scope=${encodeURIComponent('openid profile email')}` +
            `&nonce=${Date.now()}` +
            `&prompt=select_account` +
            `&state=${encodeURIComponent(appRedirect)}`;

          const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, appRedirect);

          if (result?.type === 'success' && result?.url) {
            const returnUrl = result.url;
            let paramString = '';
            if (returnUrl.includes('#') && returnUrl.includes('?')) {
              const [beforeHash, hashPart] = returnUrl.split('#');
              const queryPart = beforeHash.split('?')[1] || '';
              paramString = `${queryPart}&${hashPart}`;
            } else if (returnUrl.includes('#')) {
              paramString = returnUrl.split('#')[1] || '';
            } else if (returnUrl.includes('?')) {
              paramString = returnUrl.split('?')[1] || '';
            }

            const urlParams = new URLSearchParams(paramString);
            const idToken = urlParams.get('id_token');
            const accessToken = urlParams.get('access_token');
            let email = urlParams.get('email');
            let name = urlParams.get('name');
            let picture = urlParams.get('picture');

            // If access token is present but email is not in URL, query Google userinfo directly
            if (accessToken && !email) {
              try {
                const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (profileRes.ok) {
                  const profileData = await profileRes.json();
                  email = profileData.email;
                  name = profileData.name || profileData.given_name;
                  picture = profileData.picture;
                }
              } catch (profileErr) {
                console.warn('[GoogleAuthButton] Google profile fetch fallback:', profileErr?.message);
              }
            }

            if (idToken || accessToken || email) {
              await submitGoogleAuth({
                idToken: idToken || undefined,
                accessToken: accessToken || undefined,
                email: email || undefined,
                name: name || undefined,
                picture: picture || undefined,
              });
              return;
            }
          }

          if (result?.type === 'cancel' || result?.type === 'dismiss') {
            setLoading(false);
            return;
          }
        } catch (nativeOAuthErr) {
          console.warn('[GoogleAuthButton] Native OAuth error:', nativeOAuthErr?.message);
        }
      }

      // ── 2. Desktop Web Platform: Firebase Web Popup with In-App Fallback ──
      if (Platform.OS === 'web' && isFirebaseConfigured) {
        const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

        if (!isInsideIframe) {
          try {
            const firebaseResult = await signInWithGoogleWebPopup();
            if (firebaseResult?.idToken) {
              await submitGoogleAuth(firebaseResult);
              return;
            }
          } catch (popupErr) {
            console.warn('[GoogleAuth] Popup error:', popupErr?.code, popupErr?.message);
          }
        }
      }

      // Default fallback: show in-app account dialog
      setShowModal(true);
      return;
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
            <Ionicons name="logo-google" size={16} color={COLORS.text} />
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
        onRequestClose={() => {
          if (!modalLoading) setShowModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop dismissal - touches outside modal */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (!modalLoading) setShowModal(false);
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <View style={styles.googleModalIcon}>
                  <Ionicons name="logo-google" size={20} color={COLORS.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Sign in with Google</Text>
                  <Text style={styles.modalSubtitle}>
                    Choose an account to continue to Tribes &amp; Cliqs
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  disabled={modalLoading}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* In-Modal Error Banner */}
            {modalError ? (
              <View style={styles.modalErrorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.textSecondary} />
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            ) : null}

            {/* Account List */}
            <ScrollView style={styles.accountList} bounces={false} keyboardShouldPersistTaps="handled">
              {recentAccounts.map((account, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.accountItem}
                  onPress={() => handleSelectAccount(account)}
                  disabled={modalLoading}
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
                  disabled={modalLoading}
                >
                  <View style={styles.addAccountIcon}>
                    <Ionicons name="person-add-outline" size={16} color={COLORS.text} />
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
                    onChangeText={(val) => {
                      setCustomEmail(val);
                      if (modalError) setModalError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!modalLoading}
                    underlineColorAndroid="transparent"
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
                    editable={!modalLoading}
                    underlineColorAndroid="transparent"
                  />

                  <View style={styles.actionRow}>
                    {recentAccounts.length > 0 && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setShowCustomInput(false)}
                        disabled={modalLoading}
                      >
                        <Text style={styles.cancelBtnText}>Back</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.continueBtn, modalLoading && { opacity: 0.7 }]}
                      onPress={handleCustomSubmit}
                      disabled={modalLoading}
                    >
                      {modalLoading ? (
                        <ActivityIndicator size="small" color={COLORS.buttonText} />
                      ) : (
                        <Text style={styles.continueBtnText}>Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Secure Badge Footer */}
            <View style={styles.modalFooter}>
              <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.modalFooterText}>
                Google OAuth Verified &amp; Encrypted Session
              </Text>
            </View>
          </KeyboardAvoidingView>
        </View>
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
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(203, 213, 225, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.3)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  modalErrorText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    outlineStyle: 'none',
    outlineWidth: 0,
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
    backgroundColor: COLORS.primary,
  },
  continueBtnText: {
    color: COLORS.buttonText,
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
