import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';

const EFFECTIVE_DATE = '1st day of February 2023';

const SECTIONS = [
  {
    num: '1',
    title: 'INFORMATION WE COLLECT AND OBTAIN',
    lead: 'We obtain personal information about you from a variety of sources. This includes personal information you provide to us directly, information we obtain from other sources, and information we gather through automated means.',
    subsections: [
      {
        title: 'Information you provide to us',
        items: [
          'Contact information (such as name, postal address, email address and telephone and/or mobile numbers);',
          'Your payment information, when needed to facilitate certain transactions;',
          'Reviews, comments, and/or surveys on our media blog; and',
          'Other information you may provide to us when you fill a form, such as through our “Contact Us” feature.',
        ],
      },
      {
        title: 'Information obtained from other sources',
        items: [
          'Demographic data (such as gender, age range, educational level, household income range, number of children in household, ethnicity to the extent permitted);',
          'Purchasing data, including information about advertisements you have seen or acted upon and information about your interaction with advertisers’ products and services;',
          'Occupational data (such as profession, position, title, industry; and business address);',
        ],
      },
      {
        title: 'Information Collected by Automated Means through Our Services',
        items: [
          'Your Internet Protocol (IP) address;',
          'Device information, including unique identifiers and connection information, mobile device advertising IDs (e.g., Apple IDFA or Google AAID), and internet connection details;',
          'Your device type and settings, software used, browser type and operating system;',
          'Websites or services visited before and after visiting the Services (referring URL);',
          'Web pages and advertisements viewed, links clicked, and search queries (clickstream);',
          'Viewing behavior, duration, quality of service, and advertisement interactions;',
          'Dates and times you access or use the Services;',
          'Location information (city, state, zip via IP, WiFi triangulation, and precise GPS location with your consent);',
          'Your phone number and mobile carrier details in connection with our mobile app.',
        ],
      },
    ],
  },
  {
    num: '2',
    title: 'COOKIES AND SIMILAR TECHNOLOGIES',
    paragraphs: [
      'Cookies are small files sent to and stored on your device so that your browser or mobile app can be recognized as unique the next time you access the Services. Cookies enable you to receive customized ads, alerts, content, or services. You can adjust your device or browser settings to decline cookies, though some features might not operate properly.',
      'In addition, data-gathering mechanisms such as web beacons, pixels, and tags are used for statistical and administrative functions, measuring traffic and user activity. If you provide your email address, an encrypted hash may be used to deliver relevant updates on external media.',
    ],
  },
  {
    num: '3',
    title: 'HOW WE USE THE INFORMATION WE OBTAIN',
    lead: 'We or service providers acting on our behalf may use the collected information to:',
    items: [
      'Provide our services, including authorizing purchases or completing transactions you request;',
      'Send promotional materials, alerts regarding offers, and communications (including SMS/texts if opted in);',
      'Administer participation in special events, promotions, contests, and market research;',
      'Respond to inquiries from you and law enforcement authorities;',
      'Anonymize personal information to provide aggregated data reports;',
      'Provide customer care and technical support;',
      'Generate personalized suggestions and recommendations;',
      'Operate, evaluate, and improve our services and internal auditing;',
      'Protect against, identify, and prevent fraud and unlawful activities;',
      'Comply with applicable legal requirements, industry standards, and terms of service.',
    ],
  },
  {
    num: '4',
    title: 'DISCLOSURE OF YOUR PERSONAL INFORMATION',
    lead: 'We may disclose your personal information to selected third parties, including:',
    items: [
      'Third-party service providers performing IT and email distribution services;',
      'Professional advisors (accountants, lawyers, consultants);',
      'Prospective buyers or sellers in connection with business asset transactions;',
      'Analytics providers assisting in app and website optimization;',
      'Law enforcement agencies where legally mandated or required to protect public safety and rights.',
    ],
  },
  {
    num: '5',
    title: 'HOW WE HOLD AND PROTECT YOUR PERSONAL INFORMATION',
    paragraphs: [
      'All information you provide to us is stored on our secure servers. Any payment transactions are carried out by secure third parties over encrypted SSL connections.',
      'Where you have chosen a password or have been given credentials, you are responsible for keeping them confidential. Do not share your credentials with anyone.',
      'While internet transmissions cannot be guaranteed 100% impenetrable, we enforce strict security procedures, firewalls, and encryption to prevent unauthorized access.',
    ],
  },
  {
    num: '6',
    title: 'RETENTION OF YOUR PERSONAL INFORMATION',
    paragraphs: [
      'We retain your personal information only as long as necessary for the business purposes described in this policy or to satisfy statutory legal and accounting requirements.',
    ],
  },
  {
    num: '7',
    title: 'WHAT ARE YOUR RIGHTS TO YOUR DATA?',
    lead: 'Your personal information belongs to you. In accordance with Ghana Data Protection Act and GDPR, you have the following rights (we reply within 30 days):',
    items: [
      'Right to access: View, inspect, or receive confirmation of data held on you.',
      'Right to rectify: Correct inaccurate or incomplete personal records.',
      'Right to erase: Request permanent deletion of your data and account.',
      'Right to restrict processing: Limit how your personal data is utilized.',
      'Right to data portability: Request transfer of your data to another controller.',
      'Right to object: Object to specific processing or marketing activities.',
      'Right to withdraw consent: Revoke your processing consent at any time.',
      'Right to lodge a complaint: File an official complaint with our Data Protection Office.',
    ],
  },
  {
    num: '8',
    title: 'ANALYTICS',
    paragraphs: [
      'We utilize analytics services like Google Analytics to track general visitor patterns and app interactions in an aggregated, non-identifying manner.',
    ],
  },
  {
    num: '9',
    title: 'SECURING PRIVACY',
    paragraphs: [
      'Communication between our apps and backends is encrypted using SSL. We employ multi-layer security: data encryption, access restriction, firewalls, and regular employee privacy training.',
    ],
  },
  {
    num: '10',
    title: 'MINORS',
    paragraphs: [
      'We do not knowingly collect personal data from minors under the age of 16. If we discover a minor has registered, we will immediately delete their information. Please notify us at ask@tribesandcliqs.com if you suspect information of a minor is held.',
    ],
  },
  {
    num: '11',
    title: 'CHANGES IN THE PRIVACY STATEMENT',
    paragraphs: [
      'Any changes take effect when we post the revised Privacy Statement. Continued use of the Services signifies acceptance of the revised terms.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const handleEmail = () => {
    Linking.openURL('mailto:ask@tribesandcliqs.com');
  };

  const handlePhone = () => {
    Linking.openURL('tel:+233574555559');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top App Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.heroTitle}>TRIBESANDCLIQS LIMITED</Text>
          <Text style={styles.heroSubtitle}>Official Privacy Statement</Text>
          <Text style={styles.effectiveText}>Effective Date: {EFFECTIVE_DATE}</Text>

          <View style={styles.alertBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertHeading}>PLEASE READ CAREFULLY</Text>
              <Text style={styles.alertBody}>
                If you are under 18 years of age, please read this privacy statement with your parents or guardian. Your use of this service constitutes acceptance of this statement.
              </Text>
            </View>
          </View>
        </View>

        {/* Commitment Cards */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Our Commitment to Your Privacy</Text>
          <Text style={styles.bodyText}>
            At TRIBESANDCLIQS LIMITED, as the data controller under Ghana’s Data Protection Act (Act 843) and EU GDPR, we are committed to maintaining the trust of every user. We never sell, rent, or trade your personal information for marketing purposes.
          </Text>

          <View style={styles.promiseRow}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
            <Text style={styles.promiseText}>
              We will never sell or give away your personal details to third parties.
            </Text>
          </View>
          <View style={styles.promiseRow}>
            <Ionicons name="lock-closed" size={18} color={COLORS.primary} />
            <Text style={styles.promiseText}>
              We employ state-of-the-art encryption to protect your data from unauthorized access.
            </Text>
          </View>
        </View>

        {/* Official Data Controller Box */}
        <View style={styles.contactCard}>
          <Text style={styles.contactHeader}>DATA CONTROLLER CONTACT</Text>
          <Text style={styles.contactCompany}>TRIBESANDCLIQS LIMITED</Text>
          <Text style={styles.contactAddress}>
            7l Police Post Lane, Stadium Rd. Amasaman - Accra | Ghana
          </Text>

          <View style={styles.contactActions}>
            <TouchableOpacity style={styles.contactBtn} onPress={handlePhone}>
              <Ionicons name="call-outline" size={16} color={COLORS.text} />
              <Text style={styles.contactBtnText}>+233 574 555559</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={handleEmail}>
              <Ionicons name="mail-outline" size={16} color={COLORS.text} />
              <Text style={styles.contactBtnText}>ask@tribesandcliqs.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 11 Policy Sections */}
        {SECTIONS.map((sec) => (
          <View key={sec.num} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionNumberCircle}>
                <Text style={styles.sectionNumberText}>{sec.num}</Text>
              </View>
              <Text style={styles.sectionHeadingText}>{sec.title}</Text>
            </View>

            {sec.lead && <Text style={styles.leadText}>{sec.lead}</Text>}

            {/* Subsections if any */}
            {sec.subsections &&
              sec.subsections.map((sub, sIdx) => (
                <View key={sIdx} style={styles.subCard}>
                  <Text style={styles.subTitle}>{sub.title}</Text>
                  {sub.items.map((it, iIdx) => (
                    <View key={iIdx} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{it}</Text>
                    </View>
                  ))}
                </View>
              ))}

            {/* Paragraphs if any */}
            {sec.paragraphs &&
              sec.paragraphs.map((p, pIdx) => (
                <Text key={pIdx} style={styles.bodyText}>
                  {p}
                </Text>
              ))}

            {/* Items if any */}
            {sec.items &&
              sec.items.map((it, itIdx) => (
                <View key={itIdx} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{it}</Text>
                </View>
              ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footerCard}>
          <Ionicons name="shield-checkmark-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.footerTitle}>Have privacy questions or data requests?</Text>
          <Text style={styles.footerSubtitle}>
            Email our Data Protection Office at ask@tribesandcliqs.com
          </Text>
          <TouchableOpacity style={styles.emailButton} onPress={handleEmail}>
            <Text style={styles.emailButtonText}>Email Data Protection Office</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroBadge: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(217, 38, 38, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  effectiveText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 239, 241, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.35)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  alertHeading: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertBody: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm + 2,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  sectionNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(217, 38, 38, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  sectionHeadingText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  leadText: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 20,
  },
  bodyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  promiseText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  contactCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  contactHeader: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactCompany: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  contactAddress: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  contactActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  subCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  subTitle: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs + 2,
    marginTop: 2,
  },
  bulletDot: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  bulletText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  footerCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  footerTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  footerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  emailButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
  },
  emailButtonText: {
    color: COLORS.buttonText,
    fontWeight: '800',
    fontSize: 14,
  },
});
