import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

import { useRouter } from 'expo-router';
import Logo from './Logo';

export default function Header({ title = 'Tribes & Cliqs', subtitle, showNotification = true, onNotificationPress }) {
  const router = useRouter();
  const isBrandHome = title === 'Tribes & Cliqs' && !subtitle;

  const handlePress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push('/notifications');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {isBrandHome ? (
          <Logo size="sm" showText={true} subtitle="LIVING THE MOMENT" />
        ) : (
          <>
            <Logo size="sm" showText={false} />
            <View>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </>
        )}
      </View>

      {showNotification && (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetter: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
});
