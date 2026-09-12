import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { setAuthError, signInWithGoogle } from '../store/slices/authSlice';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const platformClientId = Platform.OS === 'android'
  ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim()
  : process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
const configured = Boolean(webClientId && platformClientId);
let googleModule;
let nativeConfigured = false;

function loadGoogleModule() {
  if (googleModule) return googleModule;
  try {
    googleModule = require('react-native-nitro-google-signin');
    return googleModule;
  } catch {
    return null;
  }
}

const configurationMessage = Platform.OS === 'android'
  ? 'Google sign-in needs both the Android OAuth client and a separate Web application OAuth client. Add them to frontend/.env.local, then rebuild the development app.'
  : 'Google sign-in needs both the iOS OAuth client and a separate Web application OAuth client. Add them to frontend/.env.local, then rebuild the development app.';

function friendlyError(error, module) {
  if (!module.isErrorWithCode(error)) return error?.message || 'Google sign-in could not be completed.';
  if (error.code === module.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return 'Google Play Services is unavailable or needs to be updated.';
  if (error.code === module.statusCodes.DEVELOPER_ERROR) return 'Google OAuth is not configured for this app signing certificate. Check the package name, SHA-1, and Web client ID, then rebuild the app.';
  if (error.code === module.statusCodes.IN_PROGRESS) return 'Google sign-in is already in progress.';
  return error.message || 'Google sign-in could not be completed.';
}

export default function useGoogleSignIn(navigation) {
  const dispatch = useDispatch();

  const startGoogleSignIn = useCallback(async () => {
    if (!configured) {
      dispatch(setAuthError(configurationMessage));
      Alert.alert('Google sign-in needs setup', configurationMessage);
      return;
    }

    dispatch(setAuthError(null));
    const module = loadGoogleModule();
    if (!module) {
      const message = 'This installed app does not contain native Google Sign-In. Install a newly built Mr_Care development APK instead of opening the project in Expo Go.';
      dispatch(setAuthError(message));
      Alert.alert('New app build required', message);
      return;
    }

    const {
      GoogleOneTapSignIn,
      isCancelledResponse,
      isNoSavedCredentialFoundResponse,
      isSuccessResponse,
    } = module;

    try {
      if (!nativeConfigured) {
        GoogleOneTapSignIn.configure({
          webClientId,
          ...(Platform.OS === 'ios' ? { iosClientId: platformClientId } : {}),
          autoSelectOnSignIn: false,
        });
        nativeConfigured = true;
      }
      await GoogleOneTapSignIn.checkPlayServices(true);
      let response = await GoogleOneTapSignIn.signIn();
      if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.createAccount();
      if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response) || !response.data.idToken) {
        throw new Error('Google did not return a valid identity token.');
      }

      const result = await dispatch(signInWithGoogle({ idToken: response.data.idToken })).unwrap();
      if (result.status === 'PROFILE_REQUIRED') {
        navigation?.navigate('Register', { googleRegistration: true });
      }
    } catch (error) {
      const message = friendlyError(error, module);
      dispatch(setAuthError(message));
      Alert.alert('Could not sign in', message);
    }
  }, [dispatch, navigation]);

  return { startGoogleSignIn, ready: true };
}
