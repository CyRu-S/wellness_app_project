import test from 'node:test';
import assert from 'node:assert/strict';
import * as toolkit from '@reduxjs/toolkit';
import { loadModule } from './loadModule.js';

test('member profiles remain visible when the full admin workspace report fails', async () => {
  const calls = [];
  const admin = loadModule('../src/store/slices/adminSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/client': { request: async (path) => {
      calls.push(path);
      if (path === '/admin/workspace') throw new Error('Report temporarily unavailable');
      if (path === '/admin/members') return [{ id: 7, name: 'Member', status: 'ACTIVE' }];
      if (path === '/admin/approvals') return [{ id: 8, name: 'New member', status: 'PENDING' }];
      throw new Error('Unexpected request');
    } },
    './mealSlice': { normalizeMeal: (meal) => meal },
  });
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token: 'jwt' }), admin: admin.default } });
  await store.dispatch(admin.loadAdminMembers()).unwrap();
  assert.deepEqual(calls, ['/admin/workspace', '/admin/members', '/admin/approvals']);
  assert.equal(store.getState().admin.members[0].name, 'Member');
  assert.equal(store.getState().admin.approvals[0].name, 'New member');
  assert.equal(store.getState().admin.membersStatus, 'degraded');
});


test('Attention and Members read their own endpoints without eagerly loading the workspace', async () => {
  const calls = [];
  const admin = loadModule('../src/store/slices/adminSlice.js', {
    '@reduxjs/toolkit': toolkit,
    '../../services/api/client': { request: async (path) => {
      calls.push(path);
      if (path === '/admin/attention') return [{ id: 1, category: 'Hydration' }];
      if (path === '/admin/members') return [{ id: 7, name: 'Online member', online: true, adherence: 80 }];
      throw new Error('Unexpected request');
    } },
    './mealSlice': { normalizeMeal: (meal) => meal },
  });
  const store = toolkit.configureStore({ reducer: { auth: () => ({ token: 'jwt' }), admin: admin.default } });
  await store.dispatch(admin.loadAdminAttention()).unwrap();
  assert.equal(store.getState().admin.attention[0].category, 'Hydration');
  assert.equal(store.getState().admin.members.length, 0);
  await store.dispatch(admin.loadAdminDirectory()).unwrap();
  assert.deepEqual(calls, ['/admin/attention', '/admin/members']);
  assert.equal(store.getState().admin.summary.activeUsers, 1);
  assert.equal(store.getState().admin.summary.averageAdherence, 80);
});
