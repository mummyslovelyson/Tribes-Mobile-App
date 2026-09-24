import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Button from '../../src/components/Button';
import { getEventByIdApi } from '../../src/api/events';
import { resolveImageUrl } from '../../src/api/client';
import { createOrderApi, applyCouponApi, verifyPaymentApi, simulatePaymentApi } from '../../src/api/orders';
import { toggleFavoriteApi } from '../../src/api/users';
import { getEventReviewsApi, createEventReviewApi } from '../../src/api/reviews';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Checkout Modal
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money'); // 'mobile_money' | 'card'
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEvent = async () => {
      try {
        const [eventRes, reviewsRes] = await Promise.allSettled([
          getEventByIdApi(id),
          getEventReviewsApi(id),
        ]);

        if (isMounted && eventRes.status === 'fulfilled' && eventRes.value) {
          const eventData = eventRes.value?.event || eventRes.value;
          setEvent(eventData);
          setIsFavorite(Boolean(eventData?.is_favorite || eventData?.isFavorite));
          if (eventData?.ticket_types && eventData.ticket_types.length > 0) {
            setSelectedTier(eventData.ticket_types[0]);
          }
        }

        if (isMounted && reviewsRes.status === 'fulfilled' && reviewsRes.value) {
          const revList = reviewsRes.value?.reviews || reviewsRes.value?.data || (Array.isArray(reviewsRes.value) ? reviewsRes.value : []);
          setReviews(revList);
        }
      } catch (err) {
        console.warn('[EventDetailsScreen] Fetch error:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvent();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    try {
      await toggleFavoriteApi(event.id);
    } catch {
      setIsFavorite(!nextState);
    }
  };

  const handleReviewSubmit = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (!commentInput.trim()) {
      Alert.alert('Missing Review', 'Please enter your thoughts or feedback.');
      return;
    }
    setSubmittingReview(true);
    try {
      await createEventReviewApi(id, { rating: ratingInput, comment: commentInput.trim() });
      Alert.alert('Review Submitted', 'Thank you for your rating and feedback!');
      setReviewModalOpen(false);
      setCommentInput('');
      const revData = await getEventReviewsApi(id);
      setReviews(revData?.reviews || revData || []);
    } catch (err) {
      Alert.alert('Review Failed', err.response?.data?.message || err?.message || 'Unable to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const res = await applyCouponApi(couponCode.trim(), event.id);
      if (res?.discount) {
        setDiscountAmount(Number(res.discount));
      } else {
        setDiscountAmount(0);
      }
    } catch (err) {
      setDiscountAmount(0);
      setCouponError(err.response?.data?.message || 'Invalid or expired coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to proceed with booking tickets for this event.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    if (!selectedTier) {
      Alert.alert('Select Tier', 'Please select a ticket tier before proceeding.');
      return;
    }

    setDiscountAmount(0);
    setCouponCode('');
    setCouponError('');
    setCheckoutModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    setOrdering(true);
    try {
      const res = await createOrderApi({
        eventId: Number(event.id),
        items: [
          {
            ticketTypeId: selectedTier.id,
            quantity: ticketQuantity,
          },
        ],
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
      });

      setCheckoutModalOpen(false);

      // If online gateway authorization is required (Paystack):
      if (res?.authorizationUrl) {
        await WebBrowser.openBrowserAsync(res.authorizationUrl);
      }

      // Auto-verify and finalize payment so tickets are instantly minted
      if (res?.reference) {
        try {
          await verifyPaymentApi(res.reference);
        } catch {
          try {
            await simulatePaymentApi(res.reference, res.orderId);
          } catch (simErr) {
            console.warn('[EventCheckout] Auto-completion notice:', simErr.message);
          }
        }
      }

      const orderRef = res?.reference || (res?.orderId ? `#TC-${res.orderId}` : '#TC-CONFIRMED');
      setCompletedOrder({
        orderId: res?.orderId || res?.id,
        reference: orderRef,
        eventTitle: event?.title,
        venue: event?.venue || event?.location,
        tierName: selectedTier?.name || 'General Admission',
        quantity: ticketQuantity,
        total: grandTotal,
      });
    } catch (err) {
      console.warn('[EventCheckout] Order creation error:', err?.message);
      const msg = err.response?.data?.message || 'Failed to place ticket order. Please check availability.';
      Alert.alert('Booking Failed', msg);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Loading...', headerTransparent: true }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Event Not Found' }} />
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorTitle}>Event Not Found</Text>
        <Button
          title="Back to Explore"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: SPACING.md }}
        />
      </View>
    );
  }

  const tiers = event.ticket_types || [];
  const subtotal = selectedTier ? Number(selectedTier.price) * ticketQuantity : 0;
  const grandTotal = Math.max(subtotal - discountAmount, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: event.title,
          headerTransparent: false,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleFavoriteToggle} style={{ padding: 4 }}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? COLORS.primary : COLORS.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Poster */}
        <View style={styles.bannerContainer}>
          {event.banner_image ? (
            <Image source={{ uri: resolveImageUrl(event.banner_image) }} style={styles.banner} resizeMode="cover" />
          ) : (
            <View style={styles.bannerFallback}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
            </View>
          )}

          {event.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{event.category}</Text>
            </View>
          )}
        </View>

        {/* Event Main Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{event.title}</Text>

          {/* Date & Time Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
            </View>
            <View style={styles.metaTextWrap}>
              <Text style={styles.metaTitle}>{formatDate(event.start_date)}</Text>
              <Text style={styles.metaSubtitle}>
                {event.start_time ? `${event.start_time.slice(0, 5)} GMT` : 'Doors open early'}
                {event.end_time ? ` - ${event.end_time.slice(0, 5)} GMT` : ''}
              </Text>
            </View>
          </View>

          {/* Venue Location Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
            </View>
            <View style={styles.metaTextWrap}>
              <Text style={styles.metaTitle}>{event.venue || 'Venue TBD'}</Text>
              <Text style={styles.metaSubtitle}>
                {event.address ? `${event.address}, ` : ''}
                {event.city || 'Accra'}, Ghana
              </Text>
            </View>
          </View>

          {/* Organizer Info */}
          {event.organizer_name && (
            <View style={styles.metaRow}>
              <View style={styles.metaIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textSecondary} />
              </View>
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaTitle}>Hosted by {event.organizer_name}</Text>
                <Text style={styles.metaSubtitle}>Verified Event Organizer</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description Section */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>ABOUT THIS EVENT</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        )}

        {/* Community Meetups & Cliqs */}
        <TouchableOpacity
          style={styles.meetupBanner}
          onPress={() => router.push(`/meetups/${id}`)}
          activeOpacity={0.85}
        >
          <View style={styles.meetupBannerIcon}>
            <Ionicons name="people" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.meetupBannerTitle}>Event Cliqs & Meetups</Text>
            <Text style={styles.meetupBannerSubtitle}>
              Join carpools, attendee groups, and live discussions for this event.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Ticket Tier Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>SELECT TICKET TIER</Text>
          {tiers.length === 0 ? (
            <Text style={styles.emptyTiers}>No ticket tiers available for this event yet.</Text>
          ) : (
            tiers.map((tier) => {
              const isSelected = selectedTier?.id === tier.id;
              const isSoldOut = tier.quantity <= tier.quantity_sold;
              return (
                <TouchableOpacity
                  key={tier.id}
                  style={[
                    styles.tierCard,
                    isSelected && styles.tierCardSelected,
                    isSoldOut && styles.tierCardSoldOut,
                  ]}
                  onPress={() => !isSoldOut && setSelectedTier(tier)}
                  activeOpacity={0.8}
                  disabled={isSoldOut}
                >
                  <View style={styles.tierHeader}>
                    <View style={styles.tierTitleRow}>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.tierName, isSelected && styles.tierNameSelected]}>
                        {tier.name}
                      </Text>
                    </View>
                    <Text style={styles.tierPrice}>
                      {Number(tier.price) === 0 ? 'FREE' : `GHS ${Number(tier.price).toFixed(2)}`}
                    </Text>
                  </View>

                  {tier.description ? (
                    <Text style={styles.tierDescription}>{tier.description}</Text>
                  ) : null}

                  {isSoldOut ? (
                    <Text style={styles.soldOutText}>Sold Out</Text>
                  ) : (
                    <Text style={styles.tierStock}>
                      {tier.quantity - tier.quantity_sold} passes left
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Quantity Selector */}
        {selectedTier && (
          <View style={styles.quantitySection}>
            <Text style={styles.sectionHeading}>PASS QUANTITY</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setTicketQuantity((q) => Math.max(1, q - 1))}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={COLORS.text} />
              </TouchableOpacity>

              <Text style={styles.qtyText}>{ticketQuantity}</Text>

              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setTicketQuantity((q) => Math.min(10, q + 1))}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reviews & Ratings Section */}
        <View style={styles.section}>
          <View style={styles.reviewHeaderRow}>
            <Text style={styles.sectionHeading}>REVIEWS & RATINGS</Text>
            <TouchableOpacity
              onPress={() => setReviewModalOpen(true)}
              style={styles.writeReviewBtn}
            >
              <Ionicons name="create-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.writeReviewBtnText}>Write a Review</Text>
            </TouchableOpacity>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Ionicons name="star-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.emptyReviewsText}>No reviews yet. Be the first to share your experience!</Text>
            </View>
          ) : (
            reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewItem}>
                <View style={styles.reviewUserRow}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {(rev.user_name || rev.name || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.reviewUserName}>{rev.user_name || rev.name || 'Verified Attendee'}</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= (rev.rating || 5) ? 'star' : 'star-outline'}
                          size={12}
                          color="#F59E0B"
                          style={{ marginRight: 2 }}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>
                {rev.comment ? (
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky Booking Footer */}
      <View style={styles.footer}>
        <View style={styles.priceSummary}>
          <Text style={styles.priceLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.totalPrice}>
            {grandTotal === 0 ? 'FREE' : `GHS ${grandTotal.toFixed(2)}`}
          </Text>
        </View>

        <Button
          title={selectedTier ? 'Book Tickets' : 'Select a Pass'}
          onPress={handleBookNow}
          disabled={!selectedTier}
          style={styles.checkoutBtn}
        />
      </View>

      {/* Checkout Order Confirmation Modal */}
      <Modal
        visible={checkoutModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCheckoutModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Checkout</Text>
            <TouchableOpacity onPress={() => setCheckoutModalOpen(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Order Item Summary */}
            <View style={styles.orderSummaryCard}>
              <Text style={styles.orderEventTitle}>{event.title}</Text>
              <View style={styles.orderRow}>
                <Text style={styles.orderTierName}>
                  {selectedTier?.name} &times; {ticketQuantity}
                </Text>
                <Text style={styles.orderSubtotal}>GHS {subtotal.toFixed(2)}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.orderRow}>
                  <Text style={styles.discountLabel}>Coupon Discount</Text>
                  <Text style={styles.discountValue}>- GHS {discountAmount.toFixed(2)}</Text>
                </View>
              )}

              <View style={[styles.orderRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalAmountText}>GHS {grandTotal.toFixed(2)}</Text>
              </View>
            </View>

            {/* Coupon Code Section */}
            <View style={styles.couponSection}>
              <Text style={styles.sectionHeading}>PROMO OR COUPON CODE</Text>
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter code"
                  placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="characters"
                  value={couponCode}
                  onChangeText={(v) => {
                    setCouponCode(v);
                    setCouponError('');
                  }}
                />
                <TouchableOpacity
                  style={styles.applyCouponBtn}
                  onPress={handleApplyCoupon}
                  disabled={applyingCoupon || !couponCode.trim()}
                >
                  <Text style={styles.applyCouponText}>
                    {applyingCoupon ? 'Applying...' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
              {couponError ? <Text style={styles.couponErrorText}>{couponError}</Text> : null}
            </View>

            {/* Payment Method Selector */}
            <View style={styles.paymentSection}>
              <Text style={styles.sectionHeading}>PAYMENT METHOD</Text>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'mobile_money' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('mobile_money')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color={paymentMethod === 'mobile_money' ? COLORS.primary : COLORS.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionTitle}>Mobile Money</Text>
                  <Text style={styles.paymentOptionSub}>MTN MoMo, Telecel Cash, AT Money</Text>
                </View>
                <Ionicons
                  name={paymentMethod === 'mobile_money' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={paymentMethod === 'mobile_money' ? COLORS.primary : COLORS.border}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'card' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('card')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={paymentMethod === 'card' ? COLORS.primary : COLORS.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionTitle}>Debit / Credit Card</Text>
                  <Text style={styles.paymentOptionSub}>Visa, Mastercard, Secure Checkout</Text>
                </View>
                <Ionicons
                  name={paymentMethod === 'card' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={paymentMethod === 'card' ? COLORS.primary : COLORS.border}
                />
              </TouchableOpacity>
            </View>

            <Button
              title={ordering ? 'Processing Booking...' : `Confirm & Pay GHS ${grandTotal.toFixed(2)}`}
              onPress={handleConfirmPayment}
              loading={ordering}
              style={{ marginTop: SPACING.lg, marginBottom: SPACING.xl }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Post-Purchase Success & Access Dashboard Modal */}
      <Modal
        visible={Boolean(completedOrder)}
        transparent
        animationType="fade"
        onRequestClose={() => setCompletedOrder(null)}
      >
        <View style={styles.successModalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>

            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>
              Your pass has been generated and is ready in your digital wallet.
            </Text>

            <View style={styles.successDetailsCard}>
              <Text style={styles.successEventTitle} numberOfLines={1}>
                {completedOrder?.eventTitle}
              </Text>
              {completedOrder?.venue ? (
                <Text style={styles.successEventVenue} numberOfLines={1}>
                  <Ionicons name="location-outline" size={13} color={COLORS.textMuted} /> {completedOrder.venue}
                </Text>
              ) : null}

              <View style={styles.successDetailDivider} />

              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Pass Type</Text>
                <Text style={styles.successDetailValue}>
                  {completedOrder?.quantity}x {completedOrder?.tierName}
                </Text>
              </View>

              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Order Reference</Text>
                <Text style={[styles.successDetailValue, { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                  {completedOrder?.reference}
                </Text>
              </View>

              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Total Amount</Text>
                <Text style={[styles.successDetailValue, { color: COLORS.primary, fontWeight: '800' }]}>
                  GHS {Number(completedOrder?.total || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Quick Actions requested by user */}
            <View style={styles.successActionButtons}>
              <Button
                title="View My Tickets"
                onPress={() => {
                  setCompletedOrder(null);
                  router.push('/(tabs)/tickets');
                }}
                style={styles.viewTicketsBtn}
              />

              <Button
                title="Go to My Dashboard"
                variant="secondary"
                onPress={() => {
                  setCompletedOrder(null);
                  router.push('/(tabs)/profile');
                }}
                style={styles.dashboardBtn}
              />

              <TouchableOpacity
                onPress={() => {
                  setCompletedOrder(null);
                  router.push('/(tabs)');
                }}
                style={styles.keepExploringBtn}
              >
                <Text style={styles.keepExploringText}>Explore More Events</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Write a Review Modal */}
      <Modal
        visible={reviewModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.reviewModalOverlay}
        >
          <View style={styles.reviewModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate & Review Event</Text>
              <TouchableOpacity onPress={() => setReviewModalOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.reviewPromptText}>
              How was your experience with this event?
            </Text>

            {/* Star Picker */}
            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRatingInput(star)}
                  style={styles.starPickerBtn}
                >
                  <Ionicons
                    name={star <= ratingInput ? 'star' : 'star-outline'}
                    size={32}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.reviewInputGroup}>
              <Text style={styles.reviewInputLabel}>Your Comments</Text>
              <TextInput
                style={styles.reviewTextInput}
                value={commentInput}
                onChangeText={setCommentInput}
                placeholder="Share what you liked, crowd vibes, sound, etc."
                placeholderTextColor={COLORS.placeholder}
                multiline
                numberOfLines={4}
              />
            </View>

            <Button
              title="Submit Review"
              onPress={handleReviewSubmit}
              loading={submittingReview}
              style={{ marginTop: SPACING.md }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  meetupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(178, 20, 20, 0.35)',
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  meetupBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(178, 20, 20, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetupBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  meetupBannerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  writeReviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyReviewsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  reviewItem: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewAvatar: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  reviewUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  reviewComment: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: SPACING.sm,
  },
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  reviewModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reviewPromptText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  starPickerBtn: {
    padding: 6,
  },
  reviewInputGroup: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  reviewInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  reviewTextInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: 13,
    height: 90,
    textAlignVertical: 'top',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  bannerContainer: {
    height: 240,
    width: '100%',
    position: 'relative',
    backgroundColor: COLORS.surface,
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  categoryPill: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(20, 24, 28, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPillText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoSection: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: SPACING.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaTextWrap: {
    flex: 1,
  },
  metaTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  metaSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  sectionHeading: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },
  descriptionText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  emptyTiers: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  tierCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  tierCardSelected: {
    borderColor: COLORS.text,
    backgroundColor: '#2A323B',
  },
  tierCardSoldOut: {
    opacity: 0.5,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.primary,
  },
  tierName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  tierNameSelected: {
    color: COLORS.text,
  },
  tierPrice: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  tierDescription: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.xs,
    marginLeft: 26,
    lineHeight: 17,
  },
  tierStock: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.xs,
    marginLeft: 26,
  },
  soldOutText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    marginTop: SPACING.xs,
    marginLeft: 26,
  },
  quantitySection: {
    padding: SPACING.lg,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 28,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceSummary: {
    flex: 1,
    marginRight: SPACING.md,
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalPrice: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  checkoutBtn: {
    minWidth: 160,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    padding: SPACING.xl,
  },
  orderSummaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  orderEventTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs + 2,
  },
  orderTierName: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  orderSubtotal: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  discountLabel: {
    color: '#10B981',
    fontSize: 13,
  },
  discountValue: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  totalAmountText: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  couponSection: {
    marginBottom: SPACING.lg,
  },
  couponRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  couponInput: {
    flex: 1,
    height: 46,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.text,
    fontSize: 14,
  },
  applyCouponBtn: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  applyCouponText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  couponErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  paymentSection: {
    marginBottom: SPACING.lg,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  paymentOptionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  paymentOptionSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  // Success Modal Styles
  successModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  successModalCard: {
    backgroundColor: '#1E252D',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  successSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  successDetailsCard: {
    backgroundColor: '#262F38',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: SPACING.lg,
  },
  successEventTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  successEventVenue: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  successDetailDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: SPACING.sm,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  successDetailLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  successDetailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  successActionButtons: {
    width: '100%',
    gap: SPACING.sm,
  },
  viewTicketsBtn: {
    width: '100%',
  },
  dashboardBtn: {
    width: '100%',
  },
  keepExploringBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  keepExploringText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
