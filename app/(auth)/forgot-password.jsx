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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import Logo from '../../src/components/Logo';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, resetPassword } = useAuth();

  const [step, setStep] = useState(1); // 1: Request Code, 2: Reset with Code & New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRequestCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await forgotPassword(email.trim());
      setSuccessMessage(res?.message || 'Password reset instructions sent to your email.');
      setStep(2);
    } catch (err) {
      console.warn('[ForgotPassword] Request code error:', err?.message);
      const msg = err.response?.data?.message || 'Unable to process reset request. Please check your email.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim()) {
      setErrorMessage('Please enter the reset code sent to your email.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      Alert.alert(
        'Password Reset Complete',
        'Your password has been successfully updated. You can now sign in with your new credentials.',
        [
          {
            text: 'Sign In Now',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (err) {
      console.warn('[ForgotPassword] Reset error:', err?.message);
      const msg = err.response?.data?.message || 'Failed to reset password. The code may be invalid or expired.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (step === 2 ? setStep(1) : router.back())}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Logo size="lg" showText={true} subtitle="LIVING THE MOMENT" style={{ marginBottom: SPACING.md }} />
          <Text style={styles.title}>
            {step === 1 ? 'Reset Password' : 'Create New Password'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? 'Enter your registered email address to receive a secure recovery code.'
              : `Enter the code sent to ${email} and choose a new password.`}
          </Text>
        </View>

        {/* Error / Success Notifications */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
              </View>
            </View>

            <Button
              title={loading ? 'Sending Code...' : 'Send Recovery Code'}
              onPress={handleRequestCode}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RESET CODE / OTP</Text>
              <View style={styles.inputBox}>
                <Ionicons name="key-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="6-digit code"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
              <View style={styles.inputBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter new password"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
              </View>
            </View>

            <Button
              title={loading ? 'Updating Password...' : 'Save New Password'}
              onPress={handleResetPassword}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Remembered your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxxl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.lg,
    alignSelf: 'flex-start',
  },
  backText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: SPACING.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  successBannerText: {
    color: '#10B981',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs + 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    height: '100%',
  },
  actionBtn: {
    marginTop: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
