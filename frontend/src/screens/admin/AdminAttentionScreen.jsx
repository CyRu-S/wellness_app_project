import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  nudgeAttention,
  nudgePriorityAttention,
  resolveAttention,
  selectAdminAttention,
} from '../../store/slices/adminSlice';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';

const filters = ['All', 'Meals', 'Hydration', 'Activity', 'Supplements'];
const categoryIcons = {
  Meals: 'restaurant-outline',
  Hydration: 'water-outline',
  Activity: 'walk-outline',
  Supplements: 'medical-outline',
};

function AttentionCard({ item, onMember, onNudge, onResolve }) {
  const high = item.severity === 'HIGH';
  const nudged = item.status === 'NUDGED';

  return (
    <View style={[styles.itemShell, high && styles.itemShellHigh]}>
      <LinearGradient
        colors={high ? ['#FFFDFC', '#FCECE9'] : ['#FFFFFF', '#EFF8F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.item}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.memberName}'s profile. ${item.title}`}
          onPress={onMember}
          style={({ pressed }) => [styles.itemMain, pressed && styles.pressed]}
        >
          <View style={styles.identityLine}>
            <View style={[styles.avatar, high && styles.avatarHigh]}><Text style={[styles.avatarText, high && styles.avatarTextHigh]}>{item.initials}</Text></View>
            <View style={styles.identityCopy}>
              <Text numberOfLines={1} style={styles.memberName}>{item.memberName}</Text>
              <Text style={[styles.severity, high && styles.severityHigh]}>{high ? 'ACT NOW' : 'WATCH'}</Text>
            </View>
            <Text style={styles.openProfile}>Profile</Text>
          </View>

          <Text style={styles.itemTitle}>{item.title}</Text>
          <View style={styles.itemMetaRow}>
            <View style={[styles.categoryPill, high && styles.categoryPillHigh]}>
              <Ionicons name={categoryIcons[item.category]} size={14} color={high ? adminColors.coral : adminColors.deepTeal} />
              <Text style={[styles.categoryText, high && styles.categoryTextHigh]}>{item.category}</Text>
            </View>
            <Text style={styles.itemTime}>{item.missedAt}</Text>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Nudge ${item.memberName}`}
            disabled={nudged}
            onPress={onNudge}
            style={({ pressed }) => [styles.nudge, nudged && styles.nudged, pressed && styles.pressed]}
          >
            <Ionicons name={nudged ? 'checkmark' : 'notifications-outline'} size={17} color={nudged ? adminColors.deepTeal : adminColors.white} />
            <Text style={[styles.nudgeText, nudged && styles.nudgedText]}>{nudged ? 'Nudge sent' : 'Send nudge'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resolve alert for ${item.memberName}`}
            onPress={onResolve}
            style={({ pressed }) => [styles.resolve, pressed && styles.pressed]}
          >
            <Text style={styles.resolveText}>Mark resolved</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

function Group({ eyebrow, title, description, items, navigation, dispatch }) {
  if (!items.length) return null;
  return (
    <View style={styles.group}>
      <View style={styles.groupHeading}>
        <View style={styles.groupHeadingCopy}>
          <Text style={styles.groupEyebrow}>{eyebrow}</Text>
          <Text style={styles.groupTitle}>{title}</Text>
          <Text style={styles.groupDescription}>{description}</Text>
        </View>
        <Text style={styles.groupCount}>{items.length}</Text>
      </View>
      <View style={styles.groupBody}>
        {items.map((item) => (
          <AttentionCard
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
  const allOpenItems = useMemo(() => attention.filter((item) => item.status !== 'RESOLVED'), [attention]);
  const openItems = useMemo(
    () => allOpenItems.filter((item) => filter === 'All' || item.category === filter),
    [allOpenItems, filter],
  );
  const actNow = openItems.filter((item) => item.severity === 'HIGH');
  const watch = openItems.filter((item) => item.severity !== 'HIGH');
  const priorityOpen = attention.filter((item) => item.severity === 'HIGH' && item.status === 'OPEN').length;
  const nudgedCount = allOpenItems.filter((item) => item.status === 'NUDGED').length;

  return (
    <AdminScreen>
      <AdminHeader title="Attention" back onBackPress={() => navigation.navigate('AdminDashboard')} />

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>CARE QUEUE</Text>
        <Text style={styles.title}>Know where to step in.</Text>
        <Text style={styles.subtitle}>A focused view of missed moments, ordered by urgency and ready for action.</Text>
      </View>

      <View style={styles.heroShell}>
        <LinearGradient colors={['#064E55', '#08767B', '#0B9295']} start={{ x: 0.02, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View pointerEvents="none" style={styles.heroOrb} />
          <View pointerEvents="none" style={styles.heroOrbit} />
          <View style={styles.heroTopline}>
            <View style={styles.heroLabelRow}><Ionicons name="pulse" size={16} color="#C9F3EB" /><Text style={styles.heroLabel}>TODAY’S CARE LOAD</Text></View>
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.heroStatement}>
            <Text style={styles.heroValue}>{allOpenItems.length}</Text>
            <View style={styles.heroStatementCopy}>
              <Text style={styles.heroTitle}>moments need attention</Text>
              <Text style={styles.heroSubtitle}>Start with priority members, then work through the watch list.</Text>
            </View>
          </View>
          <View style={styles.heroFooter}>
            <View style={styles.heroMetric}><Text style={styles.heroMetricValue}>{priorityOpen}</Text><Text style={styles.heroMetricLabel}>priority now</Text></View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetric}><Text style={styles.heroMetricValue}>{nudgedCount}</Text><Text style={styles.heroMetricLabel}>nudges sent</Text></View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Nudge ${priorityOpen} priority members`}
              disabled={!priorityOpen}
              onPress={() => dispatch(nudgePriorityAttention())}
              style={({ pressed }) => [styles.bulkButton, !priorityOpen && styles.disabled, pressed && styles.pressed]}
            >
              <Text style={styles.bulkText}>{priorityOpen ? 'Nudge priority' : 'Priority clear'}</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(item)}
              style={({ pressed }) => [styles.filter, active && styles.filterActive, pressed && styles.pressed]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Group eyebrow="PRIORITY" title="Act now" description="High-impact missed moments" items={actNow} navigation={navigation} dispatch={dispatch} />
      <Group eyebrow="MONITOR" title="Watch" description="Keep these members on your radar" items={watch} navigation={navigation} dispatch={dispatch} />

      {openItems.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="leaf-outline" size={25} color={adminColors.teal} /></View>
          <Text style={styles.emptyTitle}>{filter === 'All' ? 'The care queue is clear' : `No ${filter.toLowerCase()} alerts`}</Text>
          <Text style={styles.emptyText}>Resolved moments stay out of the way so you can focus on what is current.</Text>
          {filter !== 'All' && <Pressable accessibilityRole="button" onPress={() => setFilter('All')} style={styles.showAll}><Text style={styles.showAllText}>Show all attention</Text></Pressable>}
        </View>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 27 },
  eyebrow: { color: adminColors.coral, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.35 },
  title: { maxWidth: 330, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 31, lineHeight: 37, letterSpacing: -1.15, marginTop: 7 },
  subtitle: { maxWidth: 340, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 15, lineHeight: 22, marginTop: 7 },
  heroShell: { marginTop: 21, borderRadius: 28, backgroundColor: adminColors.deepTeal, ...adminShadow },
  hero: { minHeight: 269, overflow: 'hidden', borderRadius: 28, padding: 19 },
  heroOrb: { position: 'absolute', width: 220, height: 220, right: -78, top: -105, borderRadius: 110, backgroundColor: 'rgba(180,255,242,0.1)' },
  heroOrbit: { position: 'absolute', width: 148, height: 148, right: 8, bottom: -58, borderRadius: 74, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroLabel: { color: '#C9ECE8', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.15 },
  livePill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#89E5D6' },
  liveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12, letterSpacing: 0.8 },
  heroStatement: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 18 },
  heroValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 58, lineHeight: 62, letterSpacing: -2.5 },
  heroStatementCopy: { flex: 1, minWidth: 0 },
  heroTitle: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.4 },
  heroSubtitle: { color: '#CFEAE7', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 4 },
  heroFooter: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  heroMetric: { minWidth: 54 },
  heroMetricValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 19, lineHeight: 22 },
  heroMetricLabel: { color: '#CFEAE7', fontFamily: adminFonts.medium, fontSize: 12, lineHeight: 16, marginTop: 1 },
  heroDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.18)' },
  bulkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 15, backgroundColor: adminColors.coral, marginLeft: 'auto' },
  bulkText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12 },
  disabled: { opacity: 0.48 },
  filters: { gap: 8, paddingVertical: 19 },
  filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: adminColors.line, backgroundColor: adminColors.surface },
  filterActive: { backgroundColor: adminColors.deepTeal, borderColor: adminColors.deepTeal },
  filterText: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 13 },
  filterTextActive: { color: adminColors.white, fontFamily: adminFonts.semibold },
  group: { marginBottom: 27 },
  groupHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 11 },
  groupHeadingCopy: { flex: 1 },
  groupEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 17, letterSpacing: 1.05 },
  groupTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 26, letterSpacing: -0.4, marginTop: 2 },
  groupDescription: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  groupCount: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, lineHeight: 23, marginBottom: 2 },
  groupBody: { gap: 11 },
  itemShell: { borderTopLeftRadius: 22, borderTopRightRadius: 32, borderBottomRightRadius: 22, borderBottomLeftRadius: 32, backgroundColor: '#D8E8E4', ...adminShadow },
  itemShellHigh: { backgroundColor: '#EED7D3' },
  item: { overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 32, borderBottomRightRadius: 22, borderBottomLeftRadius: 32, borderWidth: 1, borderColor: adminColors.line },
  itemMain: { minHeight: 137, padding: 14 },
  identityLine: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarHigh: { backgroundColor: adminColors.coralSoft },
  avatarText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12 },
  avatarTextHigh: { color: adminColors.coral },
  identityCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  memberName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 15, lineHeight: 20 },
  severity: { color: adminColors.amber, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, marginTop: 2 },
  severityHigh: { color: adminColors.coral },
  openProfile: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  itemTitle: { maxWidth: 300, color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 15, lineHeight: 21, marginTop: 13 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  categoryPill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderRadius: adminRadius.pill, backgroundColor: adminColors.aqua },
  categoryPillHigh: { backgroundColor: adminColors.coralSoft },
  categoryText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12 },
  categoryTextHigh: { color: adminColors.coral },
  itemTime: { flex: 1, color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12 },
  actions: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  nudge: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 15, backgroundColor: adminColors.teal },
  nudged: { backgroundColor: adminColors.sageSoft },
  nudgeText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 13 },
  nudgedText: { color: adminColors.deepTeal },
  resolve: { minWidth: 112, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: adminColors.line, backgroundColor: 'rgba(255,255,255,0.58)' },
  resolveText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28, borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  emptyIcon: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 14 },
  emptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 5 },
  showAll: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 9 },
  showAllText: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 13 },
  pressed: { opacity: 0.68 },
});
