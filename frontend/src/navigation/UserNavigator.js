import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/user/DashboardScreen';
import MealsScreen from '../screens/user/MealsScreen';
import MealDetailsScreen from '../screens/user/MealDetailsScreen';
import MealLogScreen from '../screens/user/MealLogScreen';
import MealCaptureScreen from '../screens/user/MealCaptureScreen';
import ActivityTimerScreen from '../screens/user/ActivityTimerScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import BodyDetailsScreen from '../screens/user/BodyDetailsScreen';
import SharedMembersScreen from '../screens/user/SharedMembersScreen';
import SharedMemberTodayScreen from '../screens/user/SharedMemberTodayScreen';
import SharedPhotoScreen from '../screens/user/SharedPhotoScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
const header = { headerStyle: { backgroundColor: colors.paper }, headerShadowVisible: false, headerTintColor: colors.ink, headerTitle: '', animation: 'slide_from_right', animationDuration: 280, gestureEnabled: true };
function HomeStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} /><Stack.Screen name="Notifications" component={NotificationsScreen} /><Stack.Screen name="Meals" component={MealsScreen} options={{ headerShown: false }} /><Stack.Screen name="MealDetails" component={MealDetailsScreen} /><Stack.Screen name="MealLog" component={MealLogScreen} options={{ headerShown: false }} /><Stack.Screen name="MealCapture" component={MealCaptureScreen} options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} /></Stack.Navigator>; }
function LogStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="MealLogHome" component={MealLogScreen} options={{ headerShown: false }} /><Stack.Screen name="MealCapture" component={MealCaptureScreen} options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} /></Stack.Navigator>; }
function ProfileStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} /><Stack.Screen name="BodyDetails" component={BodyDetailsScreen} options={{ headerShown: false }} /></Stack.Navigator>; }
function SharedStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="SharedMembers" component={SharedMembersScreen} options={{ headerShown: false }} /><Stack.Screen name="SharedMemberToday" component={SharedMemberTodayScreen} options={{ headerShown: false }} /><Stack.Screen name="SharedPhoto" component={SharedPhotoScreen} options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} /></Stack.Navigator>; }
const icons = { Today: ['home', 'home-outline'], Log: ['camera', 'camera-outline'], Move: ['walk', 'walk-outline'], Shared: ['people', 'people-outline'], Profile: ['person', 'person-outline'] };

function TabIcon({ focused, color, size, names }) {
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => { Animated.spring(progress, { toValue: focused ? 1 : 0, speed: 24, bounciness: 5, useNativeDriver: true }).start(); }, [focused, progress]);
  return (
    <Animated.View style={[styles.tabIcon, focused && styles.tabIconActive, { transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>
      <Ionicons name={names[focused ? 0 : 1]} color={color} size={size - 1} />
      {focused ? <Animated.View style={[styles.activeMark, { opacity: progress }]} /> : null}
    </Animated.View>
  );
}

export default function UserNavigator() {
  return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: '#78999C', tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel, tabBarItemStyle: styles.tabItem, tabBarIcon: (props) => <TabIcon {...props} names={icons[route.name]} /> })}><Tab.Screen name="Today" component={HomeStack} /><Tab.Screen name="Log" component={LogStack} /><Tab.Screen name="Move" component={ActivityTimerScreen} /><Tab.Screen name="Shared" component={SharedStack} /><Tab.Screen name="Profile" component={ProfileStack} /></Tab.Navigator>;
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', left: 9, right: 9, bottom: 9, height: 72, paddingTop: 7, paddingBottom: 8, backgroundColor: colors.surface, borderTopWidth: 0, borderWidth: 1, borderColor: colors.line, borderRadius: 23, shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 12 },
  tabItem: { paddingHorizontal: 1 }, tabLabel: { fontFamily: fonts.medium, fontSize: 8, marginTop: 1 },
  tabIcon: { width: 35, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, tabIconActive: { backgroundColor: colors.accentSoft },
  activeMark: { position: 'absolute', bottom: -3, width: 12, height: 2, borderRadius: 1, backgroundColor: colors.tealMid },
});
