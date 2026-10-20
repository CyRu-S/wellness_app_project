import React from 'react';
import FluidTabBar from '../common/FluidTabBar';
import { colors, fonts } from '../../theme';
import { useLanguage } from '../../i18n/LanguageContext';

const palette = {
  surface: colors.surface,
  dock: colors.surfaceMuted,
  line: colors.line,
  active: colors.tealDark,
  muted: colors.muted,
  accent: colors.tealMid,
  alert: colors.danger,
};

export default function UserTabBar({ state, descriptors, navigation }) {
  const { t } = useLanguage();
  const tabs = {
    Today: { label: t('today'), icon: 'home-outline', activeIcon: 'home' },
    Log: { label: t('log'), icon: 'camera-outline', activeIcon: 'camera' },
    Move: { label: t('move'), icon: 'walk-outline', activeIcon: 'walk' },
    Shared: { label: t('shared'), icon: 'people-outline', activeIcon: 'people' },
    Profile: { label: t('profile'), icon: 'person-outline', activeIcon: 'person' },
  };
  return <FluidTabBar state={state} descriptors={descriptors} navigation={navigation} tabs={tabs} palette={palette} fonts={fonts} />;
}
