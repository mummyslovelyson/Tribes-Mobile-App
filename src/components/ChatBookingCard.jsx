import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export default function ChatBookingCard({
  booking,
  onContinuePayment,
  onVerifyPayment,
  onShowQR,
  verifying = false,
}) {
  const [timeLeft, setTimeLeft] = useState(booking?.remainingSeconds || 600);

  useEffect(() => {
    if (booking?.status !== 'reserved') return;
    if (!booking?.expiresAt && !booking?.remainingSeconds) return;

    const targetTime = booking.expiresAt
      ? new Date(booking.expiresAt).getTime()
      : Date.now() + (booking.remainingSeconds || 600) * 1000;

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [booking]);

  if (!booking) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = timeLeft <= 0 && booking.status === 'reserved';

  const formatPrice = (val) => {
    const num = Number(val || 0);
    return `GHS ${num.toFixed(2)}`;
  };

  // 1. Order Summary
  if (booking.status === 'summary') {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="receipt-outline" size={16} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.headerLabel}>ORDER SUMMARY</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{booking.eventTitle}</Text>
            </View>
          </View>
          <View style={styles.badgeAmber}>
            <Text style={styles.badgeTextAmber}>Awaiting Payment</Text>
          </View>
        </View>

        <View style={styles.breakdownBox}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{booking.quantity} × {booking.tierName}</Text>
            <Text style={styles.breakdownVal}>{formatPrice(booking.subtotal)}</Text>
          </View>
          {Boolean(booking.serviceFee) && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownSub}>Service fee</Text>
              <Text style={styles.breakdownSubVal}>{formatPrice(booking.serviceFee)}</Text>
            </View>
          )}
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>{formatPrice(booking.total)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.payBtn}
          activeOpacity={0.8}
          onPress={() => onContinuePayment?.(booking)}
        >
          <Ionicons name="card-outline" size={16} color="#FFFFFF" />
          <Text style={styles.payBtnText}>Pay with Paystack • {formatPrice(booking.total)}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. Reserved Hold (10-minute hold)
  if (booking.status === 'reserved') {
    return (
      <View style={[styles.card, styles.reservedBorder]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="lock-closed" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.headerLabel, { color: '#10B981' }]}>PASSES HELD FOR YOU</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{booking.eventTitle}</Text>
            </View>
          </View>
          <View style={[styles.timerBadge, isExpired && styles.timerExpired]}>
            <Ionicons name="time-outline" size={12} color={isExpired ? '#EF4444' : '#10B981'} />
            <Text style={[styles.timerText, isExpired && styles.timerTextExpired]}>
              {isExpired ? 'Hold Expired' : timeFormatted}
            </Text>
          </View>
        </View>

        <View style={styles.breakdownBox}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{booking.quantity} × {booking.tierName}</Text>
            <Text style={styles.breakdownVal}>{formatPrice(booking.subtotal)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalVal}>{formatPrice(booking.total)}</Text>
          </View>
        </View>

        {!isExpired && booking.authorizationUrl && (
          <TouchableOpacity
            style={styles.payBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (booking.authorizationUrl) {
                Linking.openURL(booking.authorizationUrl);
              } else {
                onContinuePayment?.(booking);
              }
            }}
          >
            <Ionicons name="card-outline" size={16} color="#FFFFFF" />
            <Text style={styles.payBtnText}>Complete Payment • {formatPrice(booking.total)}</Text>
            <Ionicons name="open-outline" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.verifyBtn}
          activeOpacity={0.8}
          disabled={verifying}
          onPress={() => onVerifyPayment?.(booking)}
        >
          {verifying ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.text} />
          )}
          <Text style={styles.verifyBtnText}>
            {verifying ? 'Verifying payment...' : 'I have completed payment (Verify)'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Completed Booking / Issued Passes
  if (booking.status === 'completed' || booking.status === 'success') {
    return (
      <View style={[styles.card, styles.completedBorder]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Ionicons name="checkmark-done" size={18} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.headerLabel, { color: '#10B981' }]}>PAYMENT CONFIRMED</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>{booking.eventTitle}</Text>
            </View>
          </View>
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeTextSuccess}>ISSUED</Text>
          </View>
        </View>

        <Text style={styles.successNote}>
          Your order has been verified! Passes are ready in your account.
        </Text>

        {booking.ticket && (
          <TouchableOpacity
            style={styles.qrBtn}
            activeOpacity={0.8}
            onPress={() => onShowQR?.(booking.ticket)}
          >
            <Ionicons name="qr-code-outline" size={16} color={COLORS.background} />
            <Text style={styles.qrBtnText}>View Entry QR Pass</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#14181C',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#2E363E',
    padding: SPACING.md,
    marginVertical: SPACING.xs,
  },
  reservedBorder: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  completedBorder: {
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: COLORS.textMuted,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  badgeAmber: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeTextAmber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  badgeSuccess: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  badgeTextSuccess: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  timerExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    fontVariant: ['tabular-nums'],
  },
  timerTextExpired: {
    color: '#EF4444',
  },
  breakdownBox: {
    backgroundColor: '#1C232B',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#2A333D',
    padding: SPACING.sm,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  breakdownSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  breakdownSubVal: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  totalRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  totalVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  payBtn: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  verifyBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  verifyBtnText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  successNote: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginVertical: 4,
  },
  qrBtn: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.text,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  qrBtnText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '800',
  },
});
