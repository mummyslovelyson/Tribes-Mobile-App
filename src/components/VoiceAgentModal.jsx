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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { sendChatMessageApi } from '../api/chat';
import ChatEventCard from './ChatEventCard';
import ChatTicketCard from './ChatTicketCard';
import ChatBookingCard from './ChatBookingCard';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const QUICK_VOICE_COMMANDS = [
  'What is happening this weekend?',
  'Concerts and live music in Accra',
  'Show my active tickets',
  'Events under 100 Cedis',
  'How do I transfer a pass?',
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
      ? `Hello ${user.name}! I am Cliq Voice Concierge. What event or passes can I help you find?`
      : 'Hello! I am Cliq Voice Concierge. Tell me what event or passes you are looking for.'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [cardsData, setCardsData] = useState({ events: [], tickets: [], booking: null, actions: [] });

  // Animation controllers using state (React 19 compliant)
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [waveAnim1] = useState(() => new Animated.Value(0.4));
  const [waveAnim2] = useState(() => new Animated.Value(0.2));
  const [rotateAnim] = useState(() => new Animated.Value(0));

  const recognitionRef = useRef(null);
  const isMountedRef = useRef(true);

  // Breathing & pulse animation loop
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

  // Clean phonetics for natural speech
  const cleanForSpeech = (text) => {
    if (!text) return '';
    return text
      .replace(/GHS\s*(\d+)/gi, '$1 Ghana Cedis')
      .replace(/\bVIP\b/g, 'V-I-P')
      .replace(/\bVVIP\b/g, 'V-V-I-P')
      .replace(/\*+/g, '')
      .replace(/#+/g, '')
      .replace(/•/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .trim();
  };

  // Speak response out loud using expo-speech
  const speakResponse = useCallback((text) => {
    if (isMuted || !text) return;

    try {
      Speech.stop();
      setAgentState('speaking');

      const spokenText = cleanForSpeech(text);
      Speech.speak(spokenText, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.96,
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

  // On mount or when modal becomes visible, greet user
  useEffect(() => {
    isMountedRef.current = true;
    if (visible) {
      if (!isMuted) {
        speakResponse(lastAgentReply);
      }
    } else {
      Speech.stop();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    }
    return () => {
      isMountedRef.current = false;
      Speech.stop();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [visible, isMuted, lastAgentReply, speakResponse]);

  // Stop speaking when muted
  useEffect(() => {
    if (isMuted) {
      Speech.stop();
      if (agentState === 'speaking') setAgentState('idle');
    }
  }, [isMuted, agentState]);

  // Handle Voice Inquiry execution
  const processVoiceInput = async (spokenQuery) => {
    const query = (spokenQuery || transcript).trim();
    if (!query) return;

    try {
      Speech.stop();
      setAgentState('thinking');
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const res = await sendChatMessageApi(query, [], {
        userId: user?.id,
        userRole: user?.role || 'attendee',
        mode: 'voice',
      });

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
      const errMsg = 'I could not connect to the voice assistant right now. Please check your network connection.';
      setLastAgentReply(errMsg);
      setAgentState('idle');
      if (!isMuted) speakResponse(errMsg);
    }
  };

  // Web Speech Recognition for Expo Web Preview
  const startWebListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscript('Speech recognition is not supported in this browser. Tap a quick prompt below.');
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

      rec.onerror = () => {
        setAgentState('idle');
      };

      rec.onend = () => {
        if (agentState === 'listening') {
          setAgentState('idle');
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.warn('[VoiceAgent.web]', e);
    }
  };

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
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setAgentState('idle');
      return;
    }

    if (Platform.OS === 'web') {
      startWebListening();
    } else {
      // On mobile native, prompt listening state and trigger sample voice inquiry
      setAgentState('listening');
      setTranscript('Listening to voice query...');
      setTimeout(() => {
        setAgentState('idle');
      }, 3000);
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
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              Speech.stop();
              onClose?.();
            }}
          >
            <Ionicons name="close" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.agentTitleContainer}>
            <View style={[styles.statusDot, agentState === 'listening' ? styles.statusGreen : agentState === 'speaking' ? styles.statusCyan : styles.statusAmber]} />
            <Text style={styles.agentTitle}>Cliq Voice Concierge</Text>
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
                color={isMuted ? '#EF4444' : COLORS.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => {
                Speech.stop();
                onSwitchToChat?.();
              }}
              title="Switch to Text Chat"
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
          {/* Main Visual Orb */}
          <View style={styles.orbContainer}>
            {/* Outer animated halo rings */}
            <Animated.View
              style={[
                styles.waveRing,
                styles.waveRingOuter,
                {
                  opacity: waveAnim2,
                  transform: [{ scale: pulseAnim }],
                  borderColor: agentState === 'speaking' ? '#06B6D4' : agentState === 'listening' ? '#10B981' : '#3B82F6',
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
                  borderColor: agentState === 'speaking' ? '#10B981' : agentState === 'thinking' ? '#F59E0B' : '#06B6D4',
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
                  <Ionicons name="sync" size={44} color="#FFFFFF" />
                </Animated.View>
              ) : agentState === 'speaking' ? (
                <Ionicons name="volume-high" size={44} color="#FFFFFF" />
              ) : agentState === 'listening' ? (
                <Ionicons name="mic" size={44} color="#FFFFFF" />
              ) : (
                <Ionicons name="mic-outline" size={44} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <Text style={styles.orbStateLabel}>
              {agentState === 'listening'
                ? 'Listening to you...'
                : agentState === 'thinking'
                ? 'Processing event data...'
                : agentState === 'speaking'
                ? 'Cliq is speaking (Tap to pause)'
                : 'Tap to speak'}
            </Text>
          </View>

          {/* Transcript / Spoken Utterance Box */}
          <View style={styles.speechCard}>
            <View style={styles.speechCardHeader}>
              <Ionicons name="sparkles" size={14} color="#10B981" />
              <Text style={styles.speechCardTitle}>VOICE AGENT RESPONSE</Text>
            </View>
            <Text style={styles.agentReplyText}>{lastAgentReply}</Text>

            {Boolean(transcript) && (
              <View style={styles.transcriptRow}>
                <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.transcriptText}>&ldquo;{transcript}&rdquo;</Text>
              </View>
            )}
          </View>

          {/* Render Returned Event Cards */}
          {cardsData.events && cardsData.events.length > 0 && (
            <View style={styles.cardsSection}>
              <Text style={styles.sectionHeader}>RECOMMENDED EVENTS</Text>
              {cardsData.events.map((ev, idx) => (
                <ChatEventCard key={`ev-${ev.id || idx}`} event={ev} />
              ))}
            </View>
          )}

          {/* Render Returned Ticket Cards */}
          {cardsData.tickets && cardsData.tickets.length > 0 && (
            <View style={styles.cardsSection}>
              <Text style={styles.sectionHeader}>YOUR PASSES</Text>
              {cardsData.tickets.map((t, idx) => (
                <ChatTicketCard key={`tk-${t.id || idx}`} ticket={t} />
              ))}
            </View>
          )}

          {/* Render Booking Hold Card */}
          {cardsData.booking && (
            <View style={styles.cardsSection}>
              <Text style={styles.sectionHeader}>TICKET RESERVATION</Text>
              <ChatBookingCard booking={cardsData.booking} />
            </View>
          )}

          {/* Quick Voice Inquiry Prompts */}
          <View style={styles.quickCommandsSection}>
            <Text style={styles.quickCommandsTitle}>TRY ASKING BY VOICE</Text>
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
                  <Ionicons name="chatbubble-ellipses-outline" size={13} color="#10B981" />
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
              Speech.stop();
              onSwitchToChat?.();
            }}
          >
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.text} />
            <Text style={styles.switchModeText}>Open Text Chat Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1317',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#14181C',
  },
  headerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
  statusGreen: {
    backgroundColor: '#10B981',
  },
  statusCyan: {
    backgroundColor: '#06B6D4',
  },
  statusAmber: {
    backgroundColor: '#F59E0B',
  },
  agentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
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
    borderWidth: 2,
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#374151',
  },
  orbListening: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
    shadowColor: '#10B981',
    shadowOpacity: 0.8,
  },
  orbSpeaking: {
    backgroundColor: '#059669',
    borderColor: '#6EE7B7',
    shadowColor: '#059669',
    shadowOpacity: 0.7,
  },
  orbThinking: {
    backgroundColor: '#D97706',
    borderColor: '#FCD34D',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.7,
  },
  orbStateLabel: {
    marginTop: SPACING.md,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  speechCard: {
    width: '100%',
    backgroundColor: '#161D22',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#262F38',
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
    color: '#10B981',
    letterSpacing: 0.8,
  },
  agentReplyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  transcriptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  transcriptText: {
    fontSize: 12,
    color: COLORS.textMuted,
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
    backgroundColor: '#1C232B',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#2A333D',
  },
  commandPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottomBar: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#14181C',
    alignItems: 'center',
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  switchModeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
});
