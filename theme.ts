import { Platform } from 'react-native';

export const Colors = {
  // Deep charcoal background ramp
  bg: {
    900: '#0B0E14',
    800: '#11151E',
    700: '#161B26',
    600: '#1C2230',
    500: '#222938',
    400: '#2A3142',
  },
  // Slate blue accents
  accent: {
    50: '#EAF0FF',
    100: '#D2DEFF',
    300: '#7E96D6',
    400: '#5C78C8',
    500: '#3E5BB0',
    600: '#2E4790',
    700: '#213571',
  },
  // Neutrals
  text: {
    primary: '#F2F5FB',
    secondary: '#A6B0C4',
    tertiary: '#6B7591',
    inverse: '#0B0E14',
  },
  // Status ramps
  success: {
    400: '#3FB98C',
    500: '#27A06B',
    600: '#1B8053',
  },
  warning: {
    400: '#F2C94C',
    500: '#E0A93B',
    600: '#B9852A',
  },
  error: {
    400: '#FF6B6B',
    500: '#E5484D',
    600: '#B3303A',
  },
  urgent: {
    400: '#FF4D4D',
    500: '#E0383B',
    600: '#A8232A',
  },
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.14)',
  overlay: 'rgba(0,0,0,0.55)',
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  hero: { fontFamily: 'Inter-Bold', fontSize: 30, lineHeight: 36 },
  h1: { fontFamily: 'Inter-Bold', fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: 'Inter-SemiBold', fontSize: 19, lineHeight: 25 },
  h3: { fontFamily: 'Inter-SemiBold', fontSize: 16, lineHeight: 22 },
  body: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19 },
  caption: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 16 },
  mono: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 18 },
};

export const isWeb = Platform.OS === 'web';
