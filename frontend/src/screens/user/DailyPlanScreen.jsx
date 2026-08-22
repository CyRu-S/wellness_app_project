import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import Screen from '../../components/common/Screen';
import UserHeader from '../../components/user/UserHeader';
import { toggleTask } from '../../store/slices/planSlice';
import { colors, fonts, radius, type } from '../../theme';

export default function DailyPlanScreen({ navigation }) {
  const plan = useSelector((state) => state.plan);
  const dispatch = useDispatch();
  const complete = plan.tasks.filter((task) => task.done).length;
  const progress = plan.tasks.length ? (complete / plan.tasks.length) * 100 : 0;

  return (
    <Screen>
      <UserHeader navigation={navigation} />
      <StaggeredView delay={40} style={styles.head}>
        <Text style={styles.kicker}>YOUR PROGRAM · {plan.daysRemaining} DAYS LEFT</Text>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.body}>Complete each ritual at your pace. Consistency matters more than perfect timing.</Text>
      </StaggeredView>
      <StaggeredView delay={130} style={styles.progressBlock}>
        <View style={styles.progressMeta}><Text style={styles.progressLabel}>TODAY’S PROGRESS</Text><Text style={styles.progressValue}>{complete}/{plan.tasks.length}</Text></View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      </StaggeredView>
      <StaggeredView delay={220}>
        <Text style={styles.sectionLabel}>TODAY’S RITUALS</Text>
        {plan.tasks.map((task, index) => (
          <Pressable key={task.id} onPress={() => dispatch(toggleTask(task.id))} style={({ pressed }) => [styles.task, pressed && styles.pressed]}>
            <View style={[styles.check, task.done && styles.checkDone]}>{task.done && <Ionicons name="checkmark" size={17} color={colors.white} />}</View>
            <View style={styles.copy}><Text style={[styles.taskTitle, task.done && styles.done]}>{task.title}</Text><Text style={styles.detail}>{task.detail}</Text></View>
            <Text style={styles.number}>0{index + 1}</Text>
          </Pressable>
        ))}
      </StaggeredView>
      <StaggeredView delay={310} style={styles.quote}>
        <AmbientBackground />
        <Ionicons name="leaf-outline" size={22} color={colors.accent} />
        <Text style={styles.quoteText}>Consistency is a direction, not a perfect score.</Text>
        <Text style={styles.quoteBy}>COACH MIRA</Text>
      </StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 24, gap: 8 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.display, color: colors.ink }, body: { ...type.body, color: colors.muted, maxWidth: 340 },
  progressBlock: { marginVertical: 27, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 18 }, progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, progressLabel: { ...type.label, color: colors.muted }, progressValue: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 13 }, progress: { height: 7, borderRadius: 4, backgroundColor: colors.line, marginTop: 12, overflow: 'hidden' }, progressFill: { height: 7, backgroundColor: colors.accent, borderRadius: 4 },
  sectionLabel: { ...type.label, color: colors.muted, marginBottom: 5 }, task: { flexDirection: 'row', alignItems: 'center', paddingVertical: 19, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }, pressed: { opacity: 0.65 }, check: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.tealMid, alignItems: 'center', justifyContent: 'center' }, checkDone: { backgroundColor: colors.tealMid }, copy: { flex: 1, marginLeft: 14 }, taskTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 }, done: { textDecorationLine: 'line-through', color: colors.muted }, detail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 4 }, number: { color: colors.line, fontFamily: fonts.semibold, fontSize: 18 },
  quote: { marginTop: 32, backgroundColor: colors.ink, padding: 24, borderRadius: radius.lg, overflow: 'hidden' }, quoteText: { color: colors.white, fontFamily: fonts.medium, fontSize: 19, lineHeight: 27, marginTop: 18, maxWidth: 280 }, quoteBy: { ...type.label, color: colors.accent, marginTop: 17 },
});
