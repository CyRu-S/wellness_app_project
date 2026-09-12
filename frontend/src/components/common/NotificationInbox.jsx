import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { markNotificationRead } from '../../store/slices/notificationSlice';
import { notificationDestination } from '../../utils/notificationDestination';
import { colors, fonts } from '../../theme';

export default function NotificationInbox({ navigation, workflowsOnly = false }) {
  const dispatch = useDispatch();
  const role = useSelector((s) => s.auth.user?.role);
  const all = useSelector((s) => s.notifications.items);
  // Notification history remains available even after a push category is muted.
  const items = workflowsOnly ? all.filter(n => n.kind && !['MEAL', 'NUDGE'].includes(n.kind)) : all;
  return <View style={styles.list}>
    {items.length === 0 ? <Text style={styles.body}>No notifications yet.</Text> : null}
    {items.map(item => <Pressable key={item.id} accessibilityRole="button" style={styles.item} onPress={() => {
      dispatch(markNotificationRead(item.id));
      const destination = notificationDestination(role, item.kind);
      navigation.navigate(destination.name, destination.params);
    }}>
      <Text style={[styles.title, !item.read && styles.unread]}>{!item.read ? '• ' : ''}{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.time}>{new Date(item.scheduledAt).toLocaleString()}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  list: { marginTop: 16 }, item: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line, minHeight: 64 },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }, unread: { color: colors.tealDark },
  body: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6 },
  time: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 8 },
});
