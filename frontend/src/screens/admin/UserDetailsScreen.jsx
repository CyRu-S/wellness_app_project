import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { memberAdherence } from '../../data/adminDemoData';
import {
  selectAdminMemberMealPostHistory,
  selectAdminMemberMealPlans,
  selectAdminMembers,
  updateMemberMealPlan,
} from '../../store/slices/adminSlice';
import { prunePostHistory } from '../../store/slices/mealSlice';
import { adminColors, adminFonts, adminRadius, adminShadow } from '../../theme/admin';

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

function Overview({ member, plan }) {
  const series = memberAdherence.map((value, index) => ({
    label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index],
    value: Math.max(34, Math.min(100, value + member.adherence - 82)),
  }));
  const completed = plan.items.filter((item) => item.consumed).length;

  return (
    <>
      <View style={styles.statsRail}>
        <Stat value={`${completed}/${plan.items.length}`} label="meals today" />
        <Stat value={`${member.hydration}%`} label="hydration" />
        <Stat value={member.streak} label="day streak" last />
      </View>

      <View style={styles.chartCard}>
        <View style={styles.cardHeading}>
          <View><Text style={styles.cardEyebrow}>SEVEN-DAY ADHERENCE</Text><Text style={styles.cardTitle}>{member.adherence}% average</Text></View>
          <Text style={styles.chartTrend}>{member.adherence >= 75 ? 'On track' : 'Needs care'}</Text>
        </View>
        <AdminBarChart data={series} label={`${member.name} seven day adherence`} />
      </View>

      <View style={styles.planCard}>
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
      </View>

      {member.attentionReason ? (
        <View style={styles.careNote}>
          <View style={styles.careCopy}><Text style={styles.careTitle}>Worth a closer look</Text><Text style={styles.careText}>{member.attentionReason}</Text></View>
        </View>
      ) : null}
    </>
  );
}

