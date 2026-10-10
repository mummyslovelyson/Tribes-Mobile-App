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
    title: 'USAGE / ELIGIBILITY',
    paragraphs: [
      'You will use this site in a manner consistent with any, and all, applicable laws, legislation, rules and regulations. If you violate any restrictions in these terms, you agree to indemnify TRIBESANDCLIQS for any losses, costs or damages, including reasonable legal fees, incurred by TRIBESANDCLIQS in relation to, or arising out of, such a breach.',
    ],
  },
  {
    num: '2',
    title: 'ACCEPTANCE OF TERMS',
    paragraphs: [
      'These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you” or “your” or “user”) and TRIBESANDCLIQS LTD (“TRIBESANDCLIQS”, “we”, “us” or “our”), concerning your access to and use of the website and mobile applications. You agree that by accessing the Site and or use the application, you have read, understood, and agree to be bound by the terms and conditions and Privacy Policy incorporated. IF YOU DO NOT AGREE WITH ALL OF THESE TOU, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.',
      'By accepting these conditions, you also agree and understand that ours is a platform for event listings and ticket sales, and you agree to release us from any liability that may arise as a result of an event organized by a registered organizer on the platform.',
      'In these Terms, “you” and “your” refer to the individual or entity that uses the Site, or Services. “We”, “us”, or “our” refer to TRIBESANDCLIQS. In addition, in these Terms, unless the context requires otherwise, words in one gender include all genders and words in the singular include the plural and vice-versa.',
    ],
  },
  {
    num: '3',
    title: 'ABOUT TRIBESANDCLIQS SERVICES',
    paragraphs: [
      'TRIBESANDCLIQS is an online self-ticketing platform that allows you to easily curate events and give your visitors with the best booking experience possible. We assist individuals in sharing, discovering, and participating in activities that link their interests and enliven their lives. Our ultimate objective is to unite people from all walks of life via live experiences, from festivals and corporate events to fundraisers, concerts, personal event invitations and everything in between.',
      'We hope to become your go-to place for curating and purchasing online tickets for any event. We attempt to make the planning and purchasing process as simple and straightforward as possible. We are also committed to staying on the cutting edge of technology, always upgrading and developing our platform to give our clients with the greatest possible experience.',
    ],
  },
  {
    num: '4',
    title: 'ACCEPTABLE USES',
    lead: 'By registering your event on the Website, you agree that you are solely responsible for any and all acts and omissions that occur while you use the Website, and you agree not to engage in unacceptable use of the Website. TRIBESANDCLIQS reserves the right to permanently remove your content, your event listing and or your account from TRIBESANDCLIQS, for any reason and to take any legal action that is otherwise necessary to enforce this Agreement. This includes unacceptable use of the Service, violations of this Agreement, or violation of the terms of services of our payment processors.',
    paragraphs: [
      'TRIBESANDCLIQS has sole discretion over what is deemed acceptable or unacceptable use. Your content must be genuine, honest and not fraudulent. You may not use the Website to post content (including photos, logos, videos and copy) or engage in any conduct that is fraudulent, offensive, illegal, harmful, or inappropriate for general audiences and further agree that you will not:',
    ],
    items: [
      'Behave in an abusive manner to any other user of the Website;',
      'Violate any venue or Event Organizer’s rules at events or violate any applicable third-party terms of service (for instance, when using our mobile applications);',
      'Contact or invite contact with other users of the Website for any reason other than the purpose for which you received the user’s contact information;',
      'Use the Buyer’s personal data for any reason other than the delivery of tickets unless otherwise agreed to by the Buyer;',
      'Breach or circumvent any laws, third party rights or the Additional Terms and Conditions;',
      'Post false, inaccurate, misleading, defamatory or libellous content;',
      'Fail to fulfill your contractual obligations regarding the sale or purchase of a ticket;',
      'Use our trademarks without our prior written permission;',
      'Copy, reproduce, reverse engineer, modify, create derivative works from, distribute or publicly display any content (except for your information) or software from the Website or our Service without our prior express written permission and the appropriate third party, as applicable;',
      'Use any robot, spider, scraper or other automated means to access the Website or our Service for any purpose without our express written permission;',
      'Take any action that imposes or may impose (to be determined in our sole discretion) an unreasonable or disproportionately large load on our infrastructure;',
      'Interfere or attempt to interfere with the proper working of the Website or our Service or any activities conducted on or with the Website or our Service;',
      'Bypass our robot exclusion headers, robots.txt rules or any other measures we may use to prevent or restrict access to the Website or our Service; or',
      'Do anything else that we determine, in our sole reasonable discretion, misuses the Website or our Service or otherwise negatively impacts our marketplace.',
    ],
    prohibitedCategories: [
      'Lotteries, auctions and games of chance;',
      'Adult content or sexually related services, including escort services or Pornography;',
      'Illegal services or illicit substances;',
      'Travel and transportation services; or',
      'High risk businesses or services.',
    ],
    closing:
      'TRIBESANDCLIQS monitors the Website’s content and takes every effort to ensure that it conforms with the terms of this Agreement. TRIBESANDCLIQS offers event organizers a ticketing and registration platform via which they may sell tickets to their own events. The Website may not be used to resell or sell tickets to any event that you are not the owner or organizer of. You may not use the Website to sell tangible items or merchandise unless it is in connection with an event hosted on the Website.',
  },
  {
    num: '5',
    title: 'EMAIL RULES',
    lead: 'If you use email through the website to communicate, you represent and agree that:',
    items: [
      'You have the right and authority to send emails to the addresses on your recipient list and such addresses were gathered in accordance with email marketing regulations in the recipient’s country of residence;',
      'Your emails are not sent in violation of any privacy policy under which the recipient emails were gathered;',
      'You will use email in compliance with all applicable local, state, provincial, national and other laws, rules and regulations, including those relating to spam and email;',
      'You will only use email, through the Website, to advertise, promote and/or manage a bona fide event listed on the Service;',
      'Your use of email and the content of your emails complies with this Agreement (including Unacceptable Use rules);',
      'You will not use false or misleading headers or deceptive subject lines in your emails;',
      'You will respond immediately and in accordance with instructions to any email sent to you by TRIBESANDCLIQS requesting you to modify a consumer’s email preferences; and',
      'You will provide an accessible and unconditional unsubscribe link for inclusion in every email where one is required, and you will not send any emails to any recipient who has unsubscribed from your mailing list.',
    ],
    closing:
      'If you violate any of these rules regarding use of email, or if your use results in excessive bounce rates or complaints, TRIBESANDCLIQS may limit or suspend your access to email provided through the Website.',
  },
  {
    num: '6',
    title: 'EXCLUSION OF LIABILITY FOR EXTERNAL LINKS',
    paragraphs: [
      'The Website may provide links to external Internet sites. TRIBESANDCLIQS hereby declares explicitly that it has no influence on the layout or content of linked pages and dissociates itself expressly from all contents of all linked pages of third parties. TRIBESANDCLIQS shall not be liable for the use or content of Internet sites that link to this site or which are linked from it. Our privacy and cookie notice do not apply to any collection and processing of your personal data on or through such external sites.',
    ],
  },
  {
    num: '7',
    title: 'INTELLECTUAL PROPERTY',
    paragraphs: [
      'Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the “Content”) and the trademarks, service marks, and logos contained therein (the “Marks”) are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws of Ghana, foreign jurisdictions, and international conventions.',
      'The Content and the Marks are provided on the Site “AS IS” for your information and personal use only. Except as expressly provided in these Terms of Use, no part of the Site and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.',
      'Provided that you are eligible to use the Site, you are granted a limited license to access and use the Site and to download or print a copy of any portion of the Content to which you have properly gained access solely for your personal, non-commercial use. We reserve all rights not expressly granted to you in and to the Site, the Content, and the Marks.',
    ],
  },
  {
    num: '8',
    title: 'YOUR REPRESENTATIONS',
    lead: 'By using the Site, you represent and warrant that:',
    items: [
      '(1) All registration information you submit will be true, accurate, current, and complete;',
      '(2) You will maintain the accuracy of such information and promptly update such registration information as necessary;',
      '(3) You have the legal capacity and you agree to comply with these Terms of Use;',
      '(4) You are not under the age of 18;',
      '(5) You are not a minor in the jurisdiction of which you reside, or if a minor, you have received parental permission to use the Site;',
      '(6) You will not access the Site through automated or non-human means, whether through a bot, script, or otherwise;',
      '(7) You will not use the Site for any illegal or unauthorized purpose; and',
      '(8) Your use of the Site will not violate any applicable law or regulation.',
    ],
    closing:
      'If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Site (or any portion thereof).',
  },
  {
    num: '9',
    title: 'ACCURACY, COMPLETENESS AND TIMELINESS OF INFORMATION',
    paragraphs: [
      'We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only and should not be relied upon or used as the sole basis for making decisions without consulting primary, more accurate, more complete or timelier sources of information. Any reliance on the material on this site is at your own risk.',
      'This site may contain certain historical information. Historical information, necessarily, is not current and is provided for your reference only. We reserve the right to modify the contents of this site at any time, but we have no obligation to update any information on our site. You agree that it is your responsibility to monitor changes to our site, including these Terms of Service and the Privacy Policy.',
    ],
  },
  {
    num: '10',
    title: 'SCOPE OF OFFERINGS',
    paragraphs: [
      'TRIBESANDCLIQS may periodically make improvements, add, change, and/or update the information and documents on the Website without notice. TRIBESANDCLIQS assumes no liability or responsibility whatsoever for any errors or omissions, including technical inaccuracies and typographical errors, in the content of the Website. Information we publish on the Website may contain references or cross references to certain TRIBESANDCLIQS products, programs, or services that are unannounced or only available in Ghana. Such references do not imply that TRIBESANDCLIQS intends to announce or make available such products, programs, or services in any other jurisdiction.',
    ],
  },
  {
    num: '11',
    title: 'TERM OF SALE',
    paragraphs: [
      'Each ticket purchased by Buyer is a license to attend a specific event granted by the Event Organizer. ALL SALES ARE FINAL; NO REFUNDS OR EXCHANGES. Tickets sold through the Website grant a revocable license to the Buyer that may be revoked at any time for any reason without compensation. Resale or attempted resale of any ticket issued hereunder at a price higher than the face value appearing thereon is grounds for seizure and cancellation without compensation.',
      'The Buyer assumes all risk or danger incidental to the attraction, whether occurring prior to, during, or subsequent to, the actual attraction. The terms of sale of each ticket issued pursuant to a Transaction initiated on the Website are subject to any and all terms imposed by the applicable Event Organizer. In order to be admitted to an event, each Buyer must present the original ticket in its original, undamaged, unaltered form, to the applicable venue at the appropriate time.',
      'Entry may be refused for various reasons, including misconduct, failure to comply with any safety and health policies required by the venue where you will attend any event, intoxication, etc., as determined by the Event Organizer (in its sole discretion). If you are refused entry for any such reason, you shall not be eligible for any refund or compensation from TRIBESANDCLIQS.',
    ],
  },
  {
    num: '12',
    title: 'FEES & MODE OF PAYMENT',
    paragraphs: [
      'You agree to pay all fees in accordance with the fee descriptions published by TRIBESANDCLIQS on the Website and any other fees applicable to a Transaction. Fees are subject to change without prior notice at any time, so you should review the fees each time you use the Website. Payments of transactions on the site can be done with the use of MOBILE MONEY, DEBIT OR CREDIT CARD, PAYPAL, and/or SWIPE.',
      'Notwithstanding anything to the contrary herein, in the event of any refunds of Transactions by an Event Organizer (or the cancellation of any events associated with such Transactions) and/or any Force Majeure event, you agree that TRIBESANDCLIQS shall be entitled to retain any fees charged by TRIBESANDCLIQS in connection with its processing and facilitation of any such Transactions.',
    ],
  },
  {
    num: '13',
    title: 'NO WARRANTIES / LIMITATION OF LIABILITY / ASSUMPTION OF RISK',
    paragraphs: [
      'ALL TRIBESANDCLIQS SERVICES, INCLUDING THE INFORMATION, CONTENT, THE SERVICE AND MATERIALS MADE AVAILABLE BY THIRD PARTY SERVICE PROVIDERS ARE PROVIDED “AS IS” WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED. TRIBESANDCLIQS DISCLAIMS ALL WARRANTIES IN CONNECTION THEREWITH, INCLUDING, WITHOUT LIMITATION, ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'IN NO EVENT SHALL TRIBESANDCLIQS BE LIABLE FOR ANY SPECIAL, INDIRECT, CONSEQUENTIAL, INCIDENTAL DAMAGES OR SIMILAR DAMAGES, OR DAMAGES FOR LOST PROFITS, LOST REVENUE, OR LOSS OF DATA OR ITS USE, ARISING OUT OF OR RELATING TO THE TRIBESANDCLIQS WEBSITE OR OTHERWISE, WHETHER IN CONTRACT OR TORT, INCLUDING NEGLIGENCE, STATUTORY OR OTHERWISE.',
      'IN THE EVENT TRIBESANDCLIQS IS LIABLE FOR ANY DAMAGES ARISING IN CONNECTION WITH THE WEBSITE OR OTHERWISE, SUCH LIABILITY SHALL BE LIMITED TO DIRECT DAMAGES NOT TO EXCEED THE FEES ACTUALLY RECEIVED BY TRIBESANDCLIQS FOR THE AFFECTED TRANSACTIONS.',
      'TRIBESANDCLIQS DISCLAIMS ANY AND ALL LIABILITY FOR THE ACTS, OMISSIONS OR CONDUCT OF ANY THIRD PARTIES IN CONNECTION WITH OR RELATED TO ANY TRANSACTION OR YOUR USE OF THE WEBSITE OR THE SERVICE. ATTENDING ANY EVENT FOR WHICH TICKETS MAY BE PURCHASED ON OR THROUGH THE WEBSITE IS A POTENTIALLY DANGEROUS ACTIVITY AND INVOLVES THE RISK OF SERIOUS INJURY, DISABILITY, DEATH, AND/OR PROPERTY DAMAGE.',
      'YOU FURTHER ACKNOWLEDGE THAT YOU ARE AWARE OF THE HIGHLY CONTAGIOUS NATURE OF BACTERIAL AND VIRAL DISEASES, INCLUDING COVID-19, AND AGREE TO ACCEPT AND ASSUME ALL RISKS ARISING FROM ATTENDING EVENTS, WHETHER CAUSED BY THE ORDINARY NEGLIGENCE OF TRIBESANDCLIQS OR OTHERWISE. YOU EXPRESSLY WAIVE AND RELEASE ANY AND ALL CLAIMS AGAINST TRIBESANDCLIQS AND ITS OFFICERS, EMPLOYEES, AGENTS, AND AFFILIATES.',
      'YOU AGREE TO INDEMNIFY AND HOLD HARMLESS TRIBESANDCLIQS FROM AND AGAINST ANY LOSSES, COSTS, PAYMENTS, DAMAGES, LIABILITIES AND EXPENSES (INCLUDING REASONABLE ATTORNEY’S FEES) ARISING OUT OF YOUR BREACH OF THESE TERMS, USE OF THE SERVICE, OR ATTENDANCE AT ANY EVENT.',
    ],
  },
  {
    num: '14',
    title: 'CLAIMS OF COPYRIGHT INFRINGEMENT (DMCA)',
    paragraphs: [
      'Under the Digital Millennium Copyright Act of 1998 (the “DMCA”), if you believe in good faith that any content on the Website infringes your copyright, you may send us a notice requesting that the content be removed. The notice must include:',
    ],
    items: [
      '(a) Your (or your agent’s) physical or electronic signature;',
      '(b) Identification of the copyrighted work claimed to have been infringed;',
      '(c) Identification of the content claimed to be infringing and reasonably sufficient location information;',
      '(d) Your name, address, telephone number, and email address;',
      '(e) A statement that you have a good faith belief that the use is not authorized; and',
      '(f) A statement under penalty of perjury that the information is accurate and you are authorized to act on behalf of the copyright owner.',
    ],
    closing:
      'Notices and counter-notices should be sent to: ask@tribesandcliqs.com. There can be penalties for false claims under the DMCA.',
  },
  {
    num: '15',
    title: 'FORCE MAJEURE',
    paragraphs: [
      'We shall not be deemed in default or otherwise liable under this Agreement due to our inability to perform our obligations by reason of any act of God, fire, earthquake, substantial snowstorm, flood, epidemic, pandemic, accident, explosion, casualty, strike, lockout, labor controversy, riot, civil disturbance, act of public enemy, embargo, war, any law ordinance or regulation, legal order, or any failure or delay of transportation, power, or communications system beyond our control.',
    ],
  },
  {
    num: '16',
    title: 'CHANGES',
    paragraphs: [
      'If TRIBESANDCLIQS decides to change these general terms and conditions, we will post the changed terms and conditions on the Website. You are advised to regularly check whether they have changed. Existing contracts will not be affected by such changes.',
    ],
  },
  {
    num: '17',
    title: 'GOVERNING LAW AND JURISDICTION',
    paragraphs: [
      'This general terms and conditions in relation to the use of the site is hereby governed by, and constructed and enforced in accordance with the laws of Ghana. The competent courts in Ghana shall have the exclusive jurisdiction to resolve any dispute between you and TRIBESANDCLIQS.',
    ],
  },
];

