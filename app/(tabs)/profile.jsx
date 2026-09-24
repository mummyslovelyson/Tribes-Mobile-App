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
  const { user, isAuthenticated, isAdmin, logout, updateProfile, changePassword } = useAuth();

  // Modals state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Dashboard Stats State
  const [ticketCount, setTicketCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [latestTicket, setLatestTicket] = useState(null);

  // Live Auto-Refresh Dashboard on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      let active = true;
      (async () => {
        try {
          const [ticketsData, ordersData] = await Promise.allSettled([
            getMyTicketsApi(),
            getUserOrdersApi(),
          ]);

          if (!active) return;

          if (ticketsData.status === 'fulfilled') {
            const list = ticketsData.value?.tickets || ticketsData.value || [];
            const activeTickets = list.filter((t) => t.status === 'active' || !t.is_used);
            setTicketCount(activeTickets.length);
            setLatestTicket(activeTickets[0] || list[0] || null);
          }

          if (ordersData.status === 'fulfilled') {
            const oList = Array.isArray(ordersData.value) ? ordersData.value : ordersData.value?.orders || [];
            setOrderCount(oList.length);
          }
        } catch (err) {
          console.warn('[ProfileScreen] Dashboard load warning:', err.message);
        }
      })();
      return () => {
        active = false;
      };
    }, [isAuthenticated])
  );

  // Edit Profile Form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Change Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditLocation(user?.location || '');
    setEditBio(user?.bio || '');
    setProfileMsg({ type: '', text: '' });
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setProfileMsg({ type: 'error', text: 'Name is required' });
      return;
    }
    setSavingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      await updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        location: editLocation.trim() || undefined,
        bio: editBio.trim() || undefined,
      });
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

  const isStaffOrOrganizer = user?.role === 'organizer' || user?.role === 'admin' || user?.role === 'staff';

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
            icon: 'shield-checkmark-outline',
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
            id: 'organizer_hub',
            title: 'Organizer Hub & Event Management',
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
      icon: 'sparkles-outline',
      onPress: () => router.push('/(tabs)/chat'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="My Account" subtitle="Profile & preferences" showNotification={false} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Identity Card */}
        {isAuthenticated && user ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.phone ? (
                <Text style={styles.userPhone}>{user.phone}</Text>
              ) : null}
              <View style={styles.rolePill}>
                <Text style={styles.roleText}>{user.role || 'Attendee'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editIconBtn}
              onPress={openEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIcon}>
              <Ionicons name="person-outline" size={28} color={COLORS.textMuted} />
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestTitle}>Welcome to Tribes &amp; Cliqs</Text>
              <Text style={styles.guestSubtitle}>Sign in to manage your tickets, passes, and orders</Text>
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
                <Ionicons name="flash" size={10} color="#22C55E" />
                <Text style={styles.liveWalletText}>LIVE WALLET</Text>
              </View>
            </View>

            {/* Quick Metrics Grid */}
            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={styles.metricCard}
                onPress={() => router.push('/(tabs)/tickets')}
                activeOpacity={0.8}
              >
                <View style={[styles.metricIconCircle, { backgroundColor: 'rgba(217, 38, 38, 0.14)' }]}>
                  <Ionicons name="ticket-outline" size={20} color={COLORS.accent} />
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
                <View style={[styles.metricIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.14)' }]}>
                  <Ionicons name="receipt-outline" size={20} color="#3B82F6" />
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
                <View style={[styles.metricIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.14)' }]}>
                  <Ionicons name="heart-outline" size={20} color="#EC4899" />
                </View>
                <Text style={styles.metricNumber}>Saved</Text>
                <Text style={styles.metricLabel}>Wishlist</Text>
                <Text style={styles.metricSub}>Explore &rarr;</Text>
              </TouchableOpacity>
            </View>

            {/* Latest Digital Pass Spotlight */}
            {latestTicket && (
              <TouchableOpacity
                style={styles.ticketSpotlightCard}
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/tickets')}
              >
                <View style={styles.spotlightHeader}>
                  <View style={styles.spotlightTag}>
                    <Ionicons name="sparkles" size={12} color="#F59E0B" />
                    <Text style={styles.spotlightTagText}>NEXT UPCOMING PASS</Text>
                  </View>
                  <View style={styles.spotlightValidBadge}>
                    <Text style={styles.spotlightValidText}>READY AT GATE</Text>
                  </View>
                </View>

                <Text style={styles.spotlightTitle} numberOfLines={1}>
                  {latestTicket.event_title || latestTicket.title || 'Event Pass'}
                </Text>

                <View style={styles.spotlightMetaRow}>
                  <View style={styles.spotlightMetaItem}>
                    <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.spotlightMetaText}>
                      {latestTicket.start_date
                        ? new Date(latestTicket.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Upcoming'}
                    </Text>
                  </View>
                  <View style={styles.spotlightMetaItem}>
                    <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.spotlightMetaText} numberOfLines={1}>
                      {latestTicket.venue || latestTicket.city || 'Accra'}
                    </Text>
                  </View>
                </View>

                <View style={styles.spotlightFooter}>
                  <View>
                    <Text style={styles.spotlightCodeLabel}>TICKET CODE</Text>
                    <Text style={styles.spotlightCode}>{latestTicket.ticket_code || `#TC-${latestTicket.id}`}</Text>
                  </View>
                  <View style={styles.spotlightAction}>
                    <Text style={styles.spotlightActionText}>Show QR Pass</Text>
                    <Ionicons name="qr-code-outline" size={15} color={COLORS.text} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Organizer Hub Banner (if Organizer) */}
            {isStaffOrOrganizer && (
              <TouchableOpacity
                style={styles.organizerHubBanner}
                activeOpacity={0.85}
                onPress={() => router.push('/check-in')}
              >
                <View style={styles.organizerHubIcon}>
                  <Ionicons name="scan-outline" size={22} color={COLORS.accent} />
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
                <Ionicons name="shield-checkmark" size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.adminBadgeSmall}>
                  <Text style={styles.adminBadgeSmallText}>ADMIN ACCESS</Text>
                </View>
                <Text style={styles.adminBannerTitle}>Admin Control Center</Text>
                <Text style={styles.adminBannerSubtitle}>
                  Moderate events, organizers, users & remote settings
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#10B981" />
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
            <Text style={styles.modalTitle}>Edit Profile</Text>
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
                  color={profileMsg.type === 'error' ? '#EF4444' : '#10B981'}
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
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.modalInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone number"
                placeholderTextColor={COLORS.placeholder}
                keyboardType="phone-pad"
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
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BIO</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="A short note about you"
                placeholderTextColor={COLORS.placeholder}
                multiline
                numberOfLines={3}
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
            <Text style={styles.modalTitle}>Change Password</Text>
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
                  color={passwordMsg.type === 'error' ? '#EF4444' : '#10B981'}
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  userPhone: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 239, 241, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginTop: SPACING.xs + 2,
  },
  roleText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editIconBtn: {
    padding: SPACING.sm,
  },
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
    fontSize: 16,
    fontWeight: '700',
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
  logoutBtn: {
    marginBottom: SPACING.xl,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  logoutText: {
    color: '#EF4444',
  },
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
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
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
  },
  textArea: {
    height: 80,
    paddingTop: SPACING.sm + 2,
    textAlignVertical: 'top',
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
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  msgSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  msgText: {
    fontSize: 13,
    flex: 1,
  },
  msgTextError: {
    color: '#EF4444',
  },
  msgTextSuccess: {
    color: '#10B981',
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
  adminBanner: {
    backgroundColor: '#1E2827',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeSmall: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginBottom: 2,
  },
  adminBadgeSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
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

  // Dashboard Styles
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
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  liveWalletText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22C55E',
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
  ticketSpotlightCard: {
    backgroundColor: '#1E252D',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(217, 38, 38, 0.25)',
    marginBottom: SPACING.md,
  },
  spotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotlightTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotlightTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  spotlightValidBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  spotlightValidText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#22C55E',
  },
  spotlightTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  spotlightMetaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  spotlightMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotlightMetaText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  spotlightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  spotlightCodeLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spotlightCode: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  spotlightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  spotlightActionText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  organizerHubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#262F38',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: SPACING.sm,
  },
  organizerHubIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(217, 38, 38, 0.12)',
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
});
