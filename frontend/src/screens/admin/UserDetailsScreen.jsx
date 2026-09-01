import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import AdminBarChart from '../../components/admin/AdminBarChart';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import AdminSegmentedControl from '../../components/admin/AdminSegmentedControl';
import MemberTodaySnapshot from '../../components/member/MemberTodaySnapshot';
import { memberAdherence } from '../../data/adminDemoData';
import {
  selectAdminMemberMealPlans,
  selectAdminMembers,
  updateMemberMealPlan,
} from '../../store/slices/adminSlice';
import {
  loadAdminMemberJournal,
  saveAdminMemberWaterGoal,
  selectAdminMemberJournal,
  selectAdminMemberJournalRequest,
  selectAdminMemberWaterGoalRequest,
} from '../../store/slices/adminMemberJournalSlice';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';
import { formatJournalClock, formatJournalDate, mealImageUri, protectedImageSource } from '../../utils/memberJournal';
import { profileImageSource } from '../../utils/profilePhoto';

const TIME_PATTERN = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i;
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Herbalife product'];

function timeToHour(value, fallback) {
  const match = value.trim().match(TIME_PATTERN);
  if (!match) return fallback;
  const compact = value.trim().toUpperCase().replace(/\s+/g, '');
  const meridiem = compact.slice(-2);
  const [rawHour, rawMinute] = compact.slice(0, -2).split(':').map(Number);
  const hour = (rawHour % 12) + (meridiem === 'PM' ? 12 : 0);
  return hour + rawMinute / 60;
}

