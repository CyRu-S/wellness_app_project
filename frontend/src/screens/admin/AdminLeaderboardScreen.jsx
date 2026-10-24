import { LocalizedText as Text } from '../../components/common/LocalizedText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminMemberAvatar from '../../components/admin/AdminMemberAvatar';
import AdminScreen from '../../components/admin/AdminScreen';
import { selectAdminLeaderboard } from '../../store/slices/adminSlice';
import { adminColors, adminFonts } from '../../theme/admin';

export default function AdminLeaderboardScreen({ navigation }) {
  const rows = useSelector(selectAdminLeaderboard);
  const token = useSelector((state) => state.auth.token);
  return (
    <AdminScreen>
      <AdminHeader title="Leaderboard" back onBackPress={() => navigation.goBack()} />
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>YESTERDAY’S RESULTS</Text>
        <Text style={styles.title}>Diet-plan consistency, ranked.</Text>
        <Text style={styles.subtitle}>Scores reward every planned meal completed and posts closest to the scheduled time.</Text>
      </View>
      <View style={styles.rule} />
      {rows.map((member) => (
        <Pressable key={member.memberId} accessibilityRole="button" accessibilityLabel={`${member.rank}. ${member.name}, ${member.score} percent. ${member.mealsCompleted} of ${member.mealsPlanned} meals completed, ${member.onTimePosts} posts on time.`} onPress={() => navigation.navigate('UserDetails', { id: member.memberId })} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Text style={[styles.rank, member.rank <= 3 && styles.topRank]}>{String(member.rank).padStart(2, '0')}</Text>
          <AdminMemberAvatar profileImageUrl={member.profileImageUrl} token={token} initials={member.initials} style={styles.avatar} imageStyle={styles.avatarImage} textStyle={styles.avatarText} />
          <View style={styles.copy}>
            <View style={styles.nameLine}><Text numberOfLines={1} style={styles.name}>{member.name}</Text><Text style={styles.score}>{member.score}%</Text></View>
            <Text style={styles.metrics}>{member.mealsCompleted}/{member.mealsPlanned} meals · {member.onTimePosts}/{member.postedMeals} posts on time · {member.averageTimingMinutes >= 0 ? `${member.averageTimingMinutes} min average` : 'no timed posts'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={adminColors.muted} />
        </Pressable>
      ))}
      {!rows.length ? <View style={styles.empty}><Ionicons name="trophy-outline" size={28} color={adminColors.teal} /><Text style={styles.emptyTitle}>No results yet</Text><Text style={styles.emptyText}>The leaderboard fills after members complete and post their planned meals.</Text></View> : null}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 26 },
  eyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 1.2 },
  title: { maxWidth: 330, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -1, marginTop: 7 },
  subtitle: { maxWidth: 350, color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 14, lineHeight: 21, marginTop: 7 },
  rule: { height: 1, backgroundColor: adminColors.line, marginTop: 25 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  rank: { width: 28, color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12 },
  topRank: { color: adminColors.coral, fontSize: 14 },
  avatar: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  avatarImage: { borderRadius: 16 },
  avatarText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12 },
  copy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 15 },
  score: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 16 },
  metrics: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, marginTop: 5 },
  empty: { alignItems: 'center', paddingVertical: 52 },
  emptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 12 },
  emptyText: { maxWidth: 280, color: adminColors.muted, fontFamily: adminFonts.regular, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 5 },
  pressed: { opacity: 0.65 },
});
