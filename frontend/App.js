import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Text, TextInput, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { store } from './src/store';
import { restoreSession } from './src/store/slices/authSlice';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'Chillax-Regular' }, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: 'Chillax-Regular' }, TextInput.defaultProps.style];

function AppContent() {
  const dispatch = useDispatch();
  const bootstrapped = useSelector((state) => state.auth.bootstrapped);
  useEffect(() => { dispatch(restoreSession()); }, [dispatch]);
  if (!bootstrapped) return <View style={{ flex: 1, backgroundColor: '#002E36' }} />;
  return <AppNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Chillax-Regular': require('./assets/fonts/Chillax-Regular.otf'),
    'Chillax-Medium': require('./assets/fonts/Chillax-Medium.otf'),
    'Chillax-Semibold': require('./assets/fonts/Chillax-Semibold.otf'),
    'Chillax-Bold': require('./assets/fonts/Chillax-Bold.otf'),
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#002E36' }} />;

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}
