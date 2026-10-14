import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import ChatTicketCard from '../../src/components/ChatTicketCard';
import ChatEventCard from '../../src/components/ChatEventCard';
import ChatBookingCard from '../../src/components/ChatBookingCard';
import VoiceAgentModal from '../../src/components/VoiceAgentModal';
import {
  sendChatMessageApi,
  createAgentBookingHoldApi,
  verifyAgentPaymentApi,
} from '../../src/api/chat';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

const CHAT_STORAGE_KEY = 'clqs_bot_chat_history_v3';

const INITIAL_SUGGESTIONS = [
  'What events are happening this weekend?',
  'Concerts and live music in Accra',
  'Order 2 regular tickets for Afrochella',
  'Show my active passes',
  'How do I transfer a ticket?',
  'Events in Kumasi under 100 Cedis',
];

let msgCounter = 0;
const generateMsgId = (prefix) => `${prefix}-${++msgCounter}`;

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: user
        ? `Hello ${user.name || 'there'}! I am Clqs Bot, your event concierge. What would you like to explore or book today?`
        : 'Hello! I am Clqs Bot, your personal event assistant. What events or passes are you looking for?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTIONS);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [verifyingOrderId, setVerifyingOrderId] = useState(null);

  // Auto-audio readout setting (Enabled by default as requested)
  const [autoSpeechEnabled, setAutoSpeechEnabled] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

  // Voice Note Recording State
  const [isRecordingNote, setIsRecordingNote] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const [recordBlinkAnim] = useState(() => new Animated.Value(1));

  // Voice Agent Modal State
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  // Blinking dot animation for voice note recording
  useEffect(() => {
    let anim;
    if (isRecordingNote) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(recordBlinkAnim, { toValue: 0.2, duration: 500, useNativeDriver: true }),
          Animated.timing(recordBlinkAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      );
      anim.start();
    } else {
      recordBlinkAnim.setValue(1);
    }
    return () => anim?.stop();
  }, [isRecordingNote, recordBlinkAnim]);

  // Load chat history from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (err) {
        console.warn('[ChatScreen] Error loading chat history:', err);
      }
    })();
  }, []);

  // Save chat history to AsyncStorage
  const saveChatHistory = async (msgs) => {
    try {
      if (Array.isArray(msgs)) {
        await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-40)));
      }
    } catch (err) {
      console.warn('[ChatScreen] Error saving chat history:', err);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 120);
    }
  }, [messages, loading]);

  // Clean text into plain spoken English
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

  // Speak bot response out loud through audio
  const speakBotResponse = useCallback((text, messageId = null) => {
    if (!text) return;
    try {
      Speech.stop();
      if (messageId) setSpeakingMessageId(messageId);

      const plainEnglish = cleanForSpeech(text);
      Speech.speak(plainEnglish, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
        onDone: () => setSpeakingMessageId(null),
        onStopped: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    } catch (err) {
      console.warn('[ChatScreen] Speech error:', err);
      setSpeakingMessageId(null);
    }
  }, []);

  // Toggle speech for an individual message
  const handleToggleSpeak = (item) => {
    if (speakingMessageId === item.id) {
      Speech.stop();
      setSpeakingMessageId(null);
      return;
    }
    speakBotResponse(item.text, item.id);
  };

  // Clear chat history
  const handleClearHistory = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to reset this chat with Clqs Bot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            Speech.stop();
            const resetMsg = [
              {
                id: generateMsgId('welcome'),
                sender: 'bot',
                text: user
                  ? `Conversation reset! How can I help you now, ${user.name || 'there'}?`
                  : 'Conversation reset! What events or passes would you like to explore or book?',
                timestamp: new Date().toISOString(),
              },
            ];
            setMessages(resetMsg);
            setSuggestions(INITIAL_SUGGESTIONS);
            setActiveBooking(null);
            await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  // Action navigation
  const handleActionNavigation = (action) => {
    if (!action?.path) return;
    const path = action.path;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (path.includes('/events/')) {
      const parts = path.split('/events/');
      const eventId = parts[1];
      if (eventId) router.push(`/event/${eventId}`);
    } else if (path === '/explore' || path === '/attendee/explore') {
      router.push('/(tabs)');
    } else if (path === '/attendee/tickets') {
      router.push('/(tabs)/tickets');
    } else if (path === '/attendee/bookings') {
      router.push('/orders');
    } else if (path === '/attendee/favorites') {
      router.push('/saved');
    } else if (path === '/organizer/check-in') {
      router.push('/check-in');
    } else if (path === '/login') {
      router.push('/(auth)/login');
    } else {
      router.push('/(tabs)');
    }
  };

  // Send message or voice note to Clqs Bot backend
  const handleSendMessage = async (textToSend, audioData = null) => {
    const text = (textToSend || inputText).trim();
    if (!text && !audioData) return;
    if (loading) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userMessage = {
      id: generateMsgId('user'),
      sender: 'user',
      text: audioData ? `🎤 Voice Note (${recordingDuration || 2}s)` : text,
      isVoiceNote: Boolean(audioData),
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputText('');
    setLoading(true);

    try {
      const history = nextMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await sendChatMessageApi(
        text || 'voice_note',
        history,
        {
          userId: user?.id,
          userRole: user?.role || 'attendee',
          mode: 'chat',
          booking: activeBooking,
        },
        audioData
      );

      // If backend transcribed the voice note, update the user message
      if (res?.transcribedText && userMessage.isVoiceNote) {
        userMessage.text = `🎤 Voice Note: "${res.transcribedText}"`;
      }

      if (res?.booking) {
        setActiveBooking(res.booking);
      }

      const replyText = res?.reply || 'Here is what I found for you:';
      const botMessageId = generateMsgId('bot');

      const botMessage = {
        id: botMessageId,
        sender: 'bot',
        text: replyText,
        actions: res?.actions || [],
        tickets: res?.tickets || [],
        events: res?.events || [],
        booking: res?.booking || null,
        timestamp: new Date().toISOString(),
      };

      if (res?.suggestions && Array.isArray(res.suggestions) && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      }

      const updated = [...nextMessages, botMessage];
      setMessages(updated);
      saveChatHistory(updated);

      // Auto-read every output through audio (as requested by user)
      if (autoSpeechEnabled) {
        speakBotResponse(replyText, botMessageId);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn('[ChatScreen] Error sending message:', err.message);
      const errorMsg = {
        id: generateMsgId('bot-err'),
        sender: 'bot',
        text: 'I ran into a connection issue. Please make sure your network is connected and try again.',
        timestamp: new Date().toISOString(),
      };
      const updated = [...nextMessages, errorMsg];
      setMessages(updated);
      saveChatHistory(updated);
      if (autoSpeechEnabled) {
        speakBotResponse(errorMsg.text, errorMsg.id);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── VOICE NOTE RECORDING HANDLERS ───
  const startRecordingVoiceNote = async () => {
    try {
      Speech.stop();
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone Access Required', 'Please enable microphone access in settings to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecordingDuration(0);
      setIsRecordingNote(true);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((sec) => sec + 1);
      }, 1000);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error('[ChatScreen] Voice note recording error:', err);
      setIsRecordingNote(false);
      Alert.alert('Recording Error', 'Could not access device microphone. Please try again.');
    }
  };

  const cancelRecordingVoiceNote = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    setIsRecordingNote(false);
    setRecordingDuration(0);
  };

  const sendVoiceNote = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const recording = recordingRef.current;
    if (!recording) {
      setIsRecordingNote(false);
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setIsRecordingNote(false);

      if (!uri) return;

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (base64Audio) {
        await handleSendMessage('', {
          audioBase64: base64Audio,
          audioMimeType: 'audio/m4a',
        });
      }
    } catch (err) {
      console.error('[ChatScreen] Error sending voice note:', err);
      setIsRecordingNote(false);
    }
  };

  // Continue payment via Paystack checkout
  const handleContinuePayment = async (booking) => {
    if (booking?.authorizationUrl) {
      Linking.openURL(booking.authorizationUrl);
      return;
    }

    try {
      // Place hold and generate Paystack payment link
      const holdRes = await createAgentBookingHoldApi({
        booking,
        paymentMethod: 'Paystack',
      });
      if (holdRes?.success && holdRes?.booking?.authorizationUrl) {
        setActiveBooking(holdRes.booking);
        Linking.openURL(holdRes.booking.authorizationUrl);
      } else {
        handleSendMessage(`Confirm and pay for my order for ${booking?.eventTitle || 'event'}`);
      }
    } catch {
      handleSendMessage(`Confirm and pay for my order for ${booking?.eventTitle || 'event'}`);
    }
  };

  // Verify payment status
  const handleVerifyPayment = async (booking) => {
    if (!booking) return;
    setVerifyingOrderId(booking.orderId || booking.reference);
    try {
      const res = await verifyAgentPaymentApi(booking.reference, booking.orderId);
      if (res?.success) {
        Alert.alert('Payment Verified', 'Your passes have been issued and added to your tickets.');
        handleSendMessage(`Verify my payment for order ${booking.orderId || booking.reference}`);
      } else {
        Alert.alert('Pending Payment', res?.message || 'Payment has not been confirmed yet. Please complete checkout.');
      }
    } catch (err) {
      Alert.alert('Verification Check', err?.response?.data?.message || 'Payment is still processing. Please try again shortly.');
    } finally {
      setVerifyingOrderId(null);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const isSpeaking = speakingMessageId === item.id;

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Ionicons name="sparkles" size={13} color={COLORS.primary} />
          </View>
        )}

        <View style={styles.messageColumn}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
            <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextBot]}>
              {item.text}
            </Text>

            {/* Read Aloud button for bot replies */}
            {!isUser && (
              <TouchableOpacity
                style={styles.readAloudBtn}
                activeOpacity={0.7}
                onPress={() => handleToggleSpeak(item)}
              >
                <Ionicons
                  name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
                  size={14}
                  color={isSpeaking ? '#FFFFFF' : COLORS.textMuted}
                />
                <Text style={[styles.readAloudText, isSpeaking && styles.readAloudTextActive]}>
                  {isSpeaking ? 'Speaking...' : 'Listen'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Render Rich Event Cards */}
          {!isUser && item.events && item.events.length > 0 && (
            <View style={styles.richCardsContainer}>
              {item.events.map((event, idx) => (
                <ChatEventCard key={`ev-${event.id || idx}`} event={event} />
              ))}
            </View>
          )}

          {/* Render Rich Ticket Cards */}
          {!isUser && item.tickets && item.tickets.length > 0 && (
            <View style={styles.richCardsContainer}>
              {item.tickets.map((ticket, idx) => (
                <ChatTicketCard key={`tk-${ticket.id || idx}`} ticket={ticket} />
              ))}
            </View>
          )}

          {/* Render Rich Booking Hold Card */}
          {!isUser && item.booking && (
            <ChatBookingCard
              booking={item.booking}
              onContinuePayment={handleContinuePayment}
              onVerifyPayment={handleVerifyPayment}
              verifying={verifyingOrderId === (item.booking.orderId || item.booking.reference)}
            />
          )}

          {/* Quick Action Navigation Chips */}
          {!isUser && item.actions && item.actions.length > 0 && (
            <View style={styles.actionsRow}>
              {item.actions.map((action, idx) => (
                <TouchableOpacity
                  key={`act-${idx}`}
                  style={styles.actionChip}
                  activeOpacity={0.8}
                  onPress={() => handleActionNavigation(action)}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.actionChipText}>{action.label || 'View'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header strictly styled with logo colors */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="sparkles" size={17} color={COLORS.buttonText} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Clqs Bot</Text>
            <Text style={styles.headerSubtitle}>Event Concierge &amp; Voice Agent</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Auto-Speech Readout Toggle Button */}
          <TouchableOpacity
            style={[styles.autoSpeechBtn, autoSpeechEnabled && styles.autoSpeechBtnActive]}
            activeOpacity={0.8}
            onPress={() => {
              const nextState = !autoSpeechEnabled;
              setAutoSpeechEnabled(nextState);
              if (!nextState) Speech.stop();
            }}
            title={autoSpeechEnabled ? 'Auto-Audio is ON' : 'Auto-Audio is OFF'}
          >
            <Ionicons
              name={autoSpeechEnabled ? 'volume-high' : 'volume-mute-outline'}
              size={15}
              color={autoSpeechEnabled ? COLORS.buttonText : COLORS.textMuted}
            />
            <Text style={[styles.autoSpeechText, autoSpeechEnabled && styles.autoSpeechTextActive]}>
              {autoSpeechEnabled ? 'Audio ON' : 'Audio OFF'}
            </Text>
          </TouchableOpacity>

          {/* Voice Agent Launcher Pill with Logo Colors */}
          <TouchableOpacity
            style={styles.voiceAgentPill}
            activeOpacity={0.8}
            onPress={() => {
              Speech.stop();
              setVoiceModalVisible(true);
            }}
          >
            <Ionicons name="mic" size={14} color={COLORS.buttonText} />
            <Text style={styles.voicePillText}>Voice Agent</Text>
          </TouchableOpacity>

          {/* Clear History Button */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleClearHistory}
            title="Clear Chat"
          >
            <Ionicons name="trash-outline" size={17} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingContainer}>
                <View style={styles.botAvatar}>
                  <Ionicons name="sparkles" size={13} color={COLORS.primary} />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.typingText}>Clqs Bot is searching...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Suggestion Chips */}
        {suggestions && suggestions.length > 0 && !isRecordingNote && (
          <View style={styles.suggestionsWrapper}>
            <FlatList
              horizontal
              data={suggestions}
              keyExtractor={(item, index) => `${item}-${index}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => handleSendMessage(item)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Interactive Input Bar & Voice Note Recorder */}
        <View style={styles.inputContainer}>
          {isRecordingNote ? (
            /* Live Voice Note Recording Bar */
            <View style={styles.recordingBar}>
              <View style={styles.recordingLeft}>
                <Animated.View style={[styles.recordingDot, { opacity: recordBlinkAnim }]} />
                <Text style={styles.recordingTime}>
                  Recording voice note: {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}
                </Text>
              </View>

              <View style={styles.recordingActions}>
                <TouchableOpacity
                  style={styles.cancelRecordBtn}
                  onPress={cancelRecordingVoiceNote}
                  title="Cancel"
                >
                  <Ionicons name="close-circle-outline" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sendRecordBtn}
                  onPress={sendVoiceNote}
                  title="Send Voice Note"
                >
                  <Ionicons name="send" size={15} color={COLORS.buttonText} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Standard Text and Voice Input Box */
            <View style={styles.inputBox}>
              {/* Record Voice Note Button */}
              <TouchableOpacity
                style={styles.micInputBtn}
                activeOpacity={0.75}
                onPress={startRecordingVoiceNote}
                title="Record Voice Note"
              >
                <Ionicons name="mic" size={18} color={COLORS.buttonText} />
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                placeholder="Ask Clqs Bot or order tickets..."
                placeholderTextColor={COLORS.placeholder}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !inputText.trim() && styles.sendBtnDisabled,
                ]}
                disabled={!inputText.trim() || loading}
                onPress={() => handleSendMessage()}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color={COLORS.buttonText} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Full Screen Voice Agent Modal */}
      <VoiceAgentModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onSwitchToChat={() => setVoiceModalVisible(false)}
        user={user}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background, // #1C232B
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface, // #161D22
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary, // Pure White
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoSpeechBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  autoSpeechBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  autoSpeechText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  autoSpeechTextActive: {
    color: COLORS.buttonText,
  },
  voiceAgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary, // Logo White
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  voicePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.buttonText,
  },
  iconBtn: {
    padding: 6,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  messageRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    maxWidth: '100%',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  messageColumn: {
    maxWidth: '82%',
    gap: 6,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary, // #EFEFF1
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  bubbleBot: {
    backgroundColor: COLORS.surface, // #161D22
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: COLORS.buttonText,
    fontWeight: '600',
  },
  messageTextBot: {
    color: COLORS.text,
    fontWeight: '500',
  },
  readAloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  readAloudText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  readAloudTextActive: {
    color: COLORS.text,
  },
  richCardsContainer: {
    gap: SPACING.sm,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  suggestionsWrapper: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  suggestionsContent: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  inputContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
  },
  micInputBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary, // Logo white circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 10,
    maxHeight: 90,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.silver,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  recordingTime: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelRecordBtn: {
    padding: 2,
  },
  sendRecordBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
