import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { File } from 'node:buffer';
import { appendImage as appendWebImage } from '../src/services/api/imageUpload.web.js';

const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');

function loadModule(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { code } = transformSync(source, {
    configFile: false, babelrc: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const exports = {};
  runInNewContext(code, { exports, FormData, require: (name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

test('native uploads append a File with bytes, not a proprietary uri-only part', async () => {
  let requestedUri;
  class NativeFile extends File {
    constructor(uri) {
      super(['image bytes'], 'photo.png', { type: 'image/png' });
      requestedUri = uri;
    }
  }
  const { appendImage } = loadModule('../src/services/api/imageUpload.js', { 'expo-file-system': { File: NativeFile } });
  const form = new FormData();
  await appendImage(form, { uri: 'file:///photo.png' });
  assert.equal(requestedUri, 'file:///photo.png');
  assert.equal(form.get('image').type, 'image/png');
  assert.equal(await form.get('image').text(), 'image bytes');
});

test('web uploads retain filename and image MIME type', async () => {
  const form = new FormData();
  await appendWebImage(form, { uri: 'data:image/png;base64,aW1hZ2U=', fileName: 'meal.png' });
  assert.equal(form.get('image').name, 'meal.png');
  assert.equal(form.get('image').type, 'image/png');
  assert.equal(await form.get('image').text(), 'image');
});

test('all four photo workflows use the SDK-compatible upload helper', async () => {
  const paths = [];
  let appended = 0;
  const dependencies = {
    './client': { request: async (path, options) => { paths.push(path); assert.ok(options.body instanceof FormData); assert.ok(options.body.get('image') instanceof File); return {}; } },
    './imageUpload': { appendImage: async (form) => { appended++; form.append('image', new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })); } },
  };
  const auth = loadModule('../src/services/api/authApi.js', dependencies);
  const profile = loadModule('../src/services/api/profileApi.js', dependencies);
  const meals = loadModule('../src/services/api/mealPostApi.js', dependencies);
  const analysis = loadModule('../src/services/api/mealAnalysisApi.js', dependencies);
  await auth.register({ name: 'Member', email: 'member@example.invalid', password: 'test', photo: { uri: 'file:///photo.jpg' } });
  await profile.uploadProfilePhoto('token', { uri: 'file:///photo.jpg' });
  await meals.createMealPost('token', { imageUri: 'file:///photo.jpg', plannedMealId: 1 });
  await analysis.analyzeMealPhoto({ uri: 'file:///photo.jpg', token: 'token' });
  assert.equal(appended, 4);
  assert.deepEqual(paths, ['/auth/register', '/profile/photo', '/meal-posts', '/meals/analyze']);
});
