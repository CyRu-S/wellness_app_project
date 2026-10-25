import React from 'react';
import { Modal, View } from 'react-native';
import InAppToast from './InAppToast';

// Native modals use a separate window. Mount feedback inside that window so
// plan validation and failed saves remain visible above the open editor/photo.
export default function AppModal({ children, ...props }) {
  return <Modal {...props}><View style={{ flex: 1 }}>{children}<InAppToast /></View></Modal>;
}
