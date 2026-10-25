import { LocalizedText as Text } from './LocalizedText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AdminMemberAvatar from '../admin/AdminMemberAvatar';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';

const categoryIcons = {
  Meals: 'restaurant-outline',
  Hydration: 'water-outline',
  Activity: 'walk-outline',
  Supplements: 'medical-outline',
  Mindfulness: 'leaf-outline',
  Sleep: 'moon-outline',
  'Follow-up': 'calendar-outline',
};

export default function MemberAttentionCard({ item, token, onMember, onNudge, onResolve, centralHydration = true, busy = false, sending = false, now = 0 }) {
  const high = item.severity === 'HIGH';
  const availableAt = item.availableAt ? Date.parse(item.availableAt) : 0;
  const nudged = availableAt > 0 ? (now === 0 || availableAt > now) : item.status === 'NUDGED';
  const completed = item.status === 'RESOLVED' || item.completed === true;
  const disabled = nudged || busy || completed;
  const minutes = nudged && availableAt > 0 && now > 0 ? Math.max(1, Math.ceil((availableAt - now) / 60000)) : 0;
  const hydration = centralHydration && item.category === 'Hydration';

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
            <AdminMemberAvatar
              profileImageUrl={item.profileImageUrl}
              token={token}
              initials={item.initials}
              style={[styles.avatar, high && styles.avatarHigh]}
              imageStyle={styles.avatarImage}
              textStyle={[styles.avatarText, high && styles.avatarTextHigh]}
            />
            <View style={styles.identityCopy}>
              <Text numberOfLines={1} style={styles.memberName}>{item.memberName}</Text>
              <Text style={[styles.severity, high && styles.severityHigh]}>{high ? 'ACT NOW' : 'WATCH'}</Text>
            </View>
            <Text style={styles.openProfile}>Profile</Text>
          </View>

          <Text style={styles.itemTitle}>{item.title}</Text>
          <View style={styles.itemMetaRow}>
            <View style={[styles.categoryPill, high && styles.categoryPillHigh]}>
              <Ionicons name={categoryIcons[item.category] || 'ellipse-outline'} size={14} color={high ? adminColors.coral : adminColors.deepTeal} />
              <Text style={[styles.categoryText, high && styles.categoryTextHigh]}>{item.category}</Text>
            </View>
            <Text style={styles.itemTime}>{item.missedAt}{minutes ? ` \u00b7 Available in ${minutes} min` : ''}</Text>
          </View>
        </Pressable>

        <View style={styles.actions}>
          {!hydration ? <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled, busy: sending }}
            accessibilityLabel={`Nudge ${item.memberName}`}
            disabled={disabled}
            onPress={onNudge}
            style={({ pressed }) => [styles.nudge, disabled && styles.nudged, pressed && styles.pressed]}
          >
            <Ionicons name="notifications-outline" size={17} color={disabled ? adminColors.deepTeal : adminColors.white} />
            <Text style={[styles.nudgeText, disabled && styles.nudgedText]}>{completed ? 'Completed' : sending ? 'Sending...' : nudged ? 'Nudge sent' : 'Send nudge'}</Text>
          </Pressable> : <View style={styles.centralNudgeNote}><Ionicons name="people-outline" size={16} color={adminColors.deepTeal} /><Text style={styles.centralNudgeText}>Use the club hydration reminder on Home</Text></View>}
          {onResolve ? <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resolve alert for ${item.memberName}`}
            onPress={onResolve}
            style={({ pressed }) => [styles.resolve, pressed && styles.pressed]}
          >
            <Text style={styles.resolveText}>Mark resolved</Text>
          </Pressable> : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  itemShell: { borderTopLeftRadius: 22, borderTopRightRadius: 32, borderBottomRightRadius: 22, borderBottomLeftRadius: 32, backgroundColor: '#D8E8E4', ...adminShadow },
  itemShellHigh: { backgroundColor: '#EED7D3' },
  item: { overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 32, borderBottomRightRadius: 22, borderBottomLeftRadius: 32, borderWidth: 1, borderColor: adminColors.line },
  itemMain: { minHeight: 137, padding: 14 },
  identityLine: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarImage: { borderRadius: 16 },
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
  centralNudgeNote: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderRadius: 15, backgroundColor: adminColors.aqua },
  centralNudgeText: { flex: 1, color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11, lineHeight: 15 },
  resolve: { minWidth: 112, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: adminColors.line, backgroundColor: 'rgba(255,255,255,0.58)' },
  resolveText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12 },
  pressed: { opacity: 0.68 },
});
