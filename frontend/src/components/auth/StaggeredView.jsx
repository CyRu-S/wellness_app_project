import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform } from 'react-native';

export default function StaggeredView({ children, delay = 0, distance = 16, style }) {
  const [progress] = useState(() => new Animated.Value(Platform.OS === 'android' ? 1 : 0));
  useEffect(() => {
    if (Platform.OS === 'android') return;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) progress.setValue(1);
      else Animated.timing(progress, { toValue: 1, duration: 430, delay, useNativeDriver: true }).start();
    });
  }, [delay, progress]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>{children}</Animated.View>;
}
