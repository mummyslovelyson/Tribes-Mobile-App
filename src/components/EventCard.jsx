import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { resolveImageUrl } from '../api/client';

import { useAuth } from '../context/AuthContext';
import { toggleFavoriteApi } from '../api/users';

export default function EventCard({ event, onFavoriteChange }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = React.useState(Boolean(event?.is_favorite || event?.isFavorite));
  const [imgError, setImgError] = React.useState(false);

  if (!event) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePress = () => {
    router.push(`/event/${event.id}`);
  };

  const handleFavoritePress = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    try {
      await toggleFavoriteApi(event.id);
      if (onFavoriteChange) onFavoriteChange(event.id, nextState);
    } catch (_err) {
      // Revert if failed
      setIsFavorite(!nextState);
    }
  };

  const minPrice = Number(event.min_price || event.price || 0);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.82}
      onPress={handlePress}
    >
      {/* Event Image Banner */}
      <View style={styles.imageContainer}>
        {event.banner_image && !imgError ? (
          <Image
            source={{ uri: resolveImageUrl(event.banner_image) }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="calendar-outline" size={32} color={COLORS.textMuted} />
          </View>
        )}

        {/* Favorite Heart Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? COLORS.primary : COLORS.text}
          />
        </TouchableOpacity>

        {/* Category Pill */}
        {event.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
        )}

        {/* Price Pill */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>
            {minPrice === 0 ? 'Free' : `GHS ${minPrice.toFixed(2)}`}
          </Text>
        </View>
      </View>

      {/* Event Details */}
      <View style={styles.content}>
        {/* Date Row */}
        {event.start_date && (
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={13} color={COLORS.primary} />
            <Text style={styles.dateText}>
              {formatDate(event.start_date)}
              {event.start_time ? ` • ${event.start_time.slice(0, 5)}` : ''}
            </Text>
          </View>
        )}

        {/* Event Title */}
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {event.venue || event.address || event.city || 'Accra, Ghana'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  imageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(22, 29, 34, 0.88)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  categoryBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(22, 29, 34, 0.88)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priceBadge: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  priceText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    padding: SPACING.lg,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: SPACING.xs + 2,
  },
  dateText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: SPACING.xs + 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    color: COLORS.textMuted,
    fontSize: 12,
    flex: 1,
  },
});
