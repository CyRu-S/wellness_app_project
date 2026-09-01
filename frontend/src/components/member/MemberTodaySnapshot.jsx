import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PrimaryTealCardBackground from '../common/PrimaryTealCardBackground';
import { colors, fonts, radius, shadows, type } from '../../theme';
import {
  formatJournalClock,
  formatJournalDate,
  mealImageUri,
  numeric,
  protectedImageSource,
} from '../../utils/memberJournal';

const hydrationLabel = (value) => {
  const ml = numeric(value);
  return ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 ? 1 : 0)} L` : `${ml} ml`;
};

function SummaryHero({ name, title, date, summary }) {
  const planned = numeric(summary.plannedMeals);
  const completed = numeric(summary.completedMeals);
  return (
    <View style={styles.hero}>
      <PrimaryTealCardBackground />
      <Text style={styles.heroLabel}>TODAY’S WELLNESS SNAPSHOT</Text>
      <Text numberOfLines={2} style={styles.heroName}>{title || name}</Text>
      <Text style={styles.heroDate}>{formatJournalDate(date)}</Text>
      <View style={styles.heroMetrics}>
        <View style={styles.heroMetric}><Text style={styles.heroValue}>{completed}/{planned}</Text><Text style={styles.heroMetricLabel}>MEALS</Text></View>
        <View style={styles.heroDivider} />
        <View style={styles.heroMetric}><Text style={styles.heroValue}>{numeric(summary.calories)}</Text><Text style={styles.heroMetricLabel}>KCAL</Text></View>
        <View style={styles.heroDivider} />
        <View style={styles.heroMetric}><Text style={styles.heroValue}>{numeric(summary.proteinGrams)}g</Text><Text style={styles.heroMetricLabel}>PROTEIN</Text></View>
      </View>
    </View>
  );
}

function MealTimeline({ meals, token, onOpenPhoto }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View><Text style={styles.eyebrow}>MEAL CHECK-INS</Text><Text style={styles.sectionTitle}>Today’s intake</Text></View>
        <Text style={styles.sectionCount}>{meals.filter((meal) => meal.postId || meal.completed).length}/{meals.length}</Text>
      </View>
      {meals.length ? (
        <View style={styles.timeline}>
          {meals.map((meal, index) => {
            const hasPhoto = Boolean(mealImageUri(meal));
            const posted = Boolean(meal.postId || meal.postedAt);
            const complete = posted || Boolean(meal.completed);
            const nutrition = meal.nutrition || {};
            const scheduled = formatJournalClock(meal.scheduledTime || meal.time);
            const postedAt = formatJournalClock(meal.postedAt || meal.uploadedAt);
            return (
              <View key={meal.postId || meal.plannedMealId || `${meal.type}-${index}`} style={styles.mealRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, complete && styles.timelineDotComplete]}>{complete ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}</View>
                  {index < meals.length - 1 ? <View style={styles.timelineLine} /> : null}
                </View>
                <View style={styles.mealContent}>
                  <View style={styles.mealTopline}>
                    <Text style={styles.mealType}>{meal.type || 'Meal'}</Text>
                    <Text style={[styles.mealStatus, posted && styles.mealStatusPosted]}>{posted ? 'POSTED' : complete ? 'COMPLETED' : 'PLANNED'}</Text>
                  </View>
                  <Text style={styles.mealName}>{meal.name || 'Planned meal'}</Text>
                  <Text style={styles.mealTime}>{scheduled ? `Planned ${scheduled}` : 'No scheduled time'}{postedAt ? ` · Posted ${postedAt}` : ''}</Text>
                  {posted ? (
                    <View style={styles.nutritionRow}>
                      <Text style={styles.nutritionText}>{numeric(nutrition.calories ?? meal.calories)} kcal</Text>
                      <View style={styles.nutritionDot} />
                      <Text style={styles.nutritionText}>{numeric(nutrition.proteinGrams ?? meal.proteinGrams ?? meal.protein)}g protein</Text>
                    </View>
                  ) : null}
                  {hasPhoto ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${meal.type || 'meal'} photo posted ${postedAt || 'today'}`}
                      onPress={() => onOpenPhoto(meal)}
                      style={({ pressed }) => [styles.photoPreview, pressed && styles.pressed]}
                    >
                      <Image source={protectedImageSource(meal, token)} resizeMode="cover" style={styles.previewImage} />
                      <LinearGradient colors={['transparent', 'rgba(2,38,38,0.78)']} style={styles.previewScrim} />
                      <View style={styles.previewCaption}><Ionicons name="expand-outline" size={16} color={colors.white} /><Text style={styles.previewText}>View check-in photo</Text></View>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptySection}><Ionicons name="restaurant-outline" size={24} color={colors.tealDark} /><View style={styles.emptySectionCopy}><Text style={styles.emptySectionTitle}>No meals planned today</Text><Text style={styles.emptySectionText}>Meal check-ins will appear here when they are available.</Text></View></View>
      )}
    </View>
  );
}