export default function TermsOfServiceScreen() {
  const router = useRouter();

  const handleEmailPress = () => {
    Linking.openURL('mailto:ask@tribesandcliqs.com?subject=Terms%20of%20Service%20Inquiry');
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+233574555559');
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://tribesandcliqs.com');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
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
            <Ionicons name="document-text" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>TRIBESANDCLIQS LIMITED</Text>
          <Text style={styles.heroSubtitle}>Terms and Conditions of Service</Text>
          <Text style={styles.effectiveText}>Effective: {EFFECTIVE_DATE}</Text>

          <View style={styles.alertBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertHeading}>LEGALLY BINDING AGREEMENT</Text>
              <Text style={styles.alertBody}>
                By accessing, browsing, registering, or using TRIBESANDCLIQS applications and services, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy.
              </Text>
            </View>
          </View>
        </View>

        {/* Company Registration Details */}
        <View style={styles.contactCard}>
          <Text style={styles.contactHeader}>REGISTERED ENTITY</Text>
          <Text style={styles.contactCompany}>TRIBESANDCLIQS LIMITED</Text>
          <Text style={styles.contactAddress}>
            7l Police Post Lane, Stadium Rd.{'\n'}
            Amasaman - Accra | Republic of Ghana
          </Text>

          <View style={styles.contactActions}>
            <TouchableOpacity style={styles.contactBtn} onPress={handlePhonePress}>
              <Ionicons name="call-outline" size={14} color={COLORS.primary} />
              <Text style={styles.contactBtnText}>+233 574 555559</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={handleEmailPress}>
              <Ionicons name="mail-outline" size={14} color={COLORS.primary} />
              <Text style={styles.contactBtnText}>ask@tribesandcliqs.com</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={handleWebsitePress}>
              <Ionicons name="globe-outline" size={14} color={COLORS.primary} />
              <Text style={styles.contactBtnText}>tribesandcliqs.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Core Promises / Disclaimers */}
        <View style={styles.promiseRow}>
          <Ionicons name="checkmark-done-circle" size={20} color={COLORS.primary} />
          <Text style={styles.promiseText}>
            TRIBESANDCLIQS is a self-ticketing platform for organizers and attendees. All ticket sales are final and subject to individual event organizer policies.
          </Text>
        </View>

        {/* 17 Numbered Legal Sections */}
        {SECTIONS.map((section) => (
          <View key={section.num} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionNumberCircle}>
                <Text style={styles.sectionNumberText}>{section.num}</Text>
              </View>
              <Text style={styles.sectionHeadingText}>{section.title}</Text>
            </View>

            {section.lead && <Text style={styles.leadText}>{section.lead}</Text>}

            {section.paragraphs?.map((para, pIdx) => (
              <Text key={pIdx} style={styles.bodyText}>
                {para}
              </Text>
            ))}

            {section.items && (
              <View style={{ gap: SPACING.xs, marginTop: SPACING.xs }}>
                {section.items.map((item, iIdx) => (
                  <View key={iIdx} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {section.prohibitedCategories && (
              <View style={styles.prohibitedCard}>
                <View style={styles.prohibitedHeaderRow}>
                  <Ionicons name="warning-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.prohibitedTitle}>EXPRESSLY PROHIBITED ACTIVITIES & SERVICES</Text>
                </View>
                <View style={{ gap: 4, marginTop: 4 }}>
                  {section.prohibitedCategories.map((cat, cIdx) => (
                    <View key={cIdx} style={styles.bulletRow}>
                      <Text style={[styles.bulletDot, { color: COLORS.textSecondary }]}>✕</Text>
                      <Text style={styles.bulletText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {section.closing && (
              <Text style={[styles.bodyText, { marginTop: SPACING.xs }]}>
                {section.closing}
              </Text>
            )}
          </View>
        ))}

        {/* Footer Card */}
        <View style={styles.footerCard}>
          <Ionicons name="scale-outline" size={32} color={COLORS.primary} />
          <Text style={styles.footerTitle}>Questions or Legal Inquiries?</Text>
          <Text style={styles.footerSubtitle}>
            Our team is available to assist organizers and attendees regarding our terms and policies.
          </Text>

          <TouchableOpacity style={styles.emailButton} onPress={handleEmailPress}>
            <Text style={styles.emailButtonText}>Email Legal &amp; Compliance Team</Text>
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
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm + 2,
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
  prohibitedCard: {
    backgroundColor: 'rgba(203, 213, 225, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.25)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    gap: 4,
  },
  prohibitedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  prohibitedTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
