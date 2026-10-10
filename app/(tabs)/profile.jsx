import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Button from '../../src/components/Button';
import Header from '../../src/components/Header';
import Logo from '../../src/components/Logo';
import { getMyTicketsApi } from '../../src/api/tickets';
import { getUserOrdersApi } from '../../src/api/orders';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, isOrganizer, logout, updateProfile, changePassword, refreshProfile } = useAuth();

  // Modals state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Dashboard Metrics State
  const [ticketCount, setTicketCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editOrgName, setEditOrgName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Data fetching helper
  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [ticketsData, ordersData] = await Promise.allSettled([
        getMyTicketsApi(),
        getUserOrdersApi(),
      ]);

      if (ticketsData.status === 'fulfilled') {
        const list = Array.isArray(ticketsData.value)
          ? ticketsData.value
          : ticketsData.value?.tickets || [];

        const now = new Date();

        // Strictly valid, upcoming active passes
        const activeList = list.filter((t) => {
          if (!t) return false;
          const status = String(t.status || '').toLowerCase();
          if (['transferred', 'cancelled', 'refunded', 'void'].includes(status)) return false;
          if (t.payment_status === 'refunded' || t.payment_status === 'failed') return false;
          if (t.event_status === 'cancelled') return false;
          if (t.is_used || status === 'used') return false;

          const dateStr = t.end_date || t.start_date;
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              const timeStr = t.end_time || t.start_time;
              if (timeStr && typeof timeStr === 'string') {
                const parts = timeStr.split(':');
                if (parts.length >= 2) {
                  d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
                  if (d < now) return false;
                }
              } else {
                d.setHours(23, 59, 59, 999);
                if (d < now) return false;
              }
            }
          }

          return status === 'active' || !status;
        });

        setTicketCount(activeList.length);
      }

      if (ordersData.status === 'fulfilled') {
        const oList = Array.isArray(ordersData.value) ? ordersData.value : ordersData.value?.orders || [];
        setOrderCount(oList.length);
      }
    } catch (err) {
      console.warn('[ProfileScreen] Dashboard load warning:', err.message);
    }
  }, [isAuthenticated]);

  // Live Auto-Refresh Dashboard on screen focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (refreshProfile) {
        await refreshProfile().catch(() => {});
      }
      await loadDashboardData();
    } catch (_err) {
      // Ignored
    } finally {
      setRefreshing(false);
    }
  };

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditLocation(user?.location || user?.city || '');
    setEditBio(user?.bio || user?.description || '');
    setEditOrgName(user?.organization_name || '');
    setProfileMsg({ type: '', text: '' });
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setProfileMsg({ type: 'error', text: 'Full Name is required' });
      return;
    }
    setSavingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        location: editLocation.trim() || undefined,
        city: editLocation.trim() || undefined,
        bio: editBio.trim() || undefined,
      };
      if (isStaffOrOrganizer && editOrgName.trim()) {
        payload.organization_name = editOrgName.trim();
      }
      await updateProfile(payload);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        setEditProfileOpen(false);
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setProfileMsg({ type: 'error', text: msg });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setSavingPassword(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => {
        setChangePasswordOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Current password may be incorrect.';
      setPasswordMsg({ type: 'error', text: msg });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const isStaffOrOrganizer = isOrganizer || user?.role === 'organizer' || user?.role === 'admin' || user?.role === 'staff';

  // Format joined date helper
  const getMemberSince = () => {
    const raw = user?.created_at || user?.createdAt;
    if (!raw) return 'Active Member';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return 'Active Member';
      return `Member since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Active Member';
    }
  };

  // Extract favorite categories array
  const favoriteCategories = Array.isArray(user?.favorite_categories)
    ? user.favorite_categories
    : Array.isArray(user?.favoriteCategories)
    ? user.favoriteCategories
    : [];

  const MENU_ITEMS = [
    {
      id: 'saved',
      title: 'Saved Events & Wishlist',
      icon: 'heart-outline',
      onPress: () => router.push('/saved'),
      authRequired: true,
    },
    {
      id: 'orders',
      title: 'Order History & Receipts',
      icon: 'receipt-outline',
      onPress: () => router.push('/orders'),
      authRequired: true,
    },
    ...(isAdmin
      ? [
          {
            id: 'admin_control',
            title: 'Admin Control Center',
            icon: 'shield-outline',
            onPress: () => router.push('/admin'),
            authRequired: true,
          },
        ]
      : []),
    ...(isStaffOrOrganizer
      ? [
          {
            id: 'organizer_hub',
            title: 'Organizer Hub & Event Management',
            icon: 'briefcase-outline',
            onPress: () => router.push('/organizer'),
            authRequired: true,
          },
          {
            id: 'check_in',
            title: 'Organizer Gate Check-In',
            icon: 'qr-code-outline',
            onPress: () => router.push('/check-in'),
            authRequired: true,
          },
          {
            id: 'organizer_wallet',
            title: 'Organizer Payouts & Wallet',
            icon: 'wallet-outline',
            onPress: () => router.push('/organizer/wallet'),
            authRequired: true,
          },
        ]
      : [
          {
            id: 'become_organizer',
            title: 'Host Events & Organizer Hub',
            icon: 'briefcase-outline',
            onPress: () => router.push('/organizer'),
            authRequired: true,
          },
        ]),
    {
      id: 'edit_profile',
      title: 'Personal Information',
      icon: 'person-circle-outline',
      onPress: openEditProfile,
      authRequired: true,
    },
    {
      id: 'security',
      title: 'Security & Change Password',
      icon: 'lock-closed-outline',
      onPress: () => {
        setPasswordMsg({ type: '', text: '' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordOpen(true);
      },
      authRequired: true,
    },
    {
      id: 'help',
      title: 'Cliqs Concierge Assistant',
      icon: 'chatbubble-ellipses-outline',
      onPress: () => router.push('/(tabs)/chat'),
    },
    {
      id: 'terms_of_service',
      title: 'Terms of Service',
      icon: 'document-text-outline',
      onPress: () => router.push('/terms'),
    },
    {
      id: 'privacy_policy',
      title: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      onPress: () => router.push('/privacy'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="My Account" subtitle="Profile & Preferences" showNotification={false} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* User Identity & Profile Card */}
        {isAuthenticated && user ? (
          <View style={styles.userCard}>
            {/* Top Identity Row */}
            <View style={styles.userTopRow}>
              {user.avatar || user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar || user.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}

              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.name || 'Valued Member'}
                  </Text>
                  {(user.is_verified || user.is_email_verified) && (
                    <View style={styles.verifiedIconWrap}>
                      <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
                    </View>
                  )}
                </View>

                <View style={styles.userMetaRow}>
                  <Ionicons name="mail-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                </View>

                {user.phone ? (
                  <View style={styles.userMetaRow}>
                    <Ionicons name="call-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.userPhone}>{user.phone}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.editIconBtn}
                onPress={openEditProfile}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Badges & Role Row */}
            <View style={styles.badgesRow}>
              <View style={styles.rolePill}>
                <Ionicons name="ribbon-outline" size={11} color={COLORS.primary} />
                <Text style={styles.roleText}>{user.role ? user.role.toUpperCase() : 'ATTENDEE'}</Text>
              </View>

              <View style={styles.memberSincePill}>
                <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.memberSinceText}>{getMemberSince()}</Text>
              </View>
            </View>

            {/* User Bio & Extended Details (if present) */}
            {(user.location || user.city || user.bio || user.organization_name) && (
              <View style={styles.userDetailsBox}>
                {(user.location || user.city) && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.detailRowText}>{user.location || user.city}</Text>
                  </View>
                )}

                {user.organization_name && (
                  <View style={styles.detailRow}>
                    <Ionicons name="business-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.detailRowText}>{user.organization_name}</Text>
                  </View>
                )}

                {user.bio ? (
                  <View style={styles.bioRow}>
                    <Text style={styles.bioText}>{user.bio}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Favorite Event Categories Chips */}
            {favoriteCategories.length > 0 && (
              <View style={styles.interestsContainer}>
                <Text style={styles.interestsLabel}>FAVORITE INTERESTS</Text>
                <View style={styles.interestsPills}>
                  {favoriteCategories.map((cat, idx) => (
                    <View key={idx} style={styles.interestChip}>
                      <Text style={styles.interestChipText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIcon}>
              <Ionicons name="person-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestTitle}>Welcome to Tribes &amp; Cliqs</Text>
              <Text style={styles.guestSubtitle}>Sign in to manage your tickets, passes, and personal profile</Text>
            </View>
            <Button
              title="Sign In / Register"
              onPress={() => router.push('/(auth)/login')}
              style={styles.guestBtn}
            />
          </View>
        )}

        {/* Member Dashboard Overview */}
        {isAuthenticated && (
          <View style={styles.dashboardSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>MY DASHBOARD</Text>
              <View style={styles.liveWalletBadge}>
                <Ionicons name="flash-outline" size={11} color={COLORS.primary} />
                <Text style={styles.liveWalletText}>LIVE WALLET</Text>
              </View>
            </View>

            {/* Quick Metrics Grid (Strictly Logo Colors) */}
            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => router.push('/(tabs)/tickets')}
                activeOpacity={0.8}
              >
                <View style={styles.metricIconCircle}>
                  <Ionicons name="ticket-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.metricNumber}>{ticketCount}</Text>
                <Text style={styles.metricLabel}>My Passes</Text>
                <Text style={styles.metricSub}>View Wallet &rarr;</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => router.push('/orders')}
                activeOpacity={0.8}
              >
                <View style={styles.metricIconCircle}>
                  <Ionicons name="receipt-outline" size={20} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.metricNumber}>{orderCount}</Text>
                <Text style={styles.metricLabel}>Orders</Text>
                <Text style={styles.metricSub}>Receipts &rarr;</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => router.push('/saved')}
                activeOpacity={0.8}
              >
                <View style={styles.metricIconCircle}>
                  <Ionicons name="heart-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.metricNumber}>Saved</Text>
                <Text style={styles.metricLabel}>Wishlist</Text>
                <Text style={styles.metricSub}>Explore &rarr;</Text>
              </TouchableOpacity>
            </View>

            {/* Organizer Hub Banner (if Organizer) */}
            {isStaffOrOrganizer && (
              <TouchableOpacity
                style={styles.organizerHubBanner}
                activeOpacity={0.85}
                onPress={() => router.push('/check-in')}
              >
                <View style={styles.organizerHubIcon}>
                  <Ionicons name="scan-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.organizerHubTitle}>Organizer Gate Check-In</Text>
                  <Text style={styles.organizerHubSub}>
                    Scan attendee QR passes at the entrance in real-time
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Admin Quick Access Banner */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBanner}
            activeOpacity={0.85}
            onPress={() => router.push('/admin')}
          >
            <View style={styles.adminBannerLeft}>
              <View style={styles.adminIconBox}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.adminBadgeSmall}>
                  <Text style={styles.adminBadgeSmallText}>ADMIN ACCESS</Text>
                </View>
                <Text style={styles.adminBannerTitle}>Admin Control Center</Text>
                <Text style={styles.adminBannerSubtitle}>
                  Moderate events, organizers, users &amp; remote settings
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>ACCOUNT &amp; SETTINGS</Text>
          <View style={styles.menuCard}>
            {MENU_ITEMS.filter((item) => !item.authRequired || isAuthenticated).map((item, index, arr) => {
              const isLast = index === arr.length - 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItem, !isLast && styles.menuItemBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name={item.icon} size={20} color={COLORS.textMuted} />
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout Button */}
        {isAuthenticated && (
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleLogout}
            style={styles.logoutBtn}
            textStyle={styles.logoutText}
          />
        )}

        {/* App Version Info */}
        <View style={styles.appInfo}>
          <Logo size="sm" showText={true} subtitle="LIVING THE MOMENT" style={{ marginBottom: SPACING.sm }} />
          <Text style={styles.appInfoText}>Tribes &amp; Cliqs Mobile v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Connected to Live Event Platform</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditProfileOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <View style={styles.modalHeaderBadge}>
                <Ionicons name="person" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>Personal Information</Text>
            </View>
            <TouchableOpacity onPress={() => setEditProfileOpen(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {profileMsg.text ? (
              <View
                style={[
                  styles.msgBanner,
                  profileMsg.type === 'error' ? styles.msgError : styles.msgSuccess,
                ]}
              >
                <Ionicons
                  name={profileMsg.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={18}
                  color={COLORS.primary}
                />
                <Text
                  style={[
                    styles.msgText,
                    profileMsg.type === 'error' ? styles.msgTextError : styles.msgTextSuccess,
                  ]}
                >
                  {profileMsg.text}
                </Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME *</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor={COLORS.placeholder}
                cursorColor={COLORS.primary}
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="e.g. +233 50 123 4567"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="phone-pad"
                cursorColor={COLORS.primary}
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CITY / LOCATION</Text>
              <TextInput
                style={styles.modalInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="e.g. Accra, Ghana"
                placeholderTextColor={COLORS.placeholder}
                cursorColor={COLORS.primary}
                underlineColorAndroid="transparent"
              />
            </View>

            {isStaffOrOrganizer && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ORGANIZATION / BRAND NAME</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editOrgName}
                  onChangeText={setEditOrgName}
                  placeholder="Official Organization Brand"
                  placeholderTextColor={COLORS.placeholder}
                  cursorColor={COLORS.primary}
                  underlineColorAndroid="transparent"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BIO &amp; ABOUT</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="A short note about your interests, vibes & events"
                placeholderTextColor={COLORS.placeholder}
                multiline
                numberOfLines={3}
                cursorColor={COLORS.primary}
                underlineColorAndroid="transparent"
              />
            </View>

            <Button
              title={savingProfile ? 'Saving Changes...' : 'Save Profile'}
              onPress={handleSaveProfile}
              loading={savingProfile}
              style={{ marginTop: SPACING.md }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChangePasswordOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <View style={styles.modalHeaderBadge}>
                <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>Security &amp; Password</Text>
            </View>
            <TouchableOpacity onPress={() => setChangePasswordOpen(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {passwordMsg.text ? (
              <View
                style={[
                  styles.msgBanner,
                  passwordMsg.type === 'error' ? styles.msgError : styles.msgSuccess,
                ]}
              >
                <Ionicons
                  name={passwordMsg.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={18}
                  color={COLORS.primary}
                />
                <Text
                  style={[
                    styles.msgText,
                    passwordMsg.type === 'error' ? styles.msgTextError : styles.msgTextSuccess,
                  ]}
                >
                  {passwordMsg.text}
                </Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showPassword}
                cursorColor={COLORS.primary}
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD (MIN. 6 CHARACTERS)</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showPassword}
                cursorColor={COLORS.primary}
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={COLORS.placeholder}
                secureTextEntry={!showPassword}
                cursorColor={COLORS.primary}
                underlineColorAndroid="transparent"
              />
            </View>

            <TouchableOpacity
              style={styles.showPassRow}
              onPress={() => setShowPassword((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'checkbox' : 'square-outline'}
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.showPassText}>Show passwords</Text>
            </TouchableOpacity>

            <Button
              title={savingPassword ? 'Updating Password...' : 'Update Password'}
              onPress={handleSavePassword}
              loading={savingPassword}
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
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  // User Profile Card Styles
  userCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginRight: SPACING.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  verifiedIconWrap: {
    backgroundColor: 'rgba(239, 239, 241, 0.15)',
    borderRadius: RADIUS.full,
    padding: 2,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  userPhone: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.35)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
  },
  roleText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  memberSincePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
  },
  memberSinceText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  // Extended Details Box
  userDetailsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailRowText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
  },
  bioRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bioText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Interests / Categories Pills
  interestsContainer: {
    gap: 6,
    marginTop: 2,
  },
  interestsLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  interestsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestChip: {
    backgroundColor: 'rgba(239, 239, 241, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.25)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  interestChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },

  // Guest State
  guestCard: {
    padding: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  guestIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  guestInfo: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  guestTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  guestSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  guestBtn: {
    width: '100%',
  },

  // Dashboard Section
  dashboardSection: {
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  liveWalletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.30)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  liveWalletText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  metricIconCircle: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricNumber: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  metricLabel: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  metricSub: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4,
  },

  // Passes & Tickets Section
  ticketsSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  ticketsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ticketSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ticketsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  activePassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 239, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.40)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  activePassBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  ticketsSectionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  fullWalletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    backgroundColor: 'rgba(239, 239, 241, 0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.25)',
  },
  fullWalletLinkText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  ticketSegmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 3,
    gap: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ticketSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  ticketSegmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  ticketSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  ticketSegmentTextActive: {
    color: COLORS.buttonText,
    fontWeight: '800',
  },
  ticketsLoader: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ticketsLoaderText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  ticketsListWrapper: {
    marginTop: SPACING.xs,
  },
  emptyTicketsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  emptyTicketsIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTicketsTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyTicketsSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: SPACING.md,
  },
  exploreEventsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  exploreEventsBtnText: {
    color: COLORS.buttonText,
    fontSize: 13,
    fontWeight: '700',
  },

  // Organizer Hub Banner
  organizerHubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  organizerHubIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerHubTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  organizerHubSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  // Admin Banner
  adminBanner: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.40)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  adminIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 239, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeSmall: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 239, 241, 0.20)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  adminBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  adminBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  adminBannerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Menu Section
  menuSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuItemTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Logout Button
  logoutBtn: {
    marginBottom: SPACING.xl,
    borderColor: 'rgba(203, 213, 225, 0.45)',
  },
  logoutText: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // App Version Info
  appInfo: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  appInfoText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  appInfoSubtext: {
    color: COLORS.placeholder,
    fontSize: 10,
    marginTop: 2,
  },

  // Modals Styles
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalHeaderBadge: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(239, 239, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  modalBody: {
    padding: SPACING.xl,
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
  modalInput: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
    color: COLORS.text,
    fontSize: 14,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  textArea: {
    height: 80,
    paddingTop: SPACING.sm + 2,
    textAlignVertical: 'top',
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  msgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  msgError: {
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.30)',
  },
  msgSuccess: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  msgText: {
    fontSize: 13,
    flex: 1,
  },
  msgTextError: {
    color: COLORS.primary,
  },
  msgTextSuccess: {
    color: COLORS.text,
  },
  showPassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  showPassText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
