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
} from '../../src/api/organizer';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function OrganizerDashboardScreen() {
  const router = useRouter();
  const { isOrganizer, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'events' | 'wallet'

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

  const loadData = useCallback(async () => {
    try {
      const [dashRes, eventsRes, walletRes] = await Promise.allSettled([
        getOrganizerDashboardApi(),
        getOrganizerEventsApi(),
        getWalletBalanceApi(),
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
    } catch (err) {
      console.warn('[OrganizerDashboard] Load error:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(178, 20, 20, 0.15)' }]}>
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
                      style={[styles.eventActionBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
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
        ) : (
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
        )}
      </ScrollView>
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
  tabContent: {
    paddingBottom: 40,
  },
  filterPills: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
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
    fontSize: 11,
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
});
