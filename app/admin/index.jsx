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
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { resolveImageUrl } from '../../src/api/client';
import {
  getAdminDashboardApi,
  getAdminEventsApi,
  approveEventApi,
  rejectEventApi,
  toggleFeatureEventApi,
  getAdminUsersApi,
  approveOrganizerApi,
  rejectOrganizerApi,
  verifyUserApi,
  suspendUserApi,
  unsuspendUserApi,
  getWithdrawalsApi,
  approveWithdrawalApi,
  rejectWithdrawalApi,
  getMobileAppAdminConfigApi,
  updateMobileAppSettingsApi,
  createMobileBannerApi,
  deleteMobileBannerApi,
} from '../../src/api/admin';

export default function AdminControlCenterScreen({ isTabScreen = false }) {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'events' | 'organizers' | 'payouts' | 'users' | 'app'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Overview Stats
  const [stats, setStats] = useState(null);

  // Events Moderation
  const [events, setEvents] = useState([]);
  const [eventFilter, setEventFilter] = useState('all'); // 'all' | 'pending' | 'published'

  // Organizers Moderation
  const [organizers, setOrganizers] = useState([]);

  // Payouts & Withdrawals
  const [withdrawals, setWithdrawals] = useState([]);
  const [payoutFilter, setPayoutFilter] = useState('pending'); // 'pending' | 'approved' | 'all'

  // Users Moderation
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Mobile App Controls
  const [appSettings, setAppSettings] = useState(null);
  const [banners, setBanners] = useState([]);
  const [savingApp, setSavingApp] = useState(false);

  // Quick Add Banner Form State
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerLinkType, setBannerLinkType] = useState('none');
  const [bannerLinkTarget, setBannerLinkTarget] = useState('');
  const [addingBanner, setAddingBanner] = useState(false);

  // Action in progress ID
  const [actionId, setActionId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const d = await getAdminDashboardApi();
        setStats(d?.stats || d || {});
      } else if (activeTab === 'events') {
        const params = eventFilter !== 'all' ? { status: eventFilter } : {};
        const res = await getAdminEventsApi(params);
        setEvents(res?.events || res?.data || (Array.isArray(res) ? res : []));
      } else if (activeTab === 'organizers') {
        const res = await getAdminUsersApi({ role: 'organizer' });
        setOrganizers(res?.users || res?.data || (Array.isArray(res) ? res : []));
      } else if (activeTab === 'payouts') {
        const params = payoutFilter !== 'all' ? { status: payoutFilter } : {};
        const res = await getWithdrawalsApi(params);
        setWithdrawals(res?.withdrawals || res?.data || (Array.isArray(res) ? res : []));
      } else if (activeTab === 'users') {
        const res = await getAdminUsersApi({ search: userSearch });
        setUsersList(res?.users || res?.data || (Array.isArray(res) ? res : []));
      } else if (activeTab === 'app') {
        const res = await getMobileAppAdminConfigApi();
        setAppSettings(res?.settings || {});
        setBanners(res?.banners || []);
      }
    } catch (err) {
      console.warn('[AdminControlCenter] Load error:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, eventFilter, payoutFilter, userSearch]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Guard: Admin role required
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="shield-outline" size={64} color={COLORS.error} />
          <Text style={styles.unauthorizedTitle}>Restricted Access</Text>
          <Text style={styles.unauthorizedSubtitle}>
            This control center is reserved for platform administrators. Log in with an admin account on the mobile app or web portal.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (isTabScreen ? router.push('/(tabs)/profile') : router.back())}
          >
            <Text style={styles.backButtonText}>Return to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Event Actions
  const handleApproveEvent = async (ev) => {
    Alert.alert('Approve Event', `Make "${ev.title}" live for attendees?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActionId(ev.id);
          try {
            await approveEventApi(ev.id);
            Alert.alert('Success', 'Event is now published.');
            loadData();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to approve');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleRejectEvent = async (ev) => {
    Alert.alert('Reject Event', `Reject "${ev.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActionId(ev.id);
          try {
            await rejectEventApi(ev.id, 'Guidelines not met');
            Alert.alert('Success', 'Event rejected.');
            loadData();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to reject');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleToggleFeature = async (ev) => {
    const nextVal = !ev.is_featured;
    setActionId(ev.id);
    try {
      await toggleFeatureEventApi(ev.id, nextVal);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to update featured status');
    } finally {
      setActionId(null);
    }
  };

  // Organizer Actions
  const handleApproveOrganizer = async (org) => {
    Alert.alert('Approve Organizer', `Approve ${org.name || org.email} as an authorized organizer?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActionId(org.id);
          try {
            await approveOrganizerApi(org.id);
            Alert.alert('Success', 'Organizer approved successfully.');
            loadData();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to approve');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleRejectOrganizer = async (org) => {
    Alert.alert('Reject Organizer', `Decline organizer application for ${org.name || org.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActionId(org.id);
          try {
            await rejectOrganizerApi(org.id);
            Alert.alert('Success', 'Organizer declined.');
            loadData();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to decline');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  // Payout Actions
  const handleApproveWithdrawal = async (w) => {
    Alert.alert(
      'Approve Payout',
      `Confirm transfer of GH₵ ${Number(w.amount).toLocaleString()} to ${w.organizerName || 'Organizer'} (${w.bankName || w.bank || 'Bank'} - ${w.accountNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Release',
          onPress: async () => {
            setActionId(w.id);
            try {
              await approveWithdrawalApi(w.id);
              Alert.alert('Success', 'Payout approved and marked completed.');
              loadData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to approve payout');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectWithdrawal = async (w) => {
    Alert.alert(
      'Reject Payout',
      `Decline withdrawal of GH₵ ${Number(w.amount).toLocaleString()} for ${w.organizerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline Payout',
          style: 'destructive',
          onPress: async () => {
            setActionId(w.id);
            try {
              await rejectWithdrawalApi(w.id, { reason: 'Account details mismatch' });
              Alert.alert('Success', 'Payout request declined.');
              loadData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to decline payout');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  // User Actions
  const handleToggleVerifyUser = async (u) => {
    setActionId(u.id);
    try {
      await verifyUserApi(u.id);
      Alert.alert('Success', 'User verification updated');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleSuspendUser = async (u) => {
    const isSuspended = u.status === 'suspended';
    Alert.alert(
      isSuspended ? 'Restore User' : 'Suspend User',
      `Are you sure you want to ${isSuspended ? 'unsuspend' : 'suspend'} ${u.name || u.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSuspended ? 'Restore' : 'Suspend',
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            setActionId(u.id);
            try {
              if (isSuspended) {
                await unsuspendUserApi(u.id);
              } else {
                await suspendUserApi(u.id);
              }
              loadData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Action failed');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  // Mobile App Controls
  const handleToggleMaintenance = async () => {
    if (!appSettings) return;
    const nextMode = appSettings.mobile_maintenance_mode === 'true' ? 'false' : 'true';
    setSavingApp(true);
    try {
      const updated = { ...appSettings, mobile_maintenance_mode: nextMode };
      await updateMobileAppSettingsApi(updated);
      setAppSettings(updated);
      Alert.alert(
        'Maintenance Mode',
        nextMode === 'true'
          ? 'Mobile app is now LOCKED under maintenance mode.'
          : 'Mobile app is now ONLINE.'
      );
    } catch {
      Alert.alert('Error', 'Failed to toggle maintenance mode');
    } finally {
      setSavingApp(false);
    }
  };

  const handleToggleAnnouncement = async () => {
    if (!appSettings) return;
    const nextMode = appSettings.mobile_announcement_enabled === 'true' ? 'false' : 'true';
    setSavingApp(true);
    try {
      const updated = { ...appSettings, mobile_announcement_enabled: nextMode };
      await updateMobileAppSettingsApi(updated);
      setAppSettings(updated);
      Alert.alert(
        'Announcement Bar',
        nextMode === 'true' ? 'In-app announcement is now active.' : 'In-app announcement disabled.'
      );
    } catch {
      Alert.alert('Error', 'Failed to toggle announcement');
    } finally {
      setSavingApp(false);
    }
  };

  const handleAddBanner = async () => {
    if (!bannerTitle.trim() || !bannerImage.trim()) {
      Alert.alert('Validation', 'Banner title and image URL are required.');
      return;
    }
    setAddingBanner(true);
    try {
      await createMobileBannerApi({
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim(),
        image_url: bannerImage.trim(),
        link_type: bannerLinkType,
        link_target: bannerLinkTarget.trim(),
        is_active: true,
        sort_order: banners.length,
      });
      Alert.alert('Success', 'Mobile promotional banner published!');
      setShowAddBanner(false);
      setBannerTitle('');
      setBannerSubtitle('');
      setBannerImage('');
      setBannerLinkTarget('');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create banner');
    } finally {
      setAddingBanner(false);
    }
  };

  const handleDeleteBanner = async (banner) => {
    Alert.alert('Delete Banner', `Remove "${banner.title}" from the mobile carousel?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionId(banner.id);
          try {
            await deleteMobileBannerApi(banner.id);
            Alert.alert('Success', 'Banner removed.');
            loadData();
          } catch {
            Alert.alert('Error', 'Failed to delete banner');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!isTabScreen ? (
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.tabHeaderIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            </View>
          )}
          <View>
            <View style={styles.badgeRow}>
              <Text style={styles.headerTitle}>Admin Control Center</Text>
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#10B981" />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Web &amp; Mobile Platform Management</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.iconCircle}
          onPress={onRefresh}
          disabled={refreshing || loading}
        >
          <Ionicons
            name="refresh"
            size={18}
            color={COLORS.text}
            style={refreshing ? styles.spin : undefined}
          />
        </TouchableOpacity>
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {[
            { key: 'overview', label: 'Overview', icon: 'stats-chart-outline' },
            { key: 'events', label: 'Events', icon: 'calendar-outline' },
            { key: 'organizers', label: 'Organizers', icon: 'people-outline' },
            { key: 'payouts', label: 'Payouts', icon: 'cash-outline' },
            { key: 'users', label: 'Users', icon: 'person-outline' },
            { key: 'app', label: 'Mobile App', icon: 'phone-portrait-outline' },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isSelected ? '#FFFFFF' : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    isSelected && styles.tabButtonTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Body */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Connecting to Admin API...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* TAB 1: OVERVIEW STATS */}
          {activeTab === 'overview' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Platform Snapshot (Web &amp; Mobile)</Text>
              <View style={styles.statsGrid}>
                {/* Revenue Card */}
                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Ionicons name="cash-outline" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.statLabel}>Total Revenue</Text>
                  <Text style={styles.statValue}>
                    GH₵ {Number(stats?.revenue || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.statFootnote}>
                    {Number(stats?.orders || 0)} orders completed
                  </Text>
                </View>

                {/* Events Card */}
                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                    <Ionicons name="calendar-outline" size={20} color="#38BDF8" />
                  </View>
                  <Text style={styles.statLabel}>Total Events</Text>
                  <Text style={styles.statValue}>{stats?.events || 0}</Text>
                  <Text style={styles.statFootnote}>
                    {stats?.pendingEvents || 0} awaiting approval
                  </Text>
                </View>

                {/* Users Card */}
                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                    <Ionicons name="people-outline" size={20} color="#A855F7" />
                  </View>
                  <Text style={styles.statLabel}>Registered Users</Text>
                  <Text style={styles.statValue}>{stats?.users || 0}</Text>
                  <Text style={styles.statFootnote}>
                    {stats?.organizers || 0} organizers
                  </Text>
                </View>

                {/* Tickets Card */}
                <View style={styles.statCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Ionicons name="ticket-outline" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.statLabel}>Tickets Issued</Text>
                  <Text style={styles.statValue}>{stats?.tickets || 0}</Text>
                  <Text style={styles.statFootnote}>Passes checked-in &amp; valid</Text>
                </View>
              </View>

              {/* Pending Approvals Notice */}
              {(Number(stats?.pendingEvents) > 0 || Number(stats?.pendingOrganizers) > 0 || Number(stats?.pendingWithdrawals) > 0) && (
                <View style={styles.alertNotice}>
                  <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertNoticeTitle}>Items Awaiting Your Review</Text>
                    <Text style={styles.alertNoticeText}>
                      {stats?.pendingEvents || 0} event(s), {stats?.pendingOrganizers || 0} organizer(s), and {stats?.pendingWithdrawals || 0} payout(s) need review.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.alertNoticeBtn}
                    onPress={() => setActiveTab('events')}
                  >
                    <Text style={styles.alertNoticeBtnText}>Review</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: EVENT MODERATION */}
          {activeTab === 'events' && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Events Moderation</Text>
                <View style={styles.filterPills}>
                  {['all', 'pending', 'published'].map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setEventFilter(f)}
                      style={[
                        styles.filterPill,
                        eventFilter === f && styles.filterPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          eventFilter === f && styles.filterPillTextActive,
                        ]}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {events.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No events in this status</Text>
                </View>
              ) : (
                events.map((ev) => (
                  <View key={ev.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {ev.title}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                          {ev.organizer_name || 'Organizer'} • {ev.venue || 'Venue'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          ev.status === 'published'
                            ? styles.statusSuccess
                            : ev.status === 'pending'
                            ? styles.statusWarning
                            : styles.statusDefault,
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {(ev.status || 'draft').toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Actions Row */}
                    <View style={styles.itemActions}>
                      {ev.status === 'pending' && (
                        <>
                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnSuccess]}
                            onPress={() => handleApproveEvent(ev)}
                            disabled={actionId === ev.id}
                          >
                            <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.btnActionText}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnDanger]}
                            onPress={() => handleRejectEvent(ev)}
                            disabled={actionId === ev.id}
                          >
                            <Ionicons name="close-circle-outline" size={15} color="#FFFFFF" />
                            <Text style={styles.btnActionText}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.btnAction,
                          ev.is_featured ? styles.btnFeatured : styles.btnOutline,
                        ]}
                        onPress={() => handleToggleFeature(ev)}
                        disabled={actionId === ev.id}
                      >
                        <Ionicons
                          name={ev.is_featured ? 'star' : 'star-outline'}
                          size={15}
                          color={ev.is_featured ? '#F59E0B' : COLORS.textSecondary}
                        />
                        <Text style={[styles.btnActionText, ev.is_featured && { color: '#F59E0B' }]}>
                          {ev.is_featured ? 'Featured' : 'Feature'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnOutline]}
                        onPress={() => router.push(`/event/${ev.id}`)}
                      >
                        <Ionicons name="eye-outline" size={15} color={COLORS.textSecondary} />
                        <Text style={styles.btnActionText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 3: ORGANIZER APPROVALS */}
          {activeTab === 'organizers' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Organizer Requests</Text>
              {organizers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No organizer accounts found</Text>
                </View>
              ) : (
                organizers.map((org) => {
                  const isApproved = Boolean(org.is_approved);
                  return (
                    <View key={org.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitle}>{org.name || 'Unnamed'}</Text>
                          <Text style={styles.itemSubtitle}>{org.email}</Text>
                          {org.phone ? (
                            <Text style={[styles.itemSubtitle, { marginTop: 2 }]}>
                              Phone: {org.phone}
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isApproved ? styles.statusSuccess : styles.statusWarning,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {isApproved ? 'APPROVED' : 'PENDING'}
                          </Text>
                        </View>
                      </View>

                      {!isApproved && (
                        <View style={styles.itemActions}>
                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnSuccess, { flex: 1 }]}
                            onPress={() => handleApproveOrganizer(org)}
                            disabled={actionId === org.id}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                            <Text style={styles.btnActionText}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnDanger, { flex: 1 }]}
                            onPress={() => handleRejectOrganizer(org)}
                            disabled={actionId === org.id}
                          >
                            <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                            <Text style={styles.btnActionText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 4: PAYOUTS & WITHDRAWALS */}
          {activeTab === 'payouts' && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Payout Requests</Text>
                <View style={styles.filterPills}>
                  {['pending', 'approved', 'all'].map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setPayoutFilter(f)}
                      style={[
                        styles.filterPill,
                        payoutFilter === f && styles.filterPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          payoutFilter === f && styles.filterPillTextActive,
                        ]}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {withdrawals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cash-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No withdrawal requests in this status</Text>
                </View>
              ) : (
                withdrawals.map((w) => {
                  const isPending = w.status === 'pending';
                  return (
                    <View key={w.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitle}>
                            GH₵ {Number(w.amount).toLocaleString()}
                          </Text>
                          <Text style={styles.itemSubtitle}>
                            {w.organizerName || 'Organizer'} ({w.organizerEmail})
                          </Text>
                          <Text style={[styles.itemSubtitle, { color: COLORS.textSecondary, marginTop: 2 }]}>
                            {w.bankName || w.bank || 'Bank'}: {w.accountNumber} ({w.accountName || w.organizerName})
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            w.status === 'approved' || w.status === 'completed'
                              ? styles.statusSuccess
                              : w.status === 'pending'
                              ? styles.statusWarning
                              : styles.statusDanger,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {(w.status || 'pending').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {isPending && (
                        <View style={styles.itemActions}>
                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnSuccess, { flex: 1 }]}
                            onPress={() => handleApproveWithdrawal(w)}
                            disabled={actionId === w.id}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                            <Text style={styles.btnActionText}>Approve &amp; Pay</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnDanger, { flex: 1 }]}
                            onPress={() => handleRejectWithdrawal(w)}
                            disabled={actionId === w.id}
                          >
                            <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                            <Text style={styles.btnActionText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 5: USERS MODERATION */}
          {activeTab === 'users' && (
            <View style={styles.section}>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search user name or email..."
                  placeholderTextColor={COLORS.placeholder}
                  value={userSearch}
                  onChangeText={setUserSearch}
                  onSubmitEditing={loadData}
                  returnKeyType="search"
                />
              </View>

              {usersList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="person-outline" size={40} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No users found</Text>
                </View>
              ) : (
                usersList.map((u) => {
                  const isSuspended = u.status === 'suspended';
                  const isVerified = Boolean(u.is_verified);

                  return (
                    <View key={u.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.itemTitle}>{u.name || 'User'}</Text>
                            {isVerified && (
                              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            )}
                          </View>
                          <Text style={styles.itemSubtitle}>{u.email}</Text>
                          <Text style={[styles.itemSubtitle, { marginTop: 2, color: COLORS.textMuted }]}>
                            Role: {u.role || 'attendee'} • Joined {new Date(u.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isSuspended ? styles.statusDanger : styles.statusSuccess,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={[styles.btnAction, styles.btnOutline, { flex: 1 }]}
                          onPress={() => handleToggleVerifyUser(u)}
                          disabled={actionId === u.id}
                        >
                          <Ionicons
                            name={isVerified ? 'shield-checkmark' : 'shield-outline'}
                            size={14}
                            color={COLORS.textSecondary}
                          />
                          <Text style={styles.btnActionText}>
                            {isVerified ? 'Verified' : 'Verify'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.btnAction,
                            isSuspended ? styles.btnSuccess : styles.btnDanger,
                            { flex: 1 },
                          ]}
                          onPress={() => handleToggleSuspendUser(u)}
                          disabled={actionId === u.id}
                        >
                          <Ionicons
                            name={isSuspended ? 'refresh-outline' : 'ban-outline'}
                            size={14}
                            color="#FFFFFF"
                          />
                          <Text style={styles.btnActionText}>
                            {isSuspended ? 'Restore' : 'Suspend'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 6: MOBILE APP REMOTE CONTROLS & BANNERS */}
          {activeTab === 'app' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Mobile App Remote Controls</Text>

              {/* Maintenance Toggle Card */}
              <View style={styles.controlCard}>
                <View style={styles.controlHeader}>
                  <View style={[styles.controlIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name="construct-outline" size={22} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.controlTitle}>Maintenance Lock Screen</Text>
                    <Text style={styles.controlDesc}>
                      {appSettings?.mobile_maintenance_mode === 'true'
                        ? 'App is currently locked with maintenance overlay.'
                        : 'App is running normally for all users.'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.btnToggle,
                    appSettings?.mobile_maintenance_mode === 'true'
                      ? styles.btnToggleAmber
                      : styles.btnToggleDefault,
                  ]}
                  onPress={handleToggleMaintenance}
                  disabled={savingApp}
                >
                  <Text style={styles.btnToggleText}>
                    {appSettings?.mobile_maintenance_mode === 'true'
                      ? 'Disable Maintenance Mode'
                      : 'Enable Maintenance Mode'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Announcement Toggle Card */}
              <View style={styles.controlCard}>
                <View style={styles.controlHeader}>
                  <View style={[styles.controlIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                    <Ionicons name="megaphone-outline" size={22} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.controlTitle}>In-App Announcement Bar</Text>
                    <Text style={styles.controlDesc}>
                      {appSettings?.mobile_announcement_enabled === 'true'
                        ? `Live: "${appSettings?.mobile_announcement_text || 'Active'}"`
                        : 'Announcement bar is currently disabled.'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.btnToggle,
                    appSettings?.mobile_announcement_enabled === 'true'
                      ? styles.btnToggleSky
                      : styles.btnToggleDefault,
                  ]}
                  onPress={handleToggleAnnouncement}
                  disabled={savingApp}
                >
                  <Text style={styles.btnToggleText}>
                    {appSettings?.mobile_announcement_enabled === 'true'
                      ? 'Turn Off Announcement'
                      : 'Turn On Announcement'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Promotional Banners Section */}
              <View style={styles.bannerHeaderRow}>
                <Text style={styles.sectionHeading}>Hero Carousel Banners ({banners.length})</Text>
                <TouchableOpacity
                  style={styles.btnAddBanner}
                  onPress={() => setShowAddBanner(!showAddBanner)}
                >
                  <Ionicons name={showAddBanner ? 'close' : 'add'} size={16} color="#FFFFFF" />
                  <Text style={styles.btnAddBannerText}>
                    {showAddBanner ? 'Cancel' : 'New Banner'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* New Banner Form */}
              {showAddBanner && (
                <View style={styles.bannerFormCard}>
                  <Text style={styles.formHeading}>Create Mobile Banner</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Headline (e.g. Easter Beach Party)"
                    placeholderTextColor={COLORS.placeholder}
                    value={bannerTitle}
                    onChangeText={setBannerTitle}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Subtitle (e.g. 20% discount this weekend)"
                    placeholderTextColor={COLORS.placeholder}
                    value={bannerSubtitle}
                    onChangeText={setBannerSubtitle}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Image URL (https://...)"
                    placeholderTextColor={COLORS.placeholder}
                    value={bannerImage}
                    onChangeText={setBannerImage}
                    autoCapitalize="none"
                  />
                  <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
                    {['none', 'event', 'category', 'external'].map((lt) => (
                      <TouchableOpacity
                        key={lt}
                        onPress={() => setBannerLinkType(lt)}
                        style={[
                          styles.filterPill,
                          bannerLinkType === lt && styles.filterPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            bannerLinkType === lt && styles.filterPillTextActive,
                          ]}
                        >
                          {lt.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.inputField}
                    placeholder={bannerLinkType === 'event' ? 'Target Event ID (e.g. 1)' : bannerLinkType === 'category' ? 'Category Name (e.g. Music)' : 'Target URL / ID (Optional)'}
                    placeholderTextColor={COLORS.placeholder}
                    value={bannerLinkTarget}
                    onChangeText={setBannerLinkTarget}
                  />
                  <TouchableOpacity
                    style={styles.btnSubmitBanner}
                    onPress={handleAddBanner}
                    disabled={addingBanner}
                  >
                    {addingBanner ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.btnSubmitBannerText}>Publish to Mobile</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Banners List */}
              {banners.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="image-outline" size={36} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>No mobile banners configured</Text>
                </View>
              ) : (
                banners.map((b) => (
                  <View key={b.id} style={styles.bannerRowCard}>
                    <Image
                      source={{ uri: resolveImageUrl(b.image_url) }}
                      style={styles.bannerThumb}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={styles.bannerTitleText} numberOfLines={1}>
                        {b.title}
                      </Text>
                      <Text style={styles.bannerSubText} numberOfLines={1}>
                        {b.subtitle || 'No subtitle'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.btnDeleteBanner}
                      onPress={() => handleDeleteBanner(b)}
                      disabled={actionId === b.id}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
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
    borderColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  tabHeaderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spin: {
    transform: [{ rotate: '45deg' }],
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  tabsContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  section: {
    gap: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 4,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statFootnote: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  alertNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FDE68A',
  },
  alertNoticeText: {
    fontSize: 11,
    color: '#FDE68A',
    opacity: 0.9,
    marginTop: 2,
  },
  alertNoticeBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  alertNoticeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C232B',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: COLORS.primary,
  },
  itemCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusDefault: {
    backgroundColor: '#2E363E',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(46, 54, 62, 0.5)',
    paddingTop: 10,
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  btnSuccess: {
    backgroundColor: '#10B981',
  },
  btnDanger: {
    backgroundColor: '#EF4444',
  },
  btnFeatured: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  btnOutline: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  controlCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 14,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  controlDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  btnToggle: {
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnToggleAmber: {
    backgroundColor: '#F59E0B',
  },
  btnToggleSky: {
    backgroundColor: '#0284C7',
  },
  btnToggleDefault: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  btnAddBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  btnAddBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerFormCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 10,
  },
  formHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  inputField: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 12,
  },
  btnSubmitBanner: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 8,
    overflow: 'hidden',
  },
  bannerThumb: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
  bannerTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  bannerSubText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  btnDeleteBanner: {
    padding: 8,
  },
  unauthorizedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  unauthorizedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  unauthorizedSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
