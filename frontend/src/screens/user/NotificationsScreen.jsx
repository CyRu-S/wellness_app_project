import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import { colors, type } from '../../theme';

export default function NotificationsScreen() {
  const items = useSelector((state) => state.notifications.items);
  return <Screen><Text style={styles.kicker}>INBOX</Text><Text style={styles.title}>Notifications</Text><View style={styles.list}>{items.map((item) => <View key={item.id} style={styles.item}>{<View style={[styles.dot, !item.unread && styles.read]} />}<View style={styles.copy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.body}>{item.body}</Text></View><Text style={styles.time}>TODAY</Text></View>)}</View></Screen>;
}
const styles = StyleSheet.create({ kicker: { ...type.label, color: colors.moss, marginTop: 20 }, title: { ...type.display, color: colors.ink, marginTop: 5 }, list: { marginTop: 22 }, item: { flexDirection: 'row', gap: 12, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 }, read: { backgroundColor: colors.line }, copy: { flex: 1 }, itemTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, body: { color: colors.muted, lineHeight: 20, marginTop: 5 }, time: { ...type.label, color: colors.muted, fontSize: 9 } });

