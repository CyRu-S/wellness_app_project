import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/user/DashboardScreen';
import DailyPlanScreen from '../screens/user/DailyPlanScreen';
import MealsScreen from '../screens/user/MealsScreen';
import MealDetailsScreen from '../screens/user/MealDetailsScreen';
import MealLogScreen from '../screens/user/MealLogScreen';
import MealCaptureScreen from '../screens/user/MealCaptureScreen';
import ActivityTimerScreen from '../screens/user/ActivityTimerScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import { colors, fonts } from '../theme';

const Tab = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
const header = { headerStyle: { backgroundColor: colors.paper }, headerShadowVisible: false, headerTintColor: colors.ink, headerTitle: '', animation: 'slide_from_right', animationDuration: 280, gestureEnabled: true };
function HomeStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} /><Stack.Screen name="Notifications" component={NotificationsScreen} /><Stack.Screen name="Meals" component={MealsScreen} options={{ headerShown: false }} /><Stack.Screen name="MealDetails" component={MealDetailsScreen} /><Stack.Screen name="MealLog" component={MealLogScreen} options={{ headerShown: false }} /><Stack.Screen name="MealCapture" component={MealCaptureScreen} options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} /></Stack.Navigator>; }
function LogStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="MealLogHome" component={MealLogScreen} options={{ headerShown: false }} /><Stack.Screen name="MealCapture" component={MealCaptureScreen} options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} /></Stack.Navigator>; }
const icons = { Today: ['home', 'home-outline'], Plan: ['calendar', 'calendar-outline'], Log: ['add-circle', 'add-circle-outline'], Move: ['walk', 'walk-outline'], Profile: ['person', 'person-outline'] };

function TabIcon({ focused, color, size, names }) {
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));
  useEffect(() => { Animated.spring(progress, { toValue: focused ? 1 : 0, speed: 24, bounciness: 5, useNativeDriver: true }).start(); }, [focused, progress]);
  return (
    <Animated.View style={[styles.tabIcon, focused && styles.tabIconActive, { transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]}>
      <Ionicons name={names[focused ? 0 : 1]} color={color} size={size - 1} />
    </Animated.View>
  );
}

export default function UserNavigator() {
  return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, animation: 'fade', tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: '#78999C', tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel, tabBarItemStyle: styles.tabItem, tabBarIcon: (props) => <TabIcon {...props} names={icons[route.name]} /> })}><Tab.Screen name="Today" component={HomeStack} /><Tab.Screen name="Plan" component={DailyPlanScreen} /><Tab.Screen name="Log" component={LogStack} /><Tab.Screen name="Move" component={ActivityTimerScreen} /><Tab.Screen name="Profile" component={ProfileScreen} /></Tab.Navigator>;
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', left: 12, right: 12, bottom: 10, height: 76, paddingTop: 7, paddingBottom: 9, backgroundColor: colors.ink, borderTopWidth: 0, borderRadius: 26, shadowColor: colors.ink, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 12 },
  tabItem: { paddingHorizontal: 1 }, tabLabel: { fontFamily: fonts.medium, fontSize: 9, marginTop: 1 },
  tabIcon: { width: 34, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, tabIconActive: { backgroundColor: 'rgba(17,184,191,0.13)' },
});
