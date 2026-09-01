import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useReducedMotion from '../../hooks/useReducedMotion';

function Badge({ value, backgroundColor, borderColor, fontFamily }) {
  if (!value) return null;
  return (
    <View style={[styles.badge, { backgroundColor, borderColor }]}>
      <Text style={[styles.badgeText, { fontFamily }]}>{value > 9 ? '9+' : value}</Text>
    </View>
  );
}

function FluidTabItem({
  route,
  focused,
  options,
  navigation,
  config,
  palette,
  fonts,
  badge,
  alertRoute,
  compact,
  reduceMotion,
  activeWeight,
}) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();
    const animation = reduceMotion
      ? Animated.timing(progress, { toValue: focused ? 1 : 0, duration: 100, useNativeDriver: false })
      : Animated.spring(progress, {
        toValue: focused ? 1 : 0,
        stiffness: 285,
        damping: 28,
        mass: 0.82,
        useNativeDriver: false,
      });
    animation.start();
    return () => animation.stop();
  }, [focused, progress, reduceMotion]);

  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const flexGrow = progress.interpolate({ inputRange: [0, 1], outputRange: [1, activeWeight] });
  const labelTargetWidth = Math.min(
    compact ? 60 : 72,
    Math.max(compact ? 32 : 36, config.label.length * (compact ? 5.7 : 6.3) + 6),
  );
  const labelWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, labelTargetWidth] });
  const labelGap = progress.interpolate({ inputRange: [0, 1], outputRange: [0, compact ? 5 : 6] });
  const surfaceScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  return (
    <Animated.View style={[styles.slot, { flexGrow }]}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={options.tabBarAccessibilityLabel || config.label}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeSurface,
            {
              opacity: progress,
              backgroundColor: palette.surface,
              borderColor: palette.line,
              transform: [{ scaleX: surfaceScale }, { scaleY: surfaceScale }],
            },
          ]}
        />
        <View pointerEvents="none" style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name={focused ? config.activeIcon : config.icon} size={compact ? 19 : 21} color={focused ? palette.active : palette.muted} />
            <Badge
              value={badge}
              backgroundColor={route.name === alertRoute ? palette.alert : palette.accent}
              borderColor={focused ? palette.surface : palette.dock}
              fontFamily={fonts.semibold}
            />
          </View>
          <Animated.View style={[styles.labelReveal, { width: labelWidth, marginLeft: labelGap, opacity: progress }]}>
            <Text
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.1}
              minimumFontScale={0.72}
              numberOfLines={1}
              style={[styles.label, compact && styles.labelCompact, { color: palette.active, fontFamily: fonts.semibold }]}
            >
              {config.label}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function FluidTabBar({
  state,
  descriptors,
  navigation,
  tabs,
  palette,
  fonts,
  badges = {},
  alertRoute,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const compact = width <= 360;
  const activeWeight = state.routes.length > 5 ? (compact ? 2.1 : 2) : 1.75;

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.shadowShell}>
        <View style={[styles.dock, { backgroundColor: palette.dock, borderColor: palette.line }]}>
          {state.routes.map((route, index) => (
            <FluidTabItem
              key={route.key}
              route={route}
              focused={state.index === index}
              options={descriptors[route.key].options}
              navigation={navigation}
              config={tabs[route.name]}
              palette={palette}
              fonts={fonts}
              badge={badges[route.name] || 0}
              alertRoute={alertRoute}
              compact={compact}
              reduceMotion={reduceMotion}
              activeWeight={activeWeight}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const nativeDockShadow = {
  shadowColor: '#164B4C',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.12,
  shadowRadius: 20,
  elevation: 7,
};

const nativePillShadow = {
  shadowColor: '#164B4C',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 9,
  elevation: 3,
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  shadowShell: {
    borderRadius: 36,
    ...Platform.select({ web: { boxShadow: '0 10px 30px rgba(22,75,76,0.12)' }, default: nativeDockShadow }),
  },
  dock: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 5,
    paddingVertical: 5,
    overflow: 'visible',
    borderRadius: 36,
    borderWidth: 1,
  },
  slot: { flexBasis: 0, flexShrink: 1, minWidth: 0 },
  item: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 31 },
  activeSurface: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 31,
    borderWidth: 1,
    ...Platform.select({ web: { boxShadow: '0 4px 14px rgba(22,75,76,0.10)' }, default: nativePillShadow }),
  },
  content: { zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  iconWrap: { width: 28, height: 32, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  labelReveal: { overflow: 'hidden', alignItems: 'center' },
  label: { width: '100%', fontSize: 10.5, lineHeight: 15, textAlign: 'center' },
  labelCompact: { fontSize: 9.5, lineHeight: 14 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },
  pressed: { opacity: 0.58 },
});
