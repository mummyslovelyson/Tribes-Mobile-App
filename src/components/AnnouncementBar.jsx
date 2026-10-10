import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';

export default function AnnouncementBar({ announcement }) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (!announcement || !announcement.enabled || !announcement.text || dismissed) {
    return null;
  }

  const getStyleForType = () => {
    switch (announcement.type) {
      case 'danger':
        return {
          bg: 'rgba(239, 239, 241, 0.15)',
          border: 'rgba(203, 213, 225, 0.40)',
          text: COLORS.text,
          icon: 'alert-circle-outline',
          iconColor: COLORS.primary,
        };
      case 'warning':
        return {
          bg: 'rgba(239, 239, 241, 0.12)',
          border: 'rgba(203, 213, 225, 0.30)',
          text: COLORS.text,
          icon: 'warning-outline',
          iconColor: COLORS.primary,
        };
      case 'success':
        return {
          bg: 'rgba(239, 239, 241, 0.12)',
          border: 'rgba(203, 213, 225, 0.30)',
          text: COLORS.text,
          icon: 'checkmark-circle-outline',
          iconColor: COLORS.primary,
        };
      case 'info':
      default:
        return {
          bg: COLORS.card,
          border: COLORS.border,
          text: COLORS.text,
          icon: 'megaphone-outline',
          iconColor: COLORS.primary,
        };
    }
  };

  const currentStyle = getStyleForType();

  const handlePress = () => {
    if (!announcement.link) return;
    const link = announcement.link.trim();
    if (link.startsWith('http://') || link.startsWith('https://')) {
      Linking.openURL(link).catch(() => {});
    } else if (link.startsWith('/')) {
      try {
        router.push(link);
      } catch (_err) {
        console.warn('Could not navigate to announcement route:', link);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentStyle.bg, borderColor: currentStyle.border }]}>
      <TouchableOpacity
        activeOpacity={announcement.link ? 0.8 : 1}
        onPress={handlePress}
        style={styles.content}
      >
        <Ionicons name={currentStyle.icon} size={18} color={currentStyle.iconColor} style={styles.icon} />
        <Text style={[styles.text, { color: currentStyle.text }]} numberOfLines={2}>
          {announcement.text}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={() => setDismissed(true)}
        style={styles.closeBtn}
      >
        <Ionicons name="close" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 2,
  },
});
