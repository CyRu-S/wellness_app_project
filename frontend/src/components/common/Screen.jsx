import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useReducedMotion from '../../hooks/useReducedMotion';
import { colors } from '../../theme';

export default function Screen({ children, scroll = true, contentStyle, style }) {
  const reduceMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: reduceMotion ? 160 : 280,
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion]);

  const content = (
    <Animated.View style={[styles.content, contentStyle, {
      opacity: progress,
      transform: [{ translateY: reduceMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
    }]}
    >
      {children}
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>{content}</ScrollView> : <View style={styles.fill}>{content}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  fill: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
});
