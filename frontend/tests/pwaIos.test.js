import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';
import { validatePwaApi } from '../scripts/pwa-config.mjs';

test('PWA builds reject missing, local and insecure APIs before bundling', () => {
  for (const api of [undefined, 'http://localhost:8080/api', 'http://api.example/api', 'https://localhost/api', 'https://api.example', 'https://user:secret@api.example/api']) {
    assert.throws(() => validatePwaApi({ EXPO_PUBLIC_WEB_API_URL: api }), /public HTTPS backend/);
  }
  assert.equal(validatePwaApi({ EXPO_PUBLIC_WEB_API_URL: 'https://api.example/api', EXPO_PUBLIC_API_URL: 'http://localhost:8080/api' }), 'https://api.example/api');
});

test('iOS home screen detection works with navigator.standalone and iPad desktop identification', () => {
  const module = loadModule('../src/services/pwa/registration.web.js', {}, {
    window: {}, navigator: { standalone: true, userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 },
  });
  assert.equal(module.isInstalled(), true);
  assert.equal(module.isIOS(), true);
});

test('web confirmation performs decline or shared access removal only after acceptance', () => {
  let accepted = false, acted = 0, cancelled = 0;
  const { default: Alert } = loadModule('../src/utils/appAlert.web.js', {}, {
    confirm: () => accepted, alert: () => {},
  });
  const buttons = [{ text: 'Keep access', style: 'cancel', onPress: () => cancelled++ },
    { text: 'Remove and save', style: 'destructive', onPress: () => acted++ }];
  Alert.alert('Remove shared access?', 'Member will lose access.', buttons);
  assert.equal(acted, 0); assert.equal(cancelled, 1);
  accepted = true;
  Alert.alert('Remove shared access?', 'Member will lose access.', buttons);
  assert.equal(acted, 1);
});

test('web success alerts run the sign in or return navigation callback after dismissal', () => {
  let dismissed = false, navigated = false;
  const { default: Alert } = loadModule('../src/utils/appAlert.web.js', {}, { alert: () => { dismissed = true; } });
  Alert.alert('Password reset', 'Saved', [{ text: 'Sign in', onPress: () => { assert.equal(dismissed, true); navigated = true; } }]);
  assert.equal(navigated, true);
});

test('web meal photos are resized and encoded as JPEG before upload', async () => {
  let encoded;
  class Image {
    naturalWidth = 4032; naturalHeight = 3024;
    set src(uri) { assert.equal(uri, 'blob:iphone-photo'); this.onload(); }
  }
  const canvas = { getContext: () => ({ drawImage: () => {} }), toDataURL: (mime, quality) => {
    encoded = { mime, quality }; return 'data:image/jpeg;base64,prepared';
  } };
  const { preparePhotoUpload } = loadModule('../src/utils/preparePhotoUpload.web.js', {}, { Image, document: { createElement: () => canvas } });
  const photo = await preparePhotoUpload({ uri: 'blob:iphone-photo' });
  assert.equal(photo.width, 1600); assert.equal(photo.height, 1200);
  assert.equal(photo.mimeType, 'image/jpeg'); assert.equal(encoded.quality, 0.8);
  assert.equal(photo.uri, 'data:image/jpeg;base64,prepared');
});

test('an undecodable iPhone photo gives a recoverable error before upload', async () => {
  class Image { set src(_) { this.onerror(); } }
  const { preparePhotoUpload } = loadModule('../src/utils/preparePhotoUpload.web.js', {}, { Image });
  await assert.rejects(preparePhotoUpload({ uri: 'blob:invalid' }), /Choose a JPEG or PNG/);
});

test('admin web pages mount the gesture refresh wrapper and avoid native keyboard resizing', () => {
  const refresh = { enabled: true, refreshing: false, onRefresh: () => {} };
  const { default: AdminScreen } = loadModule('../src/components/admin/AdminScreen.jsx', {
    react: { __esModule: true, default: { createElement: (type, props, ...children) => ({ type, props, children }) },
      useState: (initial) => [initial(), () => {}], useEffect: () => {} },
    'react-native': { Animated: { Value: class { interpolate() {} }, View: 'AnimatedView' },
      KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'web' }, RefreshControl: 'RefreshControl', ScrollView: 'ScrollView', StyleSheet: { create: (s) => s } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../../hooks/usePageRefresh': { __esModule: true, default: () => refresh }, '../../hooks/useReducedMotion': { __esModule: true, default: () => false },
    '../common/PageRefresh': { __esModule: true, default: 'WebPageRefresh' }, '../../theme/admin': { adminColors: {} },
  });
  const tree = AdminScreen({ children: 'members' });
  const keyboard = tree.children[0], wrapper = keyboard.children[0];
  assert.equal(keyboard.props.behavior, undefined);
  assert.equal(wrapper.type, 'WebPageRefresh'); assert.equal(wrapper.props.onRefresh, refresh.onRefresh);
  assert.equal(wrapper.children[0].props.refreshControl, undefined);
});
