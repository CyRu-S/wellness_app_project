// Keep credentials out of source control. EAS supports GOOGLE_SERVICES_JSON as a file variable.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const localFirebaseFile = './google-services.json';
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile
    || (fs.existsSync(path.resolve(__dirname, localFirebaseFile)) ? localFirebaseFile : undefined);
  const firebasePath = googleServicesFile ? path.resolve(__dirname, googleServicesFile) : null;
  // The root .easignore includes the local Android client config in CLI build uploads.
  // Git/CI builds without that untracked file can use an EAS file environment variable.
  if (process.env.EAS_BUILD_PLATFORM === 'android' && (!firebasePath || !fs.existsSync(firebasePath))) {
    throw new Error('Android push build requires google-services.json. Keep frontend/google-services.json in the CLI upload via the root .easignore, or set GOOGLE_SERVICES_JSON as a FILE variable in the EAS environment selected by eas.json. See docs/android-push-notifications.md.');
  }
  if (firebasePath && fs.existsSync(firebasePath)) {
    let firebase;
    try { firebase = JSON.parse(fs.readFileSync(firebasePath, 'utf8')); }
    catch { throw new Error('The configured google-services.json is not valid JSON. Download the Android app configuration from Firebase again.'); }
    if (firebase.type === 'service_account' || !firebase.client?.some((client) => client.client_info?.android_client_info?.package_name === config.android?.package)) {
      throw new Error(`google-services.json must be the Firebase Android app configuration for ${config.android?.package}, not a service-account private key.`);
    }
  }
  return {
    ...config,
    plugins: [...(config.plugins || []), ['expo-build-properties', { android: { usesCleartextTraffic: process.env.ALLOW_LOCAL_HTTP === 'true' } }]],
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    extra: { ...config.extra, ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}) },
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
  };
};
