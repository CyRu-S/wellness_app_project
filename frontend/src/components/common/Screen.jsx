import React, { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';

export default function Screen({ children, scroll = true, contentStyle, style }) {
  const [fade] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(12));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, speed: 18, bounciness: 3, useNativeDriver: true }),
    ]).start();
  }, [fade, lift]);

  const content = (
    <Animated.View style={[styles.content, contentStyle, { opacity: fade, transform: [{ translateY: lift }] }]}>
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
  content: { flex: 1, paddingHorizontal: 22, paddingBottom: 108 },
});
