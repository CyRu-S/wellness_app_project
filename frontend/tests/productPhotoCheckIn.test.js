import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';
import * as mealAnalysis from '../src/utils/mealAnalysis.js';

function captureScreen(meal, result, { cameraSupported = true, grantPermission = true, outsideFood = false } = {}) {
  const values = [], refs = [], posts = [], visits = [], alerts = [];
  let permissionRequests = 0, captures = 0;
  const permission = { granted: false };
  let stateIndex = 0, refIndex = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useEffect: () => {},
    useState: (initial) => {
      const index = stateIndex++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
      return [values[index], (value) => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
    },
    useRef: (initial) => refs[refIndex++] ||= { current: initial },
  };
  class Value { setValue() {} interpolate() {} }
  const state = { meals: { items: meal ? [meal] : [], pendingPost: null }, auth: { token: 'token', user: { id: 1 } } };
  const postMeal = (payload) => { posts.push(payload); return payload; };
  postMeal.fulfilled = { match: () => false };
  const Screen = loadModule('../src/screens/user/MealCaptureScreen.jsx', {
    react: { ...react, default: react, __esModule: true },
    'react-native': { Animated: { Value }, Image: 'Image', KeyboardAvoidingView: 'KeyboardAvoidingView',
      Platform: { OS: 'web' }, Pressable: 'Pressable', ScrollView: 'ScrollView',
      StyleSheet: { create: (value) => value }, useWindowDimensions: () => ({ height: 900 }), View: 'View' },
    '../../utils/appAlert': { alert: (...args) => alerts.push(args) },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [permission, async () => {
      permissionRequests++; permission.granted = grantPermission; return permission;
    }] },
    'expo-haptics': { NotificationFeedbackType: { Success: 'success' }, notificationAsync: async () => {},
      ImpactFeedbackStyle: { Medium: 'medium' }, impactAsync: async () => {} },
    'expo-image-picker': { launchImageLibraryAsync: async () => ({ assets: [{ uri: 'original.jpg' }] }) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@react-navigation/native': { useIsFocused: () => true },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-redux': { useSelector: (select) => select(state), useDispatch: () => (payload) => Promise.resolve(payload) },
    '../../services/api/capturedMealAnalysis': { analyzeCapturedMeal: async () => result },
    '../../utils/mealAnalysis': mealAnalysis,
    '../../utils/formatNutrition': { formatNutrition: (value) => String(value) },
    '../../store/slices/mealSlice': { postMeal },
    '../../utils/preparePhotoUpload': { preparePhotoUpload: async () => ({ uri: 'prepared.jpg' }) },
    '../../theme': { colors: {}, fonts: {}, radius: {}, shadows: {}, type: {} },
  }, { navigator: cameraSupported ? { mediaDevices: { getUserMedia: async () => {} } } : {} }).default;
  const render = () => {
    stateIndex = 0; refIndex = 0;
    return Screen({ navigation: { getState: () => ({ routeNames: ['Dashboard'] }), navigate: (name) => visits.push(name) },
      route: { params: { targetMealId: meal?.id, category: meal?.type || 'meal', outsideFood } } });
  };
  return { render, posts, visits, alerts, permissionRequests: () => permissionRequests, captures: () => captures,
    attachCamera: () => { refs[0].current = { takePictureAsync: async () => { captures++; return { uri: 'camera.jpg' }; } }; } };
}

function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}

test('unlisted product photos post the prepared image once and open the dashboard without nutrition entry', async () => {
  const meal = { id: 7, type: 'Herbalife product', name: 'Other product', consumed: false };
  const ui = captureScreen(meal, mealAnalysis.herbalifeMealAnalysis(meal));
  const choose = elements(ui.render()).find((item) => item.props?.accessibilityLabel === 'Choose from photo library');
  await choose.props.onPress();
  await choose.props.onPress();
  assert.equal(ui.posts.length, 1);
  assert.equal(ui.posts[0].imageUri, 'prepared.jpg');
  assert.equal(ui.posts[0].plannedMealId, 7);
  assert.deepEqual([ui.posts[0].calories, ui.posts[0].proteinGrams, ui.posts[0].carbsGrams, ui.posts[0].fatGrams], [0, 0, 0, 0]);
  assert.deepEqual(ui.visits, ['Dashboard']);
  assert.deepEqual(ui.alerts, []);
});

test('listed products keep fixed-calorie confirmation and offer no name or nutrition inputs', async () => {
  const meal = { id: 8, type: 'product', name: 'Beta heart', consumed: false };
  const ui = captureScreen(meal, mealAnalysis.herbalifeMealAnalysis(meal));
  const choose = elements(ui.render()).find((item) => item.props?.accessibilityLabel === 'Choose from photo library');
  await choose.props.onPress();
  assert.equal(ui.posts.length, 0);
  const review = elements(ui.render());
  assert.equal(review.some((item) => ['Meal name', 'calories', 'protein', 'carbs', 'fat'].includes(item.props?.accessibilityLabel)), false);
  const save = review.find((item) => item.props?.accessibilityState?.busy === false);
  save.props.onPress();
  assert.equal(ui.posts[0].calories, 47.5);
  assert.deepEqual(ui.visits, ['Dashboard']);
});

