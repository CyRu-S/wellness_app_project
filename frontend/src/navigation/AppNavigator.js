import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { colors, fonts } from '../theme';
import useLiveSync from '../hooks/useLiveSync';
import usePushNotifications from '../hooks/usePushNotifications';
import InAppToast from '../components/common/InAppToast';

const AuthNavigator = lazy(() => import('./AuthNavigator'));
const UserNavigator = lazy(() => import('./UserNavigator'));
const AdminNavigator = lazy(() => import('./AdminNavigator'));

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.surface, text: colors.ink, border: colors.line, primary: colors.accent }, fonts: { regular: { fontFamily: fonts.regular, fontWeight: '400' }, medium: { fontFamily: fonts.medium, fontWeight: '500' }, bold: { fontFamily: fonts.bold, fontWeight: '700' }, heavy: { fontFamily: fonts.bold, fontWeight: '700' } } };
export default function AppNavigator() {
  useLiveSync();
  const navigationRef = useNavigationContainerRef();
  const onReady = usePushNotifications(navigationRef);
  const user = useSelector((state) => state.auth.user);
  return <View style={{ flex: 1 }}><Suspense fallback={<ActivityIndicator accessibilityLabel="Loading your workspace" style={{ flex: 1 }} color={colors.accent} />}><NavigationContainer ref={navigationRef} onReady={onReady} onStateChange={onReady} theme={theme}>{!user ? <AuthNavigator /> : user.role === 'ADMIN' ? <AdminNavigator /> : <UserNavigator />}</NavigationContainer></Suspense>{user ? <InAppToast /> : null}</View>;
}
