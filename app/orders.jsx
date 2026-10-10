import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Header from '../src/components/Header';
import Button from '../src/components/Button';
import { getUserOrdersApi, cancelOrderApi, requestRefundApi } from '../src/api/orders';
import { BUYER_REFUND_OPTIONS } from '../src/constants/refundPolicy';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refund Modal State
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState(null);
  const [refundCircumstance, setRefundCircumstance] = useState('5_BUYER_CIRCUMSTANCES_UNRESPONSIVE_ORGANIZER');
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

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

  const handleOpenRefundModal = (order) => {
    setSelectedOrderForRefund(order);
    setRefundCircumstance('5_BUYER_CIRCUMSTANCES_UNRESPONSIVE_ORGANIZER');
    setRefundReason('');
    setRefundModalVisible(true);
  };

  const handleSubmitRefund = async () => {
    if (!selectedOrderForRefund) return;
    if (!refundReason.trim()) {
      Alert.alert('Reason Required', 'Please provide an explanation for your refund request.');
      return;
    }

    setSubmittingRefund(true);
    try {
      const res = await requestRefundApi(selectedOrderForRefund.id, {
        reason: refundReason.trim(),
        circumstance: refundCircumstance,
        policyCircumstance: refundCircumstance,
      });

      Alert.alert(
        'Request Submitted',
        res?.message || 'Your refund request has been transmitted to the Event Organizer. Under Clause 5, they have 24 hours to review. If unresponsive, TRIBESANDCLIQS will resolve it.',
      );

      // Update local order status
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderForRefund.id
            ? {
                ...o,
                refund_request_status: 'pending',
                refund_status_detail: 'pending',
                organizer_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              }
            : o,
        ),
      );

      setRefundModalVisible(false);
      setSelectedOrderForRefund(null);
      setRefundReason('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit refund request. Please try again.';
      Alert.alert('Request Failed', msg);
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleOpenCancelModal = (order) => {
    setSelectedOrderForCancel(order);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleSubmitCancel = async () => {
    if (!selectedOrderForCancel) return;
    setSubmittingCancel(true);
    try {
      await cancelOrderApi(selectedOrderForCancel.id, {
        reason: cancelReason.trim() || undefined,
      });

      Alert.alert('Booking Cancelled', 'Your booking has been cancelled successfully.');

      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrderForCancel.id ? { ...o, status: 'cancelled' } : o)),
      );

      setCancelModalVisible(false);
      setSelectedOrderForCancel(null);
      setCancelReason('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel booking. Please try again.';
      Alert.alert('Cancellation Failed', msg);
    } finally {
      setSubmittingCancel(false);
    }
  };

  const renderOrderItem = ({ item }) => {
    const payStatus = (item.payment_status || item.paymentStatus || 'pending').toLowerCase();
    const orderStatus = (item.status || '').toLowerCase();
    const isCancelled = orderStatus === 'cancelled';
    const refundStatus = (item.refund_request_status || item.refund_status_detail || '').toLowerCase();
    const isRefundPending = refundStatus === 'pending';
    const isRefunded = payStatus === 'refunded' || orderStatus === 'refunded' || refundStatus === 'approved';
    const isPaid = (payStatus === 'paid' || payStatus === 'completed' || orderStatus === 'paid' || orderStatus === 'completed') && !isCancelled && !isRefunded;
    const totalAmount = Number(item.total_amount || item.total || 0);

    return (
      <View style={[styles.orderCard, isRefundPending && styles.orderCardPending]}>
        {/* Header: Order ID & Status */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>
              {item.order_number || `ORDER #${(item.id || '').toString().slice(-8).toUpperCase()}`}
            </Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>

          {/* Dynamic Status Badges */}
          <View style={styles.badgeRow}>
            {isRefundPending ? (
              <View style={styles.statusRefundPending}>
                <Ionicons name="time-outline" size={11} color={COLORS.primary} />
                <Text style={styles.statusTextRefundPending}>24H REVIEW SLA</Text>
              </View>
            ) : isRefunded ? (
              <View style={styles.statusRefunded}>
                <Ionicons name="checkmark-done" size={11} color={COLORS.textSecondary} />
                <Text style={styles.statusTextRefunded}>REFUNDED</Text>
              </View>
            ) : isCancelled ? (
              <View style={styles.statusCancelled}>
                <Text style={styles.statusTextCancelled}>CANCELLED</Text>
              </View>
            ) : isPaid ? (
              <View style={styles.statusPaid}>
                <Text style={styles.statusTextPaid}>PAID</Text>
              </View>
            ) : (
              <View style={styles.statusPending}>
                <Text style={styles.statusTextPending}>PENDING</Text>
              </View>
            )}
          </View>
        </View>

        {/* Event Info */}
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

        {/* Clause 5 SLA Review Callout Banner */}
        {isRefundPending && (
          <View style={styles.slaCallout}>
            <Ionicons name="shield-checkmark" size={15} color={COLORS.primary} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.slaCalloutTitle}>Refund Request Under Review</Text>
              <Text style={styles.slaCalloutDesc}>
                Under TRIBESANDCLIQS Policy Clause 5, the Event Organizer has 24 hours to respond. If unresponsive, the platform steps in to process your refund.
              </Text>
              {item.organizer_deadline && (
                <Text style={styles.slaCalloutDeadline}>
                  Organizer Deadline: {new Date(item.organizer_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(item.organizer_deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Total & Action Buttons */}
        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalLabel}>TOTAL PAID</Text>
            <Text style={styles.totalValue}>
              {totalAmount === 0 ? 'Free Pass' : `GHS ${totalAmount.toFixed(2)}`}
            </Text>
          </View>

          <View style={styles.actionRow}>
            {/* View Tickets */}
            <TouchableOpacity
              style={styles.viewTicketsBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/tickets')}
            >
              <Ionicons name="ticket-outline" size={14} color={COLORS.text} />
              <Text style={styles.viewTicketsBtnText}>Tickets</Text>
            </TouchableOpacity>

            {/* Request Refund (Policy Clause) */}
            {isPaid && !isRefundPending && (
              <TouchableOpacity
                style={styles.refundBtn}
                activeOpacity={0.8}
                onPress={() => handleOpenRefundModal(item)}
              >
                <Ionicons name="return-up-back" size={14} color={COLORS.primary} />
                <Text style={styles.refundBtnText}>Refund</Text>
              </TouchableOpacity>
            )}

            {/* Cancel Booking */}
            {!isCancelled && !isRefunded && !isRefundPending && (
              <TouchableOpacity
                style={styles.cancelBtn}
                activeOpacity={0.8}
                onPress={() => handleOpenCancelModal(item)}
              >
                <Ionicons name="close-circle-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
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

      {/* ── Modal: Request Refund (Policy Clause 5 SLA) ── */}
      <Modal
        visible={refundModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRefundModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Request Refund</Text>
                <Text style={styles.modalSubtitle}>TRIBESANDCLIQS Policy Protection</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRefundModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Event & Order Context */}
              {selectedOrderForRefund && (
                <View style={styles.modalContextCard}>
                  <Text style={styles.modalEventTitle} numberOfLines={1}>
                    {selectedOrderForRefund.event_title || 'Selected Event'}
                  </Text>
                  <Text style={styles.modalOrderInfo}>
                    Order #{(selectedOrderForRefund.id || '').toString().slice(-8).toUpperCase()} • GHS {Number(selectedOrderForRefund.total_amount || selectedOrderForRefund.total || 0).toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Policy Grounds Selector */}
              <Text style={styles.modalSectionLabel}>STATUTORY POLICY CIRCUMSTANCE</Text>
              <View style={styles.groundsList}>
                {BUYER_REFUND_OPTIONS.map((opt) => {
                  const selected = refundCircumstance === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.groundCard, selected && styles.groundCardSelected]}
                      onPress={() => setRefundCircumstance(opt.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.groundHeader}>
                        <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                          {selected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[styles.groundTitle, selected && styles.groundTitleSelected]}>
                          Clause {opt.clauseNumber}: {opt.title}
                        </Text>
                      </View>
                      <Text style={styles.groundDesc}>{opt.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* SLA Guarantee Note */}
              <View style={styles.slaNoticeBox}>
                <Ionicons name="time" size={16} color={COLORS.primary} style={{ marginTop: 1 }} />
                <Text style={styles.slaNoticeText}>
                  Under Clause 5, the Event Organizer has 24 hours to respond. If they do not respond within 1 day, TRIBESANDCLIQS will intervene to execute the refund.
                </Text>
              </View>

              {/* Detailed Reason Input */}
              <Text style={styles.modalSectionLabel}>EXPLANATION FOR REVIEW *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Explain why you are requesting a refund..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                value={refundReason}
                onChangeText={setRefundReason}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRefundModalVisible(false)}
                disabled={submittingRefund}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingRefund && { opacity: 0.6 }]}
                onPress={handleSubmitRefund}
                disabled={submittingRefund}
              >
                {submittingRefund ? (
                  <ActivityIndicator size="small" color="#0E1216" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Cancel Booking ── */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
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
                <Text style={styles.modalTitle}>Cancel Booking</Text>
                <Text style={styles.modalSubtitle}>Release your reserved tickets</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCancelModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.cancelWarningText}>
                Are you sure you want to cancel this booking? This will invalidate your tickets.
              </Text>
              <Text style={[styles.modalSectionLabel, { marginTop: SPACING.md }]}>REASON (OPTIONAL)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Reason for cancellation..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                value={cancelReason}
                onChangeText={setCancelReason}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
                disabled={submittingCancel}
              >
                <Text style={styles.modalCancelBtnText}>Keep Booking</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: COLORS.textSecondary }, submittingCancel && { opacity: 0.6 }]}
                onPress={handleSubmitCancel}
                disabled={submittingCancel}
              >
                {submittingCancel ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalSubmitBtnText, { color: '#FFFFFF' }]}>Confirm Cancel</Text>
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
  orderCardPending: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusTextPaid: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPending: {
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.30)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusTextPending: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  statusRefundPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 239, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.40)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusTextRefundPending: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusRefunded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusTextRefunded: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  statusCancelled: {
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.30)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusTextCancelled: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
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
  slaCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs + 2,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: 2,
  },
  slaCalloutTitle: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  slaCalloutDesc: {
    color: 'rgba(253, 230, 138, 0.85)',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  slaCalloutDeadline: {
    color: COLORS.primary,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewTicketsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  viewTicketsBtnText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
  },
  refundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.35)',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  refundBtnText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(203, 213, 225, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.3)',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11,
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

  // Modal Styles
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
    maxHeight: '85%',
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
  modalContextCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  modalEventTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOrderInfo: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  modalSectionLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  groundsList: {
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  groundCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  groundCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(239, 239, 241, 0.10)',
  },
  groundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  radioCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  groundTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  groundTitleSelected: {
    color: COLORS.primary,
  },
  groundDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
    marginLeft: 22,
  },
  slaNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  slaNoticeText: {
    color: '#BAE6FD',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
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
  cancelWarningText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
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
    backgroundColor: COLORS.primary,
  },
  modalSubmitBtnText: {
    color: COLORS.buttonText,
    fontSize: 13,
    fontWeight: '700',
  },
});
