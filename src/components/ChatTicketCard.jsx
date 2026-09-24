import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { resolveImageUrl } from '../api/client';

export default function ChatTicketCard({ ticket }) {
  const router = useRouter();
  if (!ticket) return null;

  const eventDate = ticket.date
    ? new Date(ticket.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      })
    : '';

  const isActive = ticket.status === 'active';
  const price = Number(ticket.ticketPrice || 0);

  return (
    <View style={styles.card}>
      {/* Top Banner & Pass Header */}
      <View style={styles.topHeader}>
        <View style={styles.imageBox}>
          {ticket.bannerImage ? (
            <Image
              source={{ uri: resolveImageUrl(ticket.bannerImage) }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="ticket-outline" size={20} color={COLORS.textMuted} />
          )}
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.metaRow}>
            {ticket.ticketNumber ? (
              <Text style={styles.ticketNumber} numberOfLines={1}>
                {ticket.ticketNumber}
              </Text>
            ) : null}
            <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                {ticket.status || 'ACTIVE'}
              </Text>
            </View>
          </View>

          <Text style={styles.eventTitle} numberOfLines={1}>
            {ticket.eventTitle || 'Event Pass'}
          </Text>

          <Text style={styles.tierName} numberOfLines={1}>
            {ticket.ticketTypeName || 'Standard Pass'}
            {price > 0 ? ` • GHS ${price.toFixed(2)}` : ' • Free'}
          </Text>
        </View>
      </View>

      {/* Date & Location */}
      <View style={styles.detailsBody}>
        {eventDate ? (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.detailText}>
              {eventDate} {ticket.time ? `• ${ticket.time}` : ''}
            </Text>
          </View>
        ) : null}

        {ticket.venue ? (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {ticket.venue}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.82}
          onPress={() => router.push('/(tabs)/tickets')}
        >
          <Text style={styles.actionBtnText}>View QR Pass in My Tickets</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.background} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161D22',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#2E363E',
    overflow: 'hidden',
    marginVertical: SPACING.xs,
    width: '100%',
  },
  topHeader: {
    padding: SPACING.md,
    backgroundColor: '#1C232B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#2E363E',
  },
  imageBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#252E38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  ticketNumber: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#949599',
    maxWidth: '65%',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  statusActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#EFEFF1',
  },
  statusTextInactive: {
    color: '#949599',
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EFEFF1',
    letterSpacing: -0.2,
  },
  tierName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  detailsBody: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#161D22',
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#949599',
    flex: 1,
  },
  footer: {
    padding: SPACING.sm,
    paddingTop: 0,
    backgroundColor: '#161D22',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C232B',
  },
});
