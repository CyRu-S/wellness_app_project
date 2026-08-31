export const colors = {
  paper: '#F3F5F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8F4',
  ink: '#08383D',
  muted: '#71888A',
  line: '#DDEBE9',
  accent: '#009AA3',
  accentSoft: '#DDF4F3',
  moss: '#075F67',
  tealDark: '#075F67',
  tealMid: '#009AA3',
  navy: '#08383D',
  gold: '#D99A2B',
  white: '#FFFFFF',
  danger: '#E65B52',
  dangerSoft: '#FBE9E7',
  inkSoft: '#153C3D',
  mist: '#E8F0EC',
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 12, md: 18, lg: 24, xl: 28, pill: 999 };
export const fonts = { regular: 'Chillax-Regular', medium: 'Chillax-Medium', semibold: 'Chillax-Semibold', bold: 'Chillax-Bold' };
export const type = {
  display: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 39, letterSpacing: -1.1 },
  h1: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 35, letterSpacing: -0.9 },
  h2: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, letterSpacing: 1.2, textTransform: 'uppercase' },
};

export const shadows = {
  soft: { shadowColor: '#164B4C', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  raised: { shadowColor: '#164B4C', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
};

export const cards = {
  surface: {
    backgroundColor: '#D8E8E4',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 32,
    borderBottomRightRadius: 22,
    borderBottomLeftRadius: 32,
    ...shadows.soft,
  },
  featured: {
    overflow: 'hidden',
    borderRadius: 28,
    ...shadows.raised,
  },
};
