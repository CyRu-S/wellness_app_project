import 'react-native-gesture-handler';
import React from 'react';
import { useFonts } from 'expo-font';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { store } from './src/store';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Chillax-Regular': require('./assets/fonts/Chillax-Regular.otf'),
    'Chillax-Medium': require('./assets/fonts/Chillax-Medium.otf'),
    'Chillax-Semibold': require('./assets/fonts/Chillax-Semibold.otf'),
    'Chillax-Bold': require('./assets/fonts/Chillax-Bold.otf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}

