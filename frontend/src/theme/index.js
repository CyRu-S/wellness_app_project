export const colors = {
  paper: '#F5F8F3',
  surface: '#FFFFFF',
  ink: '#073B3A',
  muted: '#708580',
  line: '#DCE8E2',
  accent: '#27C3B2',
  accentSoft: '#DDF5EF',
  moss: '#08796F',
  tealDark: '#075D59',
  tealMid: '#18A99E',
  navy: '#073B3A',
  gold: '#D8AA42',
  white: '#FFFFFF',
  danger: '#C55B68',
  inkSoft: '#164C49',
  mist: '#EAF2ED',
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 10, md: 18, lg: 28, pill: 999 };
export const fonts = { regular: 'Chillax-Regular', medium: 'Chillax-Medium', semibold: 'Chillax-Semibold', bold: 'Chillax-Bold' };
export const type = {
  display: { fontFamily: fonts.semibold, fontSize: 42, lineHeight: 45, letterSpacing: -1.8 },
  h1: { fontFamily: fonts.semibold, fontSize: 31, lineHeight: 35, letterSpacing: -1 },
  h2: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 1.7, textTransform: 'uppercase' },
};

export const shadows = {
  soft: { shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  raised: { shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
};
