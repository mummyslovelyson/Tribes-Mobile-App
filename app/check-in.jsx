import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../src/components/Header';
import Button from '../src/components/Button';
import { verifyTicketApi, checkInTicketApi } from '../src/api/tickets';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

export default function CheckInScreen() {
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerify = async () => {
    const code = ticketCode.trim();
    if (!code) {
      setErrorMsg('Please enter a ticket code or number');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setTicketData(null);

    try {
      const res = await verifyTicketApi(code);
      const data = res?.ticket || res?.data || res;
      setTicketData(data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Ticket not found or invalid code.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!ticketData) return;
    const code = ticketData.ticket_code || ticketData.ticket_number || ticketCode.trim();

    setCheckingIn(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await checkInTicketApi(code);
      setSuccessMsg(`Guest successfully checked in! Welcome, ${ticketData.attendee_name || ticketData.user_name || 'Guest'}.`);
      setTicketData((prev) => (prev ? { ...prev, status: 'used', is_used: true, checked_in_at: new Date().toISOString() } : null));
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed. Ticket may already be used.';
      setErrorMsg(msg);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleClear = () => {
    setTicketCode('');
    setTicketData(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const isAlreadyCheckedIn = ticketData?.status === 'used' || ticketData?.is_used;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Gate Check-In"
        subtitle="Organizer ticket verification"
        showNotification={false}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Instructions Box */}
          <View style={styles.introCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.introTitle}>Gate Entrance Scanner</Text>
              <Text style={styles.introText}>
                Validate attendee tickets by entering the ticket code or alphanumeric pass reference.
              </Text>
            </View>
          </View>

          {/* Search / Entry Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>TICKET NUMBER / CODE</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. TC-00123-A9F"
                placeholderTextColor={COLORS.placeholder}
                value={ticketCode}
                onChangeText={(val) => {
                  setTicketCode(val);
                  if (errorMsg) setErrorMsg('');
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleVerify}
              />

              {ticketCode ? (
                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Button
              title="Verify Ticket"
              onPress={handleVerify}
              loading={loading}
              style={styles.verifyBtn}
            />
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color="#FF6B6B" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Success Banner */}
          {successMsg ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4ADE80" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Ticket Result Card */}
          {ticketData && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View>
                  <Text style={styles.resultTicketCode}>
                    {ticketData.ticket_number || ticketData.ticket_code || ticketCode}
                  </Text>
                  <Text style={styles.resultEventTitle} numberOfLines={1}>
                    {ticketData.event_title || ticketData.event?.title || 'Event Pass'}
                  </Text>
                </View>

                <View style={[styles.statusPill, isAlreadyCheckedIn ? styles.statusUsed : styles.statusValid]}>
                  <Text style={[styles.statusPillText, isAlreadyCheckedIn ? styles.statusTextUsed : styles.statusTextValid]}>
                    {isAlreadyCheckedIn ? 'ALREADY USED' : 'VALID PASS'}
                  </Text>
                </View>
              </View>

              {/* Attendee Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>ATTENDEE NAME</Text>
                  <Text style={styles.detailValue}>
                    {ticketData.attendee_name || ticketData.user_name || ticketData.user?.name || 'Valued Guest'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>PASS TIER</Text>
                  <Text style={styles.detailValue}>
                    {ticketData.ticket_type_name || ticketData.tier_name || 'General Admission'}
                  </Text>
                </View>

                {ticketData.user_email || ticketData.attendee_email ? (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>EMAIL</Text>
                    <Text style={styles.detailValue}>
                      {ticketData.user_email || ticketData.attendee_email}
                    </Text>
                  </View>
                ) : null}

                {ticketData.checked_in_at && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>CHECKED IN AT</Text>
                    <Text style={styles.detailValue}>
                      {new Date(ticketData.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Button */}
              {!isAlreadyCheckedIn ? (
                <Button
                  title="Check In Attendee"
                  onPress={handleCheckIn}
                  loading={checkingIn}
                  style={styles.checkInBtn}
                />
              ) : (
                <View style={styles.checkedInNotice}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#949599" />
                  <Text style={styles.checkedInNoticeText}>
                    This ticket has already been validated and admitted at the gate.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  introTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  introText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 46,
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  clearBtn: {
    padding: 4,
  },
  verifyBtn: {
    marginTop: SPACING.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentMuted,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  successText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  resultTicketCode: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  resultEventTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: 200,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusValid: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  statusUsed: {
    backgroundColor: 'rgba(239, 239, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 239, 241, 0.15)',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextValid: {
    color: '#4ADE80',
  },
  statusTextUsed: {
    color: COLORS.textMuted,
  },
  detailsGrid: {
    gap: SPACING.sm,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  checkInBtn: {
    backgroundColor: COLORS.text,
    marginTop: SPACING.xs,
  },
  checkedInNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  checkedInNoticeText: {
    color: COLORS.textMuted,
    fontSize: 11,
    flex: 1,
  },
});
