import React from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import AmbientBackground from '../../components/common/AmbientBackground';
import Screen from '../../components/common/Screen';
import UserHeader from '../../components/user/UserHeader';
import { toggleTask } from '../../store/slices/planSlice';
import { colors, fonts, radius, type } from '../../theme';

const fittedText = { maxFontSizeMultiplier: 1.15 };

export default function DailyPlanScreen({ navigation }) {
  const plan = useSelector((state) => state.plan);
  const dispatch = useDispatch();
  const { fontScale } = useWindowDimensions();
  const compactLayout = Platform.OS === 'ios' || fontScale > 1.15;
  const complete = plan.tasks.filter((task) => task.done).length;
  const progress = plan.tasks.length ? (complete / plan.tasks.length) * 100 : 0;

  return (
    <Screen>
      <UserHeader navigation={navigation} title="Daily plan" />
      <StaggeredView delay={40} style={[styles.head, compactLayout && styles.headCompact]}>
        <Text {...fittedText} style={styles.kicker}>YOUR PROGRAM · {plan.daysRemaining} DAYS LEFT</Text>
        <Text {...fittedText} style={[styles.title, compactLayout && styles.titleCompact]}>{plan.title}</Text>
        <Text {...fittedText} style={[styles.body, compactLayout && styles.bodyCompact]}>Complete each ritual at your pace. Consistency matters more than perfect timing.</Text>
      </StaggeredView>
      <StaggeredView delay={130} style={[styles.progressBlock, compactLayout && styles.progressBlockCompact]}>
        <View style={styles.progressMeta}><Text {...fittedText} style={styles.progressLabel}>TODAY’S PROGRESS</Text><Text {...fittedText} style={styles.progressValue}>{complete}/{plan.tasks.length}</Text></View>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      </StaggeredView>
      <StaggeredView delay={220}>
        <Text {...fittedText} style={styles.sectionLabel}>TODAY’S RITUALS</Text>
        {plan.tasks.map((task, index) => (
          <Pressable key={task.id} onPress={() => dispatch(toggleTask(task.id))} style={({ pressed }) => [styles.task, compactLayout && styles.taskCompact, pressed && styles.pressed]}>
            <View style={[styles.check, task.done && styles.checkDone]}>{task.done && <Ionicons name="checkmark" size={17} color={colors.white} />}</View>
            <View style={styles.copy}><Text {...fittedText} style={[styles.taskTitle, compactLayout && styles.taskTitleCompact, task.done && styles.done]}>{task.title}</Text><Text {...fittedText} style={[styles.detail, compactLayout && styles.detailCompact]}>{task.detail}</Text></View>
            <Text {...fittedText} style={styles.number}>0{index + 1}</Text>
          </Pressable>
        ))}
      </StaggeredView>
      <StaggeredView delay={310} style={[styles.quote, compactLayout && styles.quoteCompact]}>
        <AmbientBackground />
        <Ionicons name="leaf-outline" size={22} color={colors.accent} />
        <Text {...fittedText} style={[styles.quoteText, compactLayout && styles.quoteTextCompact]}>Consistency is a direction, not a perfect score.</Text>
        <Text {...fittedText} style={styles.quoteBy}>COACH MIRA</Text>
      </StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 26 }, kicker: { ...type.label, color: colors.tealMid }, title: { ...type.display, color: colors.ink, marginTop: 9 }, body: { ...type.body, color: colors.muted, maxWidth: 340, marginTop: 11 },
  headCompact: { marginTop: 22 }, titleCompact: { fontSize: 32, lineHeight: 37, letterSpacing: -1 }, bodyCompact: { fontSize: 15, lineHeight: 21, marginTop: 9 },
  progressBlock: { marginTop: 31, marginBottom: 33, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 21 }, progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 }, progressLabel: { ...type.label, color: colors.muted }, progressValue: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 }, progress: { height: 8, borderRadius: 4, backgroundColor: colors.line, marginTop: 16, overflow: 'hidden' }, progressFill: { height: 8, backgroundColor: colors.accent, borderRadius: 4 },
  progressBlockCompact: { marginTop: 26, marginBottom: 28, paddingVertical: 18 },
  sectionLabel: { ...type.label, color: colors.muted, marginBottom: 10 }, task: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }, pressed: { opacity: 0.65 }, check: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.tealMid, alignItems: 'center', justifyContent: 'center' }, checkDone: { backgroundColor: colors.tealMid }, copy: { flex: 1, minWidth: 0 }, taskTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 }, done: { textDecorationLine: 'line-through', color: colors.muted }, detail: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, marginTop: 6 }, number: { width: 28, color: colors.line, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 22, textAlign: 'right' },
  taskCompact: { minHeight: 86, paddingVertical: 15 }, taskTitleCompact: { fontSize: 15, lineHeight: 20 }, detailCompact: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  quote: { marginTop: 37, backgroundColor: colors.ink, borderRadius: radius.lg, padding: 24, overflow: 'hidden' }, quoteText: { color: colors.white, fontFamily: fonts.medium, fontSize: 19, lineHeight: 28, marginTop: 19, maxWidth: 280 }, quoteBy: { ...type.label, color: colors.accent, marginTop: 19 },
  quoteCompact: { marginTop: 32, padding: 22 }, quoteTextCompact: { fontSize: 18, lineHeight: 26, marginTop: 17 },
});
