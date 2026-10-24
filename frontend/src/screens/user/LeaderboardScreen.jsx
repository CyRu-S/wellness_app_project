import { LocalizedText as Text } from '../../components/common/LocalizedText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import Screen from '../../components/common/Screen';
import UserHeader from '../../components/user/UserHeader';
import { selectLeaderboardState } from '../../store/slices/leaderboardSlice';
import { colors, fonts, radius, type } from '../../theme';

const reachedLabel = (row) => row.score > 0 && row.percentageReachedAt
  ? `Reached ${row.score}% at ${new Date(row.percentageReachedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  : 'No progress logged yet';

export default function LeaderboardScreen({ navigation }) {
  const leaderboard = useSelector(selectLeaderboardState);
  const rows = leaderboard.rows;
  return <Screen>
    <UserHeader navigation={navigation} title="Live leaderboard" />
    <View style={styles.heading}>
      <View style={styles.liveLine}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE TODAY</Text></View>
      <Text style={styles.title}>Consistency, as it happens.</Text>
      <Text style={styles.subtitle}>Assigned items, to-dos, water and movement shape the percentage. When percentages match, whoever reached it first ranks higher.</Text>
    </View>
    <View style={styles.rule} />
    {rows.map((member) => <View key={member.memberId} style={[styles.row, member.viewer && styles.viewerRow]}>
      <View style={[styles.rank, member.rank <= 3 && styles.topRank]}><Text style={[styles.rankText, member.rank <= 3 && styles.topRankText]}>{member.rank}</Text></View>
      <View style={styles.copy}>
        <View style={styles.nameLine}><Text numberOfLines={1} style={styles.name}>{member.name}{member.viewer ? ' · You' : ''}</Text><Text style={styles.score}>{member.score}%</Text></View>
        <Text style={styles.timing}>{reachedLabel(member)}</Text>
        <Text style={styles.metrics}>{member.tasksCompleted}/{member.tasksPlanned} to-do · {member.hydrationMl}/{member.hydrationGoalMl} ml water · {member.activityMinutes} min movement</Text>
      </View>
    </View>)}
    {!rows.length && leaderboard.status !== 'loading' ? <View style={styles.empty}><Ionicons name="trophy-outline" size={30} color={colors.tealMid} /><Text style={styles.emptyTitle}>No members ranked yet</Text><Text style={styles.emptyText}>Today’s standings appear as soon as members start logging.</Text></View> : null}
    {leaderboard.error ? <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.error}><Text style={styles.errorText}>Live update unavailable. Pull down to retry.</Text></Pressable> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { marginTop: 25 },
  liveLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tealMid },
  liveText: { ...type.label, color: colors.tealMid, fontSize: 10, letterSpacing: 1.1 },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -1, marginTop: 8 },
  subtitle: { maxWidth: 365, color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginTop: 7 },
  rule: { height: 1, backgroundColor: colors.line, marginTop: 24 },
  row: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  viewerRow: { backgroundColor: colors.accentSoft, marginHorizontal: -10, paddingHorizontal: 10, borderRadius: radius.sm },
  rank: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  topRank: { backgroundColor: colors.tealDark },
  rankText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12 },
  topRankText: { color: colors.white },
  copy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, color: colors.ink, fontFamily: fonts.semibold, fontSize: 15 },
  score: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 18 },
  timing: { color: colors.tealMid, fontFamily: fonts.medium, fontSize: 11, marginTop: 4 },
  metrics: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: 52 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, marginTop: 12 },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 5 },
  error: { minHeight: 46, justifyContent: 'center' },
  errorText: { color: colors.danger, fontFamily: fonts.medium, fontSize: 12 },
});
