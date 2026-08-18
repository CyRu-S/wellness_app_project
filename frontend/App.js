import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Text, TextInput, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { store } from './src/store';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'Chillax-Regular' }, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: 'Chillax-Regular' }, TextInput.defaultProps.style];

export default function App() {
  const [fontsLoaded] = useFonts({
    'Chillax-Regular': require('./assets/fonts/Chillax-Regular.ttf'),
    'Chillax-Medium': require('./assets/fonts/Chillax-Medium.ttf'),
    'Chillax-Semibold': require('./assets/fonts/Chillax-Semibold.ttf'),
    'Chillax-Bold': require('./assets/fonts/Chillax-Bold.ttf'),
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#002E36' }} />;

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
