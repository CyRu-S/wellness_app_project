import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import { selectTimelineNotifications } from '../../store/slices/notificationSlice';
import { colors, fonts, type } from '../../theme';

export default function NotificationsScreen() {
  const items = useSelector(selectTimelineNotifications);
  return <Screen><Text style={styles.kicker}>AUTOMATIC TIMELINE</Text><Text style={styles.title}>Reminders</Text><Text style={styles.intro}>Reminder times update automatically whenever your assigned schedule changes.</Text><View style={styles.list}>{items.map((item) => <View key={item.id} style={styles.item}><View style={[styles.dot, !item.unread && styles.read]} /><View style={styles.copy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.body}>{item.body}</Text></View><Text style={styles.time}>{item.time}</Text></View>)}</View></Screen>;
}
const styles = StyleSheet.create({ kicker: { ...type.label, color: colors.moss, marginTop: 20 }, title: { ...type.display, color: colors.ink, marginTop: 5 }, intro: { ...type.body, color: colors.muted, marginTop: 7, maxWidth: 340 }, list: { marginTop: 22 }, item: { flexDirection: 'row', gap: 12, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 }, read: { backgroundColor: colors.line }, copy: { flex: 1 }, itemTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15 }, body: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 19, marginTop: 5, fontSize: 12 }, time: { ...type.label, color: colors.muted, fontSize: 8 } });
