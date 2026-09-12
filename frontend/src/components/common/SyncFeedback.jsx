import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

export default function SyncFeedback({ pending, error, onRetry, label = 'Changes', retryLabel = 'Retry' }) {
  if (!pending && !error) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      {pending ? <ActivityIndicator size="small" color={colors.tealMid} /> : null}
      <Text style={[styles.message, error && styles.error]}>{pending ? `${label} updated here. Saving…` : `${label}: ${error}`}</Text>
      {error && !pending && onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>{retryLabel}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  message: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger },
  retry: { minHeight: 44, minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  retryText: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 13 },
});
