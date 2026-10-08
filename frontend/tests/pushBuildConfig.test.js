import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadModule } from './loadModule.js';

const project = path.resolve('push-build-fixture');
const firebase = JSON.stringify({ client: [{ client_info: { android_client_info: { package_name: 'com.wellnessapp.mobile' } } }] });
function configFor(env = {}, files = {}) {
  env = { EXPO_PUBLIC_MOBILE_API_URL: 'https://api.example.test/api', ...env };
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


test('preview APK rejects missing, insecure, private and malformed API addresses', () => {
  for (const url of ['', 'http://api.example.test/api', 'https://localhost/api', 'https://127.0.0.1/api',
    'https://10.0.2.2/api', 'https://192.168.1.5/api', 'https://172.16.0.1/api', 'https://api.example.test',
    'https://api.example.test/api?token=private', 'https://user:password@api.example.test/api']) {
    assert.throws(() => configFor({ EAS_BUILD_PLATFORM: 'android', EXPO_PUBLIC_MOBILE_API_URL: url }), /HTTPS backend URL/);
  }
});

test('preview APK carries its validated API URL in the bundled configuration', () => {
  const config = configFor({ EAS_BUILD_PLATFORM: 'android', EXPO_PUBLIC_MOBILE_API_URL: 'https://api.example.test/api/' },
    { [path.resolve(project, 'google-services.json')]: firebase });
  assert.equal(config.extra.apiUrl, 'https://api.example.test/api');
});
