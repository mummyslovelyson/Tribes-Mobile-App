import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import EventCard from '../../src/components/EventCard';
import AnnouncementBar from '../../src/components/AnnouncementBar';
import BannerCarousel from '../../src/components/BannerCarousel';
import { getEventsApi, getCategoriesApi } from '../../src/api/events';
import { getMobileConfig } from '../../src/api/mobile';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export const CATEGORIES = [
  'All',
  'Music',
  'Nightlife',
  'Business',
  'Technology',
  'Arts',
  'Food & Drinks',
];
export const DEFAULT_CATEGORIES = CATEGORIES;

export default function ExploreScreen() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mobileConfig, setMobileConfig] = useState(null);

  const fetchMobileConfig = useCallback(async () => {
    try {
      const cfg = await getMobileConfig();
      setMobileConfig(cfg);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchMobileConfig();
  }, [fetchMobileConfig]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getCategoriesApi();
        const list = Array.isArray(res) ? res : res?.categories || [];
        if (list.length > 0) {
          const names = list.map((c) => (typeof c === 'string' ? c : c.name || c.title)).filter(Boolean);
          setCategories(['All', ...new Set(names)]);
        }
      } catch (_err) {
        // Keep defaults on network error
      }
    };
    loadCategories();
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const params = {};
      if (selectedCategory && selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const data = await getEventsApi(params);
      setEvents(data?.events || data || []);
    } catch (err) {
      console.warn('[ExploreScreen] Fetch events error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
    fetchMobileConfig();
  };

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.title?.toLowerCase().includes(q) ||
      ev.venue?.toLowerCase().includes(q) ||
      ev.city?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <Header
        title="Discover Events"
        subtitle="Live concerts, festivals & nightlife"
      />

      {/* Admin Broadcast Announcement Bar */}
      <AnnouncementBar announcement={mobileConfig?.announcement} />

      {/* Search Input Bar & Wishlist Quick Access */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artists, venues, events..."
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={fetchEvents}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.savedIconBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/saved')}
        >
          <Ionicons name="heart-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {(categories || CATEGORIES).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.75}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Event Feed */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Finding upcoming events...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <EventCard event={item} />}
          ListHeaderComponent={
            !searchQuery && selectedCategory === 'All' && mobileConfig?.banners?.length > 0 ? (
              <BannerCarousel banners={mobileConfig.banners} />
            ) : null
          }
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
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try searching with a different keyword or category.'
                  : 'Check back later for new event announcements.'}
              </Text>
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
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: SPACING.sm,
  },
  savedIconBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  categoriesWrapper: {
    paddingVertical: SPACING.sm + 2,
  },
  categoriesContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  categoryPill: {
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.xs + 3,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  categoryPillText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: COLORS.background,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxl,
  },
  centerContainer: {
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
});
