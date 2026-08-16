import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { adminColors, adminFonts } from '../../theme/admin';

export default function AdminSegmentedControl({ options, value, onChange, accessibilityLabel = 'View options' }) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      {options.map((option) => {
        const key = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        const active = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(key)}
            style={({ pressed }) => [styles.item, active && styles.active, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={[styles.label, active && styles.activeLabel]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: adminColors.sageSoft, gap: 3 },
  item: { flex: 1, minHeight: 44, paddingHorizontal: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  label: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 13 },
  activeLabel: { color: adminColors.ink, fontFamily: adminFonts.semibold },
  pressed: { opacity: 0.7 },
});
