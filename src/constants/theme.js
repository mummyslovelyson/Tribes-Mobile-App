/**
 * Tribes & Cliqs Mobile Brand Design Tokens
 * Strictly adheres to official logo palette:
 * Background/Canvas: #1C232B, Surfaces: #161D22, Cards: #242B32, #2E363E
 * Borders: #2E363E, #3A444E
 * Logo Typography & Highlights: Crisp Off-White #EFEFF1, Pure White #FFFFFF
 * Metallic Silver: #CBD5E1, Slate Gray: #949599
 * Zero foreign colors (no red, green, blue, pink, or amber).
 */

export const COLORS = {
  // Canonical Logo Palette
  background: '#1C232B',       // Primary dark slate canvas from logo background
  surface: '#161D22',          // Headers, navbars, input containers
  card: '#242B32',             // Elevated cards & containers
  cardHover: '#2A323B',
  cardElevated: '#2E363E',
  inputBg: '#161D22',          // Inset input background
  border: '#2E363E',           // Card & container borders
  borderSubtle: '#3A444E',     // Defined dividers & subtle borders
  borderLight: 'rgba(239, 239, 241, 0.12)',

  // Typography (Exact Logo Spectrum)
  text: '#EFEFF1',             // Primary readable off-white ("TRIBES", "CLIQS")
  textSecondary: '#CBD5E1',    // Metallic silver (emblem feathers & ampersand)
  textMuted: '#949599',        // Slate gray ("LIVING THE MOMENT" subtitle & inner ring)
  placeholder: '#555E68',      // Input placeholders

  // Action Buttons & Signature Highlight
  primary: '#EFEFF1',          // Primary brand white highlight
  primaryHover: '#FFFFFF',
  primaryMuted: 'rgba(239, 239, 241, 0.12)',
  buttonText: '#1C232B',       // Dark high-contrast text on primary buttons

  // Secondary Button Variant
  buttonLight: '#242B32',
  buttonLightText: '#EFEFF1',

  // Brand Accents
  accent: '#CBD5E1',           // Metallic silver accent
  accentHover: '#EFEFF1',
  accentMuted: 'rgba(203, 213, 225, 0.12)',
  accentBorder: 'rgba(203, 213, 225, 0.30)',

  brandRed: '#EFEFF1',         // Backward-compat alias mapping to brand white
  silver: '#CBD5E1',           // Metallic silver
  white: '#FFFFFF',            // Pure white
  slate: '#949599',            // Slate gray

  // Status Colors (Strictly Logo Palette)
  success: '#EFEFF1',
  warning: '#CBD5E1',
  error: '#949599',
  info: '#CBD5E1',
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
