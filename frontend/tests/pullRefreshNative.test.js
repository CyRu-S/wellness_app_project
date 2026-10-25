import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { loadModule } from './loadModule.js';

test('APK user and admin scroll screens expose the native pull gesture and call page refresh', async () => {
  for (const admin of [false, true]) {
    let fetched = 0;
    const dependencies = {
      react: { ...React, useEffect: () => {}, useState: (init) => [typeof init === 'function' ? init() : init, () => {}] },
      'react-native': { View: 'View', ScrollView: 'ScrollView', RefreshControl: 'RefreshControl', KeyboardAvoidingView: 'KeyboardAvoidingView',
        Platform: { OS: 'android' }, StyleSheet: { create: (styles) => styles },
        Animated: { View: 'AnimatedView', Value: class { interpolate() { return 0; } } } },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      '../../hooks/usePageRefresh': { __esModule: true, default: () => ({ enabled: true, refreshing: true, onRefresh: async () => { fetched++; } }) },
      '../../hooks/useReducedMotion': { __esModule: true, default: () => true },
      '../common/PageRefresh': { __esModule: true, default: 'PageRefresh' },
      '../../theme': { colors: {} }, '../../theme/admin': { adminColors: {} },
    };
    const Screen = loadModule(`../src/components/${admin ? 'admin/AdminScreen' : 'common/Screen'}.jsx`, dependencies).default;
    const flatten = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
      ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
    const scroll = flatten(Screen({ children: 'Page' })).find((node) => node.type === 'ScrollView');
    assert.equal(scroll.props.alwaysBounceVertical, true);
    assert.equal(scroll.props.refreshControl.type, 'RefreshControl');
    assert.equal(scroll.props.refreshControl.props.refreshing, true);
    await scroll.props.refreshControl.props.onRefresh();
    assert.equal(fetched, 1);
  }
});
