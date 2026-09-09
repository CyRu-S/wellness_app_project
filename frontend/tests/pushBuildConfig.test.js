import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadModule } from './loadModule.js';

const project = path.resolve('push-build-fixture');
const firebase = JSON.stringify({ client: [{ client_info: { android_client_info: { package_name: 'com.wellnessapp.mobile' } } }] });
function configFor(env = {}, files = {}) {
  const target = { exports: {} };
  loadModule('../app.config.js', { 'node:path': path, 'node:fs': {
    existsSync: (filename) => Object.hasOwn(files, filename), readFileSync: (filename) => files[filename],
  } }, { module: target, __dirname: project, process: { env } });
  return target.exports({ config: { android: { package: 'com.wellnessapp.mobile' }, plugins: [], extra: { eas: { projectId: 'existing-project' } } } });
}
test('local Firebase config is included even without the optional environment variable', () => {
  const config = configFor({}, { [path.resolve(project, 'google-services.json')]: firebase });
  assert.equal(config.android.googleServicesFile, './google-services.json');
  assert.equal(config.extra.eas.projectId, 'existing-project');
});
test('an EAS Android worker fails early when the Firebase config is missing', () => {
  assert.throws(() => configFor({ EAS_BUILD_PLATFORM: 'android' }), /FILE variable/);
});
test('an EAS Android worker uses the uploaded local file without an EAS file variable', () => {
  const config = configFor({ EAS_BUILD_PLATFORM: 'android' }, { [path.resolve(project, 'google-services.json')]: firebase });
  assert.equal(config.android.googleServicesFile, './google-services.json');
});
test('EAS file variable takes precedence over the local Firebase config', () => {
  const remote = path.resolve('eas-file-variable.json');
  const config = configFor({ EAS_BUILD_PLATFORM: 'android', GOOGLE_SERVICES_JSON: remote }, { [remote]: firebase });
  assert.equal(config.android.googleServicesFile, remote);
});
test('wrong package names and service-account keys cannot be embedded in the APK', () => {
  for (const content of [firebase.replace('com.wellnessapp.mobile', 'com.other.app'), JSON.stringify({ type: 'service_account' })]) {
    assert.throws(() => configFor({}, { [path.resolve(project, 'google-services.json')]: content }), /Android app configuration/);
  }
});
test('web and Expo Go configuration still resolve before Firebase has been set up', () => {
  assert.equal(configFor().android.googleServicesFile, undefined);
});
