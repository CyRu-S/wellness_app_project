import React from 'react';
import { useSelector } from 'react-redux';
import FluidTabBar from '../common/FluidTabBar';
import { adminColors, adminFonts } from '../../theme/admin';

const tabs = {
  AdminDashboard: { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  UserList: { label: 'Members', icon: 'people-outline', activeIcon: 'people' },
  MemberAccess: { label: 'Access', icon: 'key-outline', activeIcon: 'key' },
  UserRequests: { label: 'Approvals', icon: 'checkmark-done-outline', activeIcon: 'checkmark-done' },
  Alerts: { label: 'Attention', icon: 'alert-circle-outline', activeIcon: 'alert-circle' },
  NotificationSettings: { label: 'Settings', icon: 'options-outline', activeIcon: 'options' },
};

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
  const pendingApprovals = useSelector((storeState) => storeState.admin.summary.pendingApprovals);
  const attentionCount = useSelector((storeState) => storeState.admin.attention.filter((item) => item.status !== 'RESOLVED').length);

  return <FluidTabBar state={state} descriptors={descriptors} navigation={navigation} tabs={tabs} palette={palette} fonts={adminFonts} badges={{ UserRequests: pendingApprovals, Alerts: attentionCount }} alertRoute="Alerts" />;
}
