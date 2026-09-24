import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Header from '../../src/components/Header';
import TicketCard from '../../src/components/TicketCard';
import Button from '../../src/components/Button';
import { getMyTicketsApi, transferTicketApi } from '../../src/api/tickets';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function TicketsScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'past'
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Transfer Ticket Modal state
  const [ticketToTransfer, setTicketToTransfer] = useState(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await getMyTicketsApi();
      setTickets(data?.tickets || data || []);
    } catch (err) {
      console.warn('[TicketsScreen] Fetch tickets error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  // Auto-fetch tickets on initial mount and whenever tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [fetchTickets])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const handleOpenTransfer = (ticket) => {
    setTicketToTransfer(ticket);
    setTransferEmail('');
    setTransferPhone('');
    setTransferNote('');
    setTransferError('');
  };

  const handleExecuteTransfer = async () => {
    if (!transferEmail.trim() && !transferPhone.trim()) {
      setTransferError('Please provide either recipient email or phone number.');
      return;
    }

    setTransferring(true);
    setTransferError('');
    try {
      await transferTicketApi(ticketToTransfer.id, {
        recipientEmail: transferEmail.trim() || undefined,
        recipientPhone: transferPhone.trim() || undefined,
        notes: transferNote.trim() || undefined,
      });

      Alert.alert(
        'Transfer Complete',
        `Ticket pass #${ticketToTransfer.ticket_code || ticketToTransfer.id} was successfully transferred.`,
        [{ text: 'OK' }]
      );
      setTicketToTransfer(null);
      fetchTickets();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to transfer ticket. Please verify recipient details.';
      setTransferError(msg);
    } finally {
      setTransferring(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const isUsed = t.status === 'used' || t.is_used;
    if (activeTab === 'active') return !isUsed;
    return isUsed;
  });

  // Not signed in state
  if (!authLoading && !isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header title="My Tickets" showNotification={false} />
        <View style={styles.authPromptContainer}>
          <View style={styles.authIconCircle}>
            <Ionicons name="ticket-outline" size={36} color={COLORS.text} />
          </View>
          <Text style={styles.authTitle}>Access Your Tickets</Text>
          <Text style={styles.authSubtitle}>
            Sign in to view your purchased passes, live QR check-ins, and ticket transfers.
          </Text>
          <Button
            title="Sign In to Account"
            onPress={() => router.push('/(auth)/login')}
            style={styles.authButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="My Tickets" subtitle="Digital passes & QR codes" />

      {/* Tab Segment Controls */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'active' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeTab === 'active' && styles.segmentTextActive]}>
            Active Passes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'past' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeTab === 'past' && styles.segmentTextActive]}>
            Past &amp; Used
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tickets List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your ticket wallet...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TicketCard
              ticket={item}
              onQrPress={(t) => setSelectedTicket(t)}
              onTransferPress={(t) => handleOpenTransfer(t)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'active' ? 'No active tickets' : 'No past tickets'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'active'
                  ? 'Ready for your next experience? Explore upcoming events and grab your pass.'
                  : 'Tickets you have redeemed or past events will be listed here.'}
              </Text>
              {activeTab === 'active' && (
                <Button
                  title="Browse Events"
                  variant="secondary"
                  onPress={() => router.push('/(tabs)')}
                  style={styles.browseBtn}
                />
              )}
            </View>
          }
        />
      )}

      {/* QR Code Pass Modal */}
      <Modal
        visible={Boolean(selectedTicket)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pass Check-in</Text>
              <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalEventTitle}>
              {selectedTicket?.event_title || selectedTicket?.title}
            </Text>
            <Text style={styles.modalTier}>
              {selectedTicket?.ticket_type_name || selectedTicket?.tier_name || 'General Admission'}
            </Text>

            {/* QR Mock graphic with brand styling */}
            <View style={styles.qrContainer}>
              <View style={styles.qrBox}>
                <Ionicons name="qr-code" size={160} color={COLORS.background} />
              </View>
              <Text style={styles.modalCode}>
                {selectedTicket?.ticket_code || `#TC-${selectedTicket?.id}`}
              </Text>
            </View>

            <Text style={styles.modalInstructions}>
              Show this QR code at the event gate to scan and gain entry.
            </Text>

            <Button
              title="Done"
              variant="secondary"
              onPress={() => setSelectedTicket(null)}
              style={styles.modalDoneBtn}
            />
          </View>
        </View>
      </Modal>

      {/* Transfer Ticket Modal */}
      <Modal
        visible={Boolean(ticketToTransfer)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTicketToTransfer(null)}
      >
        <KeyboardAvoidingView
          style={styles.transferModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.transferModalHeader}>
            <Text style={styles.transferModalTitle}>Transfer Ticket Pass</Text>
            <TouchableOpacity onPress={() => setTicketToTransfer(null)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.transferModalBody}>
            <View style={styles.transferTicketSummary}>
              <Text style={styles.summaryEventTitle}>{ticketToTransfer?.event_title || ticketToTransfer?.title}</Text>
              <Text style={styles.summaryTier}>{ticketToTransfer?.ticket_type_name || ticketToTransfer?.tier_name || 'Pass'}</Text>
              <Text style={styles.summaryCode}>Code: {ticketToTransfer?.ticket_code || `#TC-${ticketToTransfer?.id}`}</Text>
            </View>

            {transferError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorBannerText}>{transferError}</Text>
              </View>
            ) : null}

            <Text style={styles.transferHelpText}>
              Enter the recipient&apos;s email address or phone number. Once transferred, this pass will belong to them.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RECIPIENT EMAIL</Text>
              <TextInput
                style={styles.transferInput}
                placeholder="friend@example.com"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={transferEmail}
                onChangeText={(v) => {
                  setTransferEmail(v);
                  setTransferError('');
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RECIPIENT PHONE (OPTIONAL)</Text>
              <TextInput
                style={styles.transferInput}
                placeholder="e.g. 055 123 4567"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="phone-pad"
                value={transferPhone}
                onChangeText={(v) => {
                  setTransferPhone(v);
                  setTransferError('');
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GIFT NOTE (OPTIONAL)</Text>
              <TextInput
                style={[styles.transferInput, styles.transferNoteInput]}
                placeholder="Add a personal message for the recipient..."
                placeholderTextColor={COLORS.placeholder}
                multiline
                numberOfLines={3}
                value={transferNote}
                onChangeText={setTransferNote}
              />
            </View>

            <Button
              title={transferring ? 'Transferring Pass...' : 'Confirm Transfer'}
              onPress={handleExecuteTransfer}
              loading={transferring}
              style={{ marginTop: SPACING.md }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 3,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.text,
  },
  segmentText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: COLORS.background,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  browseBtn: {
    minWidth: 160,
  },
  authPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  authIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  authTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  authSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xxl,
  },
  authButton: {
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  modalEventTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalTier: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
    marginBottom: SPACING.lg,
  },
  qrContainer: {
    backgroundColor: COLORS.text,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  qrBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCode: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: SPACING.sm,
    letterSpacing: 1,
  },
  modalInstructions: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  modalDoneBtn: {
    width: '100%',
  },
  transferModalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  transferModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transferModalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  transferModalBody: {
    padding: SPACING.xl,
  },
  transferTicketSummary: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  summaryEventTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryTier: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  summaryCode: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  transferHelpText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING.lg,
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
  transferInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
    color: COLORS.text,
    fontSize: 14,
  },
  transferNoteInput: {
    height: 80,
    paddingTop: SPACING.sm + 2,
    textAlignVertical: 'top',
  },
});
