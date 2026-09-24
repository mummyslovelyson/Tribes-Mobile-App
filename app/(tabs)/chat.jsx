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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Header from '../../src/components/Header';
import ChatTicketCard from '../../src/components/ChatTicketCard';
import ChatEventCard from '../../src/components/ChatEventCard';
import { sendChatMessageApi } from '../../src/api/chat';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

const INITIAL_SUGGESTIONS = [
  'What is happening this weekend?',
  'Concerts and live music in Accra',
  'Show my active tickets',
  'How do I transfer a ticket?',
  'How does ticket resale work?',
];

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: user
        ? `Hello ${user.name || 'there'}! I am Cliqs Bot. How can I help you find events or manage your passes today?`
        : 'Hello! I am Cliqs Bot, your event assistant. How can I help you discover shows or manage your tickets today?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTIONS);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleActionNavigation = (action) => {
    if (!action?.path) return;
    const path = action.path;

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
    } else if (path === '/attendee/support' || path === '/contact') {
      router.push('/(tabs)/chat');
    } else {
      router.push('/(tabs)');
    }
  };

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await sendChatMessageApi(text, history, {
        userId: user?.id,
        userRole: user?.role || 'attendee',
        mode: 'chat',
      });

      const replyText = res?.reply || 'Here is what I found for you:';

      const botMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: replyText,
        actions: res?.actions || [],
        tickets: res?.tickets || [],
        events: res?.events || [],
        timestamp: new Date().toISOString(),
      };

      if (res?.suggestions && Array.isArray(res.suggestions) && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      }

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.warn('[ChatScreen] Error sending message:', err.message);
      const errorMsg = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: 'I ran into a connection issue. Please make sure the backend server is running and try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Ionicons name="chatbubbles" size={14} color={COLORS.text} />
          </View>
        )}

        <View style={styles.messageColumn}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
            <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextBot]}>
              {item.text}
            </Text>
          </View>

          {/* Render Rich Event Cards if bot attached events */}
          {!isUser && item.events && item.events.length > 0 && (
            <View style={styles.richCardsContainer}>
              {item.events.map((event, idx) => (
                <ChatEventCard key={`ev-${event.id || idx}`} event={event} />
              ))}
            </View>
          )}

          {/* Render Rich Ticket Cards if bot attached tickets */}
          {!isUser && item.tickets && item.tickets.length > 0 && (
            <View style={styles.richCardsContainer}>
              {item.tickets.map((ticket, idx) => (
                <ChatTicketCard key={`tk-${ticket.id || idx}`} ticket={ticket} />
              ))}
            </View>
          )}

          {/* Render Quick Navigation Action Buttons if bot attached actions */}
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
      <Header
        title="Cliqs Concierge"
        subtitle="Event assistant & support"
        showNotification={false}
      />

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
                  <Ionicons name="chatbubbles" size={14} color={COLORS.text} />
                </View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={COLORS.textMuted} />
                  <Text style={styles.typingText}>Searching...</Text>
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

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputBox}>
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
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  messageColumn: {
    maxWidth: '85%',
    flexDirection: 'column',
    gap: 6,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  bubble: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  bubbleUser: {
    backgroundColor: COLORS.text,
    borderBottomRightRadius: 2,
    alignSelf: 'flex-end',
  },
  bubbleBot: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 2,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  messageTextUser: {
    color: COLORS.background,
    fontWeight: '600',
  },
  messageTextBot: {
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  richCardsContainer: {
    width: '100%',
    gap: 6,
    marginTop: 2,
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
    backgroundColor: '#1C232B',
    borderWidth: 1,
    borderColor: '#2E363E',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  actionChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typingText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  suggestionsWrapper: {
    paddingVertical: SPACING.xs,
  },
  suggestionsContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  suggestionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});
