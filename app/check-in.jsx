import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Header from '../src/components/Header';
import Button from '../src/components/Button';
import { checkInTicketApi, getCheckInStatsApi } from '../src/api/tickets';
import { getOrganizerEventsApi } from '../src/api/organizer';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

export default function CheckInScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { user, isOrganizer, isAdmin, isAuthenticated } = useAuth();

  // Mode and hardware states
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'manual'
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [autoResume, setAutoResume] = useState(true);
  const hasRequestedPermissionRef = useRef(false);

  // Auto-request camera permissions once on mount if not yet granted
  useEffect(() => {
    let mounted = true;
    if (hasRequestedPermissionRef.current) return;
    if (!permission) return;

    if (!permission.granted && permission.canAskAgain) {
      hasRequestedPermissionRef.current = true;
      requestPermission()
        .then((res) => {
          if (mounted && res?.granted) {
            setCameraError(null);
          }
        })
        .catch((err) => {
          console.warn('[CheckIn] Initial camera permission request notice:', err?.message);
        });
    }
    return () => { mounted = false; };
  }, [permission, requestPermission]);

  // Selected event filter
  const [selectedEventId, setSelectedEventId] = useState(searchParams?.eventId ? Number(searchParams.eventId) : 'all');
  const [selectedEventTitle, setSelectedEventTitle] = useState(searchParams?.eventTitle || 'All Events');
  const [organizerEvents, setOrganizerEvents] = useState([]);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);

  // Form & Verification states
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { type: 'approved' | 'duplicate' | 'cancelled' | 'invalid' | 'unauthorized', ticket, message, checkedInAt }

  // Session Statistics (Live Synced from DB)
  const [sessionStats, setSessionStats] = useState({
    admitted: 0,
    duplicates: 0,
    invalid: 0,
    totalTickets: 0,
  });

  // Recent scan history (session & database log)
  const [recentScans, setRecentScans] = useState([]);

  // Fetch true database check-in stats & recent logs (visible to both Admin and Organizer)
  const loadCheckInStats = async (eventId = selectedEventId) => {
    if (!isAuthenticated || (!isOrganizer && !isAdmin)) return;
    try {
      const params = {};
      if (eventId && eventId !== 'all') {
        params.eventId = eventId;
      }
      const res = await getCheckInStatsApi(params);
      if (res?.success && res?.stats) {
        setSessionStats((prev) => ({
          ...prev,
          admitted: res.stats.admitted ?? prev.admitted,
          totalTickets: res.stats.totalTickets ?? prev.totalTickets,
          remaining: res.stats.remaining ?? prev.remaining,
        }));
        if (Array.isArray(res.recentScans) && res.recentScans.length > 0) {
          setRecentScans((prev) => {
            const map = new Map();
            res.recentScans.forEach((s) => map.set(s.code || s.id, s));
            prev.forEach((s) => {
              if (!map.has(s.code || s.id)) {
                map.set(s.code || s.id, s);
              }
            });
            return Array.from(map.values()).slice(0, 15);
          });
        }
      }
    } catch (err) {
      console.warn('[CheckIn] Load live stats error:', err?.message);
    }
  };

  // Auto-resume timer
  const autoResumeTimerRef = useRef(null);

  // Scanning laser animation
  const [scanAnim] = useState(() => new Animated.Value(0));

  // Laser animation loop
  useEffect(() => {
    let animLoop;
    if (activeTab === 'scanner' && !scanned) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
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

  // Load organizer / admin events for event selector
  useEffect(() => {
    if (isAuthenticated && (isOrganizer || isAdmin)) {
      getOrganizerEventsApi()
        .then((res) => {
          const list = res?.events || res?.data || (Array.isArray(res) ? res : []);
          setOrganizerEvents(list);
          if (searchParams?.eventId) {
            const found = list.find((e) => String(e.id) === String(searchParams.eventId));
            if (found) {
              setSelectedEventId(Number(found.id));
              setSelectedEventTitle(found.title);
            }
          }
        })
        .catch((err) => console.warn('[CheckIn] Load events warning:', err?.message));
    }
  }, [isAuthenticated, isOrganizer, isAdmin, searchParams?.eventId]);

  // Load live DB check-in stats on mount and when selectedEventId changes
  useEffect(() => {
    loadCheckInStats(selectedEventId);
  }, [isAuthenticated, isOrganizer, isAdmin, selectedEventId]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    };
  }, []);

  // Clean raw QR code into valid ticket code / ID
  const extractCode = (raw) => {
    if (!raw) return '';
    let cleaned = String(raw).trim();

    // 1. If payload is JSON format
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleaned);
        const resolved = (
          parsed.ticket_number ||
          parsed.ticketNumber ||
          parsed.ticket_code ||
          parsed.qr_code ||
          parsed.qrCode ||
          parsed.ticketId ||
          parsed.id ||
          cleaned
        );
        if (resolved) return String(resolved).trim();
      } catch { }
    }

    // 2. Direct regex match for standard ticket patterns like TC-XXXXXX or TRB-XXXXXX
    const match = cleaned.match(/\b(TC-[A-Z0-9]+|TRB-[A-Z0-9-]+)\b/i);
    if (match) {
      return match[1].toUpperCase();
    }

    // 3. If payload is a URL link
    if (cleaned.includes('/') || cleaned.includes('?')) {
      try {
        const urlStr = cleaned.startsWith('http') ? cleaned : `https://dummy.com/${cleaned.replace(/^\/+/, '')}`;
        const u = new URL(urlStr);
        const queryParam = u.searchParams.get('code') || u.searchParams.get('ticket') || u.searchParams.get('ticketNumber') || u.searchParams.get('reference') || u.searchParams.get('trxref');
        if (queryParam) return queryParam.trim();
        const parts = u.pathname.split('/').filter(Boolean);
        const lastPart = parts.pop();
        if (lastPart) return lastPart.split('?')[0].trim();
      } catch {
        const parts = cleaned.split('/').filter(Boolean);
        const lastPart = parts.pop() || cleaned;
        return lastPart.split('?')[0].trim();
      }
    }

    return cleaned;
  };

  // Perform ticket check-in and handle approved, duplicate, or invalid states
  const processTicket = async (rawCode) => {
    const code = extractCode(rawCode);
    if (!code) {
      setScanResult({
        type: 'invalid',
        message: 'Please enter or scan a valid ticket code',
      });
      return;
    }

    setLoading(true);
    setScanResult(null);

    // Initial haptic tap on scan detection
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch { }
    }

    try {
      // 1. Directly attempt gate check-in for instant throughput
      const res = await checkInTicketApi(code);
      const ticket = res?.ticket || res?.data || res;

      // Check event match if scoped to a specific event
      if (selectedEventId !== 'all' && ticket?.event_id && Number(ticket.event_id) !== Number(selectedEventId)) {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch { }
        }
        setScanResult({
          type: 'unauthorized',
          message: `Ticket is for a different event: "${ticket.event_title || 'Other Event'}"`,
          ticket,
        });
        setSessionStats((prev) => ({ ...prev, invalid: prev.invalid + 1 }));
        logScan({ code, status: 'unauthorized', attendee: ticket.attendee_name, event: ticket.event_title });
        return;
      }

      // 🟢 SUCCESS: TICKET APPROVED & ADMITTED!
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch { }
      }

      setScanResult({
        type: 'approved',
        ticket,
        message: 'ENTRY APPROVED & ADMITTED',
        checkedInAt: new Date().toISOString(),
      });

      setSessionStats((prev) => ({ ...prev, admitted: prev.admitted + 1 }));
      logScan({
        code,
        status: 'approved',
        attendee: ticket.attendee_name || 'Guest',
        tier: ticket.ticket_type || 'General Admission',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      // Auto resume scan after 3.5 seconds if enabled
      if (autoResume) {
        if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = setTimeout(() => {
          handleResetScanner();
        }, 3500);
      }
    } catch (err) {
      const errData = err.response?.data || {};
      const statusType = errData.status || '';
      const errMsg = errData.message || err.message || '';

      //  DUPLICATE TICKET CHECK
      if (statusType === 'used' || errMsg.toLowerCase().includes('already used') || errMsg.toLowerCase().includes('already checked in')) {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch { }
        }

        setScanResult({
          type: 'duplicate',
          ticket: {
            ticketNumber: errData.ticketNumber || code,
            attendeeName: errData.attendeeName || 'Registered Attendee',
            checkedInAt: errData.checkedInAt || null,
          },
          message: 'DUPLICATE TICKET — ALREADY USED',
          checkedInAt: errData.checkedInAt,
        });

        setSessionStats((prev) => ({ ...prev, duplicates: prev.duplicates + 1 }));
        logScan({
          code,
          status: 'duplicate',
          attendee: errData.attendeeName || 'Unknown',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      } else if (statusType === 'cancelled' || errMsg.toLowerCase().includes('cancelled')) {
        // ❌ CANCELLED TICKET
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch { }
        }

        setScanResult({
          type: 'cancelled',
          ticket: { ticketNumber: errData.ticketNumber || code, attendeeName: errData.attendeeName },
          message: 'CANCELLED TICKET — ENTRY DENIED',
        });

        setSessionStats((prev) => ({ ...prev, invalid: prev.invalid + 1 }));
        logScan({ code, status: 'cancelled', attendee: errData.attendeeName || 'Unknown' });
      } else if (err.response?.status === 401) {
        // 🔒 SESSION EXPIRED
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch { }
        }

        setScanResult({
          type: 'unauthorized',
          message: 'Organizer login session expired. Please sign out and sign in again.',
        });
      } else if (err.response?.status === 403 || statusType === 'unauthorized') {
        // 🚫 UNAUTHORIZED
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch { }
        }

        setScanResult({
          type: 'unauthorized',
          message: 'Unauthorized: This ticket belongs to another organizer.',
        });
      } else {
        // ❌ INVALID / NOT FOUND
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch { }
        }

        setScanResult({
          type: 'invalid',
          message: errMsg || 'Invalid ticket pass or unrecognized QR code.',
        });

        setSessionStats((prev) => ({ ...prev, invalid: prev.invalid + 1 }));
        logScan({ code, status: 'invalid', attendee: 'Unknown' });
      }
    } finally {
      setLoading(false);
      loadCheckInStats(selectedEventId);
    }
  };

  const logScan = (item) => {
    setRecentScans((prev) => [
      {
        id: Date.now(),
        ...item,
      },
      ...prev.slice(0, 9), // Keep latest 10 scans
    ]);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setTicketCode(data);
    processTicket(data);
  };

  const handleManualVerify = () => {
    if (!ticketCode.trim()) return;
    setScanned(true);
    processTicket(ticketCode.trim());
  };

  const handleResetScanner = () => {
    if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    setScanned(false);
    setTicketCode('');
    setScanResult(null);
  };

  const scanTranslateY = useMemo(
    () =>
      scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 210],
      }),
    [scanAnim]
  );

  // Authentication Guard for Organizers
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Gate Check-In" subtitle="Organizer Pass Scanner" showNotification={false} />
        <View style={styles.centerContainer}>
          <View style={styles.authLockIconCircle}>
            <Ionicons name="lock-closed-outline" size={42} color={COLORS.primary} />
          </View>
          <Text style={styles.authLockTitle}>Organizer Sign In Required</Text>
          <Text style={styles.authLockSubtitle}>
            Please sign in with your organizer account credentials to access camera ticket scanning and gate validation.
          </Text>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={20} color={COLORS.buttonText} />
            <Text style={styles.actionBtnText}>Sign In with Organizer Details</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isOrganizer && !isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Gate Check-In" subtitle="Organizer Pass Scanner" showNotification={false} />
        <View style={styles.centerContainer}>
          <View style={styles.authLockIconCircle}>
            <Ionicons name="shield-outline" size={42} color={COLORS.warning} />
          </View>
          <Text style={styles.authLockTitle}>Organizer Access Only</Text>
          <Text style={styles.authLockSubtitle}>
            Your current account ({user?.email || 'Attendee'}) does not have organizer permissions. Sign in with your organizer details to scan tickets.
          </Text>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={COLORS.buttonText} />
            <Text style={styles.actionBtnText}>Switch to Organizer Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Viewfinder border highlight color based on scan status
  const viewportBorderColor = scanResult?.type === 'approved'
    ? 'rgba(16, 185, 129, 0.6)'
    : scanResult?.type === 'duplicate'
      ? 'rgba(245, 158, 11, 0.6)'
      : scanResult?.type === 'cancelled' || scanResult?.type === 'invalid' || scanResult?.type === 'unauthorized'
        ? 'rgba(239, 68, 68, 0.45)'
        : COLORS.borderSubtle;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Screen Header */}
      <Header
        title="Gate Check-In"
        subtitle={isAdmin ? `Admin: ${user?.name || user?.email || 'Administrator'}` : `Organizer: ${user?.name || user?.email || 'Staff'}`}
        showNotification={false}
      />

      {/* Organizer Event Picker & Scoreboard */}
      <View style={styles.topControlContainer}>
        {/* Event Picker Pill */}
        <TouchableOpacity
          style={styles.eventPickerBtn}
          onPress={() => setEventPickerOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={styles.eventPickerBtnText} numberOfLines={1}>
            {selectedEventTitle}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Live Session Counter Bar */}
        <View style={styles.scoreboardRow}>
          <View style={[styles.scoreBadge, styles.scoreBadgeApproved]}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.scoreNumber}>{sessionStats.admitted}</Text>
            <Text style={styles.scoreLabel}>Admitted</Text>
          </View>

          <View style={[styles.scoreBadge, styles.scoreBadgeDuplicate]}>
            <Ionicons name="warning" size={14} color="#F59E0B" />
            <Text style={styles.scoreNumber}>{sessionStats.duplicates}</Text>
            <Text style={styles.scoreLabel}>Duplicates</Text>
          </View>

          <View style={[styles.scoreBadge, styles.scoreBadgeInvalid]}>
            <Ionicons name="close-circle" size={14} color="#EF4444" />
            <Text style={styles.scoreNumber}>{sessionStats.invalid}</Text>
            <Text style={styles.scoreLabel}>Invalid</Text>
          </View>
        </View>
      </View>

      {/* Mode Selector Tabs: Camera Scanner vs Manual Keypad */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'scanner' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('scanner');
            handleResetScanner();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="scan"
            size={18}
            color={activeTab === 'scanner' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'scanner' && styles.tabBtnTextActive]}>
            Camera Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('manual');
            handleResetScanner();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="keypad-outline"
            size={18}
            color={activeTab === 'manual' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabBtnText, activeTab === 'manual' && styles.tabBtnTextActive]}>
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
              {Platform.OS === 'web' ? (
                <View style={styles.webFallbackCard}>
                  <View style={styles.permissionIconCircle}>
                    <Ionicons name="camera-outline" size={36} color={COLORS.primary} />
                  </View>
                  <Text style={styles.permissionTitle}>Mobile App Camera Scanning</Text>
                  <Text style={styles.permissionText}>
                    Hardware camera QR scanning with expo-camera is powered natively on Android or iOS.
                    On web browsers, please use the "Manual Code" tab to verify passes, or use the Organizer Web Portal.
                  </Text>
                  <Button
                    title="Switch to Manual Code Entry"
                    onPress={() => setActiveTab('manual')}
                    style={styles.permissionBtn}
                  />
                </View>
              ) : !permission ? (
                <View style={styles.cameraPlaceholder}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.cameraStateText}>Initializing camera hardware...</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const res = await requestPermission();
                        if (!res?.granted) Linking.openSettings();
                      } catch {
                        Linking.openSettings();
                      }
                    }}
                    style={{ marginTop: 8 }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>Tap to Enable Camera</Text>
                  </TouchableOpacity>
                </View>
              ) : !permission.granted ? (
                <View style={styles.permissionCard}>
                  <View style={styles.permissionIconCircle}>
                    <Ionicons name="camera-outline" size={36} color={COLORS.primary} />
                  </View>
                  <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                  <Text style={styles.permissionText}>
                    Grant camera permission so organizers can scan attendee QR codes live at the gate entrance.
                  </Text>
                  <Button
                    title={permission.canAskAgain !== false ? "Allow Camera Access" : "Open Phone Settings"}
                    onPress={async () => {
                      if (permission.canAskAgain) {
                        try {
                          const res = await requestPermission();
                          if (!res?.granted) Linking.openSettings();
                        } catch {
                          Linking.openSettings();
                        }
                      } else {
                        Linking.openSettings();
                      }
                    }}
                    style={styles.permissionBtn}
                  />
                  <TouchableOpacity
                    onPress={() => setActiveTab('manual')}
                    style={styles.fallbackBtn}
                  >
                    <Text style={styles.fallbackBtnText}>Or enter ticket codes manually</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* LIVE CAMERA VIEWPORT */
                <View style={[styles.cameraContainer, { borderColor: viewportBorderColor }]}>
                  <CameraView
                    style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
                    facing={facing}
                    enableTorch={torch}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                    onCameraReady={() => {
                      setCameraReady(true);
                      setCameraError(null);
                    }}
                    onMountError={(e) => {
                      console.warn('[CameraView] mount error:', e?.message);
                      setCameraError(e?.message || 'Camera preview could not be opened.');
                    }}
                  />

                  {/* Darkened overlay mask with clear scanning viewport */}
                  <View style={styles.cameraOverlay}>
                    {/* Viewport Frame */}
                    <View style={[styles.viewportBox, { borderColor: viewportBorderColor }]}>
                      {/* Corner Target Markers */}
                      <View style={[styles.cornerMarker, styles.cornerTL, { borderColor: viewportBorderColor }]} />
                      <View style={[styles.cornerMarker, styles.cornerTR, { borderColor: viewportBorderColor }]} />
                      <View style={[styles.cornerMarker, styles.cornerBL, { borderColor: viewportBorderColor }]} />
                      <View style={[styles.cornerMarker, styles.cornerBR, { borderColor: viewportBorderColor }]} />

                      {/* Animated Laser Line */}
                      {!scanned && (
                        <Animated.View
                          style={[
                            styles.laserLine,
                            { transform: [{ translateY: scanTranslateY }] },
                          ]}
                        />
                      )}

                      {/* Verifying Spinner or Initializing Banner */}
                      {!cameraReady && !cameraError && !loading && (
                        <View style={styles.viewportOverlayState}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.viewportOverlayText}>Initializing camera...</Text>
                        </View>
                      )}
                      {loading && (
                        <View style={styles.viewportOverlayState}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.viewportOverlayText}>Validating pass...</Text>
                        </View>
                      )}
                    </View>

                    {/* Camera Control Bar: Torch, Flip */}
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
                        <Text style={[styles.controlPillText, torch && styles.controlPillTextActive]}>
                          {torch ? 'Torch On' : 'Torch'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.controlPill}
                        onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="camera-reverse-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.controlPillText}>Flip</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Camera Error Banner */}
                  {cameraError && (
                    <View style={styles.cameraErrorOverlay}>
                      <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
                      <Text style={styles.cameraErrorTitle}>Camera Preview Error</Text>
                      <Text style={styles.cameraErrorText}>{cameraError}</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <TouchableOpacity
                          style={styles.errorActionBtn}
                          onPress={() => {
                            setCameraError(null);
                            setFacing((f) => (f === 'back' ? 'front' : 'back'));
                          }}
                        >
                          <Ionicons name="camera-reverse-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.errorActionBtnText}>Switch Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.errorActionBtn, { backgroundColor: COLORS.primary }]}
                          onPress={() => setActiveTab('manual')}
                        >
                          <Ionicons name="keypad-outline" size={16} color="#000000" />
                          <Text style={[styles.errorActionBtnText, { color: '#000000' }]}>Manual Code</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Top helper text */}
                  <View style={styles.scannerTopNotice}>
                    <Text style={styles.scannerTopNoticeText}>
                      Point camera directly at the ticket QR code
                    </Text>
                  </View>
                </View>
              )}

              {/* Automation switch: Auto-scan next ticket after 3s */}
              <View style={styles.autoCheckInRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoCheckInTitle}>Auto-Resume Scanner (3s)</Text>
                  <Text style={styles.autoCheckInSub}>
                    Automatically resets scanner to scan next person in queue
                  </Text>
                </View>
                <Switch
                  value={autoResume}
                  onValueChange={setAutoResume}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={autoResume ? '#000000' : '#FFFFFF'}
                />
              </View>
            </View>
          )}

          {/* MANUAL ENTRY TAB */}
          {activeTab === 'manual' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>ENTER TICKET NUMBER OR REFERENCE</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. TC-8921-X or #24"
                  placeholderTextColor={COLORS.placeholder}
                  value={ticketCode}
                  onChangeText={(val) => {
                    setTicketCode(val);
                    if (scanResult) setScanResult(null);
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
                title="Verify & Check In Pass"
                onPress={handleManualVerify}
                loading={loading}
                style={styles.verifyBtn}
              />
            </View>
          )}

          {/* ============================================================ */}
          {/* RESULT STATUS BANNER & CARDS (APPROVED / DUPLICATE / ERROR)  */}
          {/* ============================================================ */}

          {/* 🟢 1. GREEN APPROVED STATE */}
          {scanResult?.type === 'approved' && (
            <View style={styles.cardApproved}>
              <View style={styles.approvedHeaderRow}>
                <View style={styles.approvedIconCircle}>
                  <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.approvedTitle}>ENTRY APPROVED</Text>
                  <Text style={styles.approvedSubtitle}>Attendee Checked In & Admitted</Text>
                </View>
                <View style={styles.approvedBadge}>
                  <Text style={styles.approvedBadgeText}>VALID</Text>
                </View>
              </View>

              {/* Attendee Pass Details */}
              <View style={styles.resultDetailsBox}>
                <View style={styles.resultDetailRow}>
                  <Text style={styles.detailLabel}>ATTENDEE</Text>
                  <Text style={styles.detailValuePrimary}>
                    {scanResult.ticket?.attendeeName || 'Guest'}
                  </Text>
                </View>

                <View style={styles.resultDetailRow}>
                  <Text style={styles.detailLabel}>TICKET TIER</Text>
                  <Text style={styles.detailValue}>
                    {scanResult.ticket?.ticketType || 'General Admission'}
                  </Text>
                </View>

                <View style={styles.resultDetailRow}>
                  <Text style={styles.detailLabel}>PASS CODE</Text>
                  <Text style={styles.detailValueMono}>
                    #{scanResult.ticket?.ticketNumber || ticketCode}
                  </Text>
                </View>

                {scanResult.ticket?.eventTitle && (
                  <View style={styles.resultDetailRow}>
                    <Text style={styles.detailLabel}>EVENT</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {scanResult.ticket.eventTitle}
                    </Text>
                  </View>
                )}

                <View style={styles.resultDetailRow}>
                  <Text style={styles.detailLabel}>ADMITTED AT</Text>
                  <Text style={styles.detailValue}>
                    {new Date(scanResult.checkedInAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </Text>
                </View>
              </View>

              {/* Ready for next attendee button */}
              <TouchableOpacity
                style={styles.nextScanBtnApproved}
                onPress={handleResetScanner}
                activeOpacity={0.8}
              >
                <Ionicons name="scan-outline" size={18} color="#161D22" />
                <Text style={styles.nextScanBtnApprovedText}>Scan Next Ticket</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ⚠️ 2. DUPLICATE TICKET WARNING FLAGGED OUT */}
          {scanResult?.type === 'duplicate' && (
            <View style={styles.cardDuplicate}>
              <View style={styles.duplicateHeaderRow}>
                <View style={styles.duplicateIconCircle}>
                  <Ionicons name="warning" size={28} color="#FBBF24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.duplicateTitle}>DUPLICATE TICKET DETECTED</Text>
                  <Text style={styles.duplicateSubtitle}>ENTRY DENIED — PASS ALREADY USED</Text>
                </View>
                <View style={styles.duplicateBadge}>
                  <Text style={styles.duplicateBadgeText}>FLAGGED</Text>
                </View>
              </View>

              <View style={styles.duplicateWarningBox}>
                <Ionicons name="alert-circle" size={18} color="#FBBF24" style={{ marginTop: 2 }} />
                <Text style={styles.duplicateWarningText}>
                  This pass was already scanned and admitted at the entrance earlier. Do not allow duplicate entry without manager verification.
                </Text>
              </View>

              <View style={styles.resultDetailsBox}>
                <View style={styles.resultDetailRow}>
                  <Text style={styles.detailLabel}>ATTENDEE</Text>
                  <Text style={styles.detailValuePrimary}>
                    {scanResult.ticket?.attendeeName || 'Guest'}
                  </Text>
                </View>

                <View style={styles.resultDetailRow}>
                  <Text style={styles.detailLabel}>PASS CODE</Text>
                  <Text style={styles.detailValueMono}>
                    #{scanResult.ticket?.ticketNumber || ticketCode}
                  </Text>
                </View>

                {scanResult.checkedInAt && (
                  <View style={styles.resultDetailRow}>
                    <Text style={styles.detailLabel}>ORIGINALLY SCANNED</Text>
                    <Text style={[styles.detailValue, { color: '#FBBF24', fontWeight: '700' }]}>
                      {new Date(scanResult.checkedInAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.nextScanBtnWarning}
                onPress={handleResetScanner}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={18} color="#161D22" />
                <Text style={styles.nextScanBtnWarningText}>Dismiss & Scan Next Ticket</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ❌ 3. CANCELLED / UNAUTHORIZED / INVALID ERROR */}
          {(scanResult?.type === 'cancelled' ||
            scanResult?.type === 'invalid' ||
            scanResult?.type === 'unauthorized') && (
              <View style={styles.cardInvalid}>
                <View style={styles.invalidHeaderRow}>
                  <View style={styles.invalidIconCircle}>
                    <Ionicons name="close-circle" size={28} color="#F87171" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invalidTitle}>
                      {scanResult.type === 'cancelled'
                        ? 'PASS CANCELLED'
                        : scanResult.type === 'unauthorized'
                          ? 'UNAUTHORIZED EVENT'
                          : 'INVALID PASS'}
                    </Text>
                    <Text style={styles.invalidSubtitle}>ENTRY DENIED AT GATE</Text>
                  </View>
                  <View style={styles.invalidBadge}>
                    <Text style={styles.invalidBadgeText}>DENIED</Text>
                  </View>
                </View>

                <Text style={styles.invalidMessageText}>{scanResult.message}</Text>

                {scanResult.ticket?.attendeeName && (
                  <View style={styles.resultDetailsBox}>
                    <View style={styles.resultDetailRow}>
                      <Text style={styles.detailLabel}>ATTENDEE NAME</Text>
                      <Text style={styles.detailValue}>{scanResult.ticket.attendeeName}</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.nextScanBtnDanger}
                  onPress={handleResetScanner}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={18} color="#161D22" />
                  <Text style={styles.nextScanBtnDangerText}>Scan Next Pass</Text>
                </TouchableOpacity>
              </View>
            )}

          {/* RECENT SESSION SCANS LOG */}
          {recentScans.length > 0 && (
            <View style={styles.historyContainer}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Recent Gate Scans ({recentScans.length})</Text>
                <TouchableOpacity onPress={() => setRecentScans([])}>
                  <Text style={styles.clearHistoryText}>Clear</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.historyList}>
                {recentScans.map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <Ionicons
                      name={
                        item.status === 'approved'
                          ? 'checkmark-circle'
                          : item.status === 'duplicate'
                            ? 'warning'
                            : 'close-circle'
                      }
                      size={18}
                      color={
                        item.status === 'approved'
                          ? '#34D399'
                          : item.status === 'duplicate'
                            ? '#FBBF24'
                            : '#F87171'
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyAttendee} numberOfLines={1}>
                        {item.attendee} {item.tier ? `• ${item.tier}` : ''}
                      </Text>
                      <Text style={styles.historyCode}>
                        #{item.code} {item.time ? `• ${item.time}` : ''}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.historyStatusText,
                        item.status === 'approved'
                          ? { color: '#34D399' }
                          : item.status === 'duplicate'
                            ? { color: '#FBBF24' }
                            : { color: '#F87171' },
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Event Picker Modal */}
      <Modal
        visible={eventPickerOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEventPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Event to Scan</Text>
              <TouchableOpacity onPress={() => setEventPickerOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {/* Option: All Events */}
              <TouchableOpacity
                style={[
                  styles.eventOptionItem,
                  selectedEventId === 'all' && styles.eventOptionItemActive,
                ]}
                onPress={() => {
                  setSelectedEventId('all');
                  setSelectedEventTitle('All My Events');
                  setEventPickerOpen(false);
                }}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={selectedEventId === 'all' ? COLORS.primary : COLORS.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.eventOptionTitle,
                      selectedEventId === 'all' && styles.eventOptionTitleActive,
                    ]}
                  >
                    All My Events
                  </Text>
                  <Text style={styles.eventOptionSubtitle}>Scan tickets across any active event</Text>
                </View>
                {selectedEventId === 'all' && (
                  <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>

              {/* Event Specific Options */}
              {organizerEvents.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    styles.eventOptionItem,
                    Number(selectedEventId) === Number(ev.id) && styles.eventOptionItemActive,
                  ]}
                  onPress={() => {
                    setSelectedEventId(Number(ev.id));
                    setSelectedEventTitle(ev.title);
                    setEventPickerOpen(false);
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={Number(selectedEventId) === Number(ev.id) ? COLORS.primary : COLORS.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.eventOptionTitle,
                        Number(selectedEventId) === Number(ev.id) && styles.eventOptionTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {ev.title}
                    </Text>
                    <Text style={styles.eventOptionSubtitle}>
                      {ev.venue || 'Venue TBD'} • {ev.city || 'Accra'}
                    </Text>
                  </View>
                  {Number(selectedEventId) === Number(ev.id) && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  authLockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 239, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  authLockTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  authLockSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    width: '100%',
  },
  actionBtnText: {
    color: COLORS.buttonText,
    fontSize: 15,
    fontWeight: '800',
  },

  // Top Controls & Scoreboard
  topControlContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  eventPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  eventPickerBtnText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  scoreboardRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    padding: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  scoreBadgeApproved: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  scoreBadgeDuplicate: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  scoreBadgeInvalid: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  scoreNumber: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  scoreLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
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
    paddingTop: SPACING.xs,
    gap: SPACING.md,
    paddingBottom: 40,
  },
  scannerWrapper: {
    gap: SPACING.md,
  },

  // Camera viewport styles
  cameraContainer: {
    width: '100%',
    height: 360,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
    borderWidth: 1,
  },
  cameraErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 24, 28, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    zIndex: 20,
  },
  cameraErrorTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: SPACING.sm,
  },
  cameraErrorText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  errorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraPlaceholder: {
    height: 320,
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
  webFallbackCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
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
    backgroundColor: 'rgba(239, 239, 241, 0.12)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportBox: {
    width: 220,
    height: 220,
    position: 'relative',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cornerMarker: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderWidth: 3.5,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: RADIUS.sm,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: RADIUS.sm,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS.sm,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: RADIUS.sm,
  },
  laserLine: {
    height: 2,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  viewportOverlayState: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
  },
  viewportOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraControlRow: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 34, 38, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
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
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  scannerTopNoticeText: {
    color: '#EFEFF1',
    fontSize: 11,
    fontWeight: '600',
  },

  autoCheckInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  autoCheckInTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  autoCheckInSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  // Manual Input Form
  inputContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  clearBtn: {
    padding: SPACING.xs,
  },
  verifyBtn: {
    marginTop: SPACING.xs,
  },

  // ========================================================
  // RESULT CARD STYLES
  // ========================================================

  // 1. APPROVED CARD (EMERALD REFINED ACCENT)
  cardApproved: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  approvedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  approvedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedTitle: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  approvedSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  approvedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  approvedBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nextScanBtnApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
  },
  nextScanBtnApprovedText: {
    color: '#161D22',
    fontSize: 14,
    fontWeight: '800',
  },

  // 2. DUPLICATE CARD (AMBER REFINED ACCENT)
  cardDuplicate: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  duplicateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  duplicateIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duplicateTitle: {
    color: '#FBBF24',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  duplicateSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  duplicateBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  duplicateBadgeText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  duplicateWarningBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  duplicateWarningText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  nextScanBtnWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
  },
  nextScanBtnWarningText: {
    color: '#161D22',
    fontSize: 14,
    fontWeight: '800',
  },

  // 3. INVALID CARD (RED REFINED ACCENT)
  cardInvalid: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  invalidHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  invalidIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invalidTitle: {
    color: '#F87171',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  invalidSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  invalidBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  invalidBadgeText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  invalidMessageText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  nextScanBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
  },
  nextScanBtnDangerText: {
    color: '#161D22',
    fontSize: 14,
    fontWeight: '800',
  },

  // Common Details Box inside result cards
  resultDetailsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValuePrimary: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  detailValueMono: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Recent scans history
  historyContainer: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  clearHistoryText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  historyList: {
    gap: 6,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyAttendee: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  historyCode: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  eventOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventOptionItemActive: {
    backgroundColor: 'rgba(239, 239, 241, 0.08)',
    borderRadius: RADIUS.md,
  },
  eventOptionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  eventOptionTitleActive: {
    color: COLORS.primary,
  },
  eventOptionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