function Today({ plan, onOpenPhoto }) {
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

function History({ posts, onOpenPhoto }) {
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

function PhotoViewer({ meal, onClose }) {
  return (
    <Modal visible={Boolean(meal)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.photoBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close meal photo" onPress={onClose} style={styles.photoClose}><Ionicons name="close" size={23} color={adminColors.white} /></Pressable>
        {meal?.imageUri ? <Image source={{ uri: meal.imageUri }} resizeMode="contain" style={styles.photoFull} /> : null}
        <View style={styles.photoCaption}>
          <Text style={styles.photoType}>{meal?.type}</Text>
          <Text style={styles.photoTitle}>{meal?.detectedName || meal?.name}</Text>
          <Text style={styles.photoMeta}>Posted {meal?.uploadedAt}{meal?.detectedCalories ? ` · ${meal.detectedCalories} kcal · ${meal.detectedProtein}g protein` : ''}</Text>
        </View>
      </View>
    </Modal>
  );
}

export default function UserDetailsScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const members = useSelector(selectAdminMembers);
  const memberPlans = useSelector(selectAdminMemberMealPlans);
  const memberPostHistory = useSelector(selectAdminMemberMealPostHistory);
  const liveUserMeals = useSelector((state) => state.meals);
  const [segment, setSegment] = useState('Overview');
  const [editingPlan, setEditingPlan] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const member = useMemo(
    () => members.find((item) => item.id === route.params?.id || item.name === route.params?.name) || members[0],
    [members, route.params],
  );
  const active = member.status === 'ACTIVE';
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
  const historyPosts = member.id === 1 ? liveUserMeals.postHistory : memberPostHistory[member.id] || [];

  useEffect(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 21);
    dispatch(prunePostHistory(cutoff.toISOString()));
  }, [dispatch]);

  const savePlan = (nextPlan) => {
    dispatch(updateMemberMealPlan({ memberId: member.id, ...nextPlan }));
    setEditingPlan(false);
    setSegment('Overview');
    Alert.alert('Daily plan updated', `${member.name} will follow this meal schedule each day until you change it again.`);
  };

  return (
    <AdminScreen>
      <AdminHeader title="Member profile" back onBackPress={() => navigation.goBack()} />

      <View style={styles.identityShell}>
        <LinearGradient colors={['#064E55', '#08767B', '#0B9295']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.identity}>
          <View pointerEvents="none" style={styles.identityOrb} />
          <View style={styles.identityTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{member.initials}</Text></View>
            <View style={styles.statusPill}><View style={[styles.statusDot, !active && styles.statusDotAway]} /><Text style={styles.statusText}>{member.lastActiveAt}</Text></View>
          </View>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberEmail}>{member.email}</Text>
          <View style={styles.identityFooter}>
            <View style={styles.identityContext}><Text style={styles.contextLabel}>DAILY PLAN</Text><Text numberOfLines={1} style={styles.contextValue}>{plan.planName}</Text></View>
            <View style={styles.contextDivider} />
            <View style={styles.identityContext}><Text style={styles.contextLabel}>GOAL</Text><Text numberOfLines={2} style={styles.contextValue}>{member.goal}</Text></View>
          </View>
        </LinearGradient>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setEditingPlan(true)} style={({ pressed }) => [styles.adjustAction, pressed && styles.pressed]}>
        <View><Text style={styles.adjustLabel}>MEAL SCHEDULE</Text><Text style={styles.adjustText}>Adjust daily plan</Text></View>
        <View style={styles.adjustIcon}><Ionicons name="options-outline" size={20} color={adminColors.white} /></View>
      </Pressable>

      <View style={styles.segmentWrap}><AdminSegmentedControl options={['Overview', 'Today', 'History']} value={segment} onChange={setSegment} accessibilityLabel="Member profile section" /></View>

      {segment === 'Overview' && <Overview member={member} plan={plan} />}
      {segment === 'Today' && <Today plan={plan} onOpenPhoto={setSelectedPhoto} />}
      {segment === 'History' && <History posts={historyPosts} onOpenPhoto={setSelectedPhoto} />}

      {editingPlan ? <PlanEditor visible member={member} plan={plan} onClose={() => setEditingPlan(false)} onSave={savePlan} /> : null}
      <PhotoViewer meal={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  identityShell: { marginTop: 23, borderRadius: 28, backgroundColor: adminColors.deepTeal, ...adminShadow },
  identity: { minHeight: 259, overflow: 'hidden', padding: 19, borderRadius: 28 },
  identityOrb: { position: 'absolute', width: 220, height: 220, right: -88, top: -104, borderRadius: 110, backgroundColor: 'rgba(180,255,242,0.1)' },
  identityTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 58, height: 58, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  avatarText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 16 },
  statusPill: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: adminRadius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#89E5D6' },
  statusDotAway: { backgroundColor: '#C6D4D2' },
  statusText: { color: '#D7F0ED', fontFamily: adminFonts.medium, fontSize: 12 },
  memberName: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 29, lineHeight: 35, letterSpacing: -0.9, marginTop: 18 },
  memberEmail: { color: '#CFEAE7', fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 18, marginTop: 3 },
  identityFooter: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 13, paddingTop: 17, marginTop: 17, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)' },
  identityContext: { flex: 1, minWidth: 0 },
  contextDivider: { width: 1, height: 42, backgroundColor: 'rgba(255,255,255,0.18)' },
  contextLabel: { color: '#A9D4D0', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.85 },
  contextValue: { color: adminColors.white, fontFamily: adminFonts.medium, fontSize: 13, lineHeight: 18, marginTop: 4 },
  adjustAction: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderRadius: 21, backgroundColor: adminColors.teal, marginTop: 13, ...adminShadow },
  adjustLabel: { color: '#D9F4EF', fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.85 },
  adjustText: { color: adminColors.white, fontFamily: adminFonts.semibold, fontSize: 16, lineHeight: 21, marginTop: 2 },
  adjustIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  segmentWrap: { marginTop: 20, marginBottom: 12 },
  statsRail: { minHeight: 88, flexDirection: 'row', borderRadius: adminRadius.lg, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, ...adminShadow },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: adminColors.line },
  statValue: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 19 },
  statLabel: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, lineHeight: 16, marginTop: 3 },
  chartCard: { padding: 17, borderTopLeftRadius: 22, borderTopRightRadius: 34, borderBottomRightRadius: 22, borderBottomLeftRadius: 34, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 12, ...adminShadow },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  cardEyebrow: { color: adminColors.muted, fontFamily: adminFonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.9 },
  cardTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 18, lineHeight: 23, marginTop: 4 },
  chartTrend: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 12 },
  planCard: { padding: 17, borderTopLeftRadius: 22, borderTopRightRadius: 34, borderBottomRightRadius: 22, borderBottomLeftRadius: 34, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line, marginTop: 12, ...adminShadow },
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
  historyEmpty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 38, borderRadius: 21, backgroundColor: adminColors.surface, borderWidth: 1, borderColor: adminColors.line },
  historyEmptyTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16 },
  historyEmptyText: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 5 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,33,37,0.48)' },
  editorSheet: { maxHeight: '92%', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: adminColors.canvas },
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
