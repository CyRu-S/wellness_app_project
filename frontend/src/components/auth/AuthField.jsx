import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '../../theme';

export default function AuthField({ label, icon, style, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.shell, focused && styles.focused]}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.accent : colors.muted} /> : null}
        <TextInput
          {...inputProps}
          placeholderTextColor="#9AA9AC"
          selectionColor={colors.accent}
          onFocus={(event) => { setFocused(true); inputProps.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); inputProps.onBlur?.(event); }}
          style={[styles.input, inputProps.multiline && styles.multiline, inputProps.style]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.2, marginBottom: 8 },
  shell: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 16 },
  focused: { borderColor: colors.accent, backgroundColor: colors.surface },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 13 },
  multiline: { minHeight: 78, textAlignVertical: 'top' },
});
