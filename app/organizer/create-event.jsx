import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createEventApi } from '../../src/api/organizer';
import { getCategoriesApi } from '../../src/api/events';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function CreateEventScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Accra');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('23:00');
  const [capacity, setCapacity] = useState('500');
  const [bannerUrl, setBannerUrl] = useState('');
  const [dressCode, setDressCode] = useState('Casual');

  // Ticket Tiers
  const [ticketTiers, setTicketTiers] = useState([
    { name: 'Standard / Regular', price: '100', capacity: '300', description: 'General admission entry' },
    { name: 'VIP Pass', price: '250', capacity: '100', description: 'VIP section & fast-track entry' },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCategoriesApi();
        const list = Array.isArray(res) ? res : res?.categories || [];
        setCategories(list);
        if (list.length > 0) {
          setCategoryId(String(list[0].id || list[0].value || '1'));
        }
      } catch (err) {
        console.warn('[CreateEvent] Error loading categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, []);

  const handleAddTier = () => {
    setTicketTiers([
      ...ticketTiers,
      { name: 'New Tier', price: '50', capacity: '100', description: '' },
    ]);
  };

  const handleRemoveTier = (index) => {
    if (ticketTiers.length <= 1) {
      Alert.alert('Validation Error', 'Events must have at least one ticket tier.');
      return;
    }
    setTicketTiers(ticketTiers.filter((_, i) => i !== index));
  };

  const handleUpdateTier = (index, field, value) => {
    const updated = [...ticketTiers];
    updated[index][field] = value;
    setTicketTiers(updated);
  };

  const handleSubmit = async (publishNow = false) => {
    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter an event title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Field', 'Please enter an event description.');
      return;
    }
    if (!venue.trim()) {
      Alert.alert('Missing Field', 'Please enter a venue or location.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId || 1,
        venue: venue.trim(),
        address: address.trim() || venue.trim(),
        city: city.trim() || 'Accra',
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        capacity: parseInt(capacity, 10) || 500,
        banner_image: bannerUrl.trim() || undefined,
        dress_code: dressCode.trim() || 'Casual',
        status: publishNow ? 'published' : 'draft',
        ticket_types: ticketTiers.map((t) => ({
          name: t.name.trim(),
          price: parseFloat(t.price) || 0,
          capacity: parseInt(t.capacity, 10) || 100,
          description: t.description.trim(),
        })),
      };

      await createEventApi(payload);
      Alert.alert(
        'Success',
        publishNow
          ? 'Event created and published for ticket sales!'
          : 'Event saved as draft. You can publish it anytime from your dashboard.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/organizer'),
          },
        ]
      );
    } catch (err) {
      console.warn('[CreateEvent] Submit error:', err);
      Alert.alert(
        'Creation Failed',
        err.response?.data?.message || err?.message || 'Unable to create event. Please verify all fields and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Event</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          {/* Section: Basic Details */}
          <Text style={styles.sectionHeader}>Basic Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Accra Afrobeat Fest 2026"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what attendees can expect, lineup, dress code, etc."
              placeholderTextColor={COLORS.placeholder}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Category Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category</Text>
            {loadingCategories ? (
              <ActivityIndicator color={COLORS.primary} style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((c) => {
                  const cId = String(c.id || c.name);
                  const isSelected = categoryId === cId;
                  return (
                    <TouchableOpacity
                      key={cId}
                      style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                      onPress={() => setCategoryId(cId)}
                    >
                      <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                        {c.name || c.title || c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Section: Location & Time */}
          <Text style={styles.sectionHeader}>Location & Schedule</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Venue Name *</Text>
            <TextInput
              style={styles.input}
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g. National Theatre / Laboma Beach"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Street Address / Landmark</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. South Liberia Road, Ministries"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Accra"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Capacity</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
                placeholder="500"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="18:00"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="23:00"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Dress Code</Text>
            <TextInput
              style={styles.input}
              value={dressCode}
              onChangeText={setDressCode}
              placeholder="e.g. All Black, Traditional, Smart Casual"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          {/* Banner URL */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Banner Image URL (Optional)</Text>
            <TextInput
              style={styles.input}
              value={bannerUrl}
              onChangeText={setBannerUrl}
              placeholder="https://images.unsplash.com/..."
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          {/* Section: Ticket Tiers */}
          <View style={styles.tierHeaderRow}>
            <Text style={styles.sectionHeader}>Ticket Tiers</Text>
            <TouchableOpacity onPress={handleAddTier} style={styles.addTierBtn}>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.addTierBtnText}>Add Tier</Text>
            </TouchableOpacity>
          </View>

          {ticketTiers.map((tier, idx) => (
            <View key={idx} style={styles.tierCard}>
              <View style={styles.tierTopRow}>
                <Text style={styles.tierIndexLabel}>Tier #{idx + 1}</Text>
                {ticketTiers.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveTier(idx)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tier Name</Text>
                <TextInput
                  style={styles.input}
                  value={tier.name}
                  onChangeText={(val) => handleUpdateTier(idx, 'name', val)}
                  placeholder="e.g. VIP Table / Early Bird"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Price (GH₵)</Text>
                  <TextInput
                    style={styles.input}
                    value={tier.price}
                    onChangeText={(val) => handleUpdateTier(idx, 'price', val)}
                    keyboardType="numeric"
                    placeholder="100"
                    placeholderTextColor={COLORS.placeholder}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Available Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={tier.capacity}
                    onChangeText={(val) => handleUpdateTier(idx, 'capacity', val)}
                    keyboardType="numeric"
                    placeholder="200"
                    placeholderTextColor={COLORS.placeholder}
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Submit Actions */}
          <View style={styles.submitContainer}>
            <TouchableOpacity
              style={styles.publishBtn}
              onPress={() => handleSubmit(true)}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.buttonText} />
              ) : (
                <Text style={styles.publishBtnText}>Publish Live</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.draftBtn}
              onPress={() => handleSubmit(false)}
              disabled={submitting}
            >
              <Text style={styles.draftBtnText}>Save as Draft</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  container: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
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
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    backgroundColor: COLORS.surface,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  categoryPillTextActive: {
    color: COLORS.white,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  addTierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTierBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tierCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  tierTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tierIndexLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  submitContainer: {
    marginTop: SPACING.xl,
    marginBottom: 60,
  },
  publishBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  publishBtnText: {
    color: COLORS.buttonText,
    fontSize: 14,
    fontWeight: '700',
  },
  draftBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  draftBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