function Stat({ value, label, last }) {
  return (
    <View style={[styles.stat, !last && styles.statDivider]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Overview({ member, plan, snapshot }) {
  const series = memberAdherence.map((value, index) => ({
    label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index],
    value: Math.max(34, Math.min(100, value + member.adherence - 82)),
  }));
  const completedItems = plan.items.filter((item) => item.consumed);
  const completed = completedItems.length;
  const calories = snapshot?.summary?.calories ?? completedItems.reduce((sum, item) => sum + (item.detectedCalories ?? item.calories ?? 0), 0);
  const protein = snapshot?.summary?.proteinGrams ?? completedItems.reduce((sum, item) => sum + (item.detectedProtein ?? item.protein ?? 0), 0);
  const hydrationMl = snapshot?.summary?.hydrationMl;
  const hydrationConsumed = hydrationMl != null
    ? hydrationMl >= 1000 ? `${(hydrationMl / 1000).toFixed(hydrationMl % 1000 ? 1 : 0)} L` : `${hydrationMl} ml`
    : `${member.hydration}%`;
  const waterGoalMl = member.waterGoalMl || 2000;
  const hydration = hydrationMl != null
    ? `${hydrationConsumed} / ${(waterGoalMl / 1000).toFixed(waterGoalMl % 1000 ? 2 : 0).replace(/0$/, '')} L`
    : hydrationConsumed;

  return (
    <>
      <LinearGradient colors={['#F1FBF9', '#D7F1EC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Stat value={`${completed}/${plan.items.length}`} label="meals today" />
          <Stat value={hydration} label="water intake" />
          <Stat value={member.streak} label="day streak" last />
        </View>
        <View style={styles.statsHorizontalDivider} />
        <View style={styles.statsRow}>
          <Stat value={calories} label="kcal today" />
          <Stat value={`${protein}g`} label="protein today" last />
        </View>
      </LinearGradient>

      <LinearGradient colors={['#FFFFFF', '#F0FAF7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chartCard}>
        <View pointerEvents="none" style={styles.chartGlow} />
        <View style={styles.cardHeading}>
          <View><Text style={styles.cardEyebrow}>SEVEN-DAY ADHERENCE</Text><Text style={styles.cardTitle}>{member.adherence}% average</Text></View>
          <Text style={styles.chartTrend}>{member.adherence >= 75 ? 'On track' : 'Needs care'}</Text>
        </View>
        <AdminBarChart data={series} label={`${member.name} seven day adherence`} />
      </LinearGradient>

      <LinearGradient colors={['#F1FBF9', '#D7F1EC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planCard}>
        <View style={styles.planTop}>
          <View style={styles.planHeading}>
            <Text style={styles.cardEyebrow}>DAILY MEAL PLAN</Text>
            <Text style={styles.planName}>{plan.planName}</Text>
          </View>
          <View style={styles.repeatPill}><Text style={styles.repeatText}>REPEATS DAILY</Text></View>
        </View>
        <Text style={styles.planExplanation}>This schedule stays active every day until you adjust it.</Text>
        <View style={styles.planMeals}>
          {plan.items.map((meal, index) => (
            <View key={meal.id || `${meal.type}-${index}`} style={[styles.planMeal, index < plan.items.length - 1 && styles.planMealDivider]}>
              <View style={styles.planMealIndex}><Text style={styles.planMealIndexText}>{String(index + 1).padStart(2, '0')}</Text></View>
              <View style={styles.planMealCopy}><Text style={styles.planMealType}>{meal.type}</Text><Text numberOfLines={1} style={styles.planMealName}>{meal.name}</Text></View>
              <Text style={styles.planMealTime}>{meal.time}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.planUpdated}>Last adjusted {plan.updatedAt || 'today'}</Text>
      </LinearGradient>

      {member.attentionReason ? (
        <View style={styles.careNote}>
          <View style={styles.careCopy}><Text style={styles.careTitle}>Worth a closer look</Text><Text style={styles.careText}>{member.attentionReason}</Text></View>
        </View>
      ) : null}
    </>
  );
}

function Today({ plan, snapshot, token, onOpenPhoto }) {
  if (snapshot) return <MemberTodaySnapshot snapshot={snapshot} token={token} onOpenPhoto={onOpenPhoto} showHero={false} showHydration={false} />;
  const completed = plan.items.filter((item) => item.consumed).length;
  return (
    <>
      <View style={styles.todayHeader}>
        <View><Text style={styles.cardEyebrow}>TODAY’S CHECK-INS</Text><Text style={styles.todayTitle}>{completed} of {plan.items.length} meals complete</Text></View>
        <Text style={styles.todayDate}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
      </View>
      <View style={styles.todayList}>
        {plan.items.map((meal, index) => {
          const hasPhoto = Boolean(meal.imageUri);
          const complete = Boolean(meal.consumed);
          const title = meal.detectedName || meal.name;
          return (
            <Pressable
              key={meal.id || `${meal.type}-${index}`}
              accessibilityRole={hasPhoto ? 'button' : undefined}
              accessibilityLabel={hasPhoto ? `View ${meal.type} photo posted at ${meal.uploadedAt}` : `${meal.type}. ${complete ? 'Completed without a photo' : 'Awaiting check-in'}`}
              disabled={!hasPhoto}
              onPress={() => onOpenPhoto(meal)}
              style={({ pressed }) => [styles.todayMeal, complete && styles.todayMealComplete, pressed && styles.pressed]}
            >
              {hasPhoto ? (
                <Image source={{ uri: meal.imageUri }} resizeMode="cover" style={styles.mealPhoto} />
              ) : (
                <View style={[styles.mealPlaceholder, complete && styles.mealPlaceholderComplete]}>
                  <Text style={styles.mealPlaceholderText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
              )}
              <View style={styles.todayMealCopy}>
                <View style={styles.todayMealTopline}>
                  <Text style={styles.todayMealType}>{meal.type}</Text>
                  <Text style={[styles.todayStatus, complete && styles.todayStatusComplete]}>{hasPhoto ? 'PHOTO POSTED' : complete ? 'COMPLETED' : 'AWAITING'}</Text>
                </View>
                <Text numberOfLines={2} style={styles.todayMealName}>{title}</Text>
                <Text style={styles.todayMealMeta}>{meal.time}{meal.uploadedAt ? ` · checked in ${meal.uploadedAt}` : ''}</Text>
                {hasPhoto ? <Text style={styles.viewPhoto}>Tap to view photo</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function History({ posts = [], days, token, retentionDays = 21, onOpenPhoto }) {
  if (days) return <JournalHistory days={days} token={token} retentionDays={retentionDays} onOpenPhoto={onOpenPhoto} />;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const cutoff = startOfToday.getTime() - 21 * 24 * 60 * 60 * 1000;
  const previousPosts = posts
    .filter((post) => {
      const postedAt = new Date(post.postedAt).getTime();
      return postedAt < startOfToday.getTime() && postedAt >= cutoff;
    })
    .sort((first, second) => new Date(second.postedAt).getTime() - new Date(first.postedAt).getTime());

  return (
    <>
      <View style={styles.historyHeading}>
        <View><Text style={styles.cardEyebrow}>MEAL HISTORY</Text><Text style={styles.historyHeadingTitle}>Previous-day posts</Text></View>
        <View style={styles.retentionPill}><Text style={styles.retentionText}>21 DAYS</Text></View>
      </View>
      <Text style={styles.historyIntro}>Only previous meal posts are kept here. Posts older than 21 days are removed automatically.</Text>
      {previousPosts.length ? (
        <View style={styles.historyList}>
          {previousPosts.map((post, index) => (
            <Pressable
              key={post.id}
              accessibilityRole={post.imageUri ? 'button' : undefined}
              accessibilityLabel={post.imageUri ? `View ${post.type} photo from ${new Date(post.postedAt).toLocaleDateString('en-IN')}` : `${post.type} posted ${new Date(post.postedAt).toLocaleDateString('en-IN')}`}
              disabled={!post.imageUri}
              onPress={() => onOpenPhoto(post)}
              style={({ pressed }) => [styles.historyRow, index < previousPosts.length - 1 && styles.historyRowDivider, pressed && styles.pressed]}
            >
              {post.imageUri ? <Image source={{ uri: post.imageUri }} resizeMode="cover" style={styles.historyPhoto} /> : <View style={styles.historyPlaceholder}><Text style={styles.historyPlaceholderText}>{post.type.slice(0, 2).toUpperCase()}</Text></View>}
              <View style={styles.historyCopy}>
                <View style={styles.historyTitleRow}><Text style={styles.historyTitle}>{post.type}</Text><Text style={styles.historyDate}>{new Date(post.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text></View>
                <Text numberOfLines={1} style={styles.historyDetail}>{post.name}</Text>
                <Text style={styles.historyTime}>Posted {post.loggedAt}{post.imageUri ? ' · Tap to view photo' : ''}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.historyEmpty}><Text style={styles.historyEmptyTitle}>No previous posts</Text><Text style={styles.historyEmptyText}>Yesterday’s meal posts will appear here and remain available for 21 days.</Text></View>
      )}
    </>
  );
}

function JournalState({ loading, error, onRetry }) {
  return (
    <View style={styles.journalState}>
      {loading ? <ActivityIndicator color={adminColors.teal} /> : <Ionicons name="cloud-offline-outline" size={25} color={adminColors.coral} />}
      <Text style={styles.journalStateTitle}>{loading ? 'Loading member journal' : 'Member journal unavailable'}</Text>
      <Text style={styles.journalStateText}>{loading ? 'Bringing today’s check-ins together…' : error?.message || 'Please check your connection and try again.'}</Text>
      {!loading ? <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable> : null}
    </View>
  );
}

function JournalHistory({ days, token, retentionDays, onOpenPhoto }) {
  return (
    <>
      <View style={styles.historyHeading}>
        <View><Text style={styles.cardEyebrow}>MEAL HISTORY</Text><Text style={styles.historyHeadingTitle}>Previous-day posts</Text></View>
        <View style={styles.retentionPill}><Text style={styles.retentionText}>{retentionDays} DAYS</Text></View>
      </View>
      <Text style={styles.historyIntro}>Previous meal posts remain available for {retentionDays} days, then their records and photos are removed automatically.</Text>
      {days.length ? (
        <View style={styles.historyDays}>
          {days.map((day) => (
            <View key={day.date} style={styles.historyDay}>
              <View style={styles.historyDayHead}>
                <Text style={styles.historyDayDate}>{formatJournalDate(day.date, { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
                <Text style={styles.historyDayCount}>{day.posts.length} post{day.posts.length === 1 ? '' : 's'}</Text>
              </View>
              {day.posts.map((post, index) => {
                const hasPhoto = Boolean(mealImageUri(post));
                const nutrition = post.nutrition || {};
                return (
                  <Pressable
                    key={post.postId || `${day.date}-${index}`}
                    accessibilityRole={hasPhoto ? 'button' : undefined}
                    accessibilityLabel={hasPhoto ? `View ${post.type} photo from ${formatJournalDate(day.date)}` : `${post.type} posted ${formatJournalDate(day.date)}`}
                    disabled={!hasPhoto}
                    onPress={() => onOpenPhoto(post)}
                    style={({ pressed }) => [styles.historyRow, index < day.posts.length - 1 && styles.historyRowDivider, pressed && styles.pressed]}
                  >
                    {hasPhoto ? <Image source={protectedImageSource(post, token)} resizeMode="cover" style={styles.historyPhoto} /> : <View style={styles.historyPlaceholder}><Ionicons name="image-outline" size={22} color={adminColors.muted} /></View>}
                    <View style={styles.historyCopy}>
                      <View style={styles.historyTitleRow}><Text style={styles.historyTitle}>{post.type}</Text><Text style={styles.historyTime}>{formatJournalClock(post.postedAt)}</Text></View>
                      <Text numberOfLines={1} style={styles.historyDetail}>{post.name}</Text>
                      <Text style={styles.historyNutrition}>{nutrition.calories || 0} kcal · {nutrition.proteinGrams || 0}g protein{hasPhoto ? ' · View photo' : ''}</Text>
                    </View>
                    {hasPhoto ? <Ionicons name="expand-outline" size={19} color={adminColors.teal} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.historyEmpty}><Ionicons name="images-outline" size={28} color={adminColors.teal} /><Text style={styles.historyEmptyTitle}>No previous posts</Text><Text style={styles.historyEmptyText}>Yesterday’s meal posts will appear here and remain available for {retentionDays} days.</Text></View>
      )}
    </>
  );
}

function Metric({ label, value, unit, last }) {
  return (
    <View style={[styles.metric, !last && styles.metricDivider]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value ?? '—'}{value != null && unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}</Text>
    </View>
  );
}

function WaterGoalEditor({ visible, member, currentGoal, saving, onClose, onSave }) {
  const [goal, setGoal] = useState(currentGoal || 2000);
  const presets = [1500, 2000, 2500, 3000, 3500];
  const changeGoal = (amount) => setGoal((value) => Math.max(500, Math.min(6000, value + amount)));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.waterSheet}>
          <View style={styles.editorHandle} />
          <View style={styles.editorHeader}>
            <View style={styles.editorHeaderCopy}><Text style={styles.editorEyebrow}>DAILY HYDRATION</Text><Text style={styles.editorTitle}>Set {member.name}’s goal</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close water goal editor" onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={21} color={adminColors.ink} /></Pressable>
          </View>
          <Text style={styles.editorIntro}>Choose a personal daily target. It will appear immediately in the member’s hydration tracker.</Text>
          <View style={styles.waterGoalControl}>
            <Pressable accessibilityRole="button" accessibilityLabel="Reduce water goal by 250 millilitres" onPress={() => changeGoal(-250)} disabled={goal <= 500} style={({ pressed }) => [styles.waterStep, pressed && styles.pressed, goal <= 500 && styles.waterStepDisabled]}><Ionicons name="remove" size={23} color={adminColors.deepTeal} /></Pressable>
            <View style={styles.waterGoalValue}><Text style={styles.waterGoalNumber}>{(goal / 1000).toFixed(goal % 1000 ? 2 : 1).replace(/0$/, '')} L</Text><Text style={styles.waterGoalGlasses}>{goal / 250} glasses of 250 ml</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Increase water goal by 250 millilitres" onPress={() => changeGoal(250)} disabled={goal >= 6000} style={({ pressed }) => [styles.waterStep, pressed && styles.pressed, goal >= 6000 && styles.waterStepDisabled]}><Ionicons name="add" size={23} color={adminColors.deepTeal} /></Pressable>
          </View>
          <View style={styles.waterPresets}>
            {presets.map((value) => <Pressable key={value} accessibilityRole="button" onPress={() => setGoal(value)} style={[styles.waterPreset, goal === value && styles.waterPresetActive]}><Text style={[styles.waterPresetText, goal === value && styles.waterPresetTextActive]}>{value / 1000} L</Text></Pressable>)}
          </View>
          <View style={styles.editorActions}>
            <Pressable accessibilityRole="button" onPress={onClose} disabled={saving} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => onSave(goal)} disabled={saving} style={styles.saveButton}>{saving ? <ActivityIndicator color={adminColors.white} /> : <><Text style={styles.saveText}>Save water goal</Text><Ionicons name="checkmark" size={18} color={adminColors.white} /></>}</Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PlanEditor({ visible, member, plan, onClose, onSave }) {
  const [planName, setPlanName] = useState(plan.planName);
  const [items, setItems] = useState(plan.items.map((item) => ({ ...item })));

  const changeItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  const addItem = () => {
    const index = items.length;
    setItems((current) => [
      ...current,
      {
        id: `${member.id}-new-${Date.now()}`,
        type: 'Snack',
        name: '',
        time: '4:00 PM',
        hour: 16,
        calories: 0,
        protein: 0,
        ingredients: [],
        consumed: false,
        uploadedAt: null,
        imageUri: null,
        sortOrder: index + 1,
      },
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const save = () => {
    if (!planName.trim() || items.some((item) => !item.name.trim() || !TIME_PATTERN.test(item.time.trim()))) {
      Alert.alert('Check the daily plan', 'Add a plan name, meal name, and time such as 8:00 AM for every meal.');
      return;
    }
    onSave({
      planName: planName.trim(),
      items: items.map((item) => ({
        ...item,
        name: item.name.trim(),
        time: item.time.trim().toUpperCase(),
        hour: timeToHour(item.time, item.hour),
      })),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
        <View style={styles.editorSheet}>
          <View style={styles.editorHandle} />
          <View style={styles.editorHeader}>
            <View style={styles.editorHeaderCopy}><Text style={styles.editorEyebrow}>RECURRING DAILY PLAN</Text><Text style={styles.editorTitle}>Plan {member.name}’s day</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close plan editor" onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={21} color={adminColors.ink} /></Pressable>
          </View>
          <Text style={styles.editorIntro}>Save this schedule once. It will remain the member’s daily meal plan until you change it again.</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorScroll}>
            <Text style={styles.inputLabel}>PLAN NAME</Text>
            <TextInput accessibilityLabel="Plan name" value={planName} onChangeText={setPlanName} placeholder="Daily meal plan" placeholderTextColor={adminColors.muted} style={styles.planInput} />
            <Text style={styles.mealsLabel}>MEALS & TIMES</Text>
            {items.map((meal, index) => (
              <View key={meal.id || `${meal.type}-${index}`} style={styles.editorMeal}>
                <View style={styles.editorMealTop}>
                  <View style={styles.editorMealNumber}><Text style={styles.editorMealNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                  <Text style={styles.editorMealType}>{meal.type}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${meal.type}`} disabled={items.length === 1} onPress={() => removeItem(index)} style={[styles.removeMeal, items.length === 1 && styles.removeMealDisabled]}>
                    <Ionicons name="trash-outline" size={17} color={adminColors.coral} />
                  </Pressable>
                  <TextInput
                    accessibilityLabel={`${meal.type} time`}
                    autoCapitalize="characters"
                    value={meal.time}
                    onChangeText={(value) => changeItem(index, 'time', value)}
                    placeholder="8:00 AM"
                    placeholderTextColor={adminColors.muted}
                    style={styles.timeInput}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeOptions}>
                  {MEAL_TYPES.map((type) => {
                    const selected = meal.type === type;
                    return (
                      <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => changeItem(index, 'type', type)} style={[styles.typeOption, selected && styles.typeOptionSelected]}>
                        <Text style={[styles.typeOptionText, selected && styles.typeOptionTextSelected]}>{type}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <TextInput
                  accessibilityLabel={`${meal.type} meal`}
                  value={meal.name}
                  onChangeText={(value) => changeItem(index, 'name', value)}
                  placeholder={`Describe ${meal.type.toLowerCase()}`}
                  placeholderTextColor={adminColors.muted}
                  multiline
                  style={styles.mealInput}
                />
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={addItem} style={({ pressed }) => [styles.addMealButton, pressed && styles.pressed]}>
              <View style={styles.addMealIcon}><Ionicons name="add" size={20} color={adminColors.deepTeal} /></View>
              <View style={styles.addMealCopy}><Text style={styles.addMealTitle}>Add another meal</Text><Text style={styles.addMealDetail}>Create as many daily meal or product slots as needed.</Text></View>
            </Pressable>
          </ScrollView>
          <View style={styles.editorActions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={save} style={styles.saveButton}><Text style={styles.saveText}>Save daily plan</Text><Ionicons name="checkmark" size={18} color={adminColors.white} /></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PhotoViewer({ meal, token, memberName, onClose }) {
  const nutrition = meal?.nutrition || {};
  const source = meal ? protectedImageSource(meal, token) : null;
  return (
    <Modal visible={Boolean(meal)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.photoBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close meal photo" onPress={onClose} style={styles.photoClose}><Ionicons name="close" size={23} color={adminColors.white} /></Pressable>
        {source ? <Image accessibilityLabel={`${meal?.type || 'Meal'} photo posted by ${memberName}`} source={source} resizeMode="contain" style={styles.photoFull} /> : null}
        <View style={styles.photoCaption}>
          <Text style={styles.photoType}>{meal?.type}</Text>
          <Text style={styles.photoTitle}>{meal?.detectedName || meal?.name}</Text>
          <Text style={styles.photoMeta}>Posted {formatJournalClock(meal?.postedAt || meal?.uploadedAt) || 'today'} · {nutrition.calories ?? meal?.detectedCalories ?? meal?.calories ?? 0} kcal · {nutrition.proteinGrams ?? meal?.detectedProtein ?? meal?.protein ?? 0}g protein</Text>
        </View>
      </View>
    </Modal>
  );
}

export default function UserDetailsScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const members = useSelector(selectAdminMembers);
  const memberPlans = useSelector(selectAdminMemberMealPlans);
  const liveUserMeals = useSelector((state) => state.meals);
  const token = useSelector((state) => state.auth.token);
  const authSource = useSelector((state) => state.auth.source);
  const [segment, setSegment] = useState('Overview');
  const [editingPlan, setEditingPlan] = useState(false);
  const [editingWaterGoal, setEditingWaterGoal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const member = useMemo(
    () => members.find((item) => item.id === route.params?.id || item.name === route.params?.name) || members[0],
    [members, route.params],
  );
  const journal = useSelector((state) => selectAdminMemberJournal(state, member.id));
  const journalRequest = useSelector((state) => selectAdminMemberJournalRequest(state, member.id));
  const waterGoalRequest = useSelector((state) => selectAdminMemberWaterGoalRequest(state, member.id));
  const profileMember = useMemo(() => ({ ...member, ...(journal?.member || {}), id: member.id, initials: member.initials }), [journal?.member, member]);
  const memberAvatarSource = avatarFailed ? null : profileImageSource(profileMember.profileImageUrl, token);
  const storedPlan = memberPlans[member.id];
  const plan = useMemo(() => {
    if (member.id !== 1) return storedPlan;
    return {
      ...storedPlan,
      planName: liveUserMeals.planName,
      consultant: liveUserMeals.consultant,
      items: liveUserMeals.items,
    };
  }, [liveUserMeals.consultant, liveUserMeals.items, liveUserMeals.planName, member.id, storedPlan]);
  const todaySnapshot = useMemo(() => {
    if (!journal?.today || authSource !== 'demo') return journal?.today || null;
    const currentMeals = journal.today.meals || [];
    const meals = plan.items.map((meal) => {
      const existing = currentMeals.find((item) => String(item.plannedMealId) === String(meal.id))
        || currentMeals.find((item) => item.type === meal.type);
      return {
        ...existing,
        plannedMealId: meal.id,
        type: meal.type,
        name: meal.detectedName || meal.name,
        scheduledTime: meal.time,
        completed: Boolean(meal.consumed),
        postedAt: meal.consumed ? existing?.postedAt || meal.uploadedAt : null,
        imageUrl: meal.imageUri || existing?.imageUrl || null,
        nutrition: meal.consumed ? existing?.nutrition || {
          calories: meal.detectedCalories ?? meal.calories ?? 0,
          proteinGrams: meal.detectedProtein ?? meal.protein ?? 0,
          carbsGrams: 0,
          fatGrams: 0,
        } : null,
      };
    });
    const completedMeals = meals.filter((meal) => meal.completed);
    return {
      ...journal.today,
      meals,
      summary: {
        ...journal.today.summary,
        plannedMeals: meals.length,
        completedMeals: completedMeals.length,
        calories: completedMeals.reduce((sum, meal) => sum + (meal.nutrition?.calories || 0), 0),
        proteinGrams: completedMeals.reduce((sum, meal) => sum + (meal.nutrition?.proteinGrams || 0), 0),
      },
    };
  }, [authSource, journal?.today, plan.items]);

  useEffect(() => {
    dispatch(loadAdminMemberJournal({ memberId: member.id, email: member.email }));
  }, [dispatch, member.email, member.id]);

  useEffect(() => { setAvatarFailed(false); }, [profileMember.profileImageUrl]);

  const retryJournal = () => dispatch(loadAdminMemberJournal({ memberId: member.id, email: member.email }));
  const journalLoading = journalRequest.status === 'loading' || journalRequest.status === 'idle';

  const savePlan = (nextPlan) => {
    dispatch(updateMemberMealPlan({ memberId: member.id, ...nextPlan }));
    setEditingPlan(false);
    setSegment('Overview');
    Alert.alert('Daily plan updated', `${member.name} will follow this meal schedule each day until you change it again.`);
  };

  const saveWaterGoal = async (waterGoalMl) => {
    try {
      await dispatch(saveAdminMemberWaterGoal({ memberId: member.id, email: member.email, waterGoalMl })).unwrap();
      setEditingWaterGoal(false);
      Alert.alert('Water goal updated', `${profileMember.name}'s daily target is now ${waterGoalMl / 1000} litres.`);
    } catch (error) {
      Alert.alert('Could not update water goal', error?.message || 'Please try again.');
    }
  };

  return (
    <AdminScreen>
      <AdminHeader title="Member profile" back onBackPress={() => navigation.goBack()} />

      <View style={styles.identityShell}>
        <LinearGradient colors={['#064E55', '#08767B', '#0B9295']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.identity}>
          <View pointerEvents="none" style={styles.identityOrb} />
          <View style={styles.identityTop}>
            <View style={styles.avatar}>{memberAvatarSource ? <Image source={memberAvatarSource} resizeMode="cover" onError={() => setAvatarFailed(true)} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{member.initials}</Text>}</View>
            <View style={styles.identityCopy}>
              <Text numberOfLines={2} style={styles.memberName}>{profileMember.name}</Text>
              <Text numberOfLines={1} style={styles.memberEmail}>{profileMember.email}</Text>
            </View>
          </View>
          <View style={styles.bodyProfile}>
            <View style={styles.bodyProfileHead}>
              <Text style={styles.bodyProfileTitle}>BODY PROFILE</Text>
              <Text style={styles.bodyProfileDate}>{profileMember.lastBodyMetricsUpdatedAt ? `Updated ${formatJournalDate(profileMember.lastBodyMetricsUpdatedAt, { day: 'numeric', month: 'short' })}` : 'Update unavailable'}</Text>
            </View>
            <View style={styles.metricsRow}>
              <Metric label="HEIGHT" value={profileMember.heightCm} unit="cm" />
              <Metric label="WEIGHT" value={profileMember.weightKg} unit="kg" />
              <Metric label="BMI" value={profileMember.bmi} last />
            </View>
            <View style={styles.metricsRowDivider} />
            <View style={styles.metricsRow}>
              <Metric label="WAIST" value={profileMember.waistCm} unit="cm" />
              <Metric label="BODY FAT" value={profileMember.bodyFatPercent} unit="%" last />
            </View>
          </View>
          <View style={styles.profileDetails}>
            <View style={styles.profileDetail}><Text style={styles.contextLabel}>GOAL</Text><Text style={styles.contextValue}>{profileMember.goal || 'Not added yet'}</Text></View>
            <View style={styles.profileDetail}><Text style={styles.contextLabel}>DIETARY PREFERENCES</Text><Text style={styles.contextValue}>{profileMember.dietaryPreferences || 'Not added yet'}</Text></View>
          </View>
        </LinearGradient>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setEditingPlan(true)} style={({ pressed }) => [styles.adjustActionShell, pressed && styles.pressed]}>
        <LinearGradient colors={['#FFFFFF', '#EEF8F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.adjustAction}>
          <View><Text style={styles.adjustLabel}>MEAL SCHEDULE</Text><Text style={styles.adjustText}>Adjust daily plan</Text></View>
          <View style={styles.adjustIcon}><Ionicons name="options-outline" size={20} color={adminColors.deepTeal} /></View>
        </LinearGradient>
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel={`Set daily water goal. Current goal ${profileMember.waterGoalMl || 2000} millilitres`} onPress={() => setEditingWaterGoal(true)} style={({ pressed }) => [styles.waterAction, pressed && styles.pressed]}>
        <View style={styles.waterActionIcon}><Ionicons name="water-outline" size={22} color={adminColors.teal} /></View>
        <View style={styles.waterActionCopy}><Text style={styles.waterActionLabel}>DAILY HYDRATION</Text><Text style={styles.waterActionText}>Set water goal</Text></View>
        <View style={styles.waterActionValue}><Text style={styles.waterActionNumber}>{((profileMember.waterGoalMl || 2000) / 1000).toFixed((profileMember.waterGoalMl || 2000) % 1000 ? 2 : 0).replace(/0$/, '')} L</Text><Ionicons name="chevron-forward" size={18} color={adminColors.muted} /></View>
      </Pressable>

      <View style={styles.segmentWrap}><AdminSegmentedControl options={['Overview', 'Today', 'History']} value={segment} onChange={setSegment} accessibilityLabel="Member profile section" /></View>

      {segment === 'Overview' && <Overview member={profileMember} plan={plan} snapshot={todaySnapshot} />}
      {segment === 'Today' && (todaySnapshot ? <Today plan={plan} snapshot={todaySnapshot} token={token} onOpenPhoto={setSelectedPhoto} /> : <JournalState loading={journalLoading} error={journalRequest.error} onRetry={retryJournal} />)}
      {segment === 'History' && (journal ? <History days={journal.history || []} token={token} retentionDays={journal.retentionDays || 21} onOpenPhoto={setSelectedPhoto} /> : <JournalState loading={journalLoading} error={journalRequest.error} onRetry={retryJournal} />)}

      {editingPlan ? <PlanEditor visible member={member} plan={plan} onClose={() => setEditingPlan(false)} onSave={savePlan} /> : null}
      {editingWaterGoal ? <WaterGoalEditor visible member={profileMember} currentGoal={profileMember.waterGoalMl || 2000} saving={waterGoalRequest.status === 'saving'} onClose={() => setEditingWaterGoal(false)} onSave={saveWaterGoal} /> : null}
      <PhotoViewer meal={selectedPhoto} token={token} memberName={profileMember.name} onClose={() => setSelectedPhoto(null)} />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  identityShell: { marginTop: 23, borderRadius: 28, backgroundColor: adminColors.deepTeal, ...adminShadow },
  identity: { overflow: 'hidden', padding: 19, borderRadius: 28 },
  identityOrb: { position: 'absolute', width: 220, height: 220, right: -88, top: -104, borderRadius: 110, backgroundColor: 'rgba(180,255,242,0.1)' },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 20 },
  avatarText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 16 },
  identityCopy: { flex: 1, minWidth: 0 },
  memberName: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 25, lineHeight: 30, letterSpacing: -0.7 },
  memberEmail: { color: '#CFEAE7', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
  bodyProfile: { overflow: 'hidden', marginTop: 18, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  bodyProfileHead: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.16)' },
  bodyProfileTitle: { color: '#CFEAE7', fontFamily: adminFonts.semibold, fontSize: 10, letterSpacing: 0.85 },
  bodyProfileDate: { color: '#A9D4D0', fontFamily: adminFonts.regular, fontSize: 10 },
  metricsRow: { minHeight: 67, flexDirection: 'row', alignItems: 'stretch' },
  metricsRowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.16)', marginHorizontal: 13 },
  metric: { flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: 12 },
  metricDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.16)' },
  metricLabel: { color: '#A9D4D0', fontFamily: adminFonts.semibold, fontSize: 10, letterSpacing: 0.6 },
  metricValue: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 18, marginTop: 4 },
  metricUnit: { color: '#CFEAE7', fontFamily: adminFonts.medium, fontSize: 11 },
  profileDetails: { gap: 12, paddingTop: 16, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  profileDetail: { gap: 3 },
  contextLabel: { color: '#A9D4D0', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.85 },
  contextValue: { color: adminColors.white, fontFamily: adminFonts.medium, fontSize: 13, lineHeight: 18, marginTop: 4 },
  adjustActionShell: { overflow: 'hidden', borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 13, ...adminShadow },
  adjustAction: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  adjustLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.85 },
  adjustText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 21, marginTop: 2 },
  adjustIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  waterAction: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 10, ...adminShadow },
  waterActionIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  waterActionCopy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  waterActionLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 10, letterSpacing: 0.8 },
  waterActionText: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 20, marginTop: 2 },
  waterActionValue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  waterActionNumber: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 17 },
  segmentWrap: { marginTop: 20, marginBottom: 12 },
  statsCard: { overflow: 'hidden', borderRadius: adminRadius.lg, borderWidth: 1, borderColor: '#E0E7E2', ...adminShadow },
  statsRow: { minHeight: 84, flexDirection: 'row' },
  statsHorizontalDivider: { height: StyleSheet.hairlineWidth, backgroundColor: adminColors.line, marginHorizontal: 16 },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: adminColors.line },
  statValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 19 },
  statLabel: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16, marginTop: 3 },
  chartCard: { overflow: 'hidden', padding: 17, borderTopLeftRadius: 22, borderTopRightRadius: 34, borderBottomRightRadius: 22, borderBottomLeftRadius: 34, borderWidth: 1, borderColor: adminColors.line, marginTop: 12, ...adminShadow },
  chartGlow: { position: 'absolute', width: 170, height: 170, right: -70, top: -86, borderRadius: 85, backgroundColor: 'rgba(30,177,164,0.1)' },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  cardEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.9 },
  cardTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, lineHeight: 23, marginTop: 4 },
  chartTrend: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  planCard: { padding: 17, borderTopLeftRadius: 22, borderTopRightRadius: 34, borderBottomRightRadius: 22, borderBottomLeftRadius: 34, borderWidth: 1, borderColor: '#E0E7E2', marginTop: 12, ...adminShadow },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  planHeading: { flex: 1 },
  planName: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, lineHeight: 23, marginTop: 4 },
  repeatPill: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: adminRadius.pill, backgroundColor: adminColors.aqua },
  repeatText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.45 },
  planExplanation: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 9 },
  planMeals: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  planMeal: { minHeight: 65, flexDirection: 'row', alignItems: 'center' },
  planMealDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  planMealIndex: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.sageSoft },
  planMealIndexText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11 },
  planMealCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  planMealType: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 13 },
  planMealName: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 2 },
  planMealTime: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12 },
  planUpdated: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12, marginTop: 11 },
  careNote: { padding: 15, borderRadius: adminRadius.lg, backgroundColor: adminColors.coralSoft, borderWidth: 1, borderColor: '#F2D6D1', marginTop: 12 },
  careCopy: { flex: 1 },
  careTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 13 },
  careText: { color: adminColors.coral, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
  todayHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 4, marginBottom: 11 },
  todayTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 26, marginTop: 3 },
  todayDate: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, marginBottom: 3 },
  todayList: { gap: 10 },
  todayMeal: { minHeight: 121, flexDirection: 'row', alignItems: 'stretch', padding: 12, borderRadius: 22, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  todayMealComplete: { backgroundColor: '#F2FAF7' },
  mealPhoto: { width: 92, minHeight: 96, borderRadius: 17, backgroundColor: adminColors.sageSoft },
  mealPlaceholder: { width: 74, minHeight: 96, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: adminColors.surfaceMuted, borderWidth: 1, borderColor: adminColors.line },
  mealPlaceholderComplete: { backgroundColor: adminColors.aqua },
  mealPlaceholderText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 16 },
  todayMealCopy: { flex: 1, minWidth: 0, paddingLeft: 12, paddingVertical: 2 },
  todayMealTopline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayMealType: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14 },
  todayStatus: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.4 },
  todayStatusComplete: { color: adminColors.teal },
  todayMealName: { color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 13, lineHeight: 18, marginTop: 7 },
  todayMealMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16, marginTop: 4 },
  viewPhoto: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, marginTop: 7 },
  historyHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 4 },
  historyHeadingTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 20, lineHeight: 26, marginTop: 2 },
  retentionPill: { minHeight: 31, justifyContent: 'center', paddingHorizontal: 10, borderRadius: adminRadius.pill, backgroundColor: adminColors.sageSoft, marginBottom: 2 },
  retentionText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11, letterSpacing: 0.55 },
  historyIntro: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 13 },
  historyDays: { gap: 12 },
  historyDay: { overflow: 'hidden', paddingHorizontal: 13, borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  historyDayHead: { minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  historyDayDate: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14 },
  historyDayCount: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 11 },
  historyList: { overflow: 'hidden', paddingHorizontal: 13, borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  historyRow: { minHeight: 90, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  historyRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminColors.line },
  historyPhoto: { width: 62, height: 62, borderRadius: 15, backgroundColor: adminColors.sageSoft },
  historyPlaceholder: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: adminColors.sageSoft },
  historyPlaceholderText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 13 },
  historyDate: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12 },
  historyCopy: { flex: 1, minWidth: 0, paddingLeft: 12 },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTitle: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14, lineHeight: 19 },
  historyDetail: { color: adminColors.ink, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 4 },
  historyTime: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16, marginTop: 4 },
  historyNutrition: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 11, lineHeight: 16, marginTop: 4 },
  historyEmpty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 38, borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  historyEmptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16 },
  historyEmptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  journalState: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 38, borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  journalStateTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, marginTop: 12 },
  journalStateText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 15, backgroundColor: adminColors.teal, marginTop: 15 },
  retryText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 12 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,33,37,0.48)' },
  editorSheet: { maxHeight: '92%', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: adminColors.canvas },
  waterSheet: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: adminColors.canvas },
  waterGoalControl: { minHeight: 116, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingHorizontal: 15, borderRadius: 23, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  waterStep: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  waterStepDisabled: { opacity: 0.35 },
  waterGoalValue: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  waterGoalNumber: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  waterGoalGlasses: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 3 },
  waterPresets: { flexDirection: 'row', gap: 7, marginTop: 12, marginBottom: 22 },
  waterPreset: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  waterPresetActive: { backgroundColor: adminColors.aqua, borderColor: adminColors.teal },
  waterPresetText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12 },
  waterPresetTextActive: { color: adminColors.deepTeal },
  editorHandle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: adminColors.line, marginBottom: 15 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editorHeaderCopy: { flex: 1 },
  editorEyebrow: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12, letterSpacing: 1.05 },
  editorTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.6, marginTop: 3 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  editorIntro: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, marginTop: 9 },
  editorScroll: { paddingTop: 18, paddingBottom: 12 },
  inputLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.9, marginBottom: 7 },
  planInput: { minHeight: 52, paddingHorizontal: 14, borderRadius: 17, color: adminColors.ink, fontFamily: adminFonts.medium, fontSize: 15, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  mealsLabel: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.9, marginTop: 21, marginBottom: 8 },
  editorMeal: { padding: 13, borderRadius: 20, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginBottom: 10 },
  editorMealTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  editorMealNumber: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.aqua },
  editorMealNumberText: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 11 },
  editorMealType: { flex: 1, color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 14 },
  removeMeal: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: adminColors.coralSoft },
  removeMealDisabled: { opacity: 0.35 },
  timeInput: { width: 92, minHeight: 42, paddingHorizontal: 9, borderRadius: 13, color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 12, textAlign: 'center', backgroundColor: adminColors.aqua },
  typeOptions: { gap: 7, paddingTop: 11, paddingBottom: 1 },
  typeOption: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 13, backgroundColor: adminColors.surfaceMuted, borderWidth: 1, borderColor: adminColors.line },
  typeOptionSelected: { backgroundColor: adminColors.deepTeal, borderColor: adminColors.deepTeal },
  typeOptionText: { color: adminColors.muted, fontFamily: adminFonts.medium, fontSize: 12 },
  typeOptionTextSelected: { color: adminColors.white, fontFamily: adminFonts.semibold },
  mealInput: { minHeight: 52, maxHeight: 82, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, color: adminColors.ink, fontFamily: adminFonts.regular, fontSize: 14, lineHeight: 19, textAlignVertical: 'top', backgroundColor: adminColors.surfaceMuted, marginTop: 10 },
  addMealButton: { minHeight: 72, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: adminColors.teal, backgroundColor: adminColors.aqua },
  addMealIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.72)' },
  addMealCopy: { flex: 1, minWidth: 0, paddingLeft: 11 },
  addMealTitle: { color: adminColors.deepTeal, fontFamily: adminFonts.semibold, fontSize: 14 },
  addMealDetail: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 17, marginTop: 2 },
  editorActions: { flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: adminColors.line },
  cancelButton: { minWidth: 92, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 17, borderWidth: 1, borderColor: adminColors.line, backgroundColor: adminColors.surface },
  cancelText: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 13 },
  saveButton: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 17, backgroundColor: adminColors.teal },
  saveText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 13 },
  photoBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(1,22,25,0.96)' },
  photoClose: { zIndex: 2, position: 'absolute', top: 55, right: 20, width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)' },
  photoFull: { width: '100%', height: '65%' },
  photoCaption: { position: 'absolute', left: 20, right: 20, bottom: 42, padding: 17, borderRadius: 22, backgroundColor: 'rgba(6,61,66,0.88)' },
  photoType: { color: '#A9DAD4', fontFamily: adminFonts.semibold, fontSize: 12, letterSpacing: 0.9 },
  photoTitle: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 21, lineHeight: 27, marginTop: 4 },
  photoMeta: { color: '#D5ECE8', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 6 },
  pressed: { opacity: 0.68 },
});
