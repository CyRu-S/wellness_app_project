import { presentAppAlert } from './appFeedback';

// Browser dialogs block the PWA. Use the same top notification on every platform.
const Alert = {
  alert: presentAppAlert,
};
export default Alert;
