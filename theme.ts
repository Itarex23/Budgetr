export const colors = {
  background: '#06061D',
  surface: '#14142E',
  surfaceRaised: '#202041',
  surfaceMuted: '#2B2B4A',
  border: '#29294A',
  text: '#F8F8FF',
  textMuted: '#C7C7E5',
  textDim: '#9292BC',
  primary: '#7650F5',
  primaryPressed: '#6742DD',
  secondary: '#31E59B',
  accent: '#A79BFF',
  success: '#31E59B',
  warning: '#F5C85B',
  error: '#FF7187',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const typography = {
  display: 36,
  title: 26,
  heading: 20,
  body: 16,
  caption: 13,
  micro: 11,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;
