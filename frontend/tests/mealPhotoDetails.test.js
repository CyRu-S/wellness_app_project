import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';
import * as nutrition from '../src/utils/mealAnalysis.js';

function details() {
  const values = [];
  let index = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => {
      const slot = index++;
      if (!(slot in values)) values[slot] = initial;
      return [values[slot], (value) => { values[slot] = value; }];
    },
  };
  const state = { auth: { token: 'test-token' }, meals: { items: [], postHistory: [{ id: 66, name: 'Afresh',
    type: 'Herbalife product', calories: 180, protein: 15, carbsGrams: 22, fatGrams: 4, loggedAt: '12:53 pm' }] } };
  const source = { uri: 'https://api.test/api/meal-posts/66/image', headers: { Authorization: 'Bearer test-token' } };
  const Screen = loadModule('../src/screens/user/MealDetailsScreen.jsx', {
    react: { ...react, default: react, __esModule: true },
    'react-native': { Modal: 'Modal', Pressable: 'Pressable', View: 'View', StyleSheet: { create: (styles) => styles } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'react-redux': { useSelector: (select) => select(state), useDispatch: () => () => {} },
    '../../utils/appAlert': { alert: () => {} },
    '../../store/slices/mealSlice': { deleteMealPost: () => {} },
    '../../components/common/ProtectedImage': 'ProtectedImage',
    '../../components/common/AppModal': 'Modal',
    '../../components/common/PrimaryButton': 'PrimaryButton',
    '../../components/common/Screen': 'Screen',
    '../../components/user/UserHeader': 'UserHeader',
    '../../theme': { colors: {}, fonts: {}, radius: {}, type: {} },
    '../../utils/memberJournal': { protectedImageSource: () => source },
    '../../utils/mealAnalysis': nutrition,
  }).default;
  return { source, render: () => { index = 0; return Screen({ navigation: {}, route: { params: { postId: 66 } } }); } };
}

function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children)];
}
const style = (value) => Object.assign({}, ...[value].flat().filter(Boolean));

test('web and native image dimensions both produce a full-width portrait image without square letterboxing', () => {
  for (const event of [
    { nativeEvent: { source: { width: 1080, height: 1920 } } },
    { nativeEvent: { target: { naturalWidth: 1080, naturalHeight: 1920 } } },
    { target: { naturalWidth: 1080, naturalHeight: 1920 } },
  ]) {
    const ui = details();
    elements(ui.render()).find((item) => item.type === 'ProtectedImage').props.onLoad(event);
    const tree = ui.render();
    const photo = elements(tree).find((item) => item.type === 'ProtectedImage');
    assert.equal(tree.props.contentStyle.paddingHorizontal, 0);
    assert.equal(style(photo.props.style).width, '100%');
    assert.equal(style(photo.props.style).height, undefined);
    assert.equal(style(photo.props.style).aspectRatio, 1080 / 1920);
    assert.equal(photo.props.resizeMode, 'contain');
  }
});

test('landscape metadata updates the ratio and missing dimensions leave a safe fallback', () => {
  const ui = details();
  const photo = elements(ui.render()).find((item) => item.type === 'ProtectedImage');
  photo.props.onLoad({ nativeEvent: {} });
  assert.equal(style(elements(ui.render()).find((item) => item.type === 'ProtectedImage').props.style).aspectRatio, 1);
  photo.props.onLoad({ nativeEvent: { source: { width: 1920, height: 1080 } } });
  assert.equal(style(elements(ui.render()).find((item) => item.type === 'ProtectedImage').props.style).aspectRatio, 1920 / 1080);
});

test('tapping the image opens a protected full-screen photo and both close actions dismiss it', () => {
  const ui = details();
  const open = () => elements(ui.render()).find((item) => item.props?.accessibilityLabel === 'Open full-screen meal photo').props.onPress();
  open();
  let modal = elements(ui.render()).find((item) => item.type === 'Modal');
  assert.equal(modal.props.visible, true);
  const image = elements(modal).find((item) => item.type === 'ProtectedImage');
  assert.equal(image.props.source.headers.Authorization, 'Bearer test-token');
  assert.equal(image.props.resizeMode, 'contain');
  assert.equal(image.props.style.flex, 1);
  modal.props.onRequestClose();
  assert.equal(elements(ui.render()).some((item) => item.type === 'Modal'), false);
  open();
  modal = elements(ui.render()).find((item) => item.type === 'Modal');
  elements(modal).find((item) => item.props?.accessibilityLabel === 'Close full-screen meal photo').props.onPress();
  assert.equal(elements(ui.render()).some((item) => item.type === 'Modal'), false);
});

test('an Afresh product shows 4 kcal even when an old cached post contains 180', () => {
  const tree = elements(details().render());
  assert.ok(tree.some((item) => item.props?.children.includes(4)));
  assert.equal(tree.some((item) => item.props?.children.includes(180)), false);
  assert.equal(tree.some((item) => item.props?.children.includes('protein')), false);
});
