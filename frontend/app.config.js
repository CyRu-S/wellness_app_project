// Keep credentials out of source control. EAS supports GOOGLE_SERVICES_JSON as a file variable.
module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  return {
    ...config,
    plugins: [...(config.plugins || []), ['expo-build-properties', { android: { usesCleartextTraffic: process.env.ALLOW_LOCAL_HTTP === 'true' } }]],
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    extra: { ...config.extra, ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}) },
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
  };
};
