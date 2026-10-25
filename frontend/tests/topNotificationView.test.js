import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { loadModule } from './loadModule.js';

function render(toast) {
  const effects = [], timers = [], choices = [], actions = [];
  class Value {
    interpolate() { return 1; }
    stopAnimation() {}
    setValue() {}
  }
  const component = loadModule('../src/components/common/InAppToast.jsx', {
    react: { ...React, useCallback: (fn) => fn, useEffect: (fn) => effects.push(fn),
      useState: (init) => [typeof init === 'function' ? init() : init, () => {}], useRef: (current) => ({ current }) },
    'react-native': { Animated: { Value, View: 'AnimatedView' }, Easing: {}, Pressable: 'Button', View: 'View',
      useWindowDimensions: () => ({ width: 390, height: 844 }), StyleSheet: { create: (value) => value } },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) },
    'react-redux': { useDispatch: () => (action) => actions.push(action),
      useSelector: (fn) => fn({ toast: { current: toast.confirmation ? null : toast, dialog: toast.confirmation ? toast : null } }) },
    '../../store/slices/toastSlice': { clearToast: (id) => ({ type: 'clear', id }) },
    '../../utils/appFeedback': { chooseAppDialog: (...args) => choices.push(args) },
    '../../hooks/useReducedMotion': { __esModule: true, default: () => true },
    '../../theme': { colors: {}, fonts: {}, radius: {}, shadows: {} },
  }, { setTimeout: (fn, ms) => { timers.push({ fn, ms }); return 1; }, clearTimeout: () => {} }).default;
  const flatten = (node) => node == null || typeof node === 'boolean' ? [] : Array.isArray(node)
    ? node.flatMap(flatten) : typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [node];
  const nodes = flatten(component());
  effects.forEach((effect) => effect());
  return { nodes, timers, choices, actions };
}

test('error banners auto-dismiss and also expose a close button without any confetti', () => {
  const app = render({ id: 'error', title: 'Reminder not sent', kind: 'error', celebrate: false });
  assert.equal(app.timers[0].ms, 6500);
  app.timers[0].fn();
  assert.equal(app.actions[0].id, 'error');
  assert.ok(app.nodes.some((node) => node?.props?.accessibilityLabel === 'Dismiss notification'));
  assert.ok(!app.nodes.some((node) => node?.type?.name === 'Confetti'));
});

test('top confirmation buttons wait for an explicit choice and closing cancels without choosing an action', () => {
  const app = render({ id: 'confirm', title: 'Delete post?', confirmation: true,
    buttons: [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive' }] });
  assert.equal(app.timers.length, 0);
  assert.equal(app.choices.length, 0);
  app.nodes.find((node) => node?.type === 'Button' && node.props.children?.props?.children === 'Delete').props.onPress();
  assert.equal(app.choices[0][0], 'confirm'); assert.equal(app.choices[0][1], 1);
  app.nodes.find((node) => node?.props?.accessibilityLabel === 'Dismiss notification').props.onPress();
  assert.equal(app.choices[1][0], 'confirm'); assert.equal(app.choices[1].length, 1);
});
