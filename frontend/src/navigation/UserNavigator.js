import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UserTabBar from '../components/user/UserTabBar';
import DashboardScreen from '../screens/user/DashboardScreen';
import MealsScreen from '../screens/user/MealsScreen';
import MealDetailsScreen from '../screens/user/MealDetailsScreen';
import MealLogScreen from '../screens/user/MealLogScreen';
import MealCaptureScreen from '../screens/user/MealCaptureScreen';
import ActivityTimerScreen from '../screens/user/ActivityTimerScreen';
import NotificationsScreen from '../screens/user/NotificationsScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import BodyDetailsScreen from '../screens/user/BodyDetailsScreen';
import EditProfileScreen from '../screens/user/EditProfileScreen';
import HealthPreferencesScreen from '../screens/user/HealthPreferencesScreen';
import PrivacyDataScreen from '../screens/user/PrivacyDataScreen';
import SharedMembersScreen from '../screens/user/SharedMembersScreen';
import SharedMemberTodayScreen from '../screens/user/SharedMemberTodayScreen';
import SharedPhotoScreen from '../screens/user/SharedPhotoScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
const header = { headerStyle: { backgroundColor: colors.paper }, headerShadowVisible: false, headerTintColor: colors.ink, headerTitle: '', animation: 'slide_from_right', animationDuration: 280, gestureEnabled: true };
function HomeStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} /><Stack.Screen name="Notifications" component={NotificationsScreen} /><Stack.Screen name="Meals" component={MealsScreen} options={{ headerShown: false }} /><Stack.Screen name="MealDetails" component={MealDetailsScreen} /><Stack.Screen name="MealLog" component={MealLogScreen} options={{ headerShown: false }} /><Stack.Screen name="MealCapture" component={MealCaptureScreen} options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} /></Stack.Navigator>; }
function LogStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="MealLogHome" component={MealLogScreen} options={{ headerShown: false }} /><Stack.Screen name="MealCapture" component={MealCaptureScreen} options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} /></Stack.Navigator>; }
function ProfileStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} /><Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} /><Stack.Screen name="BodyDetails" component={BodyDetailsScreen} options={{ headerShown: false }} /><Stack.Screen name="HealthPreferences" component={HealthPreferencesScreen} options={{ headerShown: false }} /><Stack.Screen name="PrivacyData" component={PrivacyDataScreen} options={{ headerShown: false }} /></Stack.Navigator>; }
function SharedStack() { return <Stack.Navigator screenOptions={header}><Stack.Screen name="SharedMembers" component={SharedMembersScreen} options={{ headerShown: false }} /><Stack.Screen name="SharedMemberToday" component={SharedMemberTodayScreen} options={{ headerShown: false }} /><Stack.Screen name="SharedPhoto" component={SharedPhotoScreen} options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} /></Stack.Navigator>; }
export default function UserNavigator() {
  return <Tab.Navigator screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: colors.paper } }} tabBar={(props) => <UserTabBar {...props} />}><Tab.Screen name="Today" component={HomeStack} /><Tab.Screen name="Log" component={LogStack} /><Tab.Screen name="Move" component={ActivityTimerScreen} /><Tab.Screen name="Shared" component={SharedStack} /><Tab.Screen name="Profile" component={ProfileStack} /></Tab.Navigator>;
}
