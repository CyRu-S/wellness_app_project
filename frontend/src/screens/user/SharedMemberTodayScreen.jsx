import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AmbientBackground from '../../components/common/AmbientBackground';
import {
  clearSharedMemberToday,
  loadSharedMemberToday,
} from '../../store/slices/memberAccessSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080/api';

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value) => {
  if (!value) return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

const formatClock = (value) => {
  if (!value) return null;
  if (/^\d{2}:\d{2}/.test(value)) {
    const [hour, minute] = value.split(':').map(Number);
    const stamp = new Date();
    stamp.setHours(hour, minute, 0, 0);
    return stamp.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

const hydrationLabel = (value) => {
  const ml = number(value);
  return ml >= 1000 ? `${(ml / 1000).toFixed(ml % 1000 ? 1 : 0)} L` : `${ml} ml`;
};

const imageUriFor = (meal) => meal?.imageUrl || meal?.imageUri || (meal?.postId ? `/api/meal-posts/${meal.postId}/image` : null);

const imageSourceFor = (meal, token) => {
  const rawUri = imageUriFor(meal);
  if (!rawUri) return null;
  if (typeof rawUri !== 'string') return rawUri;
  let uri = rawUri;
  if (!/^(https?:|file:|data:|blob:)/i.test(rawUri)) {
    const origin = API_URL.replace(/\/api\/?$/, '');
    uri = rawUri.startsWith('/api/') ? `${origin}${rawUri}` : `${API_URL.replace(/\/$/, '')}/${rawUri.replace(/^\//, '')}`;
  }
  return { uri, ...(token && /^https?:/i.test(uri) ? { headers: { Authorization: `Bearer ${token}` } } : {}) };
};

function BackHeader({ navigation }) {
  return (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to shared members" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Ionicons name="arrow-back" size={21} color={colors.ink} />
      </Pressable>
      <Text style={styles.topTitle}>Shared today</Text>
      <View style={styles.readOnlyPill}><Ionicons name="eye-outline" size={13} color={colors.tealDark} /><Text style={styles.readOnlyText}>READ ONLY</Text></View>
    </View>
  );
}

function SummaryHero({ name, date, summary }) {
  const planned = number(summary.plannedMeals);
  const completed = number(summary.completedMeals);
  return (
    <View style={styles.hero}>
      <LinearGradient colors={[colors.tealDark, '#0C8B80']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <AmbientBackground light />
      <Text style={styles.heroLabel}>TODAY’S WELLNESS SNAPSHOT</Text>
      <Text numberOfLines={2} style={styles.heroName}>{name}</Text>
      <Text style={styles.heroDate}>{formatDate(date)}</Text>
      <View style={styles.heroMetrics}>
        <View style={styles.heroMetric}><Text style={styles.heroValue}>{completed}/{planned}</Text><Text style={styles.heroMetricLabel}>MEALS</Text></View>
        <View style={styles.heroDivider} />
        <View style={styles.heroMetric}><Text style={styles.heroValue}>{number(summary.calories)}</Text><Text style={styles.heroMetricLabel}>KCAL</Text></View>
        <View style={styles.heroDivider} />
        <View style={styles.heroMetric}><Text style={styles.heroValue}>{number(summary.proteinGrams)}g</Text><Text style={styles.heroMetricLabel}>PROTEIN</Text></View>
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
            const hasPhoto = Boolean(imageUriFor(meal));
            const posted = Boolean(meal.postId || meal.postedAt);
            const complete = posted || Boolean(meal.completed);
            const nutrition = meal.nutrition || {};
            const scheduled = formatClock(meal.scheduledTime || meal.time);
            const postedAt = formatClock(meal.postedAt || meal.uploadedAt);
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
                      <Text style={styles.nutritionText}>{number(nutrition.calories ?? meal.calories)} kcal</Text>
                      <View style={styles.nutritionDot} />
                      <Text style={styles.nutritionText}>{number(nutrition.proteinGrams ?? meal.proteinGrams ?? meal.protein)}g protein</Text>
                    </View>
                  ) : null}
                  {hasPhoto ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${meal.type || 'meal'} photo posted ${postedAt || 'today'}`}
                      onPress={() => onOpenPhoto(meal)}
                      style={({ pressed }) => [styles.photoPreview, pressed && styles.pressed]}
                    >
                      <Image source={imageSourceFor(meal, token)} resizeMode="cover" style={styles.previewImage} />
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
        {logs.length ? <View style={styles.timeChips}>{logs.slice(-3).map((log, index) => <Text key={log.id || index} style={styles.timeChip}>{number(log.amountMl)} ml · {formatClock(log.loggedAt) || 'Today'}</Text>)}</View> : null}
      </View>
    </View>
  );
}

function ActivitySection({ total, activities }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View><Text style={styles.eyebrow}>MOVEMENT</Text><Text style={styles.sectionTitle}>Activity today</Text></View>
        <Text style={styles.sectionCount}>{number(total)} min</Text>
      </View>
      {activities.length ? (
        <View style={styles.activityList}>
          {activities.map((activity, index) => (
            <View key={activity.id || index} style={[styles.activityRow, index < activities.length - 1 && styles.activityDivider]}>
              <View style={styles.activityIcon}><Ionicons name="walk" size={23} color={colors.tealDark} /></View>
              <View style={styles.activityCopy}><Text style={styles.activityName}>{activity.activity || activity.name || 'Activity session'}</Text><Text style={styles.activityMeta}>{formatClock(activity.startedAt) || 'Today'}{activity.distanceKm ? ` · ${activity.distanceKm} km` : ''}</Text></View>
              <Text style={styles.activityDuration}>{number(activity.durationMinutes ?? activity.minutes)}m</Text>
            </View>
          ))}
        </View>
      ) : <View style={styles.emptySection}><Ionicons name="walk-outline" size={25} color={colors.tealDark} /><View style={styles.emptySectionCopy}><Text style={styles.emptySectionTitle}>No activity posted yet</Text><Text style={styles.emptySectionText}>Today’s movement sessions will appear here.</Text></View></View>}
    </View>
  );
}

function FailedState({ revoked, message, onRetry, onBack }) {
  return (
    <View style={styles.failedState}>
      <View style={[styles.failedIcon, revoked && styles.revokedIcon]}><Ionicons name={revoked ? 'lock-closed-outline' : 'cloud-offline-outline'} size={30} color={revoked ? colors.danger : colors.tealDark} /></View>
      <Text style={styles.failedTitle}>{revoked ? 'Access is no longer available' : 'Today’s view didn’t load'}</Text>
      <Text style={styles.failedCopy}>{revoked ? 'Your club admin may have changed this permission. This member’s information is no longer visible to you.' : message || 'Check your connection and try again.'}</Text>
      <Pressable accessibilityRole="button" onPress={revoked ? onBack : onRetry} style={({ pressed }) => [styles.failedAction, pressed && styles.pressed]}>
        <Text style={styles.failedActionText}>{revoked ? 'Back to shared members' : 'Try again'}</Text>
        <Ionicons name={revoked ? 'arrow-back' : 'refresh'} size={17} color={colors.white} />
      </Pressable>
    </View>
  );
}

export default function SharedMemberTodayScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const access = useSelector((state) => state.memberAccess || {});
  const memberId = route.params?.memberId;
  const fallbackName = route.params?.memberName || 'Member';
  const payload = access.sharedToday;
  const today = useMemo(() => {
    if (!payload) return null;
    if (payload.byMemberId) return payload.byMemberId[memberId] || null;
    if (payload.member?.id != null && memberId != null && String(payload.member.id) !== String(memberId)) return null;
    return payload;
  }, [memberId, payload]);
  const status = access.sharedTodayStatus || access.todayStatus || access.status || 'idle';
  const error = access.sharedTodayError || access.error;
  const loading = status === 'loading' || status === 'pending';
  const errorStatus = error?.status ?? error?.code ?? access.errorStatus;
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const revoked = errorStatus === 404 || /not found|no longer|permission|access/i.test(errorMessage || '');

  const load = useCallback(() => {
    if (memberId != null) return dispatch(loadSharedMemberToday(memberId));
    return undefined;
  }, [dispatch, memberId]);

  useEffect(() => {
    load();
    return () => { dispatch(clearSharedMemberToday()); };
  }, [dispatch, load]);

  const openPhoto = useCallback((post) => {
    navigation.navigate('SharedPhoto', { post, memberName: today?.member?.name || fallbackName });
  }, [fallbackName, navigation, today?.member?.name]);

  if (!today && loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.content}><BackHeader navigation={navigation} /><View style={styles.loadingState}><ActivityIndicator color={colors.tealMid} size="large" /><Text style={styles.loadingTitle}>Opening today’s snapshot</Text><Text style={styles.loadingCopy}>Loading shared check-ins securely…</Text></View></View>
      </SafeAreaView>
    );
  }

  if (!today && error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.content}><BackHeader navigation={navigation} /><FailedState revoked={revoked} message={errorMessage} onRetry={load} onBack={() => navigation.goBack()} /></View>
      </SafeAreaView>
    );
  }

  const summary = today?.summary || {};
  const meals = today?.meals || today?.plannedMeals || [];
  const waterLogs = today?.waterLogs || today?.hydration?.logs || [];
  const activities = today?.activities || today?.activity?.sessions || [];
  const name = today?.member?.name || fallbackName;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[colors.tealMid]} tintColor={colors.tealMid} />}
      >
        <BackHeader navigation={navigation} />
        <SummaryHero name={name} date={today?.date} summary={summary} />
        <View style={styles.accessNote}><Ionicons name="shield-checkmark-outline" size={18} color={colors.tealDark} /><Text style={styles.accessNoteText}>You can view today’s check-ins only. Personal details and previous days remain private.</Text></View>
        <MealTimeline meals={meals} token={token} onOpenPhoto={openPhoto} />
        <HydrationSection total={summary.hydrationMl ?? today?.hydration?.totalMl} logs={waterLogs} />
        <ActivitySection total={summary.activityMinutes ?? today?.activity?.totalMinutes} activities={activities} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28 },
  topBar: { minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  topTitle: { position: 'absolute', left: 64, right: 104, color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },
  readOnlyPill: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, backgroundColor: colors.accentSoft, paddingHorizontal: 10 },
  readOnlyText: { ...type.label, color: colors.tealDark, fontSize: 10, letterSpacing: 0.7 },
  hero: { minHeight: 263, borderRadius: radius.lg, marginTop: 19, padding: 22, overflow: 'hidden', ...shadows.raised },
  heroLabel: { ...type.label, color: '#BDE7DF', fontSize: 11, zIndex: 2 },
  heroName: { color: colors.white, fontFamily: fonts.semibold, fontSize: 31, lineHeight: 35, letterSpacing: -0.9, marginTop: 18, zIndex: 2 },
  heroDate: { color: '#BBD9D5', fontFamily: fonts.regular, fontSize: 11, marginTop: 5, zIndex: 2 },
  heroMetrics: { flexDirection: 'row', alignItems: 'center', marginTop: 29, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)', zIndex: 2 },
  heroMetric: { flex: 1 },
  heroValue: { color: colors.white, fontFamily: fonts.semibold, fontSize: 20 },
  heroMetricLabel: { color: '#BBD9D5', fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.6, marginTop: 4 },
  heroDivider: { width: 1, height: 31, backgroundColor: 'rgba(255,255,255,0.16)', marginHorizontal: 12 },
  accessNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: radius.md, backgroundColor: colors.accentSoft, padding: 14, marginTop: 14 },
  accessNoteText: { flex: 1, color: colors.inkSoft, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  section: { marginTop: 31 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { ...type.label, color: colors.tealMid, fontSize: 11 },
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
  mealType: { ...type.label, color: colors.tealDark, fontSize: 10 },
  mealStatus: { color: colors.muted, fontFamily: fonts.semibold, backgroundColor: colors.mist, borderRadius: radius.pill, fontSize: 10, lineHeight: 14, letterSpacing: 0.5, paddingHorizontal: 9, paddingVertical: 5 },
  mealStatusPosted: { color: colors.tealDark, backgroundColor: colors.accentSoft },
  mealName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, marginTop: 5 },
  mealTime: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, marginTop: 4 },
  nutritionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  nutritionText: { color: colors.inkSoft, fontFamily: fonts.semibold, fontSize: 12 },
  nutritionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.tealMid },
  photoPreview: { height: 142, borderRadius: 17, overflow: 'hidden', marginTop: 13, backgroundColor: colors.mist },
  previewImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  previewScrim: { ...StyleSheet.absoluteFillObject },
  previewCaption: { position: 'absolute', left: 13, right: 13, bottom: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  previewText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11 },
  emptySection: { minHeight: 91, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 16 },
  emptySectionCopy: { flex: 1 },
  emptySectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  emptySectionText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: 3 },
  hydrationCard: { minHeight: 91, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 15 },
  waterVisual: { width: 48, height: 55, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  hydrationCopy: { flex: 1 },
  hydrationValue: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  hydrationMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
  timeChips: { alignItems: 'flex-end', gap: 3 },
  timeChip: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 11 },
  activityRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, paddingHorizontal: 14 },
  activityList: { overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  activityDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  activityIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1 },
  activityName: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  activityMeta: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
  activityDuration: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 17 },
  loadingState: { flex: 1, minHeight: 430, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, marginTop: 18 },
  loadingCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, marginTop: 5 },
  failedState: { flex: 1, minHeight: 440, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  failedIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  revokedIcon: { backgroundColor: '#FCE6E2' },
  failedTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20, textAlign: 'center', marginTop: 19 },
  failedCopy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 305, marginTop: 8 },
  failedAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, backgroundColor: colors.tealMid, paddingHorizontal: 20, marginTop: 20 },
  failedActionText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 12 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
});
