import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './loadModule.js';

function mockManipulator({ width = 4000, height = 3000, fail = false } = {}) {
  const sizes = [];
  const released = [];
  let options;
  const context = {
    resize: (size) => sizes.push(size),
    release: () => released.push('context'),
    renderAsync: async () => ({
      width, height, release: () => released.push('image'),
      saveAsync: async (value) => {
        options = value;
        if (fail) throw new Error('Image could not be decoded');
        return { uri: 'file:///resized.jpg', width: 640, height: 480 };
      },
    }),
  };
  const module = loadModule('../src/utils/preparePhotoUpload.js', {
    'expo-image-manipulator': { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: 'jpeg' } },
  });
  return { ...module, sizes, released, options: () => options };
}

test('native profile uploads limit the long edge to 640px, retain aspect ratio, and avoid base64', async () => {
  const helper = mockManipulator();
  const result = await helper.preparePhotoUpload({ uri: 'file:///camera.jpg', width: 4000, height: 3000 }, 640);
  assert.equal(helper.sizes[0].width, 640);
  assert.equal(helper.sizes[0].height, undefined);
  assert.equal(helper.options().base64, false);
  assert.equal(result.mimeType, 'image/jpeg');
  assert.equal(result.uri, 'file:///resized.jpg');
  assert.deepEqual(helper.released, ['image', 'context']);
});

test('portrait meal photos use their height and release the temporary decoded image', async () => {
  const helper = mockManipulator({ width: 3000, height: 4000 });
  await helper.preparePhotoUpload({ uri: 'file:///camera.jpg' });
  assert.equal(helper.sizes[0].height, 1600);
  assert.deepEqual(helper.released, ['image', 'image', 'context']);
});

test('small photos are never enlarged and native resources are released on failure', async () => {
  const helper = mockManipulator({ fail: true });
  await assert.rejects(helper.preparePhotoUpload({ uri: 'file:///small.jpg', width: 300, height: 300 }), /decoded/);
  assert.equal(helper.sizes.length, 0);
  assert.deepEqual(helper.released, ['image', 'context']);
});
