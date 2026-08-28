import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useReducedMotion from '../../hooks/useReducedMotion';
import { colors, fonts, shadows } from '../../theme';

const tabs = {
  Today: { label: 'Today', icon: 'home-outline', activeIcon: 'home' },
  Log: { label: 'Log', icon: 'camera-outline', activeIcon: 'camera' },
  Move: { label: 'Move', icon: 'walk-outline', activeIcon: 'walk' },
  Shared: { label: 'Shared', icon: 'people-outline', activeIcon: 'people' },
  Profile: { label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
};

function TabButton({ route, focused, options, navigation, compact, reduceMotion }) {
  const config = tabs[route.name];
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: reduceMotion ? 100 : 220,
      useNativeDriver: true,
    }).start();
  }, [focused, progress, reduceMotion]);

  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options.tabBarAccessibilityLabel || config.label}
      onPress={onPress}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.itemContent, {
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] }),
        transform: [{ translateY: reduceMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }],
      }]}
      >
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
          <Ionicons name={focused ? config.activeIcon : config.icon} size={compact ? 19 : 20} color={focused ? colors.tealDark : colors.muted} />
        </View>
        <Text adjustsFontSizeToFit minimumFontScale={0.9} maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.label, compact && styles.labelCompact, focused && styles.labelActive]}>{config.label}</Text>
        <Animated.View style={[styles.activeMarker, { opacity: progress, transform: [{ scaleX: progress }] }]} />
      </Animated.View>
    </Pressable>
  );
}

export default function UserTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const compact = width <= 360;

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.dock}>
        {state.routes.map((route, index) => (
          <TabButton
            key={route.key}
            route={route}
            focused={state.index === index}
            options={descriptors[route.key].options}
            navigation={navigation}
            compact={compact}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 8, paddingTop: 7, backgroundColor: colors.paper },
  dock: { minHeight: 76, flexDirection: 'row', alignItems: 'stretch', borderRadius: 26, paddingHorizontal: 4, paddingVertical: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  item: { flex: 1, minWidth: 0, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  itemContent: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 38, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.accentSoft },
  label: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11, lineHeight: 15, marginTop: 3 },
  labelCompact: { fontSize: 10 },
  labelActive: { color: colors.tealDark, fontFamily: fonts.semibold },
  activeMarker: { width: 15, height: 3, borderRadius: 2, backgroundColor: colors.tealMid, marginTop: 3 },
  pressed: { opacity: 0.66 },
});
