import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/user/DashboardScreen';
import DailyPlanScreen from '../screens/user/DailyPlanScreen';
import MealsScreen from '../screens/user/MealsScreen';
import MealDetailsScreen from '../screens/user/MealDetailsScreen';
import ActivityTimerScreen from '../screens/user/ActivityTimerScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
const header = { headerStyle: { backgroundColor: colors.paper }, headerShadowVisible: false, headerTintColor: colors.ink, headerTitle: '' };
function HomeStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} /><Stack.Screen name="Notifications" component={NotificationsScreen} /></Stack.Navigator>; }
function MealsStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="MealList" component={MealsScreen} options={{ headerShown: false }} /><Stack.Screen name="MealDetails" component={MealDetailsScreen} /></Stack.Navigator>; }
const icons = { Today: ['home', 'home-outline'], Plan: ['checkmark-circle', 'checkmark-circle-outline'], Meals: ['restaurant', 'restaurant-outline'], Move: ['walk', 'walk-outline'], Profile: ['person', 'person-outline'] };
export default function UserNavigator() {
  return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.ink, tabBarInactiveTintColor: '#8B9892', tabBarStyle: { height: 72, paddingTop: 7, paddingBottom: 10, backgroundColor: colors.surface, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' }, tabBarIcon: ({ focused, color, size }) => <Ionicons name={icons[route.name][focused ? 0 : 1]} color={color} size={size} /> })}><Tab.Screen name="Today" component={HomeStack} /><Tab.Screen name="Plan" component={DailyPlanScreen} /><Tab.Screen name="Meals" component={MealsStack} /><Tab.Screen name="Move" component={ActivityTimerScreen} /><Tab.Screen name="Profile" component={ProfileScreen} /></Tab.Navigator>;
}

