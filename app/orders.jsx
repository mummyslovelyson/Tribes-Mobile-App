import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Header from '../src/components/Header';
import Button from '../src/components/Button';
import { getUserOrdersApi } from '../src/api/orders';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setOrders([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await getUserOrdersApi();
      const list = Array.isArray(data) ? data : data?.orders || [];
      setOrders(list);
    } catch (err) {
      console.warn('[OrdersScreen] Error fetching orders:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderOrderItem = ({ item }) => {
    const isPaid = item.status === 'paid' || item.status === 'completed' || item.payment_status === 'paid';
    const totalAmount = Number(item.total_amount || item.total || 0);

    return (
      <View style={styles.orderCard}>
        {/* Header: Order ID & Status */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>
              {item.order_number || `ORDER #${item.id}`}
            </Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>

          <View style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusPending]}>
            <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
              {item.status ? item.status.toUpperCase() : 'PAID'}
            </Text>
          </View>
        </View>

        {/* Event or Items Info */}
        <View style={styles.orderBody}>
          {item.event_title ? (
            <Text style={styles.eventTitle} numberOfLines={1}>
              {item.event_title}
            </Text>
          ) : null}

          {item.items && Array.isArray(item.items) && item.items.length > 0 ? (
            <View style={styles.itemsList}>
              {item.items.map((sub, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemText} numberOfLines={1}>
                    {sub.quantity || 1}x {sub.ticket_type_name || sub.name || 'Ticket Pass'}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {sub.price ? `GHS ${Number(sub.price).toFixed(2)}` : 'Free'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Total & Action */}
        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalLabel}>TOTAL PAID</Text>
            <Text style={styles.totalValue}>
              {totalAmount === 0 ? 'Free Pass' : `GHS ${totalAmount.toFixed(2)}`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewTicketsBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/tickets')}
          >
            <Ionicons name="ticket-outline" size={15} color={COLORS.text} />
            <Text style={styles.viewTicketsBtnText}>View Tickets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header title="Order History" subtitle="Your past purchases" showNotification={false} />
        <View style={styles.authPromptContainer}>
          <View style={styles.authIconCircle}>
            <Ionicons name="receipt-outline" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={styles.authTitle}>Sign in to view your orders</Text>
          <Text style={styles.authSubtitle}>
            Track your receipts, invoice summaries, and ticket purchases across all events.
          </Text>
          <Button
            title="Sign In / Register"
            onPress={() => router.push('/(auth)/login')}
            style={styles.authBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Order History"
        subtitle={`${orders.length} past ${orders.length === 1 ? 'order' : 'orders'}`}
        showNotification={false}
      />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Retrieving receipts...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => `order-${item.id}`}
          renderItem={renderOrderItem}
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
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No orders placed yet</Text>
              <Text style={styles.emptySubtitle}>
                When you book passes for upcoming events, your receipts and order confirmations will appear here.
              </Text>
              <Button
                title="Explore Events"
                onPress={() => router.push('/(tabs)')}
                style={styles.exploreBtn}
              />
            </View>
          }
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
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs + 2,
  },
  orderNumber: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  orderDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusPaid: {
    backgroundColor: 'rgba(239, 239, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 239, 241, 0.2)',
  },
  statusPending: {
    backgroundColor: COLORS.accentMuted,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextPaid: {
    color: COLORS.text,
  },
  statusTextPending: {
    color: '#FF6B6B',
  },
  orderBody: {
    gap: 4,
    paddingVertical: 2,
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  itemsList: {
    gap: 3,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    color: COLORS.textMuted,
    fontSize: 12,
    maxWidth: '70%',
  },
  itemPrice: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: 2,
  },
  totalLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  viewTicketsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  viewTicketsBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  authPromptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  authIconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  authTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  authSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  authBtn: {
    marginTop: SPACING.sm,
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 260,
  },
  exploreBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
});