function HydrationSection({ total, logs }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View><Text style={styles.eyebrow}>HYDRATION</Text><Text style={styles.sectionTitle}>Water check-ins</Text></View>
        <Text style={styles.sectionCount}>{hydrationLabel(total)}</Text>
      </View>
      <View style={styles.hydrationCard}>
        <View style={styles.waterVisual}><Ionicons name="water" size={25} color={colors.tealMid} /></View>
        <View style={styles.hydrationCopy}>
          <Text style={styles.hydrationValue}>{hydrationLabel(total)} today</Text>
          <Text style={styles.hydrationMeta}>{logs.length ? `${logs.length} water check-in${logs.length === 1 ? '' : 's'}` : 'No water logged yet'}</Text>
        </View>
        {logs.length ? <View style={styles.timeChips}>{logs.slice(-3).map((log, index) => <Text key={log.id || index} style={styles.timeChip}>{numeric(log.amountMl)} ml · {formatJournalClock(log.loggedAt) || 'Today'}</Text>)}</View> : null}
      </View>
    </View>
  );
}

function ActivitySection({ total, activities }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View><Text style={styles.eyebrow}>MOVEMENT</Text><Text style={styles.sectionTitle}>Activity today</Text></View>
        <Text style={styles.sectionCount}>{numeric(total)} min</Text>
      </View>
      {activities.length ? (
        <View style={styles.activityList}>
          {activities.map((activity, index) => (
            <View key={activity.id || index} style={[styles.activityRow, index < activities.length - 1 && styles.activityDivider]}>
              <View style={styles.activityIcon}><Ionicons name="walk" size={23} color={colors.tealDark} /></View>
              <View style={styles.activityCopy}><Text style={styles.activityName}>{activity.activity || activity.name || 'Activity session'}</Text><Text style={styles.activityMeta}>{formatJournalClock(activity.startedAt) || 'Today'}{activity.distanceKm ? ` · ${activity.distanceKm} km` : ''}</Text></View>
              <Text style={styles.activityDuration}>{numeric(activity.durationMinutes ?? activity.minutes)}m</Text>
            </View>
          ))}
        </View>
      ) : <View style={styles.emptySection}><Ionicons name="walk-outline" size={25} color={colors.tealDark} /><View style={styles.emptySectionCopy}><Text style={styles.emptySectionTitle}>No activity posted yet</Text><Text style={styles.emptySectionText}>Today’s movement sessions will appear here.</Text></View></View>}
    </View>
  );
}

