import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Header from '../src/components/Header';
import EventCard from '../src/components/EventCard';
import Button from '../src/components/Button';
import { getFavoritesApi } from '../src/api/users';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

export default function SavedEventsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setEvents([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await getFavoritesApi();
      const list = Array.isArray(data) ? data : data?.favorites || data?.events || [];
      // Normalize event data so is_favorite is true
      const normalized = list.map((item) => ({
        ...(item.event || item),
        is_favorite: true,
      }));
      setEvents(normalized);
    } catch (err) {
      console.warn('[SavedEventsScreen] Error fetching favorites:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleFavoriteChange = (eventId, isFav) => {
    if (!isFav) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header title="Saved Events" subtitle="Your bookmarked shows" showNotification={false} />
        <View style={styles.authPromptContainer}>
          <View style={styles.authIconCircle}>
            <Ionicons name="heart-outline" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={styles.authTitle}>Sign in to view saved events</Text>
          <Text style={styles.authSubtitle}>
            Save concerts, parties, and nightlife events to your wishlist so you never miss a drop.
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
        title="Saved Events"
        subtitle={`${events.length} saved ${events.length === 1 ? 'event' : 'events'}`}
        showNotification={false}
      />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your wishlist...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => `saved-${item.id}`}
          renderItem={({ item }) => (
            <EventCard event={item} onFavoriteChange={handleFavoriteChange} />
          )}
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
                <Ionicons name="heart-dislike-outline" size={40} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No saved events yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the heart on any event card to save it here for quick access later.
              </Text>
              <Button
                title="Discover Events"
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
    gap: SPACING.lg,
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
