import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useReducedMotion from '../../hooks/useReducedMotion';
import { adminColors } from '../../theme/admin';

export default function AdminScreen({ children, contentStyle, keyboardShouldPersistTaps = 'handled', scroll = true }) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 160 : 280,
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion]);

  const animatedStyle = {
    opacity: progress,
    transform: [{ translateY: reduceMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          <Animated.View style={animatedStyle}>{children}</Animated.View>
        </ScrollView>
      ) : <Animated.View style={[styles.content, styles.flex, contentStyle, animatedStyle]}>{children}</Animated.View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: adminColors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  flex: { flex: 1 },
});
