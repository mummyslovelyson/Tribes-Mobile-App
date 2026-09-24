import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export default function MaintenanceScreen({ maintenance, onRetry }) {
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setTimeout(() => {
        setChecking(false);
      }, 600);
    }
  };

  const handleEmail = () => {
    if (!maintenance?.supportEmail) return;
    Linking.openURL(`mailto:${maintenance.supportEmail}`).catch(() => {});
  };

  const handlePhone = () => {
    if (!maintenance?.supportPhone) return;
    Linking.openURL(`tel:${maintenance.supportPhone.replace(/\s+/g, '')}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Brand Header */}
        <View style={styles.brandRow}>
          <Text style={styles.brandName}>CLIQS</Text>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Under Maintenance</Text>
          </View>
        </View>

        {/* Center Card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="construct-outline" size={36} color="#F59E0B" />
          </View>

          <Text style={styles.title}>Scheduled System Update</Text>
          <Text style={styles.message}>
            {maintenance?.message ||
              'We are currently performing scheduled maintenance to enhance your experience. All services will be back shortly.'}
          </Text>

          {/* Retry Button */}
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={handleRetry}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Check Again</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Need urgent assistance?</Text>
          <View style={styles.supportActions}>
            {maintenance?.supportEmail && (
              <TouchableOpacity
                style={styles.supportItem}
                onPress={handleEmail}
                activeOpacity={0.7}
              >
                <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.supportText} numberOfLines={1}>
                  {maintenance.supportEmail}
                </Text>
              </TouchableOpacity>
            )}

            {maintenance?.supportPhone && (
              <TouchableOpacity
                style={styles.supportItem}
                onPress={handlePhone}
                activeOpacity={0.7}
              >
                <Ionicons name="call-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.supportText} numberOfLines={1}>
                  {maintenance.supportPhone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FDE68A',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
    width: '100%',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  supportSection: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
  },
  supportTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  supportActions: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
    width: '100%',
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  supportText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
