import React from 'react';
import FluidTabBar from '../common/FluidTabBar';
import { colors, fonts } from '../../theme';

const tabs = {
  Today: { label: 'Today', icon: 'home-outline', activeIcon: 'home' },
  Log: { label: 'Log', icon: 'camera-outline', activeIcon: 'camera' },
  Move: { label: 'Move', icon: 'walk-outline', activeIcon: 'walk' },
  Shared: { label: 'Shared', icon: 'people-outline', activeIcon: 'people' },
  Profile: { label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
};

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
  return <FluidTabBar state={state} descriptors={descriptors} navigation={navigation} tabs={tabs} palette={palette} fonts={fonts} />;
}
