import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Header from '../src/components/Header';
import Button from '../src/components/Button';
import { verifyTicketApi, checkInTicketApi } from '../src/api/tickets';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

export default function CheckInScreen() {
  // Scanner / Mode states
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'manual'
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [autoCheckIn, setAutoCheckIn] = useState(false);

  // Form / Data states
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Scanning laser animation
  const [scanAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let animLoop;
    if (activeTab === 'scanner' && !scanned) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      scanAnim.setValue(0);
    }
    return () => animLoop?.stop();
  }, [activeTab, scanned, scanAnim]);

  // Clean raw QR code into valid ticket identifier
  const extractCode = (raw) => {
    if (!raw) return '';
    let cleaned = String(raw).trim();

    // If payload is JSON format
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleaned);
        return (
          parsed.ticket_number ||
          parsed.ticketNumber ||
          parsed.ticket_code ||
          parsed.qr_code ||
          parsed.qrCode ||
          parsed.ticketId ||
          parsed.id ||
          cleaned
        );
      } catch {}
    }

    // If payload is a URL link
    if (cleaned.includes('/')) {
      const parts = cleaned.split('/');
      const lastPart = parts.filter(Boolean).pop();
      if (lastPart) return lastPart;
    }

    return cleaned;
  };

  // Process ticket verification from code or camera scan
  const handleVerifyCode = async (rawCode, isFromScanner = false) => {
    const code = extractCode(rawCode);
    if (!code) {
      setErrorMsg('Please enter or scan a valid ticket code');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setTicketData(null);

    try {
      if (Platform.OS !== 'web') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      }

      const res = await verifyTicketApi(code);
      const data = res?.ticket || res?.data || res;
      setTicketData(data);

      const isUsed = data?.status === 'used' || data?.is_used || data?.checkedIn;
      const isCancelled = data?.status === 'cancelled';

      if (isUsed) {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
        }
        setErrorMsg('⚠️ Ticket was already checked in at the entrance.');
      } else if (isCancelled) {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {}
        }
        setErrorMsg('❌ Ticket has been cancelled — Admission denied.');
      } else {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }

        // Auto Check-In mode if enabled from scanner
        if (isFromScanner && autoCheckIn) {
          await executeCheckIn(data, code);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Ticket not found or unrecognized QR pass.';
      setErrorMsg(msg);
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || loading || checkingIn) return;
    setScanned(true);
    setTicketCode(data);
    handleVerifyCode(data, true);
  };

  const executeCheckIn = async (currentData, codeOverride) => {
    const data = currentData || ticketData;
    if (!data) return;
    const targetCode =
      codeOverride ||
      data.ticket_code ||
      data.ticket_number ||
      data.qr_code ||
      data.qrCode ||
      ticketCode.trim();

    setCheckingIn(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await checkInTicketApi(targetCode);
      const guestName = data.attendee_name || data.user_name || data.user?.name || 'Guest';
      setSuccessMsg(`✅ Admitted! Welcome, ${guestName}.`);
      setTicketData((prev) =>
        prev
          ? {
              ...prev,
              status: 'used',
              is_used: true,
              checkedIn: true,
              checked_in_at: new Date().toISOString(),
            }
          : null
      );
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed. Ticket may already be checked in.';
      setErrorMsg(msg);
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleManualVerify = () => {
    handleVerifyCode(ticketCode, false);
  };

  const handleResetScanner = () => {
    setScanned(false);
    setTicketCode('');
    setTicketData(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const isAlreadyCheckedIn =
    ticketData?.status === 'used' || ticketData?.is_used || ticketData?.checkedIn;
  const isCancelled = ticketData?.status === 'cancelled';

  const scanTranslateY = useMemo(
    () =>
      scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 210],
      }),
    [scanAnim]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Gate Check-In"
        subtitle="Organizer Live QR & Pass Verification"
        showNotification={false}
      />

      {/* Mode Selector Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'scanner' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('scanner');
            setErrorMsg('');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="scan"
            size={18}
            color={activeTab === 'scanner' ? COLORS.primary : COLORS.textMuted}
          />
          <Text
            style={[styles.tabBtnText, activeTab === 'scanner' && styles.tabBtnTextActive]}
          >
            Camera Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('manual');
            setErrorMsg('');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="keypad-outline"
            size={18}
            color={activeTab === 'manual' ? COLORS.primary : COLORS.textMuted}
          />
          <Text
            style={[styles.tabBtnText, activeTab === 'manual' && styles.tabBtnTextActive]}
          >
            Manual Code
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* CAMERA SCANNER TAB */}
          {activeTab === 'scanner' && (
            <View style={styles.scannerWrapper}>
              {/* Permission Check */}
              {!permission ? (
                <View style={styles.cameraPlaceholder}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.cameraStateText}>Initializing camera hardware...</Text>
                </View>
              ) : !permission.granted ? (
                <View style={styles.permissionCard}>
                  <View style={styles.permissionIconCircle}>
                    <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
                  </View>
                  <Text style={styles.permissionTitle}>Camera Access Required</Text>
                  <Text style={styles.permissionText}>
                    To scan attendee QR tickets directly at the entrance, please grant camera permissions to the app.
                  </Text>
                  <Button
                    title="Grant Camera Permission"
                    onPress={requestPermission}
                    style={styles.permissionBtn}
                  />
                  <TouchableOpacity
                    onPress={() => setActiveTab('manual')}
                    style={styles.fallbackBtn}
                  >
                    <Text style={styles.fallbackBtnText}>Or enter ticket code manually</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* LIVE CAMERA VIEW */
                <View style={styles.cameraContainer}>
                  <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing={facing}
                    enableTorch={torch}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  />

                  {/* Darkened overlay mask with clear scanning viewport */}
                  <View style={styles.cameraOverlay}>
                    {/* Viewport Frame */}
                    <View style={styles.viewportBox}>
                      {/* Corner Target Markers */}
                      <View style={[styles.cornerMarker, styles.cornerTL]} />
                      <View style={[styles.cornerMarker, styles.cornerTR]} />
                      <View style={[styles.cornerMarker, styles.cornerBL]} />
                      <View style={[styles.cornerMarker, styles.cornerBR]} />

                      {/* Animated Laser Line */}
                      {!scanned && (
                        <Animated.View
                          style={[
                            styles.laserLine,
                            { transform: [{ translateY: scanTranslateY }] },
                          ]}
                        />
                      )}

                      {/* Scanning status banner inside viewport */}
                      {loading && (
                        <View style={styles.viewportOverlayState}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.viewportOverlayText}>Verifying pass...</Text>
                        </View>
                      )}
                    </View>

                    {/* Camera Control Bar: Torch, Flip, Info */}
                    <View style={styles.cameraControlRow}>
                      <TouchableOpacity
                        style={[styles.controlPill, torch && styles.controlPillActive]}
                        onPress={() => setTorch((prev) => !prev)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={torch ? 'flashlight' : 'flashlight-outline'}
                          size={18}
                          color={torch ? '#000000' : '#FFFFFF'}
                        />
                        <Text
                          style={[
                            styles.controlPillText,
                            torch && styles.controlPillTextActive,
                          ]}
                        >
                          {torch ? 'Torch On' : 'Torch'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.controlPill}
                        onPress={() =>
                          setFacing((prev) => (prev === 'back' ? 'front' : 'back'))
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons name="camera-reverse-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.controlPillText}>Flip</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Top helper text */}
                  <View style={styles.scannerTopNotice}>
                    <Text style={styles.scannerTopNoticeText}>
                      Align attendee QR code within the frame
                    </Text>
                  </View>
                </View>
              )}

              {/* Fast Check-In Automation Bar */}
              <View style={styles.autoCheckInRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoCheckInTitle}>Auto Check-In</Text>
                  <Text style={styles.autoCheckInSub}>
                    Admit valid tickets automatically upon scan
                  </Text>
                </View>
                <Switch
                  value={autoCheckIn}
                  onValueChange={setAutoCheckIn}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={autoCheckIn ? '#000000' : '#FFFFFF'}
                />
              </View>

              {/* Resume / Next Scan Button if Scanned */}
              {scanned && (
                <TouchableOpacity
                  style={styles.scanNextBtn}
                  onPress={handleResetScanner}
                  activeOpacity={0.8}
                >
                  <Ionicons name="scan-outline" size={18} color="#000000" />
                  <Text style={styles.scanNextBtnText}>Scan Next Ticket</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* MANUAL ENTRY TAB */}
          {activeTab === 'manual' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>TICKET NUMBER / REFERENCE CODE</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. TC-00123-A9F"
                  placeholderTextColor={COLORS.placeholder}
                  value={ticketCode}
                  onChangeText={(val) => {
                    setTicketCode(val);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleManualVerify}
                />

                {ticketCode ? (
                  <TouchableOpacity onPress={handleResetScanner} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <Button
                title="Verify Ticket Pass"
                onPress={handleManualVerify}
                loading={loading}
                style={styles.verifyBtn}
              />
            </View>
          )}

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={22} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Success Banner */}
          {successMsg ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#10B981" />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Ticket Result Details Card */}
          {ticketData && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={{ flex: 1, marginRight: SPACING.sm }}>
                  <Text style={styles.resultTicketCode}>
                    PASS #{ticketData.ticket_number || ticketData.ticket_code || ticketCode}
                  </Text>
                  <Text style={styles.resultEventTitle} numberOfLines={2}>
                    {ticketData.event_title ||
                      ticketData.event?.title ||
                      'Event Admission Pass'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    isCancelled
                      ? styles.statusCancelled
                      : isAlreadyCheckedIn
                      ? styles.statusUsed
                      : styles.statusValid,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isCancelled
                        ? styles.statusTextCancelled
                        : isAlreadyCheckedIn
                        ? styles.statusTextUsed
                        : styles.statusTextValid,
                    ]}
                  >
                    {isCancelled
                      ? 'CANCELLED'
                      : isAlreadyCheckedIn
                      ? 'ALREADY USED'
                      : 'ENTRY APPROVED'}
                  </Text>
                </View>
              </View>

              {/* Attendee Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>ATTENDEE NAME</Text>
                  <Text style={styles.detailValue}>
                    {ticketData.attendee_name ||
                      ticketData.user_name ||
                      ticketData.user?.name ||
                      'Valued Guest'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>PASS TIER &amp; SEAT</Text>
                  <Text style={styles.detailValue}>
                    {ticketData.ticket_type_name ||
                      ticketData.tier_name ||
                      ticketData.ticket_type ||
                      'General Admission'}{' '}
                    &bull;{' '}
                    {ticketData.seat_number || ticketData.seatNumber || 'Standard Entry'}
                  </Text>
                </View>

                {(ticketData.attendee_email || ticketData.user_email) && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>EMAIL ADDRESS</Text>
                    <Text style={styles.detailValue}>
                      {ticketData.attendee_email || ticketData.user_email}
                    </Text>
                  </View>
                )}

                {ticketData.checked_in_at && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>GATE CHECK-IN TIME</Text>
                    <Text style={styles.detailValue}>
                      {new Date(ticketData.checked_in_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              {!isAlreadyCheckedIn && !isCancelled ? (
                <Button
                  title="Check In Attendee Now"
                  onPress={() => executeCheckIn(ticketData)}
                  loading={checkingIn}
                  style={styles.checkInBtn}
                />
              ) : isAlreadyCheckedIn ? (
                <View style={styles.checkedInNotice}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
                  <Text style={styles.checkedInNoticeText}>
                    Attendee pass validated and admitted at gate entrance.
                  </Text>
                </View>
              ) : (
                <View style={[styles.checkedInNotice, { borderColor: '#EF4444' }]}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                  <Text style={[styles.checkedInNoticeText, { color: '#EF4444' }]}>
                    Admission denied. Ticket has been invalidated.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: COLORS.text,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  scannerWrapper: {
    gap: SPACING.md,
  },
  cameraContainer: {
    height: 330,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cameraPlaceholder: {
    height: 300,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  cameraStateText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  permissionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  permissionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  permissionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  permissionText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  permissionBtn: {
    width: '100%',
  },
  fallbackBtn: {
    marginTop: SPACING.xs,
    padding: SPACING.xs,
  },
  fallbackBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportBox: {
    width: 230,
    height: 230,
    position: 'relative',
    borderRadius: RADIUS.md,
  },
  cornerMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    width: '100%',
    height: 2.5,
    backgroundColor: '#FF2A6D',
    shadowColor: '#FF2A6D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  viewportOverlayState: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewportOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraControlRow: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  controlPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  controlPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  controlPillTextActive: {
    color: '#000000',
  },
  scannerTopNotice: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  scannerTopNoticeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  autoCheckInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  autoCheckInTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  autoCheckInSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  scanNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
  },
  scanNextBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  inputContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  clearBtn: {
    padding: 4,
  },
  verifyBtn: {
    marginTop: SPACING.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.md,
  },
  resultTicketCode: {
    color: COLORS.primary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultEventTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 22,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
  },
  statusValid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusUsed: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  statusTextValid: {
    color: '#10B981',
  },
  statusTextUsed: {
    color: '#F59E0B',
  },
  statusTextCancelled: {
    color: '#EF4444',
  },
  detailsGrid: {
    gap: SPACING.md,
  },
  detailItem: {
    gap: 3,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  checkInBtn: {
    marginTop: SPACING.xs,
  },
  checkedInNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: SPACING.md,
  },
  checkedInNoticeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
