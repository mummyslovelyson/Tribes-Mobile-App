import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { resolveImageUrl } from '../api/client';

export default function ChatEventCard({ event }) {
  const router = useRouter();
  const [showTiers, setShowTiers] = useState(false);

  if (!event) return null;

  const eventDate = event.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      })
    : '';

  const minPrice = Number(event.minPrice ?? event.min_price ?? 0);
  const priceDisplay = minPrice === 0 ? 'Free' : `GHS ${minPrice.toFixed(2)}`;

  return (
    <View style={styles.card}>
      {/* Flyer Header */}
      <View style={styles.imageContainer}>
        {event.bannerImage || event.banner_image ? (
          <Image
            source={{ uri: resolveImageUrl(event.bannerImage || event.banner_image) }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="calendar-outline" size={28} color={COLORS.textMuted} />
          </View>
        )}

        {/* Category Badge */}
        {event.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
        ) : null}

        {/* Price Badge */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{priceDisplay}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>

        <View style={styles.metaList}>
          {eventDate ? (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>
                {eventDate} {event.time ? `• ${event.time}` : ''}
              </Text>
            </View>
          ) : null}

          {(event.venue || event.city) ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {[event.venue, event.city].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Expandable Ticket Tiers Preview */}
        {event.ticketTiers && event.ticketTiers.length > 0 ? (
          <View style={styles.tiersContainer}>
            <TouchableOpacity
              style={styles.tierToggle}
              activeOpacity={0.75}
              onPress={() => setShowTiers((prev) => !prev)}
            >
              <Text style={styles.tierToggleText}>
                {showTiers ? 'Hide Ticket Tiers' : `Preview Ticket Tiers (${event.ticketTiers.length})`}
              </Text>
              <Ionicons
                name={showTiers ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>

            {showTiers ? (
              <View style={styles.tiersList}>
                {event.ticketTiers.map((t, idx) => (
                  <View key={idx} style={styles.tierRow}>
                    <Text style={styles.tierName} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={styles.tierPrice}>
                      {Number(t.price) === 0 ? 'Free' : `GHS ${Number(t.price).toFixed(2)}`}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.82}
          onPress={() => router.push(`/event/${event.id}`)}
        >
          <Text style={styles.actionBtnText}>View &amp; Buy Tickets</Text>
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
  imageContainer: {
    height: 120,
    backgroundColor: '#242B32',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C232B',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(28, 35, 43, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  priceText: {
    color: '#1C232B',
    fontSize: 11,
    fontWeight: '900',
  },
  body: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EFEFF1',
    letterSpacing: -0.2,
  },
  metaList: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#949599',
    flex: 1,
  },
  tiersContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 6,
  },
  tierToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tierToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EFEFF1',
  },
  tiersList: {
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    gap: 4,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#EFEFF1',
    maxWidth: '65%',
  },
  tierPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginTop: 2,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C232B',
  },
});
