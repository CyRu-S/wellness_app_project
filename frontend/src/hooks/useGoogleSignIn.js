import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { setAuthError, signInWithGoogle } from '../store/slices/authSlice';

WebBrowser.maybeCompleteAuthSession();

const clientIds = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
};

const isConfigured = () => {
  if (Platform.OS === 'android') return Boolean(clientIds.androidClientId);
  if (Platform.OS === 'ios') return Boolean(clientIds.iosClientId);
  return Boolean(clientIds.webClientId);
};

export default function useGoogleSignIn(navigation) {
  const dispatch = useDispatch();
  const configured = isConfigured();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    ...clientIds,
    selectAccount: true,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.authentication?.idToken || response.params?.id_token;
      if (idToken) dispatch(signInWithGoogle({ idToken })).unwrap()
        .then((result) => {
          if (result.status === 'PROFILE_REQUIRED') navigation?.navigate('Register', { googleRegistration: true });
        })
        .catch((error) => Alert.alert('Could not sign in', error.message));
      else dispatch(setAuthError('Google did not return a valid identity token. Please try again.'));
    } else if (response.type === 'error') {
      dispatch(setAuthError(response.error?.message || 'Google sign-in could not be completed.'));
    }
  }, [dispatch, navigation, response]);

  const startGoogleSignIn = async () => {
    if (!configured) {
      const message = 'Add the Mr_Care Google OAuth client IDs to the environment before starting the app.';
      dispatch(setAuthError(message));
      Alert.alert('Google sign-in needs setup', message);
      return;
    }
    dispatch(setAuthError(null));
    await promptAsync();
  };

  return { startGoogleSignIn, ready: configured && Boolean(request) };
}
