import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

export default function StaggeredView({ children, delay = 0, distance = 16, style }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) progress.setValue(1);
      else Animated.timing(progress, { toValue: 1, duration: 430, delay, useNativeDriver: true }).start();
    });
  }, [delay, progress]);
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>{children}</Animated.View>;
}
