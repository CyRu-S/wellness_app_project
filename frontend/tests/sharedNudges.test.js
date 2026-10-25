import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { loadModule } from './loadModule.js';

const Card = loadModule('../src/components/common/MemberAttentionCard.jsx', {
  react: React,
  'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: (value) => value, hairlineWidth: 1 } },
  '@expo/vector-icons': { Ionicons: 'Icon' },
  'expo-linear-gradient': { LinearGradient: 'Gradient' },
  '../admin/AdminMemberAvatar': { __esModule: true, default: 'Avatar' },
  '../../theme/admin': { adminColors: {}, adminFonts: {}, adminRadius: {}, adminShadow: {} },
}).default;

function nodes(tree) {
  if (tree == null || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [tree];
}
const item = { id: 10, memberId: 2, memberName: 'Member', initials: 'M', title: 'Breakfast is overdue',
  category: 'Meals', type: 'MEALS', severity: 'HIGH', status: 'OPEN', missedAt: '25 Oct, 8:00 am' };

test('admin and shared cards show the same specific overdue item with role-appropriate actions', () => {
  const admin = nodes(Card({ item, onResolve: () => {}, now: 1 }));
  const coach = nodes(Card({ item, centralHydration: false, now: 1 }));
  for (const tree of [admin, coach]) {
    assert.ok(tree.includes('Breakfast is overdue'));
    assert.ok(tree.includes('Meals'));
    assert.ok(tree.includes('ACT NOW'));
    assert.equal(tree.find((node) => node?.props?.accessibilityLabel === 'Nudge Member').props.disabled, false);
  }
  assert.ok(admin.includes('Mark resolved'));
  assert.ok(!coach.includes('Mark resolved'));
});

test('shared and admin cards use the same cooldown and become available after it expires', () => {
  const locked = { ...item, status: 'NUDGED', availableAt: '2026-10-25T04:30:00Z' };
  for (const centralHydration of [true, false]) {
    const before = nodes(Card({ item: locked, centralHydration, now: Date.parse('2026-10-25T04:15:00Z') }));
    assert.equal(before.find((node) => node?.props?.accessibilityLabel === 'Nudge Member').props.disabled, true);
    assert.ok(before.includes('Nudge sent'));
    const after = nodes(Card({ item: locked, centralHydration, now: Date.parse('2026-10-25T04:31:00Z') }));
    assert.equal(after.find((node) => node?.props?.accessibilityLabel === 'Nudge Member').props.disabled, false);
  }
});

test('completed items stay disabled after a nudge cooldown expires', () => {
  const tree = nodes(Card({ item: { ...item, status: 'RESOLVED', availableAt: '2026-10-25T04:30:00Z' }, now: Date.parse('2026-10-25T05:00:00Z') }));
  assert.equal(tree.find((node) => node?.props?.accessibilityLabel === 'Nudge Member').props.disabled, true);
  assert.ok(tree.includes('Completed'));
});

test('shared hydration nudges target the assigned member while admins retain the club reminder', () => {
  const hydration = { ...item, category: 'Hydration', type: 'HYDRATION' };
  assert.ok(nodes(Card({ item: hydration })).includes('Use the club hydration reminder on Home'));
  assert.ok(nodes(Card({ item: hydration, centralHydration: false })).includes('Send nudge'));
});

test('shared access loads the scoped admin attention items and sends the selected item ID', async () => {
  const calls = [];
  const attention = [{ ...item }];
  const api = loadModule('../src/services/api/memberAccessApi.js', { './client': { request: async (path, options) => {
    calls.push({ path, ...options });
    return path.endsWith('/today') ? { member: { id: 2 }, nudges: [{ type: 'MEALS', detail: 'Generic reminder' }] } : attention;
  } } });
  const today = await api.getSharedMemberToday('token', 2);
  assert.equal(today.nudges, attention);
  assert.equal(calls[1].path, '/shared-members/2/attention');
  await api.nudgeSharedMember('token', 2, 'MEALS', 10);
  assert.equal(calls[2].path, '/shared-members/2/attention/10/nudge');
  assert.equal(calls[2].method, 'POST');
  assert.equal(calls[2].headers.Authorization, 'Bearer token');
});