test('normal meal photos still wait for review and retain their nutrition values', async () => {
  const meal = { id: 9, type: 'Lunch', name: 'Lunch', consumed: false };
  const ui = captureScreen(meal, { name: 'Dal', calories: 240, protein: 14, carbs: 30, fat: 7, items: [] });
  const choose = elements(ui.render()).find((item) => item.props?.accessibilityLabel === 'Choose from photo library');
  await choose.props.onPress();
  assert.equal(ui.posts.length, 0);
  const save = elements(ui.render()).find((item) => item.props?.accessibilityState?.busy === false);
  save.props.onPress();
  assert.equal(ui.posts[0].calories, 240);
});

test('web camera opens a live preview and captures a photo only after it is ready', async () => {
  const meal = { id: 10, type: 'Lunch', name: 'Lunch', consumed: false };
  const ui = captureScreen(meal, { name: 'Dal', calories: 240, protein: 14, carbs: 30, fat: 7, items: [] });
  const initial = elements(ui.render());
  assert.equal(initial.some((item) => item.type === 'CameraView'), false);
  await initial.find((item) => item.props?.accessibilityLabel === 'Open camera').props.onPress();
  assert.equal(ui.permissionRequests(), 1);
  let preview = elements(ui.render());
  const camera = preview.find((item) => item.type === 'CameraView');
  assert.ok(camera);
  assert.equal(camera.props.facing, 'back');
  const shutter = preview.find((item) => item.props?.accessibilityLabel === 'Take photo');
  assert.equal(shutter.props.disabled, true);
  ui.attachCamera();
  await shutter.props.onPress();
  assert.equal(ui.captures(), 0);
  camera.props.onCameraReady();
  preview = elements(ui.render());
  await preview.find((item) => item.props?.accessibilityLabel === 'Take photo').props.onPress();
  assert.equal(ui.captures(), 1);
  const review = elements(ui.render());
  assert.equal(review.some((item) => item.type === 'CameraView'), false);
  assert.equal(review.find((item) => item.type === 'Image').props.source.uri, 'prepared.jpg');
  assert.equal(ui.posts.length, 0);
  assert.deepEqual(ui.alerts, []);
});

test('denied web camera permissions leave the photo-library fallback available', async () => {
  const ui = captureScreen({ id: 11, type: 'Lunch', name: 'Lunch' }, {}, { grantPermission: false });
  await elements(ui.render()).find((item) => item.props?.accessibilityLabel === 'Open camera').props.onPress();
  const denied = elements(ui.render());
  assert.equal(denied.some((item) => item.type === 'CameraView'), false);
  assert.ok(denied.some((item) => item.props?.accessibilityLabel === 'Choose from photo library'));
});

test('unsupported or insecure web contexts explain camera requirements without blocking library selection', async () => {
  const ui = captureScreen({ id: 12, type: 'Lunch', name: 'Lunch' }, {}, { cameraSupported: false });
  await elements(ui.render()).find((item) => item.props?.accessibilityLabel === 'Open camera').props.onPress();
  assert.equal(ui.permissionRequests(), 0);
  assert.match(ui.alerts[0][1], /HTTPS or localhost/);
  assert.ok(elements(ui.render()).some((item) => item.props?.accessibilityLabel === 'Choose from photo library'));
});

test('camera startup failures disable the shutter and expose a useful error', async () => {
  const ui = captureScreen({ id: 13, type: 'Lunch', name: 'Lunch' }, {});
  await elements(ui.render()).find((item) => item.props?.accessibilityLabel === 'Open camera').props.onPress();
  elements(ui.render()).find((item) => item.type === 'CameraView').props.onMountError({ message: 'Camera is already in use' });
  const failed = elements(ui.render());
  assert.equal(failed.find((item) => item.props?.accessibilityLabel === 'Take photo').props.disabled, true);
  assert.ok(failed.some((item) => item.props?.children.includes('Camera is already in use')));
});

test('outside food uses normal photo review without requiring or completing an assigned meal', async () => {
  const ui = captureScreen(null, { name: 'Pizza', calories: 450, protein: 15, carbs: 60, fat: 17, items: [] }, { outsideFood: true });
  await elements(ui.render()).find((item) => item.props?.accessibilityLabel === 'Choose from photo library').props.onPress();
  assert.equal(ui.posts.length, 0);
  elements(ui.render()).find((item) => item.props?.accessibilityState?.busy === false).props.onPress();
  assert.equal(ui.posts.length, 1);
  assert.equal(ui.posts[0].plannedMealId, null);
  assert.equal(ui.posts[0].mealType, 'Outside food');
  assert.equal(ui.posts[0].mealName, 'Pizza');
  assert.equal(ui.posts[0].calories, 450);
  assert.equal(ui.posts[0].optimisticCompletion, undefined);
  assert.deepEqual(ui.alerts, []);
});
