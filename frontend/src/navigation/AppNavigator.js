import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AuthNavigator from './AuthNavigator';
import UserNavigator from './UserNavigator';
import AdminNavigator from './AdminNavigator';
import { colors, fonts } from '../theme';
import useLiveSync from '../hooks/useLiveSync';
import usePushNotifications from '../hooks/usePushNotifications';
import InAppToast from '../components/common/InAppToast';

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.surface, text: colors.ink, border: colors.line, primary: colors.accent }, fonts: { regular: { fontFamily: fonts.regular, fontWeight: '400' }, medium: { fontFamily: fonts.medium, fontWeight: '500' }, bold: { fontFamily: fonts.bold, fontWeight: '700' }, heavy: { fontFamily: fonts.bold, fontWeight: '700' } } };
export default function AppNavigator() {
  useLiveSync();
  const navigationRef = useNavigationContainerRef();
  const onReady = usePushNotifications(navigationRef);
  const user = useSelector((state) => state.auth.user);
  return <View style={{ flex: 1 }}><NavigationContainer ref={navigationRef} onReady={onReady} onStateChange={onReady} theme={theme}>{!user ? <AuthNavigator /> : user.role === 'ADMIN' ? <AdminNavigator /> : <UserNavigator />}</NavigationContainer>{user ? <InAppToast /> : null}</View>;
}
