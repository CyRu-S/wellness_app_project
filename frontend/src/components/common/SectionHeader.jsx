import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, type } from '../../theme';

export default function SectionHeader({ title, eyebrow, action, onPress }) {
  return (
    <View style={styles.row}>
      <View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action ? <Pressable onPress={onPress}><Text style={styles.action}>{action}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow: { ...type.label, color: colors.muted, marginBottom: 4 },
  title: { ...type.h2, color: colors.ink },
  action: { color: colors.moss, fontFamily: fonts.semibold, textDecorationLine: 'underline' },
});
