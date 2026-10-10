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
  getOrganizerDashboardApi,
  getOrganizerEventsApi,
  publishEventApi,
  unpublishEventApi,
  deleteEventApi,
  getWalletBalanceApi,
  getOrganizerRefundRequestsApi,
  respondToRefundRequestApi,
} from '../../src/api/organizer';
import { getPolicyTitle } from '../../src/constants/refundPolicy';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function OrganizerDashboardScreen() {
  const router = useRouter();
  const { isOrganizer, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'events' | 'wallet' | 'refunds'

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    ticketsSold: 0,
    activeEvents: 0,
    totalAttendees: 0,
  });

  // Events list
  const [events, setEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('all'); // 'all' | 'published' | 'draft'

  // Wallet summary
  const [wallet, setWallet] = useState({
    available: 0,
    pending: 0,
    totalRevenue: 0,
  });

  // Refunds list & response modals
  const [refundRequests, setRefundRequests] = useState([]);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedRefundForDecline, setSelectedRefundForDecline] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [respondingRefund, setRespondingRefund] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashRes, eventsRes, walletRes, refundsRes] = await Promise.allSettled([
        getOrganizerDashboardApi(),
        getOrganizerEventsApi(),
        getWalletBalanceApi(),
        getOrganizerRefundRequestsApi(),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value) {
        const d = dashRes.value?.data || dashRes.value;
        setStats({
          totalRevenue: d?.totalRevenue || d?.revenue || 0,
          ticketsSold: d?.ticketsSold || d?.tickets_sold || 0,
          activeEvents: d?.activeEvents || d?.active_events || 0,
          totalAttendees: d?.totalAttendees || d?.attendees || 0,
        });
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value) {
        const evs = eventsRes.value?.events || eventsRes.value?.data || (Array.isArray(eventsRes.value) ? eventsRes.value : []);
        setEvents(evs);
      }

      if (walletRes.status === 'fulfilled' && walletRes.value) {
        const w = walletRes.value?.data || walletRes.value;
        setWallet({
          available: Number(w?.available || w?.balance || 0),
          pending: Number(w?.pending || 0),
          totalRevenue: Number(w?.totalRevenue || w?.total_revenue || 0),
        });
      }

      if (refundsRes.status === 'fulfilled' && refundsRes.value) {
        const reqs = refundsRes.value?.refundRequests || refundsRes.value?.data || (Array.isArray(refundsRes.value) ? refundsRes.value : []);
        setRefundRequests(Array.isArray(reqs) ? reqs : []);
      }
    } catch (err) {
      console.warn('[OrganizerDashboard] Load error:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleAuthorizeRefund = (refund) => {
    Alert.alert(
      'Authorize Refund (Clause 1)',
      `Are you sure you want to authorize refund of GH₵ ${Number(refund.amount || 0).toFixed(2)} for ${refund.buyer_name || 'Buyer'}? Under Clause 1, funds will be returned and tickets will be invalidated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Refund',
          style: 'default',
          onPress: async () => {
            try {
              const res = await respondToRefundRequestApi(refund.id, { action: 'authorize' });
              Alert.alert('Refund Authorized', res?.message || 'Refund successfully processed.');
              loadData();
            } catch (err) {
              const msg = err.response?.data?.message || 'Failed to authorize refund.';
              Alert.alert('Authorization Failed', msg);
            }
          },
        },
      ]
    );
  };

  const handleOpenDeclineModal = (refund) => {
    setSelectedRefundForDecline(refund);
    setDeclineReason('');
    setDeclineModalVisible(true);
  };

  const handleConfirmDecline = async () => {
    if (!selectedRefundForDecline) return;
    if (!declineReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a clear justification for declining this refund request.');
      return;
    }
    setRespondingRefund(true);
    try {
      const res = await respondToRefundRequestApi(selectedRefundForDecline.id, {
        action: 'decline',
        responseNote: declineReason.trim(),
      });
      Alert.alert('Request Declined', res?.message || 'Refund request has been declined.');
      setDeclineModalVisible(false);
      setSelectedRefundForDecline(null);
      setDeclineReason('');
      loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to decline refund request.';
      Alert.alert('Action Failed', msg);
    } finally {
      setRespondingRefund(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    fetch();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTogglePublish = async (event) => {
    const isPub = event.status === 'published';
    const actionText = isPub ? 'unpublish' : 'publish';
    Alert.alert(
      `${isPub ? 'Unpublish' : 'Publish'} Event`,
      `Are you sure you want to ${actionText} "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              if (isPub) {
                await unpublishEventApi(event.id);
              } else {
                await publishEventApi(event.id);
              }
              loadData();
            } catch (err) {
              Alert.alert('Action Failed', err.response?.data?.message || err?.message || 'Error updating event status.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteEvent = (event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to permanently delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventApi(event.id);
              loadData();
            } catch (err) {
              Alert.alert('Delete Failed', err.response?.data?.message || err?.message || 'Error deleting event.');
            }
          },
        },
      ]
    );
  };

  if (!isOrganizer && !isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Organizer Hub</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="business-outline" size={64} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>Organizer Access Required</Text>
          <Text style={styles.emptySubtitle}>
            This section is reserved for verified event organizers. You can apply to become an organizer or switch accounts.
          </Text>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.actionBtnText}>Register as Organizer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredEvents = events.filter((ev) => {
    if (eventFilter === 'all') return true;
    return ev.status === eventFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organizer Hub</Text>
        <TouchableOpacity
          onPress={() => router.push('/organizer/create-event')}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={COLORS.buttonText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Quick Actions Row */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/organizer/create-event')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 239, 241, 0.15)' }]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Create Event</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/check-in')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="qr-code-outline" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.quickActionLabel}>Gate Scanner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/organizer/wallet')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.info} />
            </View>
            <Text style={styles.quickActionLabel}>Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Stat Cards Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <Ionicons name="trending-up" size={16} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>GH₵ {Number(stats.totalRevenue).toLocaleString()}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Tickets Sold</Text>
              <Ionicons name="ticket-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{Number(stats.ticketsSold).toLocaleString()}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Active Events</Text>
              <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.statValue}>{stats.activeEvents}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Attendees</Text>
              <Ionicons name="people-outline" size={16} color={COLORS.info} />
            </View>
            <Text style={styles.statValue}>{Number(stats.totalAttendees).toLocaleString()}</Text>
          </View>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              My Events
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'wallet' && styles.tabItemActive]}
            onPress={() => setActiveTab('wallet')}
          >
            <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>
              Payouts & Wallet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'refunds' && styles.tabItemActive]}
            onPress={() => setActiveTab('refunds')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.tabText, activeTab === 'refunds' && styles.tabTextActive]}>
                Refunds
              </Text>
              {refundRequests.filter((r) => (r.status || '').toLowerCase() === 'pending').length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {refundRequests.filter((r) => (r.status || '').toLowerCase() === 'pending').length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Content based on activeTab */}
        {activeTab === 'overview' ? (
          <View style={styles.tabContent}>
            {/* Filter Pills */}
            <View style={styles.filterPills}>
              {['all', 'published', 'draft'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterPill,
                    eventFilter === filter && styles.filterPillActive,
                  ]}
                  onPress={() => setEventFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      eventFilter === filter && styles.filterPillTextActive,
                    ]}
                  >
                    {filter.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : filteredEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No events found</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first event to start selling tickets and tracking attendees.
                </Text>
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={() => router.push('/organizer/create-event')}
                >
                  <Text style={styles.actionBtnText}>Create Event</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredEvents.map((item) => (
                <View key={item.id} style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.eventSubtitle}>
                        {item.venue || 'Venue TBD'} • {item.city || 'Accra'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === 'published'
                          ? styles.statusPublished
                          : styles.statusDraft,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.status === 'published'
                            ? { color: COLORS.success }
                            : { color: COLORS.warning },
                        ]}
                      >
                        {item.status?.toUpperCase() || 'DRAFT'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.eventMetricsRow}>
                    <View style={styles.eventMetric}>
                      <Text style={styles.eventMetricValue}>
                        {item.tickets_sold || item.sold_count || 0}
                      </Text>
                      <Text style={styles.eventMetricLabel}>Sold</Text>
                    </View>
                    <View style={styles.eventMetric}>
                      <Text style={styles.eventMetricValue}>
                        {item.capacity || '100+'}
                      </Text>
                      <Text style={styles.eventMetricLabel}>Capacity</Text>
                    </View>
                    <View style={styles.eventMetric}>
                      <Text style={styles.eventMetricValue}>
                        GH₵ {Number(item.revenue || item.total_sales || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.eventMetricLabel}>Revenue</Text>
                    </View>
                  </View>

                  <View style={styles.eventActionsRow}>
                    <TouchableOpacity
                      style={styles.eventActionBtn}
                      onPress={() => router.push(`/event/${item.id}`)}
                    >
                      <Ionicons name="eye-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.eventActionBtnText}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.eventActionBtn}
                      onPress={() => handleTogglePublish(item)}
                    >
                      <Ionicons
                        name={item.status === 'published' ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={16}
                        color={item.status === 'published' ? COLORS.warning : COLORS.success}
                      />
                      <Text style={styles.eventActionBtnText}>
                        {item.status === 'published' ? 'Unpublish' : 'Publish'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.eventActionBtn, { borderColor: 'rgba(203, 213, 225, 0.3)' }]}
                      onPress={() => handleDeleteEvent(item)}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                      <Text style={[styles.eventActionBtnText, { color: COLORS.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : activeTab === 'wallet' ? (
          <View style={styles.tabContent}>
            {/* Wallet Overview Box */}
            <View style={styles.walletCard}>
              <Text style={styles.walletHeader}>Available for Withdrawal</Text>
              <Text style={styles.walletAmount}>GH₵ {wallet.available.toFixed(2)}</Text>

              <View style={styles.walletSubRow}>
                <View>
                  <Text style={styles.walletSubLabel}>Pending Clearing</Text>
                  <Text style={styles.walletSubValue}>GH₵ {wallet.pending.toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={styles.walletSubLabel}>Lifetime Earnings</Text>
                  <Text style={styles.walletSubValue}>GH₵ {wallet.totalRevenue.toFixed(2)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => router.push('/organizer/wallet')}
              >
                <Ionicons name="cash-outline" size={18} color={COLORS.buttonText} style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Request Payout / View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Refunds Tab (Policy Clause 5 SLA) */
          <View style={styles.tabContent}>
            <View style={styles.refundPolicyNotice}>
              <Ionicons name="time" size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.refundPolicyNoticeTitle}>24-Hour Review SLA (Policy Clause 5)</Text>
                <Text style={styles.refundPolicyNoticeDesc}>
                  Under TRIBESANDCLIQS Policy, you have 1 day (24 hours) from submission to authorize or decline refund requests. Overdue requests are eligible for unilateral platform resolution.
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
            ) : refundRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No refund requests</Text>
                <Text style={styles.emptySubText}>
                  Any attendee refund requests submitted for your events will appear here with a 24-hour review countdown.
                </Text>
              </View>
            ) : (
              refundRequests.map((req) => {
                const isPending = (req.status || '').toLowerCase() === 'pending';
                const isApproved = (req.status || '').toLowerCase() === 'approved';

                let slaText = '24h SLA Active';
                let isExpired = false;
                if (req.organizer_deadline) {
                  const msLeft = new Date(req.organizer_deadline) - new Date();
                  const hoursLeft = Math.round(msLeft / (1000 * 60 * 60));
                  if (hoursLeft <= 0) {
                    slaText = 'SLA Expired (Clause 5 Platform Resolution Eligible)';
                    isExpired = true;
                  } else {
                    slaText = `${hoursLeft}h remaining to review`;
                  }
                }

                return (
                  <View key={req.id} style={[styles.refundCard, isPending && styles.refundCardPending]}>
                    <View style={styles.refundHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.refundOrderTitle}>{req.event_title || 'Event'}</Text>
                        <Text style={styles.refundBuyer}>
                          {req.buyer_name || 'Attendee'} ({req.buyer_email || '—'})
                        </Text>
                      </View>
                      <View style={[
                        styles.refundBadge,
                        isPending ? styles.refundBadgePending : isApproved ? styles.refundBadgeApproved : styles.refundBadgeDeclined
                      ]}>
                        <Text style={[
                          styles.refundBadgeText,
                          isPending ? styles.refundBadgeTextPending : isApproved ? styles.refundBadgeTextApproved : styles.refundBadgeTextDeclined
                        ]}>
                          {(req.status || 'PENDING').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.refundBody}>
                      <View style={styles.refundRow}>
                        <Text style={styles.refundLabel}>Refund Amount:</Text>
                        <Text style={styles.refundAmount}>GH₵ {Number(req.amount || 0).toFixed(2)}</Text>
                      </View>
                      <View style={styles.refundRow}>
                        <Text style={styles.refundLabel}>Statutory Ground:</Text>
                        <Text style={styles.refundGround}>{getPolicyTitle(req.policy_circumstance || req.clause_number)}</Text>
                      </View>
                      {req.reason ? (
                        <View style={styles.refundReasonBox}>
                          <Text style={styles.refundReasonLabel}>Attendee Reason:</Text>
                          <Text style={styles.refundReasonText}>{req.reason}</Text>
                        </View>
                      ) : null}

                      {isPending && (
                        <View style={[styles.slaTimerBox, isExpired && styles.slaTimerBoxExpired]}>
                          <Ionicons name="stopwatch-outline" size={13} color={COLORS.primary} />
                          <Text style={[styles.slaTimerText, isExpired && { color: COLORS.primary }]}>
                            {slaText}
                          </Text>
                        </View>
                      )}
                    </View>

                    {isPending && (
                      <View style={styles.refundActionRow}>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => handleOpenDeclineModal(req)}
                        >
                          <Ionicons name="close" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.authorizeBtn}
                          onPress={() => handleAuthorizeRefund(req)}
                        >
                          <Ionicons name="checkmark" size={14} color="#0E1216" />
                          <Text style={styles.authorizeBtnText}>Authorize (Clause 1)</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Modal: Decline Refund Request ── */}
      <Modal
        visible={declineModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: 'rgba(203, 213, 225, 0.15)' }]}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Decline Refund</Text>
                <Text style={styles.modalSubtitle}>Provide Justification for Record</Text>
              </View>
              <TouchableOpacity onPress={() => setDeclineModalVisible(false)}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.declineInstructionText}>
                Under TRIBESANDCLIQS Policy, declining a refund request requires an official justification that will be recorded in audit logs and communicated to the attendee.
              </Text>
              <Text style={[styles.modalSectionLabel, { marginTop: SPACING.md }]}>DECLINE REASON *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Explain why this request is ineligible for refund..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                value={declineReason}
                onChangeText={setDeclineReason}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeclineModalVisible(false)}
                disabled={respondingRefund}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: COLORS.textSecondary }, respondingRefund && { opacity: 0.6 }]}
                onPress={handleConfirmDecline}
                disabled={respondingRefund}
              >
                {respondingRefund ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalSubmitBtnText, { color: '#FFFFFF' }]}>Confirm Decline</Text>
                )}
              </TouchableOpacity>
            </View>
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 6,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabItemActive: {
    backgroundColor: COLORS.card,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.text,
    fontWeight: '900',
  },
  tabContent: {
    paddingBottom: 40,
  },
  filterPills: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  statusPublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusDraft: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  eventMetricsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  eventMetric: {
    alignItems: 'center',
  },
  eventMetricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventMetricLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  eventActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  eventActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 8,
  },
  eventActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  walletCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  walletHeader: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginVertical: SPACING.sm,
  },
  walletSubRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginVertical: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  walletSubLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  walletSubValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  actionBtnText: {
    color: COLORS.buttonText,
    fontSize: 13,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: COLORS.buttonText,
    fontSize: 10,
    fontWeight: '800',
  },
  refundPolicyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs + 2,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  refundPolicyNoticeTitle: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  refundPolicyNoticeDesc: {
    color: 'rgba(253, 230, 138, 0.85)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  refundCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  refundCardPending: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  refundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs + 2,
  },
  refundOrderTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  refundBuyer: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  refundBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  refundBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  refundBadgeApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  refundBadgeDeclined: {
    backgroundColor: 'rgba(203, 213, 225, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.3)',
  },
  refundBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  refundBadgeTextPending: { color: COLORS.primary },
  refundBadgeTextApproved: { color: COLORS.text },
  refundBadgeTextDeclined: { color: COLORS.primary },
  refundBody: {
    gap: 4,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refundLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  refundAmount: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  refundGround: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '600',
  },
  refundReasonBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    marginTop: 3,
  },
  refundReasonLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  refundReasonText: {
    color: COLORS.text,
    fontSize: 11,
    marginTop: 2,
  },
  slaTimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  slaTimerBoxExpired: {
    backgroundColor: 'rgba(203, 213, 225, 0.1)',
  },
  slaTimerText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  refundActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: 2,
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 239, 241, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.30)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  declineBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  authorizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  authorizeBtnText: {
    color: COLORS.buttonText,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#161A1E',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  declineInstructionText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  modalSectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  modalTextInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    padding: SPACING.sm,
    fontSize: 13,
    minHeight: 75,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
