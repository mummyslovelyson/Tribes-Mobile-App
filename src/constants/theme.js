/**
 * Tribes & Cliqs Mobile Brand Design Tokens
 * Strictly adheres to project palette:
 * Background: #111417, Cards: #14181C, #171A1D, #1C232B
 * Borders: #2E363E, #242B32, Accent: #b21414, Text: #FFFFFF, #949599
 * Zero emojis across all screens and components.
 */

export const COLORS = {
  // Canonical Project Palette (tailwind.config.js & index.css)
  background: '#1C232B',       // tc-bg: Primary dark canvas
  surface: '#161D22',          // tc-sidebar: Headers, navbars, input containers
  card: '#242B32',             // tc-card: Cards, dialogs, step containers
  cardHover: '#2A323B',
  cardElevated: '#2E363E',
  inputBg: '#161D22',          // Inset input background
  border: '#2E363E',           // Card & container borders
  borderSubtle: '#494F55',     // tc-subtle: Defined dividers & subtle borders
  borderLight: 'rgba(239, 239, 241, 0.12)',

  // Typography
  text: '#EFEFF1',             // tc-text: Primary readable off-white
  textSecondary: '#CBD5E1',    // tc-silver: Secondary text
  textMuted: '#949599',        // tc-muted: Subtle / helper text
  placeholder: '#494F55',      // tc-subtle: Input placeholders

  // Action Buttons & Signature Accent
  primary: '#b21414',          // Signature brand red accent
  primaryHover: '#8F1010',
  primaryMuted: 'rgba(178, 20, 20, 0.15)',
  buttonText: '#FFFFFF',

  // High-Contrast Web Style Button Variant
  buttonLight: '#EFEFF1',
  buttonLightText: '#1C232B',

  // Brand Accents
  accent: '#b21414',
  accentHover: '#8F1010',
  accentMuted: 'rgba(178, 20, 20, 0.15)',
  accentBorder: 'rgba(178, 20, 20, 0.35)',

  brandRed: '#b21414',
  silver: '#CBD5E1',           // tc-silver
  white: '#FFFFFF',

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export default { COLORS, SPACING, RADIUS };
