export const pushSupport = () => 'Phone push notifications are available in the Android app. Preferences below apply to your account.';
export const notificationModule = async () => null;
export const beginPushSession = () => ({});
export const syncPushRegistration = async () => ({ status: 'unsupported', message: pushSupport() });
export const revokePushBeforeLogout = async () => {};
export const endPushSession = async () => {};
export const isOwnNotification = () => false;
