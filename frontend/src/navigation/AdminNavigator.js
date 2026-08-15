import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminListScreen from '../screens/admin/AdminListScreen';
import UserDetailsScreen from '../screens/admin/UserDetailsScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const variants = {
  UserRequests: 'requests', UserList: 'users', DietPlans: 'plans', Products: 'products', Alerts: 'alerts', Reports: 'reports', NotificationSettings: 'settings',
};
const Variant = ({ route, navigation }) => <AdminListScreen kind={variants[route.name]} navigation={navigation} />;
export default function AdminNavigator() {
  return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerShadowVisible: false, headerTintColor: colors.ink, headerTitle: '', contentStyle: { backgroundColor: colors.paper } }}><Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />{Object.keys(variants).map((name) => <Stack.Screen key={name} name={name} component={Variant} />)}<Stack.Screen name="UserDetails" component={UserDetailsScreen} /><Stack.Screen name="AdminProfile" component={ProfileScreen} /></Stack.Navigator>;
}

