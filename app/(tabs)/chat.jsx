import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import ChatTicketCard from '../../src/components/ChatTicketCard';
import ChatEventCard from '../../src/components/ChatEventCard';
import ChatBookingCard from '../../src/components/ChatBookingCard';
import VoiceAgentModal from '../../src/components/VoiceAgentModal';
import { sendChatMessageApi, verifyAgentPaymentApi } from '../../src/api/chat';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

const CHAT_STORAGE_KEY = 'cliqs_mobile_chat_history_v2';

const INITIAL_SUGGESTIONS = [
  'What is happening this weekend?',
  'Concerts and live music in Accra',
  'Show my active tickets',
  'How do I transfer a ticket?',
  'How does ticket resale work?',
  'Events under 100 Cedis',
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
        ? `Hello ${user.name || 'there'}! I am Cliq AI Concierge. How can I help you discover events, check passes, or reserve tickets today?`
        : 'Hello! I am Cliq AI Concierge, your personal event assistant. What events or passes are you looking for?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTIONS);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [verifyingOrderId, setVerifyingOrderId] = useState(null);

  // Voice Agent Modal State
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);

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

  // Speak a message aloud using expo-speech
  const handleToggleSpeak = (item) => {
    if (speakingMessageId === item.id) {
      Speech.stop();
      setSpeakingMessageId(null);
      return;
    }

    try {
      Speech.stop();
      setSpeakingMessageId(item.id);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const spokenText = cleanForSpeech(item.text);
      Speech.speak(spokenText, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.96,
        onDone: () => setSpeakingMessageId(null),
        onStopped: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    } catch (err) {
      console.warn('[ChatScreen] Speech error:', err);
      setSpeakingMessageId(null);
    }
  };

  // Clear chat history
  const handleClearHistory = () => {
    Alert.alert(
      'Clear Conversation',
      'Are you sure you want to reset this chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            Speech.stop();
            const resetMsg = [
              {
                id: `welcome-${Date.now()}`,
                sender: 'bot',
                text: user
                  ? `Conversation cleared! How can I help you now, ${user.name || 'there'}?`
                  : 'Conversation cleared! How can I help you find events or tickets today?',
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

  // Action navigation from bot action chips
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

  // Send text message to AI backend
  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const userMessage = {
      id: generateMsgId('user'),
      sender: 'user',
      text,
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

      const res = await sendChatMessageApi(text, history, {
        userId: user?.id,
        userRole: user?.role || 'attendee',
        mode: 'chat',
        booking: activeBooking,
      });

      if (res?.booking) {
        setActiveBooking(res.booking);
      }

      const replyText = res?.reply || 'Here is what I found for you:';

      const botMessage = {
        id: generateMsgId('bot'),
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
    } finally {
      setLoading(false);
    }
  };

  // Continue payment via Paystack checkout
  const handleContinuePayment = (booking) => {
    if (booking?.authorizationUrl) {
      Linking.openURL(booking.authorizationUrl);
    } else {
      handleSend(`Pay for my reservation for ${booking?.eventTitle || 'event'}`);
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
        handleSend(`Verify my payment for order ${booking.orderId || booking.reference}`);
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
            <Ionicons name="sparkles" size={13} color="#10B981" />
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
                  color={isSpeaking ? '#10B981' : COLORS.textMuted}
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

          {/* Quick Action Chips */}
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
      {/* Header with Voice Agent Trigger & History Clear */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="chatbubbles" size={18} color="#10B981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Cliq Concierge</Text>
            <Text style={styles.headerSubtitle}>AI Event &amp; Ticket Assistant</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Voice Agent Trigger Button with pulsing badge */}
          <TouchableOpacity
            style={styles.voiceAgentPill}
            activeOpacity={0.8}
            onPress={() => {
              Speech.stop();
              setVoiceModalVisible(true);
            }}
          >
            <View style={styles.voicePulseDot} />
            <Ionicons name="mic" size={15} color="#FFFFFF" />
            <Text style={styles.voicePillText}>Voice Agent</Text>
          </TouchableOpacity>

          {/* Clear History Button */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleClearHistory}
            title="Clear Chat"
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
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
                  <Ionicons name="sparkles" size={13} color="#10B981" />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={styles.typingText}>Cliq is finding events...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Suggestion Chips */}
        {suggestions && suggestions.length > 0 && (
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
                  onPress={() => handleSend(item)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Input Bar with Integrated Mic Trigger */}
        <View style={styles.inputContainer}>
          <View style={styles.inputBox}>
            <TouchableOpacity
              style={styles.micInputBtn}
              activeOpacity={0.75}
              onPress={() => {
                Speech.stop();
                setVoiceModalVisible(true);
              }}
            >
              <Ionicons name="mic" size={18} color="#10B981" />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Ask about events, passes, tickets..."
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
              onPress={() => handleSend()}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={16} color={COLORS.background} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Full Screen Interactive Voice Agent Modal */}
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
    backgroundColor: COLORS.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#14181C',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceAgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  voicePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  voicePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  iconBtn: {
    padding: 6,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: '#1C232B',
    borderWidth: 1,
    borderColor: '#2A333D',
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
    backgroundColor: '#FFFFFF',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  bubbleBot: {
    backgroundColor: '#1A2128',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#262F38',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#1C232B',
    fontWeight: '600',
  },
  messageTextBot: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  readAloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignSelf: 'flex-start',
  },
  readAloudText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  readAloudTextActive: {
    color: '#10B981',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#1A2128',
    borderWidth: 1,
    borderColor: '#262F38',
  },
  typingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  suggestionsWrapper: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
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
    backgroundColor: '#161D22',
    borderWidth: 1,
    borderColor: '#262F38',
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
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161D22',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#262F38',
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
  },
  micInputBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 10,
    maxHeight: 90,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});
