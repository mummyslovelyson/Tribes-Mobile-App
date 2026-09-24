import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getWalletBalanceApi,
  getWalletTransactionsApi,
  getWithdrawalsApi,
  requestWithdrawalApi,
} from '../../src/api/organizer';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function OrganizerWalletScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [balance, setBalance] = useState({ available: 0, pending: 0, totalRevenue: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('withdrawals'); // 'withdrawals' | 'transactions'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('momo'); // 'momo' | 'bank'
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [provider, setProvider] = useState('MTN'); // 'MTN' | 'Telecel' | 'AirtelTigo'
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const loadWalletData = useCallback(async () => {
    try {
      const [balRes, withRes, txRes] = await Promise.allSettled([
        getWalletBalanceApi(),
        getWithdrawalsApi(),
        getWalletTransactionsApi(),
      ]);

      if (balRes.status === 'fulfilled' && balRes.value) {
        const d = balRes.value?.data || balRes.value;
        setBalance({
          available: Number(d?.available || d?.balance || 0),
          pending: Number(d?.pending || 0),
          totalRevenue: Number(d?.totalRevenue || d?.total_revenue || 0),
        });
      }

      if (withRes.status === 'fulfilled' && withRes.value) {
        const wList = withRes.value?.withdrawals || withRes.value?.data || (Array.isArray(withRes.value) ? withRes.value : []);
        setWithdrawals(wList);
      }

      if (txRes.status === 'fulfilled' && txRes.value) {
        const tList = txRes.value?.transactions || txRes.value?.data || (Array.isArray(txRes.value) ? txRes.value : []);
        setTransactions(tList);
      }
    } catch (err) {
      console.warn('[OrganizerWallet] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      if (isMounted) {
        await loadWalletData();
      }
    };
    fetch();
    return () => {
      isMounted = false;
    };
  }, [loadWalletData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  const handleRequestPayout = async () => {
    const amountNum = parseFloat(payoutAmount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payout amount.');
      return;
    }
    if (amountNum > balance.available) {
      Alert.alert('Insufficient Balance', `Requested amount exceeds available balance of GH₵ ${balance.available.toFixed(2)}.`);
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert('Missing Detail', 'Please enter the receiving account or mobile money number.');
      return;
    }
    if (!accountName.trim()) {
      Alert.alert('Missing Detail', 'Please enter the account holder name.');
      return;
    }

    setSubmittingPayout(true);
    try {
      await requestWithdrawalApi({
        amount: amountNum,
        payout_method: payoutMethod,
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        provider: payoutMethod === 'momo' ? provider : undefined,
      });

      Alert.alert('Payout Requested', 'Your withdrawal request has been submitted for administrator processing.');
      setModalOpen(false);
      setPayoutAmount('');
      setAccountNumber('');
      setAccountName('');
      loadWalletData();
    } catch (err) {
      Alert.alert('Payout Error', err.response?.data?.message || err?.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmittingPayout(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organizer Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Balance Showcase Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>GH₵ {balance.available.toFixed(2)}</Text>

          <View style={styles.balanceMetaRow}>
            <View style={styles.balanceMetaItem}>
              <Text style={styles.balanceMetaLabel}>Pending Clearing</Text>
              <Text style={styles.balanceMetaValue}>GH₵ {balance.pending.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceMetaItem}>
              <Text style={styles.balanceMetaLabel}>Total Lifetime Revenue</Text>
              <Text style={styles.balanceMetaValue}>GH₵ {balance.totalRevenue.toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.payoutButton}
            onPress={() => setModalOpen(true)}
            disabled={balance.available <= 0}
          >
            <Ionicons name="cash-outline" size={18} color={COLORS.buttonText} style={{ marginRight: 6 }} />
            <Text style={styles.payoutButtonText}>Request Payout</Text>
          </TouchableOpacity>
        </View>

        {/* Tab switch */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'withdrawals' && styles.tabItemActive]}
            onPress={() => setActiveTab('withdrawals')}
          >
            <Text style={[styles.tabText, activeTab === 'withdrawals' && styles.tabTextActive]}>
              Withdrawals ({withdrawals.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'transactions' && styles.tabItemActive]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
              Transactions ({transactions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* History List */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : activeTab === 'withdrawals' ? (
          withdrawals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={42} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No withdrawal history</Text>
              <Text style={styles.emptySubtitle}>
                Withdrawals requested from ticket sales will appear here.
              </Text>
            </View>
          ) : (
            withdrawals.map((w) => (
              <View key={w.id} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>GH₵ {Number(w.amount).toFixed(2)}</Text>
                  <Text style={styles.historySubtitle}>
                    {w.payout_method === 'momo' ? `${w.provider || 'MoMo'} • ${w.account_number}` : `Bank • ${w.account_number}`}
                  </Text>
                  <Text style={styles.historyDate}>
                    {w.created_at ? new Date(w.created_at).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    w.status === 'completed' || w.status === 'approved'
                      ? styles.statusSuccess
                      : w.status === 'rejected'
                      ? styles.statusError
                      : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      w.status === 'completed' || w.status === 'approved'
                        ? { color: COLORS.success }
                        : w.status === 'rejected'
                        ? { color: COLORS.error }
                        : { color: COLORS.warning },
                    ]}
                  >
                    {w.status?.toUpperCase() || 'PENDING'}
                  </Text>
                </View>
              </View>
            ))
          )
        ) : (
          transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="swap-horizontal-outline" size={42} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No transactions recorded</Text>
              <Text style={styles.emptySubtitle}>
                Ticket sales and balance credits will appear here.
              </Text>
            </View>
          ) : (
            transactions.map((t) => (
              <View key={t.id} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>GH₵ {Number(t.amount).toFixed(2)}</Text>
                  <Text style={styles.historySubtitle}>{t.description || t.event_title || 'Ticket Sale'}</Text>
                  <Text style={styles.historyDate}>
                    {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>
                <Ionicons name="arrow-down-circle" size={24} color={COLORS.success} />
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Payout Request Modal */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Payout</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Available balance: GH₵ {balance.available.toFixed(2)}
            </Text>

            {/* Payout Method Selector */}
            <View style={styles.methodToggleRow}>
              <TouchableOpacity
                style={[styles.methodToggleBtn, payoutMethod === 'momo' && styles.methodToggleBtnActive]}
                onPress={() => setPayoutMethod('momo')}
              >
                <Ionicons name="phone-portrait-outline" size={16} color={payoutMethod === 'momo' ? COLORS.white : COLORS.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.methodToggleText, payoutMethod === 'momo' && styles.methodToggleTextActive]}>
                  Mobile Money
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodToggleBtn, payoutMethod === 'bank' && styles.methodToggleBtnActive]}
                onPress={() => setPayoutMethod('bank')}
              >
                <Ionicons name="business-outline" size={16} color={payoutMethod === 'bank' ? COLORS.white : COLORS.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.methodToggleText, payoutMethod === 'bank' && styles.methodToggleTextActive]}>
                  Bank Account
                </Text>
              </TouchableOpacity>
            </View>

            {payoutMethod === 'momo' && (
              <View style={styles.providerRow}>
                {['MTN', 'Telecel', 'AirtelTigo'].map((prov) => (
                  <TouchableOpacity
                    key={prov}
                    style={[styles.providerPill, provider === prov && styles.providerPillActive]}
                    onPress={() => setProvider(prov)}
                  >
                    <Text style={[styles.providerPillText, provider === prov && styles.providerPillTextActive]}>
                      {prov}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payout Amount (GH₵)</Text>
              <TextInput
                style={styles.modalInput}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="numeric"
                placeholder={`Max ${balance.available.toFixed(2)}`}
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {payoutMethod === 'momo' ? 'Mobile Money Number' : 'Account Number'}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
                placeholder="0244000000"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.modalInput}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="e.g. Kwame Mensah"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleRequestPayout}
              disabled={submittingPayout}
            >
              {submittingPayout ? (
                <ActivityIndicator color={COLORS.buttonText} />
              ) : (
                <Text style={styles.submitModalBtnText}>Confirm Withdrawal</Text>
              )}
            </TouchableOpacity>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    marginVertical: SPACING.sm,
  },
  balanceMetaRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginVertical: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  balanceMetaItem: {
    alignItems: 'center',
  },
  balanceMetaLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  balanceMetaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    width: '100%',
    marginTop: SPACING.sm,
  },
  payoutButtonText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.sm - 2,
  },
  tabItemActive: {
    backgroundColor: COLORS.card,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  historySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  methodToggleRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  methodToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    marginRight: 6,
  },
  methodToggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  methodToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  methodToggleTextActive: {
    color: COLORS.white,
  },
  providerRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  providerPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginRight: 6,
  },
  providerPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(178, 20, 20, 0.15)',
  },
  providerPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  providerPillTextActive: {
    color: COLORS.text,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  submitModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitModalBtnText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: '700',
  },
});
