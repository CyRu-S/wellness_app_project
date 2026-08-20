import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import GetStartedScreen from '../screens/auth/GetStartedScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
export default function AuthNavigator() {
  return <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper }, animation: 'fade_from_bottom', animationDuration: 360 }}><Stack.Screen name="Splash" component={SplashScreen} /><Stack.Screen name="Onboarding" component={OnboardingScreen} /><Stack.Screen name="GetStarted" component={GetStartedScreen} /><Stack.Screen name="Login" component={LoginScreen} /><Stack.Screen name="Register" component={RegisterScreen} /></Stack.Navigator>;
}
