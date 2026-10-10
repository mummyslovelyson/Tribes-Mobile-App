import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export default function TicketCard({ ticket, onQrPress, onTransferPress }) {
  if (!ticket) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isRefunded = ticket.status === 'refunded' || ticket.payment_status === 'refunded';
  const isCancelled = ticket.status === 'cancelled' || ticket.event_status === 'cancelled';
  const isTransferred = ticket.status === 'transferred';
  const isUsed = ticket.status === 'used' || ticket.is_used;
  const isValid = !isRefunded && !isCancelled && !isTransferred && !isUsed;

  const getStatusBadge = () => {
    if (isRefunded) return { label: 'REFUNDED', badgeStyle: styles.statusUsed, textStyle: styles.statusTextUsed };
    if (isCancelled) return { label: 'CANCELLED', badgeStyle: styles.statusUsed, textStyle: styles.statusTextUsed };
    if (isTransferred) return { label: 'TRANSFERRED', badgeStyle: styles.statusUsed, textStyle: styles.statusTextUsed };
    if (isUsed) return { label: 'USED', badgeStyle: styles.statusUsed, textStyle: styles.statusTextUsed };
    return { label: 'VALID', badgeStyle: styles.statusActive, textStyle: styles.statusTextActive };
  };

  const statusBadge = getStatusBadge();

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {ticket.event_title || ticket.title || 'Event Pass'}
          </Text>
          <Text style={styles.tierName}>
            {ticket.ticket_type_name || ticket.tier_name || 'Standard Pass'}
          </Text>
        </View>

        <View style={[styles.statusBadge, statusBadge.badgeStyle]}>
          <Text style={[styles.statusText, statusBadge.textStyle]}>
            {statusBadge.label}
          </Text>
        </View>
      </View>

      {/* Ticket Details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>DATE</Text>
          <Text style={styles.detailValue}>{formatDate(ticket.start_date || ticket.created_at)}</Text>
        </View>

        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>VENUE</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {ticket.venue || ticket.city || 'Accra'}
          </Text>
        </View>

        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>PRICE</Text>
          <Text style={styles.detailValue}>
            {`GHS ${Number(ticket.price ?? ticket.unit_price ?? ticket.ticket_price ?? 0).toFixed(2)}`}
          </Text>
        </View>
      </View>

      {/* Perforation Separator */}
      <View style={styles.perforation}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.notchRight} />
      </View>

      {/* QR Code & Code Section */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.ticketCodeLabel}>TICKET CODE</Text>
          <Text style={styles.ticketCode}>{ticket.ticket_code || `#TC-${ticket.id}`}</Text>
        </View>

        <View style={styles.footerActions}>
          {isValid && onTransferPress && (
            <TouchableOpacity
              style={styles.transferButton}
              activeOpacity={0.8}
              onPress={() => onTransferPress(ticket)}
            >
              <Ionicons name="paper-plane-outline" size={15} color={COLORS.textMuted} />
              <Text style={styles.transferButtonText}>Transfer</Text>
            </TouchableOpacity>
          )}

          {(isValid || isUsed) && (
            <TouchableOpacity
              style={styles.qrButton}
              activeOpacity={0.8}
              onPress={() => onQrPress && onQrPress(ticket)}
            >
              <Ionicons name="qr-code-outline" size={16} color={COLORS.text} />
              <Text style={styles.qrButtonText}>Show QR</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  tierName: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusActive: {
    backgroundColor: 'rgba(239, 239, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.40)',
  },
  statusUsed: {
    backgroundColor: 'rgba(148, 149, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(148, 149, 153, 0.3)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: COLORS.primary,
  },
  statusTextUsed: {
    color: COLORS.textMuted,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  perforation: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    position: 'relative',
  },
  tearLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    position: 'relative',
  },
  notchLeft: {
    width: 14,
    height: 24,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: COLORS.border,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  notchRight: {
    width: 14,
    height: 24,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: COLORS.border,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  ticketCodeLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ticketCode: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transferButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
