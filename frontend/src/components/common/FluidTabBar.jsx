import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

function getFluidWeights(routeCount, activeIndex, activeWeight) {
  const activeSize = activeWeight / (routeCount - 1 + activeWeight);
  const naturalCenter = (activeIndex + 0.5) / routeCount;
  const activeCenter = Math.min(1 - activeSize / 2, Math.max(activeSize / 2, naturalCenter));
  const leftSize = activeIndex > 0 ? (activeCenter - activeSize / 2) / activeIndex : 0;
  const rightCount = routeCount - activeIndex - 1;
  const rightSize = rightCount > 0 ? (1 - activeCenter - activeSize / 2) / rightCount : 0;

  return Array.from({ length: routeCount }, (_, index) => {
    if (index === activeIndex) return activeSize;
    return index < activeIndex ? leftSize : rightSize;
  });
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
  progress,
  slotWeight,
}) {
  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const labelTargetWidth = Math.min(
    compact ? 60 : 72,
    Math.max(compact ? 32 : 36, config.label.length * (compact ? 5.7 : 6.3) + 6),
  );
  const labelWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, labelTargetWidth] });
  const labelGap = progress.interpolate({ inputRange: [0, 1], outputRange: [0, compact ? 5 : 6] });

  return (
    <Animated.View style={[styles.slot, { flexGrow: slotWeight }]}>
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
  const progressByRoute = useRef(new Map()).current;
  const weightByRoute = useRef(new Map()).current;
  const targetWeights = getFluidWeights(state.routes.length, state.index, activeWeight);

  state.routes.forEach((route, index) => {
    if (!progressByRoute.has(route.key)) {
      progressByRoute.set(route.key, new Animated.Value(state.index === index ? 1 : 0));
    }
    if (!weightByRoute.has(route.key)) {
      weightByRoute.set(route.key, new Animated.Value(targetWeights[index]));
    }
  });

  useEffect(() => {
    const duration = reduceMotion ? 90 : 320;
    const easing = reduceMotion ? Easing.linear : Easing.bezier(0.22, 1, 0.36, 1);
    const nextWeights = getFluidWeights(state.routes.length, state.index, activeWeight);
    const animations = state.routes.flatMap((route, index) => {
      const progress = progressByRoute.get(route.key);
      const slotWeight = weightByRoute.get(route.key);
      progress.stopAnimation();
      slotWeight.stopAnimation();
      return [
        Animated.timing(progress, {
          toValue: state.index === index ? 1 : 0,
          duration,
          easing,
          useNativeDriver: false,
        }),
        Animated.timing(slotWeight, {
          toValue: nextWeights[index],
          duration,
          easing,
          useNativeDriver: false,
        }),
      ];
    });

    const transition = Animated.parallel(animations, { stopTogether: false });
    transition.start();
    return () => transition.stop();
  }, [activeWeight, progressByRoute, reduceMotion, state.index, state.routes, weightByRoute]);

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
              progress={progressByRoute.get(route.key)}
              slotWeight={weightByRoute.get(route.key)}
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
