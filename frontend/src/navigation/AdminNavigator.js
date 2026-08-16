import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminTabBar from '../components/admin/AdminTabBar';
import AdminApprovalsScreen from '../screens/admin/AdminApprovalsScreen';
import AdminAttentionScreen from '../screens/admin/AdminAttentionScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminListScreen from '../screens/admin/AdminListScreen';
import AdminMealInsightsScreen from '../screens/admin/AdminMealInsightsScreen';
import AdminMembersScreen from '../screens/admin/AdminMembersScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import UserDetailsScreen from '../screens/admin/UserDetailsScreen';
import useReducedMotion from '../hooks/useReducedMotion';
import { adminColors } from '../theme/admin';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const variants = {
  DietPlans: 'plans',
  Products: 'products',
};

const Variant = ({ route, navigation }) => (
  <AdminListScreen kind={variants[route.name]} navigation={navigation} />
);

function AdminTabs() {
  const reduceMotion = useReducedMotion();
  return (
    <Tab.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: adminColors.canvas },
        animation: reduceMotion ? 'fade' : 'shift',
        transitionSpec: { animation: 'timing', config: { duration: reduceMotion ? 120 : 260 } },
      }}
      tabBar={(props) => <AdminTabBar {...props} />}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Reports" component={AdminMealInsightsScreen} />
      <Tab.Screen name="Alerts" component={AdminAttentionScreen} />
      <Tab.Screen name="UserList" component={AdminMembersScreen} />
      <Tab.Screen name="UserRequests" component={AdminApprovalsScreen} />
      <Tab.Screen name="NotificationSettings" component={AdminSettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: adminColors.canvas },
        headerShadowVisible: false,
        headerTintColor: adminColors.ink,
        headerTitle: '',
        contentStyle: { backgroundColor: adminColors.canvas },
      }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      {Object.keys(variants).map((name) => <Stack.Screen key={name} name={name} component={Variant} />)}
      <Stack.Screen name="UserDetails" component={UserDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminProfile" component={AdminProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