export default function MemberTodaySnapshot({
  snapshot,
  token,
  onOpenPhoto,
  showAccessNote = false,
  showHero = true,
  showHydration = true,
  title,
}) {
  const summary = snapshot?.summary || {};
  const meals = snapshot?.meals || snapshot?.plannedMeals || [];
  const waterLogs = snapshot?.waterLogs || snapshot?.hydration?.logs || [];
  const activities = snapshot?.activities || snapshot?.activity?.sessions || [];
  const name = snapshot?.member?.name || 'Member';

  return (
    <>
      {showHero ? <SummaryHero name={name} title={title} date={snapshot?.date} summary={summary} /> : null}
      {showAccessNote ? <View style={styles.accessNote}><Ionicons name="shield-checkmark-outline" size={18} color={colors.tealDark} /><Text style={styles.accessNoteText}>You can view today’s check-ins only. Personal details and previous days remain private.</Text></View> : null}
      <MealTimeline meals={meals} token={token} onOpenPhoto={onOpenPhoto} />
      {showHydration ? <HydrationSection total={summary.hydrationMl ?? snapshot?.hydration?.totalMl} logs={waterLogs} /> : null}
      <ActivitySection total={summary.activityMinutes ?? snapshot?.activity?.totalMinutes} activities={activities} />
    </>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 263, borderRadius: radius.xl, marginTop: 19, padding: 22, overflow: 'hidden', backgroundColor: colors.tealDark, ...shadows.soft },
  heroLabel: { ...type.label, color: '#C9ECE8', fontSize: 8, zIndex: 2 },
  heroName: { color: colors.white, fontFamily: fonts.semibold, fontSize: 31, lineHeight: 35, letterSpacing: -0.9, marginTop: 18, zIndex: 2 },
  heroDate: { color: '#CFEAE7', fontFamily: fonts.regular, fontSize: 11, marginTop: 5, zIndex: 2 },
  heroMetrics: { flexDirection: 'row', alignItems: 'center', marginTop: 29, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)', zIndex: 2 },
  heroMetric: { flex: 1 },
  heroValue: { color: colors.white, fontFamily: fonts.semibold, fontSize: 20 },
  heroMetricLabel: { ...type.label, color: '#CFEAE7', fontSize: 6, marginTop: 4 },
  heroDivider: { width: 1, height: 31, backgroundColor: 'rgba(255,255,255,0.16)', marginHorizontal: 12 },
  accessNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: radius.md, backgroundColor: colors.accentSoft, padding: 14, marginTop: 14 },
  accessNoteText: { flex: 1, color: colors.inkSoft, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  section: { marginTop: 31 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { ...type.label, color: colors.tealMid, fontSize: 8 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 21, marginTop: 4 },
  sectionCount: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 13 },
  timeline: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16, ...shadows.soft },
  mealRow: { flexDirection: 'row' },
  timelineRail: { width: 28, alignItems: 'center' },
  timelineDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  timelineDotComplete: { backgroundColor: colors.tealMid, borderColor: colors.tealMid },
  timelineLine: { width: 1, flex: 1, minHeight: 86, backgroundColor: colors.line },
  mealContent: { flex: 1, paddingLeft: 10, paddingBottom: 22 },
  mealTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealType: { ...type.label, color: colors.tealDark, fontSize: 7 },
  mealStatus: { ...type.label, color: colors.muted, backgroundColor: colors.mist, borderRadius: radius.pill, fontSize: 6, paddingHorizontal: 8, paddingVertical: 4 },
  mealStatusPosted: { color: colors.tealDark, backgroundColor: colors.accentSoft },
  mealName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, marginTop: 5 },
  mealTime: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, marginTop: 4 },
  nutritionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  nutritionText: { color: colors.inkSoft, fontFamily: fonts.medium, fontSize: 10 },
  nutritionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.tealMid },
  photoPreview: { height: 142, borderRadius: 17, overflow: 'hidden', marginTop: 13, backgroundColor: colors.mist },
  previewImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  previewScrim: { ...StyleSheet.absoluteFillObject },
  previewCaption: { position: 'absolute', left: 13, right: 13, bottom: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  previewText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11 },
  emptySection: { minHeight: 91, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16 },
  emptySectionCopy: { flex: 1 },
  emptySectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  emptySectionText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 15, marginTop: 3 },
  hydrationCard: { minHeight: 91, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 15 },
  waterVisual: { width: 48, height: 55, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  hydrationCopy: { flex: 1 },
  hydrationValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  hydrationMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 9, marginTop: 4 },
  timeChips: { alignItems: 'flex-end', gap: 3 },
  timeChip: { color: colors.tealDark, fontFamily: fonts.medium, fontSize: 8 },
  activityRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, paddingHorizontal: 14 },
  activityList: { overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  activityDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  activityIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1 },
  activityName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  activityMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, marginTop: 4 },
  activityDuration: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 17 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
});
