import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getEventMeetupsApi,
  createMeetupApi,
  joinMeetupApi,
  leaveMeetupApi,
  getEventDiscussionsApi,
  postEventDiscussionApi,
} from '../../src/api/meetups';
import { getEventByIdApi } from '../../src/api/events';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function EventMeetupsScreen() {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('meetups'); // 'meetups' | 'discussions'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Meetups list
  const [meetups, setMeetups] = useState([]);

  // Discussions feed
  const [discussions, setDiscussions] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [postingMessage, setPostingMessage] = useState(false);

  // Create Meetup Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newMax, setNewMax] = useState('10');
  const [creatingMeetup, setCreatingMeetup] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [evRes, mRes, dRes] = await Promise.allSettled([
        getEventByIdApi(eventId),
        getEventMeetupsApi(eventId),
        getEventDiscussionsApi(eventId),
      ]);

      if (evRes.status === 'fulfilled' && evRes.value) {
        setEvent(evRes.value?.event || evRes.value);
      }

      if (mRes.status === 'fulfilled' && mRes.value) {
        const mList = mRes.value?.meetups || mRes.value?.data || (Array.isArray(mRes.value) ? mRes.value : []);
        setMeetups(mList);
      }

      if (dRes.status === 'fulfilled' && dRes.value) {
        const dList = dRes.value?.discussions || dRes.value?.data || (Array.isArray(dRes.value) ? dRes.value : []);
        setDiscussions(dList);
      }
    } catch (err) {
      console.warn('[EventMeetups] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    fetch();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleJoinLeave = async (meetup) => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }

    try {
      if (meetup.is_member || meetup.isMember) {
        await leaveMeetupApi(meetup.id);
      } else {
        await joinMeetupApi(meetup.id);
      }
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err?.message || 'Unable to update meetup attendance.');
    }
  };

  const handleCreateMeetup = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!newTitle.trim()) {
      Alert.alert('Missing Field', 'Please enter a title for your meetup.');
      return;
    }

    setCreatingMeetup(true);
    try {
      await createMeetupApi(eventId, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        location: newLocation.trim() || event?.venue || 'Event Venue',
        meetup_time: newTime.trim() || event?.start_time || '18:00',
        max_participants: parseInt(newMax, 10) || 10,
      });

      Alert.alert('Cliq Created', 'Your meetup cliq has been created!');
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewLocation('');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err?.message || 'Failed to create meetup.');
    } finally {
      setCreatingMeetup(false);
    }
  };

  const handleSendMessage = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!messageInput.trim()) return;

    setPostingMessage(true);
    try {
      await postEventDiscussionApi(eventId, messageInput.trim());
      setMessageInput('');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err?.message || 'Failed to post message.');
    } finally {
      setPostingMessage(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {event?.title || 'Meetups & Cliqs'}
          </Text>
          <Text style={styles.headerSubtitle}>Community Cliqs & Discussions</Text>
        </View>
        {activeTab === 'meetups' && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreateModalOpen(true)}
          >
            <Ionicons name="add" size={22} color={COLORS.buttonText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'meetups' && styles.tabItemActive]}
          onPress={() => setActiveTab('meetups')}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={activeTab === 'meetups' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'meetups' && styles.tabTextActive]}>
            Meetups ({meetups.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'discussions' && styles.tabItemActive]}
          onPress={() => setActiveTab('discussions')}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={16}
            color={activeTab === 'discussions' ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'discussions' && styles.tabTextActive]}>
            Cliq Board ({discussions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'meetups' ? (
        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
          ) : meetups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Meetups Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create the first meetup cliq for this event to connect with other attendees, coordinate rides, or hang out!
              </Text>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setCreateModalOpen(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color={COLORS.buttonText} style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Create a Cliq Meetup</Text>
              </TouchableOpacity>
            </View>
          ) : (
            meetups.map((m) => {
              const isJoined = Boolean(m.is_member || m.isMember);
              return (
                <View key={m.id} style={styles.meetupCard}>
                  <View style={styles.meetupCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.meetupTitle}>{m.title}</Text>
                      <Text style={styles.meetupMeta}>
                        Host: {m.creator_name || m.user_name || 'Attendee'}
                      </Text>
                    </View>
                    <View style={styles.memberPill}>
                      <Ionicons name="people" size={12} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.memberPillText}>
                        {m.participant_count || m.member_count || 1}
                        {m.max_participants ? `/${m.max_participants}` : ''}
                      </Text>
                    </View>
                  </View>

                  {m.description ? (
                    <Text style={styles.meetupDescription}>{m.description}</Text>
                  ) : null}

                  <View style={styles.meetupDetailsRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="location-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.detailText} numberOfLines={1}>{m.location || 'At Event'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                      <Text style={styles.detailText}>{m.meetup_time || 'Event Hours'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.joinBtn,
                      isJoined ? styles.leaveBtn : styles.joinBtnPrimary,
                    ]}
                    onPress={() => handleJoinLeave(m)}
                  >
                    <Text
                      style={[
                        styles.joinBtnText,
                        isJoined && { color: COLORS.error },
                      ]}
                    >
                      {isJoined ? 'Leave Meetup' : 'Join Cliq'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
            ) : discussions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Cliq Board is quiet</Text>
                <Text style={styles.emptySubtitle}>
                  Start the conversation! Ask questions about parking, coordinate meetups, or discuss the lineup.
                </Text>
              </View>
            ) : (
              discussions.map((d) => (
                <View key={d.id} style={styles.discussionCard}>
                  <View style={styles.discussionHeader}>
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarLetter}>
                        {(d.user_name || d.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.userName}>{d.user_name || d.name || 'Attendee'}</Text>
                      <Text style={styles.postDate}>
                        {d.created_at ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.discussionText}>{d.message || d.text}</Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Discussion Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Ask a question or share a thought..."
              placeholderTextColor={COLORS.placeholder}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={handleSendMessage}
              disabled={postingMessage || !messageInput.trim()}
            >
              {postingMessage ? (
                <ActivityIndicator size="small" color={COLORS.buttonText} />
              ) : (
                <Ionicons name="send" size={18} color={COLORS.buttonText} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Create Meetup Modal */}
      <Modal visible={createModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Meetup Cliq</Text>
              <TouchableOpacity onPress={() => setCreateModalOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Cliq Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Afrobeat VIP Circle / Pre-Party"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="What is the plan? Where are we meeting?"
                placeholderTextColor={COLORS.placeholder}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Meeting Time</Text>
              <TextInput
                style={styles.modalInput}
                value={newTime}
                onChangeText={setNewTime}
                placeholder="e.g. 19:30 or Before Main Act"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Meeting Spot</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newLocation}
                  onChangeText={setNewLocation}
                  placeholder="e.g. VIP Gate 2"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Max Members</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newMax}
                  onChangeText={setNewMax}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleCreateMeetup}
              disabled={creatingMeetup}
            >
              {creatingMeetup ? (
                <ActivityIndicator color={COLORS.buttonText} />
              ) : (
                <Text style={styles.submitModalBtnText}>Create Cliq</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.xs,
  },
  tabItemActive: {
    backgroundColor: COLORS.card,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  meetupCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  meetupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  meetupMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  meetupDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginVertical: SPACING.xs,
  },
  meetupDetailsRow: {
    flexDirection: 'row',
    marginVertical: SPACING.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  joinBtn: {
    paddingVertical: 10,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  joinBtnPrimary: {
    backgroundColor: COLORS.primary,
  },
  leaveBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  joinBtnText: {
    color: COLORS.buttonText,
    fontSize: 13,
    fontWeight: '700',
  },
  discussionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  postDate: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  discussionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 13,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: SPACING.lg,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
  },
  actionBtnText: {
    color: COLORS.buttonText,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  submitModalBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitModalBtnText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: '700',
  },
});
