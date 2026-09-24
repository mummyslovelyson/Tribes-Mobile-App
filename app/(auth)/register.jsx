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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import Logo from '../../src/components/Logo';
import GoogleAuthButton from '../../src/components/GoogleAuthButton';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

const ORGANIZER_CATEGORIES = [
  'Concerts & Live Music',
  'Nightlife & Parties',
  'Arts & Culture',
  'Food & Festivals',
  'Business & Tech',
  'Sports & Fitness',
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  // Multi-step state
  const [role, setRole] = useState('attendee'); // 'attendee' | 'organizer'
  const [step, setStep] = useState(1);
  const totalSteps = role === 'organizer' ? 3 : 2;

  // Step 1: Basics
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  // Step 2 (Organizer): Profile details
  const [category, setCategory] = useState('Concerts & Live Music');
  const [city, setCity] = useState('Accra');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  // Final Step: Credentials & Security
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRoleChange = (newRole) => {
    if (newRole === role) return;
    setRole(newRole);
    setStep(1);
    setErrorMessage('');
  };

  const handleNextStep = () => {
    setErrorMessage('');

    if (step === 1) {
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (role === 'attendee') {
        if (!email.trim() || !email.includes('@')) {
          setErrorMessage('Please enter a valid email address.');
          return;
        }
      } else {
        if (!organizationName.trim()) {
          setErrorMessage('Please enter your organization or brand name.');
          return;
        }
      }
      setStep(2);
    } else if (step === 2 && role === 'organizer') {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Please enter your official contact email.');
        return;
      }
      if (!city.trim()) {
        setErrorMessage('Please enter your operating city (e.g. Accra).');
        return;
      }
      if (!website.trim()) {
        setErrorMessage('Please enter your official website or social profile link.');
        return;
      }
      if (!description.trim()) {
        setErrorMessage('Please enter your organization bio and event scope.');
        return;
      }
      setStep(3);
    }
  };

  const handleBackStep = () => {
    setErrorMessage('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = async () => {
    setErrorMessage('');

    if (!phone.trim()) {
      setErrorMessage('Please enter your phone number for ticket SMS verification.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      };

      if (role === 'organizer') {
        payload.organizationName = organizationName.trim();
        payload.city = city.trim() || 'Accra';
        payload.category = category;
        payload.description = description.trim();
        payload.websiteUrl = website.trim();
      }

      const res = await register(payload);

      // If registration requires OTP verification
      if (res?.status === 'pending_verification' || res?.registrationId) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: {
            registrationId: res.registrationId || '',
            email: email.trim(),
            phone: phone.trim(),
          },
        });
        return;
      }

      // If immediately authenticated
      router.replace('/(tabs)');
    } catch (err) {
      console.warn('[RegisterScreen] Registration error:', err?.message);
      const msg = err.response?.data?.message || 'Registration failed. An account with this email or phone may already exist.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const getStepSubtitle = () => {
    if (step === 1) {
      return role === 'organizer' ? 'Step 1 of 3: Organization Basics' : 'Step 1 of 2: Account Details';
    }
    if (step === 2) {
      return role === 'organizer' ? 'Step 2 of 3: Organization Profile' : 'Step 2 of 2: Security & Contact';
    }
    return 'Step 3 of 3: Security & Credentials';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Logo size="md" showText={true} subtitle="LIVING THE MOMENT" style={{ marginBottom: SPACING.md }} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
        </View>

        {/* Step Progress Segments */}
        <View style={styles.progressContainer}>
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isCompleted = step > stepNum;
            const isActive = step === stepNum;
            return (
              <View
                key={idx}
                style={[
                  styles.progressSegment,
                  isActive && styles.progressSegmentActive,
                  isCompleted && styles.progressSegmentCompleted,
                ]}
              />
            );
          })}
        </View>

        {/* Role Switcher Tabs (Shown on Step 1) */}
        {step === 1 && (
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleTab, role === 'attendee' && styles.roleTabActive]}
              onPress={() => handleRoleChange('attendee')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={role === 'attendee' ? '#FFFFFF' : COLORS.textMuted}
              />
              <Text style={[styles.roleTabText, role === 'attendee' && styles.roleTabTextActive]}>
                Attendee Pass
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleTab, role === 'organizer' && styles.roleTabActive]}
              onPress={() => handleRoleChange('organizer')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="business-outline"
                size={16}
                color={role === 'organizer' ? '#FFFFFF' : COLORS.textMuted}
              />
              <Text style={[styles.roleTabText, role === 'organizer' && styles.roleTabTextActive]}>
                Organizer Hub
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Notification */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#FF6B6B" />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <View style={styles.stepCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Kwame Mensah"
                  placeholderTextColor={COLORS.placeholder}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
              </View>
            </View>

            {/* If Attendee: Email */}
            {role === 'attendee' ? (
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
            ) : (
              /* If Organizer: Brand / Organization Name */
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ORGANIZATION / BRAND NAME</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="sparkles-outline" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Echo House Events"
                    placeholderTextColor={COLORS.placeholder}
                    value={organizationName}
                    onChangeText={(val) => {
                      setOrganizationName(val);
                      setErrorMessage('');
                    }}
                    cursorColor={COLORS.primary}
                  />
                </View>
              </View>
            )}

            {/* Next Button */}
            <Button
              title="Continue"
              onPress={handleNextStep}
              style={styles.primaryActionBtn}
            />

            {/* Social Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Authentication */}
            <GoogleAuthButton
              role={role}
              organizerData={{
                organizationName: organizationName.trim(),
                city,
              }}
              text="Continue with Google"
              onError={(msg) => setErrorMessage(msg)}
            />
          </View>
        )}

        {/* ================= STEP 2 (ORGANIZER ONLY) ================= */}
        {step === 2 && role === 'organizer' && (
          <View style={styles.stepCard}>
            {/* Official Contact Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OFFICIAL BUSINESS EMAIL</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="contact@yourbrand.com"
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

            {/* Primary Category Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PRIMARY EVENT CATEGORY</Text>
              <View style={styles.categoryPillsWrapper}>
                {ORGANIZER_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Operating City */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OPERATING CITY *</Text>
              <View style={styles.inputBox}>
                <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Accra"
                  placeholderTextColor={COLORS.placeholder}
                  value={city}
                  onChangeText={(val) => {
                    setCity(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
              </View>
            </View>

            {/* Official Website or Social URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>OFFICIAL WEBSITE OR SOCIAL LINK *</Text>
              <View style={styles.inputBox}>
                <Ionicons name="globe-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="https://instagram.com/yourbrand or website"
                  placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="none"
                  keyboardType="url"
                  value={website}
                  onChangeText={(val) => {
                    setWebsite(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
              </View>
            </View>

            {/* Short Bio / Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ORGANIZATION BIO & EVENT SCOPE *</Text>
              <View style={[styles.inputBox, styles.bioInputBox]}>
                <TextInput
                  style={[styles.textInput, styles.bioTextInput]}
                  placeholder="Describe your organization, events, and target audience..."
                  placeholderTextColor={COLORS.placeholder}
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={(val) => {
                    setDescription(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
              </View>
            </View>

            {/* Dual Button Navigation */}
            <View style={styles.dualNavRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBackStep}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color={COLORS.text} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleNextStep}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= FINAL STEP (SECURITY & CONTACT) ================= */}
        {((step === 2 && role === 'attendee') || (step === 3 && role === 'organizer')) && (
          <View style={styles.stepCard}>
            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithHint}>
                <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                <Text style={styles.labelBadge}>SMS &amp; WHATSAPP PASSES</Text>
              </View>
              <View style={styles.inputBox}>
                <Ionicons name="call-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +233 24 000 0000"
                  placeholderTextColor={COLORS.placeholder}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMessage('');
                  }}
                  cursorColor={COLORS.primary}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.inputBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter password"
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

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => {
                setAgreedToTerms((prev) => !prev);
                setErrorMessage('');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsHighlight}>Terms of Service</Text> and{' '}
                <Text style={styles.termsHighlight}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Dual Button Navigation */}
            <View style={styles.dualNavRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handleBackStep}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={16} color={COLORS.text} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
                onPress={handleFinalSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>
                  {loading ? 'Creating...' : 'Create Account'}
                </Text>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Footer: Sign In Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
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
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  progressSegmentActive: {
    backgroundColor: COLORS.primary,
  },
  progressSegmentCompleted: {
    backgroundColor: COLORS.primaryHover,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
  },
  roleTabText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accentMuted,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorBannerText: {
    color: '#FF6B6B',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
    fontWeight: '600',
  },
  stepCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  labelWithHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  labelBadge: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    backgroundColor: 'rgba(239, 239, 241, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 46,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  bioInputBox: {
    minHeight: 70,
    paddingVertical: SPACING.sm,
    alignItems: 'flex-start',
  },
  bioTextInput: {
    textAlignVertical: 'top',
  },
  eyeBtn: {
    padding: 4,
  },
  categoryPillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  primaryActionBtn: {
    backgroundColor: COLORS.primary,
    marginTop: SPACING.xs,
  },
  dualNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    minWidth: 90,
  },
  backBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    marginBottom: SPACING.md,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    color: COLORS.textMuted,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  termsHighlight: {
    color: COLORS.text,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
    gap: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
