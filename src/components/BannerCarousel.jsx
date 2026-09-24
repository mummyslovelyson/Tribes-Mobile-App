import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { resolveImageUrl } from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32; // 16px padding on sides
const ITEM_HEIGHT = 175;

export default function BannerCarousel({ banners = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);
  const router = useRouter();

  const activeBanners = Array.isArray(banners) ? banners.filter((b) => b && b.is_active !== false) : [];

  // Auto-advance banner every 5 seconds if more than 1 banner
  useEffect(() => {
    if (activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % activeBanners.length;
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [activeBanners.length]);

  if (!activeBanners || activeBanners.length === 0) {
    return null;
  }

  const handleBannerPress = (banner) => {
    if (!banner || !banner.link_type || banner.link_type === 'none') return;

    const target = (banner.link_target || '').trim();
    if (banner.link_type === 'event' && target) {
      router.push(`/event/${target}`);
    } else if (banner.link_type === 'external' && target) {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        Linking.openURL(target).catch(() => {});
      }
    } else if (banner.link_type === 'category' && target) {
      router.push({
        pathname: '/(tabs)/explore',
        params: { category: target },
      });
    }
  };

  const onScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / (CAROUSEL_WIDTH + 12));
    if (index >= 0 && index < activeBanners.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const renderItem = ({ item }) => {
    const imageUrl = resolveImageUrl(item.image_url);

    return (
      <TouchableOpacity
        activeOpacity={item.link_type && item.link_type !== 'none' ? 0.88 : 1}
        onPress={() => handleBannerPress(item)}
        style={styles.bannerCard}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallbackBackground} />
        )}

        {/* Gradient dark overlay for readability */}
        <View style={styles.gradientOverlay}>
          <View style={styles.textContainer}>
            {item.title ? (
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {item.title}
              </Text>
            ) : null}
            {item.subtitle ? (
              <Text style={styles.bannerSubtitle} numberOfLines={2}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={activeBanners}
        renderItem={renderItem}
        keyExtractor={(item, index) => (item.id ? `banner-${item.id}` : `banner-idx-${index}`)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_WIDTH + 12}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({
          length: CAROUSEL_WIDTH + 12,
          offset: (CAROUSEL_WIDTH + 12) * index,
          index,
        })}
      />

      {/* Pagination Dots */}
      {activeBanners.length > 1 && (
        <View style={styles.dotsContainer}>
          {activeBanners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  bannerCard: {
    width: CAROUSEL_WIDTH,
    height: ITEM_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.card,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(15, 20, 25, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  textContainer: {
    backgroundColor: 'rgba(22, 29, 34, 0.75)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(46, 54, 62, 0.6)',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    width: 18,
    backgroundColor: COLORS.accent,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: COLORS.border,
  },
});
