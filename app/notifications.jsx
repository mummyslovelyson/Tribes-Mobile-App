import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
} from '../src/api/users';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await getNotificationsApi();
      setNotifications(data?.notifications || data || []);
    } catch (err) {
      console.warn('[Notifications] Fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.warn('[Notifications] Mark read error:', err?.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (_err) {
      Alert.alert('Error', 'Failed to mark all as read.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotificationApi(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (_err) {
      Alert.alert('Error', 'Failed to delete notification.');
    }
  };

  const getTypeMeta = (type) => {
    switch (type) {
      case 'ticket':
        return {
          icon: 'ticket-outline',
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.12)',
        };
      case 'order':
      case 'payment':
        return {
          icon: 'checkmark-circle-outline',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
        };
      case 'reminder':
      case 'event':
        return {
          icon: 'calendar-outline',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.12)',
        };
      case 'account':
      case 'security':
        return {
          icon: 'shield-checkmark-outline',
          color: '#818CF8',
          bg: 'rgba(129, 140, 248, 0.12)',
        };
      default:
        return {
          icon: 'notifications-outline',
          color: '#CBD5E1',
          bg: 'rgba(203, 213, 225, 0.08)',
        };
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' ? styles.filterTabActive : null]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'all' ? styles.filterTextActive : null]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' ? styles.filterTabActive : null]}
          onPress={() => setFilter('unread')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'unread' ? styles.filterTextActive : null]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.text} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="notifications-off-outline" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'unread'
              ? 'You have caught up with all your unread messages.'
              : 'Updates regarding your tickets, bookings, and events will show up here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.text}
              colors={[COLORS.text]}
            />
          }
          renderItem={({ item }) => {
            const meta = getTypeMeta(item.type);
            return (
              <TouchableOpacity
                style={[styles.card, !item.is_read ? styles.cardUnread : null]}
                onPress={() => !item.is_read && handleMarkRead(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.typeIconWrap, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardTime}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </Text>
                  </View>
                  {!item.is_read && <View style={styles.dot} />}
                </View>

                <Text style={styles.cardMessage}>{item.message}</Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={styles.deleteBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
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
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  unreadBadge: {
    backgroundColor: 'rgba(239, 239, 241, 0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  markAllText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  filterTab: {
    paddingVertical: 5,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  filterText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.background,
    fontWeight: '800',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardUnread: {
    backgroundColor: '#2A323B',
    borderColor: '#38424D',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  typeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm + 2,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  cardTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
    marginLeft: SPACING.xs,
  },
  cardMessage: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginVertical: SPACING.xs + 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  deleteText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: SPACING.md,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
