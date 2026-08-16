import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  nudgeAttention,
  nudgePriorityAttention,
  resolveAttention,
  selectAdminAttention,
} from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius } from '../../theme/admin';

const filters = ['All', 'Meals', 'Hydration', 'Activity', 'Supplements'];
const categoryIcons = { Meals: 'restaurant-outline', Hydration: 'water-outline', Activity: 'walk-outline', Supplements: 'medical-outline' };

function AttentionRow({ item, onMember, onNudge, onResolve }) {
  const high = item.severity === 'HIGH';
  const nudged = item.status === 'NUDGED';
  return (
    <View style={styles.item}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.memberName}'s profile`} onPress={onMember} style={({ pressed }) => [styles.itemTop, pressed && styles.pressed]}>
        <View style={[styles.categoryIcon, high && styles.categoryIconHigh]}><Ionicons name={categoryIcons[item.category]} size={18} color={high ? adminColors.coral : adminColors.teal} /></View>
        <View style={styles.itemCopy}>
          <View style={styles.nameLine}><Text style={styles.memberName}>{item.memberName}</Text><Text style={[styles.severity, high && styles.severityHigh]}>{high ? 'ACT NOW' : 'WATCH'}</Text></View>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemMeta}>{item.category} · {item.missedAt}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={adminColors.muted} />
      </Pressable>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Nudge ${item.memberName}`} disabled={nudged} onPress={onNudge} style={({ pressed }) => [styles.nudge, nudged && styles.nudged, pressed && styles.pressed]}>
          <Ionicons name={nudged ? 'checkmark' : 'notifications-outline'} size={16} color={nudged ? adminColors.deepTeal : adminColors.teal} />
          <Text style={[styles.nudgeText, nudged && styles.nudgedText]}>{nudged ? 'Nudge sent' : 'Nudge'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Resolve alert for ${item.memberName}`} onPress={onResolve} style={({ pressed }) => [styles.resolve, pressed && styles.pressed]}>
          <Text style={styles.resolveText}>Resolve</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Group({ title, description, items, navigation, dispatch }) {
  if (!items.length) return null;
  return (
    <View style={styles.group}>
      <View style={styles.groupHeading}><View><Text style={styles.groupTitle}>{title}</Text><Text style={styles.groupDescription}>{description}</Text></View><Text style={styles.groupCount}>{items.length}</Text></View>
      <View style={styles.groupBody}>
        {items.map((item) => (
          <AttentionRow
            key={item.id}
            item={item}
            onMember={() => navigation.navigate('UserDetails', { id: item.memberId })}
            onNudge={() => dispatch(nudgeAttention(item.id))}
            onResolve={() => dispatch(resolveAttention(item.id))}
          />
        ))}
      </View>
    </View>
  );
}

export default function AdminAttentionScreen({ navigation }) {
  const dispatch = useDispatch();
  const attention = useSelector(selectAdminAttention);
  const [filter, setFilter] = useState('All');
  const openItems = useMemo(() => attention.filter((item) => item.status !== 'RESOLVED' && (filter === 'All' || item.category === filter)), [attention, filter]);
  const actNow = openItems.filter((item) => item.severity === 'HIGH');
  const watch = openItems.filter((item) => item.severity !== 'HIGH');
  const priorityOpen = attention.filter((item) => item.severity === 'HIGH' && item.status === 'OPEN').length;

  return (
    <AdminScreen>
      <AdminHeader title="Attention" back onBackPress={() => navigation.navigate('AdminDashboard')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>CARE QUEUE</Text>
        <Text style={styles.title}>Intervene with intent.</Text>
        <Text style={styles.subtitle}>Priority is based on how late an event is and how much it affects a member&apos;s day.</Text>
      </View>

      <View style={styles.priorityBar}>
        <View style={styles.priorityIcon}><Ionicons name="alert-outline" size={20} color={adminColors.coral} /></View>
        <View style={styles.priorityCopy}><Text style={styles.priorityValue}>{priorityOpen} priority members</Text><Text style={styles.priorityDetail}>A thoughtful nudge can recover today&apos;s rhythm.</Text></View>
        <Pressable accessibilityRole="button" disabled={!priorityOpen} onPress={() => dispatch(nudgePriorityAttention())} style={({ pressed }) => [styles.bulkButton, !priorityOpen && styles.disabled, pressed && styles.pressed]}><Text style={styles.bulkText}>Nudge all</Text></Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => {
          const active = filter === item;
          return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(item)} style={({ pressed }) => [styles.filter, active && styles.filterActive, pressed && styles.pressed]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text></Pressable>;
        })}
      </ScrollView>

      <Group title="Act now" description="High-priority missed events" items={actNow} navigation={navigation} dispatch={dispatch} />
      <Group title="Watch" description="Keep these on your radar" items={watch} navigation={navigation} dispatch={dispatch} />

      {openItems.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="leaf-outline" size={25} color={adminColors.teal} /></View>
          <Text style={styles.emptyTitle}>{filter === 'All' ? 'The care queue is clear' : `No ${filter.toLowerCase()} alerts`}</Text>
          <Text style={styles.emptyText}>Resolved items stay out of the way so you can focus on what is current.</Text>
          {filter !== 'All' && <Pressable accessibilityRole="button" onPress={() => setFilter('All')} style={styles.showAll}><Text style={styles.showAllText}>Show all attention</Text></Pressable>}
        </View>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.coral, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.4 },
  title: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -1.1, marginTop: 7 },
  subtitle: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 14, lineHeight: 21, marginTop: 6 },
  priorityBar: { minHeight: 94, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: adminRadius.lg, backgroundColor: adminColors.coralSoft, marginTop: 21 },
  priorityIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.surface },
  priorityCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  priorityValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 13 },
  priorityDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, lineHeight: 16, marginTop: 3 },
  bulkButton: { minWidth: 73, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: adminColors.coral },
  bulkText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12 },
  disabled: { opacity: 0.45 },
  filters: { gap: 7, paddingVertical: 18 },
  filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: adminColors.line, backgroundColor: adminColors.surface },
  filterActive: { backgroundColor: adminColors.deepTeal, borderColor: adminColors.deepTeal },
  filterText: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12 },
  filterTextActive: { color: adminColors.white, fontFamily: adminFonts.semibold },
  group: { marginBottom: 23 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  groupTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17 },
  groupDescription: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 3 },
  groupCount: { minWidth: 29, height: 29, borderRadius: 15, textAlign: 'center', textAlignVertical: 'center', color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 11, backgroundColor: adminColors.sageSoft, paddingTop: 6 },
  groupBody: { gap: 9 },
  item: { overflow: 'hidden', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  itemTop: { minHeight: 91, flexDirection: 'row', alignItems: 'center', padding: 12 },
  categoryIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  categoryIconHigh: { backgroundColor: adminColors.coralSoft },
  itemCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  memberName: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 13 },
  severity: { color: adminColors.amber, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.4 },
  severityHigh: { color: adminColors.coral },
  itemTitle: { color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 17, marginTop: 4 },
  itemMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 4 },
  actions: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  nudge: { minWidth: 105, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, backgroundColor: adminColors.aqua },
  nudged: { backgroundColor: adminColors.sageSoft },
  nudgeText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  nudgedText: { color: adminColors.deepTeal },
  resolve: { minWidth: 74, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  resolveText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface },
  emptyIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 17, marginTop: 14 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 5 },
  showAll: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 9 },
  showAllText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11 },
  pressed: { opacity: 0.7 },
});
