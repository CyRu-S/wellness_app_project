import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';
import * as mealAnalysis from '../src/utils/mealAnalysis.js';

function captureScreen(meal, result) {
  const values = [], refs = [], posts = [], visits = [], alerts = [];
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
  const state = { meals: { items: [meal], pendingPost: null }, auth: { token: 'token', user: { id: 1 } } };
  const postMeal = (payload) => { posts.push(payload); return payload; };
  postMeal.fulfilled = { match: () => false };
  const Screen = loadModule('../src/screens/user/MealCaptureScreen.jsx', {
    react: { ...react, default: react, __esModule: true },
    'react-native': { Animated: { Value }, Image: 'Image', KeyboardAvoidingView: 'KeyboardAvoidingView',
      Platform: { OS: 'web' }, Pressable: 'Pressable', ScrollView: 'ScrollView',
      StyleSheet: { create: (value) => value }, useWindowDimensions: () => ({ height: 900 }), View: 'View' },
    '../../utils/appAlert': { alert: (...args) => alerts.push(args) },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}] },
    'expo-haptics': { NotificationFeedbackType: { Success: 'success' }, notificationAsync: async () => {} },
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
  }).default;
  const render = () => {
    stateIndex = 0; refIndex = 0;
    return Screen({ navigation: { getState: () => ({ routeNames: ['Dashboard'] }), navigate: (name) => visits.push(name) },
      route: { params: { targetMealId: meal.id, category: meal.type } } });
  };
  return { render, posts, visits, alerts };
}

function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}

test('unlisted product photos post the prepared image once and open the dashboard without nutrition entry', async () => {
  const meal = { id: 7, type: 'Herbalife product', name: 'Other product', consumed: false };
  const ui = captureScreen(meal, mealAnalysis.herbalifeMealAnalysis(meal));
  const choose = elements(ui.render()).find((item) => item.props?.onPress && item.props?.accessibilityRole === 'button' && !item.props?.accessibilityLabel);
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
  const choose = elements(ui.render()).find((item) => item.props?.onPress && item.props?.accessibilityRole === 'button' && !item.props?.accessibilityLabel);
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
  const choose = elements(ui.render()).find((item) => item.props?.onPress && item.props?.accessibilityRole === 'button' && !item.props?.accessibilityLabel);
  await choose.props.onPress();
  assert.equal(ui.posts.length, 0);
  const save = elements(ui.render()).find((item) => item.props?.accessibilityState?.busy === false);
  save.props.onPress();
  assert.equal(ui.posts[0].calories, 240);
});
