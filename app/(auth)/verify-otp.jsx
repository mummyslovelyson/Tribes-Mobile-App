import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import Logo from '../../src/components/Logo';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyOtp, resendOtp } = useAuth();

  const registrationId = params.registrationId || '';
  const email = params.email || '';
  const phone = params.phone || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (val, index) => {
    setErrorMessage('');
    const sanitized = val.replace(/[^0-9]/g, '');

    // Handle paste of 6 digits
    if (sanitized.length > 1) {
      const chars = sanitized.slice(0, 6).split('');
      const newOtp = [...otp];
      chars.forEach((c, idx) => {
        newOtp[idx] = c;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(chars.length, 5);
      inputRefs.current[nextIndex]?.focus();

      if (chars.length === 6) {
        submitOtp(chars.join(''));
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = sanitized;
    setOtp(newOtp);

    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit when 6th digit entered
    if (sanitized && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        submitOtp(fullCode);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitOtp = async (codeToVerify) => {
    const fullCode = codeToVerify || otp.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await verifyOtp({
        registrationId,
        otp: fullCode,
        email,
        phone,
      });
      setSuccessMessage('Account verified successfully! Welcome to Tribes & Cliqs.');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    } catch (err) {
      console.warn('[VerifyOtpScreen] Verification error:', err?.message);
      const msg = err.response?.data?.message || 'Verification failed. The code may be incorrect or expired.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage('');
    try {
      await resendOtp({ registrationId, email, phone });
      setSuccessMessage('A new verification code has been dispatched.');
      setCooldown(60);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code. Please try again.';
      setErrorMessage(msg);
    } finally {
      setResending(false);
    }
  };

  const maskContact = (str) => {
    if (!str) return '';
    if (str.includes('@')) {
      const [name, domain] = str.split('@');
      const visible = name.slice(0, 2);
      return `${visible}***@${domain}`;
    }
    return str.slice(0, 4) + ' *** ' + str.slice(-3);
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
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Logo size="lg" showText={true} subtitle="LIVING THE MOMENT" style={{ marginBottom: SPACING.md }} />
          <Text style={styles.title}>Verify Your Account</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{' '}
            <Text style={styles.highlightText}>{maskContact(email || phone || 'your contact')}</Text>
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

        {/* OTP Input Boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => (inputRefs.current[idx] = ref)}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                errorMessage ? styles.otpBoxError : null,
              ]}
              keyboardType="number-pad"
              maxLength={6}
              value={digit}
              onChangeText={(val) => handleDigitChange(val, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              selectTextOnFocus
              cursorColor={COLORS.primary}
            />
          ))}
        </View>

        {/* Verify Button */}
        <Button
          title={loading ? 'Verifying Code...' : 'Verify & Continue'}
          onPress={() => submitOtp()}
          loading={loading}
          style={styles.verifyBtn}
        />

        {/* Resend Action */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendNotice}>{"Didn't receive the code?"}</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={cooldown > 0 || resending}
            activeOpacity={0.7}
          >
            {resending ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 4 }} />
            ) : (
              <Text
                style={[
                  styles.resendLink,
                  cooldown > 0 ? styles.resendDisabled : null,
                ]}
              >
                {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Alternate Action */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Entered the wrong email or phone? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
            <Text style={styles.footerLink}>Change Details</Text>
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
    paddingHorizontal: SPACING.md,
  },
  highlightText: {
    color: COLORS.text,
    fontWeight: '700',
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  otpBoxError: {
    borderColor: '#EF4444',
  },
  verifyBtn: {
    marginBottom: SPACING.xl,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  resendNotice: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  resendLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  resendDisabled: {
    color: COLORS.placeholder,
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
