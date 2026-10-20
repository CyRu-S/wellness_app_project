import React from 'react';
import { useSelector } from 'react-redux';
import FluidTabBar from '../common/FluidTabBar';
import { adminColors, adminFonts } from '../../theme/admin';
import { useLanguage } from '../../i18n/LanguageContext';

const palette = {
  surface: adminColors.surface,
  dock: adminColors.surfaceMuted,
  line: adminColors.line,
  active: adminColors.deepTeal,
  muted: adminColors.muted,
  accent: adminColors.teal,
  alert: adminColors.coral,
};

export default function AdminTabBar({ state, descriptors, navigation }) {
  const { t } = useLanguage();
  const pendingApprovals = useSelector((storeState) => storeState.admin.summary.pendingApprovals);
  const attentionCount = useSelector((storeState) => storeState.admin.attention.filter((item) => item.status !== 'RESOLVED').length);

  const tabs = {
    AdminDashboard: { label: t('home'), icon: 'home-outline', activeIcon: 'home' },
    UserList: { label: t('members'), icon: 'people-outline', activeIcon: 'people' },
    MemberAccess: { label: t('access'), icon: 'key-outline', activeIcon: 'key' },
    UserRequests: { label: t('approvals'), icon: 'checkmark-done-outline', activeIcon: 'checkmark-done' },
    Alerts: { label: t('attention'), icon: 'alert-circle-outline', activeIcon: 'alert-circle' },
    NotificationSettings: { label: t('settings'), icon: 'options-outline', activeIcon: 'options' },
  };
  return <FluidTabBar state={state} descriptors={descriptors} navigation={navigation} tabs={tabs} palette={palette} fonts={adminFonts} badges={{ UserRequests: pendingApprovals, Alerts: attentionCount }} alertRoute="Alerts" />;
}
