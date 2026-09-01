import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

export default function AnimatedNumber({ value, formatter = (number) => Math.round(number).toLocaleString(), style, suffix = '' }) {
  const previous = useRef(value);
  const motion = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    motion.setValue(previous.current);
    const listener = motion.addListener(({ value: next }) => setDisplay(next));
    Animated.spring(motion, { toValue: value, speed: 16, bounciness: 1, useNativeDriver: false }).start(() => { previous.current = value; });
    return () => motion.removeListener(listener);
  }, [motion, value]);

  return <Text style={style}>{formatter(display)}{suffix}</Text>;
}
