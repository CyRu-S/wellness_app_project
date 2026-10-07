import React, { useState, useEffect } from 'react';
import { Animated, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import usePageRefresh from '../../hooks/usePageRefresh';
import WebPageRefresh from './WebPageRefresh';
import useReducedMotion from '../../hooks/useReducedMotion';
import { colors } from '../../theme';

export default function Screen({ children, scroll = true, contentStyle, style, keyboardShouldPersistTaps = 'handled' }) {
  const pageRefresh = usePageRefresh();
  const reduceMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

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
      <KeyboardAvoidingView style={styles.fill}>
        <WebPageRefresh {...pageRefresh}>
        {scroll ? <ScrollView alwaysBounceVertical keyboardShouldPersistTaps={keyboardShouldPersistTaps} keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>{content}</ScrollView> : <View style={styles.fill}>{content}</View>}
        </WebPageRefresh>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  fill: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
});
