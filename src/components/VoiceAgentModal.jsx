import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';

import { sendChatMessageApi, createAgentBookingHoldApi } from '../api/chat';
import ChatEventCard from './ChatEventCard';
import ChatTicketCard from './ChatTicketCard';
import ChatBookingCard from './ChatBookingCard';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const QUICK_VOICE_COMMANDS = [
  'What events are happening this weekend?',
  'Concerts and music in Accra',
  'Order 2 regular tickets for Afrochella',
  'Show my active passes',
  'Events in Kumasi under 100 Cedis',
];

export default function VoiceAgentModal({
  visible,
  onClose,
  onSwitchToChat,
  user,
}) {
  const [agentState, setAgentState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [transcript, setTranscript] = useState('');
  const [lastAgentReply, setLastAgentReply] = useState(
    user?.name
      ? `Hello ${user.name}! I am Clqs Bot. Tell me what events or passes you want to find or order.`
      : 'Hello! I am Clqs Bot. What event would you like to explore or book today?'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [cardsData, setCardsData] = useState({ events: [], tickets: [], booking: null, actions: [] });
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Native Audio Recorder via expo-audio (Native in Expo Go SDK 53+)
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Animation controllers using state (React 19 compliant)
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [waveAnim1] = useState(() => new Animated.Value(0.4));
  const [waveAnim2] = useState(() => new Animated.Value(0.2));
  const [rotateAnim] = useState(() => new Animated.Value(0));

  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const recognitionRef = useRef(null);

  // Concentric logo-colored halo animations
  useEffect(() => {
    let anim;
    if (agentState === 'listening' || agentState === 'speaking') {
      anim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim1, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
            Animated.timing(waveAnim1, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim2, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
            Animated.timing(waveAnim2, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
    } else if (agentState === 'thinking') {
      anim = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0.4);
      waveAnim2.setValue(0.2);
      rotateAnim.setValue(0);
    }
    return () => anim?.stop();
  }, [agentState, pulseAnim, waveAnim1, waveAnim2, rotateAnim]);

  // Clean phonetics for natural, plain English speech
  const cleanForSpeech = (text) => {
    if (!text) return '';
    return text
      .replace(/GHS\s*(\d+)/gi, '$1 Ghana Cedis')
      .replace(/GHS/gi, 'Ghana Cedis')
      .replace(/\bVIP\b/g, 'V-I-P')
      .replace(/\bVVIP\b/g, 'V-V-I-P')
      .replace(/\*+/g, '')
      .replace(/#+/g, '')
      .replace(/•/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/─+/g, '')
      .trim();
  };

  // Speak response out loud in plain English via expo-speech
  const speakResponse = useCallback((text) => {
    if (isMuted || !text) return;

    try {
      Speech.stop();
      setAgentState('speaking');

      const plainEnglish = cleanForSpeech(text);
      Speech.speak(plainEnglish, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
        onDone: () => {
          if (isMountedRef.current) setAgentState('idle');
        },
        onStopped: () => {
          if (isMountedRef.current) setAgentState('idle');
        },
        onError: () => {
          if (isMountedRef.current) setAgentState('idle');
        },
      });
    } catch (err) {
      console.warn('[VoiceAgent] Speech error:', err);
      setAgentState('idle');
    }
  }, [isMuted]);

  const stopAllAudio = useCallback(() => {
    Speech.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    try {
      if (audioRecorder?.isRecording) {
        audioRecorder.stop();
      }
    } catch {}
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, [audioRecorder]);

  // On mount or visibility change
  useEffect(() => {
    isMountedRef.current = true;
    if (visible) {
      if (!isMuted) {
        speakResponse(lastAgentReply);
      }
    } else {
      stopAllAudio();
    }
    return () => {
      isMountedRef.current = false;
      stopAllAudio();
    };
  }, [visible, isMuted, lastAgentReply, speakResponse, stopAllAudio]);

  // Stop speaking when muted
  useEffect(() => {
    if (isMuted) {
      Speech.stop();
      if (agentState === 'speaking') setAgentState('idle');
    }
  }, [isMuted, agentState]);

  // Process voice inquiry / booking in plain English
  const processVoiceInput = async (spokenQuery, audioBase64 = null) => {
    const query = (spokenQuery || transcript || '').trim();
    if (!query && !audioBase64) return;

    try {
      Speech.stop();
      setAgentState('thinking');
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Check if user spoke to confirm an active order
      const lowerQuery = query.toLowerCase();
      const isConfirming = lowerQuery.includes('confirm') || lowerQuery.includes('pay now') || lowerQuery.includes('pay with paystack');

      if (isConfirming && cardsData.booking?.status === 'summary') {
        // Place order / hold tickets for 10 minutes immediately!
        try {
          const holdRes = await createAgentBookingHoldApi({
            booking: cardsData.booking,
            paymentMethod: 'Paystack',
          });

          if (holdRes?.success && holdRes?.booking) {
            setCardsData((prev) => ({
              ...prev,
              booking: holdRes.booking,
            }));
            const confirmMsg = `Order placed! I have reserved your tickets for 10 minutes. Tap Pay with Paystack below to complete your checkout.`;
            setLastAgentReply(confirmMsg);
            if (!isMuted) speakResponse(confirmMsg);
            if (holdRes.booking.authorizationUrl) {
              Linking.openURL(holdRes.booking.authorizationUrl);
            }
            return;
          }
        } catch (holdErr) {
          console.warn('[VoiceAgent] Order hold error:', holdErr.message);
        }
      }

      const res = await sendChatMessageApi(
        query || 'voice_note',
        [],
        {
          userId: user?.id,
          userRole: user?.role || 'attendee',
          mode: 'voice',
          booking: cardsData.booking,
        },
        audioBase64 ? { audioBase64, audioMimeType: 'audio/m4a' } : null
      );

      // If backend transcribed the audio, update transcript display
      if (res?.transcribedText) {
        setTranscript(res.transcribedText);
      } else if (query && query !== 'voice_note') {
        setTranscript(query);
      }

      const reply = res?.reply || 'I found some matching events for you.';
      setLastAgentReply(reply);
      setCardsData({
        events: res?.events || [],
        tickets: res?.tickets || [],
        booking: res?.booking || null,
        actions: res?.actions || [],
      });

      if (!isMuted) {
        speakResponse(reply);
      } else {
        setAgentState('idle');
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn('[VoiceAgent] API Error:', err.message);
      const errMsg = 'I could not connect to Clqs Bot right now. Please check your network and try again.';
      setLastAgentReply(errMsg);
      setAgentState('idle');
      if (!isMuted) speakResponse(errMsg);
    }
  };

  // Real Native Microphone Recording using expo-audio (Native in Expo Go)
  const startRecordingAudio = async () => {
    try {
      Speech.stop();
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone Access Required', 'Please allow microphone access in your settings so Clqs Bot can hear you.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordingDuration(0);
      setAgentState('listening');
      setTranscript('Listening... Speak now');

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((sec) => sec + 1);
      }, 1000);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error('[VoiceAgent] Failed to start recording:', err);
      setAgentState('idle');
      Alert.alert('Microphone Error', 'Could not access device microphone. Please try again.');
    }
  };

  // Stop Recording and Process Audio
  const stopRecordingAudio = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    try {
      setAgentState('thinking');
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) {
        setAgentState('idle');
        return;
      }

      // Convert audio file to Base64
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (base64Audio) {
        setTranscript('Transcribing your voice...');
        await processVoiceInput('', base64Audio);
      } else {
        setAgentState('idle');
      }
    } catch (err) {
      console.error('[VoiceAgent] Failed to stop recording:', err);
      setAgentState('idle');
    }
  };

  // Web Browser Speech Recognition fallback
  const startWebListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      startRecordingAudio();
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setAgentState('listening');
        setTranscript('Listening... Speak now');
      };

      rec.onresult = (e) => {
        const text = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join('');
        setTranscript(text);
        if (e.results[0]?.isFinal) {
          processVoiceInput(text);
        }
      };

      rec.onerror = () => setAgentState('idle');
      rec.onend = () => {
        if (agentState === 'listening') setAgentState('idle');
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      startRecordingAudio();
    }
  };

  // Main Microphone Orb Tap Handler
  const handleMicPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (agentState === 'speaking') {
      Speech.stop();
      setAgentState('idle');
      return;
    }

    if (agentState === 'listening') {
      if (Platform.OS === 'web' && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      } else {
        stopRecordingAudio();
      }
      return;
    }

    if (Platform.OS === 'web') {
      startWebListening();
    } else {
      startRecordingAudio();
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Top Header strictly in official logo colors */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              stopAllAudio();
              onClose?.();
            }}
          >
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.agentTitleContainer}>
            <View style={[styles.statusDot, agentState === 'listening' ? styles.statusActive : styles.statusIdle]} />
            <Text style={styles.agentTitle}>Clqs Bot Voice Assistant</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute voice' : 'Mute voice'}
            >
              <Ionicons
                name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'}
                size={22}
                color={isMuted ? COLORS.textMuted : COLORS.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                stopAllAudio();
                onSwitchToChat?.();
              }}
              title="Open Chatbot"
            >
              <Ionicons name="chatbubbles-outline" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Visual Orb with Logo Colors: Crisp White, Metallic Silver, Deep Slate */}
          <View style={styles.orbContainer}>
            {/* Outer animated halo rings */}
            <Animated.View
              style={[
                styles.waveRing,
                styles.waveRingOuter,
                {
                  opacity: waveAnim2,
                  transform: [{ scale: pulseAnim }],
                  borderColor: agentState === 'listening' ? '#FFFFFF' : '#CBD5E1',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.waveRing,
                styles.waveRingInner,
                {
                  opacity: waveAnim1,
                  transform: [{ scale: pulseAnim }],
                  borderColor: agentState === 'listening' ? '#EFEFF1' : 'rgba(239, 239, 241, 0.4)',
                },
              ]}
            />

            {/* Central Interactive Orb Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.orbButton,
                agentState === 'listening' && styles.orbListening,
                agentState === 'speaking' && styles.orbSpeaking,
                agentState === 'thinking' && styles.orbThinking,
              ]}
              onPress={handleMicPress}
            >
              {agentState === 'thinking' ? (
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sync" size={44} color="#1C232B" />
                </Animated.View>
              ) : agentState === 'speaking' ? (
                <Ionicons name="volume-high" size={44} color="#1C232B" />
              ) : agentState === 'listening' ? (
                <Ionicons name="mic" size={44} color="#1C232B" />
              ) : (
                <Ionicons name="mic-outline" size={44} color="#1C232B" />
              )}
            </TouchableOpacity>

            <Text style={styles.orbStateLabel}>
              {agentState === 'listening'
                ? `Recording voice (${recordingDuration}s)... Tap orb to finish`
                : agentState === 'thinking'
                ? 'Clqs Bot is processing your request...'
                : agentState === 'speaking'
                ? 'Clqs Bot is speaking (Tap to pause)'
                : 'Tap orb and speak in plain English'}
            </Text>
          </View>

          {/* Transcript / Spoken Utterance Box */}
          <View style={styles.speechCard}>
            <View style={styles.speechCardHeader}>
              <Ionicons name="sparkles" size={14} color={COLORS.primary} />
              <Text style={styles.speechCardTitle}>CLQS BOT RESPONSE</Text>
            </View>
            <Text style={styles.agentReplyText}>{lastAgentReply}</Text>

            {Boolean(transcript) && (
              <View style={styles.transcriptRow}>
                <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.transcriptText}>&ldquo;{transcript}&rdquo;</Text>
              </View>
            )}
          </View>

          {/* Direct Voice Order / Reservation Card */}
          {cardsData.booking && (
            <View style={styles.cardsSection}>
              <Text style={styles.sectionHeader}>ORDER &amp; TICKET RESERVATION</Text>
              <ChatBookingCard
                booking={cardsData.booking}
                onContinuePayment={(b) => {
                  if (b.authorizationUrl) {
                    Linking.openURL(b.authorizationUrl);
                  } else {
                    processVoiceInput(`Confirm order for ${b.eventTitle}`);
                  }
                }}
                onVerifyPayment={(b) => processVoiceInput(`Verify payment for ${b.orderId || b.reference}`)}
              />
            </View>
          )}

          {/* Render Returned Recommended Events */}
          {cardsData.events && cardsData.events.length > 0 && (
            <View style={styles.cardsSection}>
              <Text style={styles.sectionHeader}>MATCHING EVENTS</Text>
              {cardsData.events.map((ev, idx) => (
                <ChatEventCard key={`ev-${ev.id || idx}`} event={ev} />
              ))}
            </View>
          )}

          {/* Render Returned Ticket Passes */}
          {cardsData.tickets && cardsData.tickets.length > 0 && (
            <View style={styles.cardsSection}>
              <Text style={styles.sectionHeader}>YOUR PASSES</Text>
              {cardsData.tickets.map((t, idx) => (
                <ChatTicketCard key={`tk-${t.id || idx}`} ticket={t} />
              ))}
            </View>
          )}

          {/* Quick Plain-English Voice Commands */}
          <View style={styles.quickCommandsSection}>
            <Text style={styles.quickCommandsTitle}>EXAMPLE VOICE COMMANDS</Text>
            <View style={styles.commandsGrid}>
              {QUICK_VOICE_COMMANDS.map((cmd, idx) => (
                <TouchableOpacity
                  key={`cmd-${idx}`}
                  style={styles.commandPill}
                  activeOpacity={0.75}
                  onPress={() => {
                    setTranscript(cmd);
                    processVoiceInput(cmd);
                  }}
                >
                  <Ionicons name="mic-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.commandPillText}>{cmd}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Switcher */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.switchModeBtn}
            onPress={() => {
              stopAllAudio();
              onSwitchToChat?.();
            }}
          >
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.buttonText} />
            <Text style={styles.switchModeText}>Open Text Chatbot</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // #1C232B
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface, // #161D22
  },
  headerBtn: {
    padding: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  statusIdle: {
    backgroundColor: COLORS.textMuted,
  },
  agentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  waveRing: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 1.5,
  },
  waveRingOuter: {
    width: 200,
    height: 200,
  },
  waveRingInner: {
    width: 150,
    height: 150,
  },
  orbButton: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.silver,
  },
  orbListening: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFEFF1',
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  orbSpeaking: {
    backgroundColor: COLORS.silver,
    borderColor: '#FFFFFF',
    shadowOpacity: 0.5,
  },
  orbThinking: {
    backgroundColor: COLORS.textSecondary,
    borderColor: '#FFFFFF',
  },
  orbStateLabel: {
    marginTop: SPACING.md,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  speechCard: {
    width: '100%',
    backgroundColor: COLORS.surface, // #161D22
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
  },
  speechCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  speechCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  agentReplyText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
    fontWeight: '600',
  },
  transcriptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  transcriptText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  cardsSection: {
    width: '100%',
    marginVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  quickCommandsSection: {
    width: '100%',
    marginTop: SPACING.md,
  },
  quickCommandsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  commandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commandPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottomBar: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary, // #EFEFF1
  },
  switchModeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.buttonText, // #1C232B
  },
});
