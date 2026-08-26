import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Svg, { Rect } from 'react-native-svg';
import useReducedMotion from '../../hooks/useReducedMotion';
import { adminColors, adminFonts } from '../../theme/admin';

const tabs = {
  AdminDashboard: { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  UserList: { label: 'Members', icon: 'people-outline', activeIcon: 'people' },
  MemberAccess: { label: 'Access', icon: 'key-outline', activeIcon: 'key' },
  UserRequests: { label: 'Approvals', icon: 'checkmark-done-outline', activeIcon: 'checkmark-done' },
  Alerts: { label: 'Attention', icon: 'alert-circle-outline', activeIcon: 'alert-circle' },
  NotificationSettings: { label: 'Settings', icon: 'options-outline', activeIcon: 'options' },
};

function TabButton({ route, focused, options, navigation, badge, reduceMotion, compact }) {
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

  const animatedStyle = {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
    transform: [
      { translateY: reduceMotion ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
      { scale: reduceMotion ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) },
    ],
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
      <Animated.View style={[styles.itemContent, animatedStyle]}>
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
          <Ionicons name={focused ? config.activeIcon : config.icon} size={compact ? 19 : 20} color={focused ? adminColors.deepTeal : adminColors.muted} />
          {badge > 0 && (
            <View style={[styles.badge, route.name === 'Alerts' && styles.attentionBadge]}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
            </View>
          )}
        </View>
        <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.2} minimumFontScale={0.78} numberOfLines={1} style={[styles.label, compact && styles.labelCompact, focused && styles.labelActive]}>{config.label}</Text>
        <Animated.View style={[styles.activeMarker, { opacity: progress, transform: [{ scaleX: progress }] }]} />
      </Animated.View>
    </Pressable>
  );
}

export default function AdminTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const compact = width <= 360;
  const pendingApprovals = useSelector((storeState) => storeState.admin.summary.pendingApprovals);
  const attentionCount = useSelector((storeState) => storeState.admin.attention.filter((item) => item.status !== 'RESOLVED').length);

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.dockShadow}>
        <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Rect x="0.5" y="0.5" width="99.7%" height="99%" rx="27" fill={adminColors.surface} stroke={adminColors.line} strokeWidth="1" />
        </Svg>
        <View style={styles.dock}>
          {state.routes.map((route, index) => {
            const badge = route.name === 'UserRequests' ? pendingApprovals : route.name === 'Alerts' ? attentionCount : 0;
            return (
              <TabButton
                key={route.key}
                route={route}
                focused={state.index === index}
                options={descriptors[route.key].options}
                navigation={navigation}
                badge={badge}
                reduceMotion={reduceMotion}
                compact={compact}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingTop: 7, backgroundColor: 'transparent' },
  dockShadow: { minHeight: 76, borderRadius: 27 },
  dock: { minHeight: 76, flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 3, paddingVertical: 5 },
  item: { flex: 1, minWidth: 0, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  itemContent: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 37, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: adminColors.aqua },
  label: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 11, marginTop: 3 },
  labelCompact: { fontSize: 9.5 },
  labelActive: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold },
  activeMarker: { width: 15, height: 3, borderRadius: 2, backgroundColor: adminColors.teal, marginTop: 3 },
  badge: { position: 'absolute', top: -6, right: -7, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.teal, borderWidth: 2, borderColor: adminColors.surface },
  attentionBadge: { backgroundColor: adminColors.coral },
  badgeText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 10 },
  pressed: { opacity: 0.65 },
});
