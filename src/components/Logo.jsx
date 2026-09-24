import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

export default function Logo({
  size = 'md',
  showText = true,
  subtitle = 'LIVING THE MOMENT',
  style,
}) {
  const sizeMap = {
    sm: {
      img: 32,
      radius: RADIUS.sm,
      title: 13,
      subtitle: 8,
      letterSpacing: 1.5,
      gap: 8,
    },
    md: {
      img: 40,
      radius: RADIUS.md,
      title: 15,
      subtitle: 9,
      letterSpacing: 2,
      gap: 10,
    },
    lg: {
      img: 52,
      radius: RADIUS.lg,
      title: 18,
      subtitle: 10,
      letterSpacing: 2.2,
      gap: 12,
    },
    xl: {
      img: 72,
      radius: RADIUS.xl,
      title: 22,
      subtitle: 11,
      letterSpacing: 2.5,
      gap: 14,
    },
  };

  const config = sizeMap[size] || sizeMap.md;

  return (
    <View style={[styles.container, { gap: config.gap }, style]}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={{
          width: config.img,
          height: config.img,
          borderRadius: config.radius,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
        resizeMode="cover"
      />
      {showText && (
        <View style={styles.textColumn}>
          <View style={styles.brandRow}>
            <Text style={[styles.brandTitle, { fontSize: config.title }]}>
              TRIBES
            </Text>
            <Text style={[styles.brandAmp, { fontSize: config.title }]}>
              &amp;
            </Text>
            <Text style={[styles.brandTitle, { fontSize: config.title }]}>
              CLIQS
            </Text>
          </View>
          {subtitle ? (
            <Text
              style={[
                styles.brandSubtitle,
                {
                  fontSize: config.subtitle,
                  letterSpacing: config.letterSpacing,
                },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    color: COLORS.text,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandAmp: {
    color: COLORS.primary,
    fontWeight: '900',
    marginHorizontal: 1,
  },
  brandSubtitle: {
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
});
