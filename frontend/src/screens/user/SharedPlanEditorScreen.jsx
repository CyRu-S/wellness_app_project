import { LocalizedText as Text, LocalizedTextInput as TextInput } from '../../components/common/LocalizedText';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Alert from '../../utils/appAlert';
import {
  convertSharedMemberToZDrink,
  getSharedMemberPlan,
  revertSharedMemberZDrink,
  saveSharedMemberPlan,
} from '../../services/api/memberAccessApi';
import { colors, fonts, radius, shadows, type } from '../../theme';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Shake', 'Herbalife product'];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const editableItems = (plan) => [...(plan.items || []), ...(plan.habits || []), ...(plan.exercises || [])]
  .map((item) => ({ ...item, kind: item.kind || 'MEAL', time: String(item.time || '08:00').slice(0, 5) }));

export default function SharedPlanEditorScreen({ navigation, route }) {
  const token = useSelector((state) => state.auth.token);
  const memberId = route.params?.memberId;
  const memberName = route.params?.memberName || 'Member';
  const [plan, setPlan] = useState(null);
  const [planName, setPlanName] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const applyPlan = useCallback((next) => {
    setPlan(next);
    setPlanName(next.planName || '');
    setItems(editableItems(next));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { applyPlan(await getSharedMemberPlan(token, memberId)); }
    catch (requestError) { setError(requestError.message || 'The diet plan could not be loaded.'); }
    finally { setLoading(false); }
  }, [applyPlan, memberId, token]);

  useEffect(() => {
    let active = true;
    getSharedMemberPlan(token, memberId)
      .then((next) => { if (active) applyPlan(next); })
      .catch((requestError) => { if (active) setError(requestError.message || 'The diet plan could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applyPlan, memberId, token]);

  const changeItem = (index, key, value) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const addItem = (kind) => setItems((current) => [...current, {
    id: `new-${Date.now()}`, kind, type: kind === 'MEAL' ? 'Snack' : 'Healthy habit',
    category: kind === 'MEAL' ? null : 'Wellbeing', name: '', time: '16:00', calories: 0, protein: 0, ingredients: [],
  }]);

  const requestBody = useMemo(() => ({
    planName: planName.trim(),
    items: items.map((item) => ({
      id: Number.isSafeInteger(Number(item.id)) ? Number(item.id) : null,
      kind: item.kind || 'MEAL', type: item.type || 'Snack', name: item.name.trim(),
      time: `${item.time}:00`, calories: Number(item.calories) || 0, protein: Number(item.protein) || 0,
      ingredients: item.ingredients || [], category: item.category || null,
    })),
  }), [items, planName]);

  const save = async () => {
    if (!planName.trim() || items.some((item) => !item.name.trim() || !TIME_PATTERN.test(item.time))) {
      Alert.alert('Check the diet plan', 'Add a plan name, item description, and a 24-hour time such as 08:00 for every item.');
      return;
    }
    if (new Set(items.map((item) => item.time)).size !== items.length) {
      Alert.alert('Time already used', 'Every plan item needs a different reminder time.');
      return;
    }
    setSaving(true);
    try {
      applyPlan(await saveSharedMemberPlan(token, memberId, requestBody));
      Alert.alert('Diet plan saved', `${memberName}'s recurring plan is updated.`);
    } catch (requestError) { Alert.alert('Plan not saved', requestError.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const convert = () => Alert.alert('Switch to Z-Drink Day?', 'This temporarily replaces the current schedule with three shakes and three supplement / Herbalife product slots. The current plan will be saved for restore.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Switch plan', onPress: async () => {
      setSaving(true);
      try { applyPlan(await convertSharedMemberToZDrink(token, memberId)); }
      catch (requestError) { Alert.alert('Could not switch plan', requestError.message || 'Please try again.'); }
      finally { setSaving(false); }
    } },
  ]);

  const revert = () => Alert.alert('Restore previous plan?', 'The plan saved before Z-Drink Day will be assigned again.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Restore plan', onPress: async () => {
      setSaving(true);
      try { applyPlan(await revertSharedMemberZDrink(token, memberId)); }
      catch (requestError) { Alert.alert('Could not restore plan', requestError.message || 'Please try again.'); }
      finally { setSaving(false); }
    } },
  ]);

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.ink} /></Pressable>
        <Text style={styles.topTitle}>Diet plan</Text>
        <View style={styles.accessPill}><Text style={styles.accessText}>COACH ACCESS</Text></View>
      </View>

      <View style={styles.heading}><Text style={styles.eyebrow}>RECURRING SCHEDULE</Text><Text style={styles.title}>Plan {memberName}’s day</Text><Text style={styles.copy}>Changes repeat daily and are visible to the member immediately.</Text></View>

      {loading ? <View style={styles.state}><ActivityIndicator color={colors.tealMid} /><Text style={styles.stateText}>Loading diet plan…</Text></View> : null}
      {!loading && error ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={28} color={colors.danger} /><Text style={styles.stateTitle}>Plan unavailable</Text><Text style={styles.stateText}>{error}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View> : null}

      {!loading && !error ? <>
        <View style={[styles.modeBanner, plan?.zDrinkActive && styles.modeBannerActive]}>
          <View style={styles.modeIcon}><Text style={styles.modeIconText}>Z</Text></View>
          <View style={styles.modeCopy}><Text style={styles.modeLabel}>Z-DRINK DAY</Text><Text style={styles.modeTitle}>{plan?.zDrinkActive ? 'Temporary plan is active' : 'Use a six-slot Z-Drink schedule'}</Text><Text style={styles.modeText}>{plan?.zDrinkActive ? 'The previous diet plan is safely stored.' : 'Three shakes and three supplement / product slots.'}</Text></View>
          <Pressable accessibilityRole="button" disabled={saving} onPress={plan?.canRevert ? revert : convert} style={styles.modeAction}><Text style={styles.modeActionText}>{plan?.canRevert ? 'Restore' : 'Convert'}</Text></Pressable>
        </View>

        <Text style={styles.label}>PLAN NAME</Text>
        <TextInput value={planName} onChangeText={setPlanName} placeholder="Daily diet plan" placeholderTextColor={colors.muted} style={styles.planInput} />
        <View style={styles.listHead}><Text style={styles.label}>ITEMS & TIMES</Text><Text style={styles.count}>{items.length} assigned</Text></View>
        <View style={styles.list}>
          {items.map((item, index) => <View key={item.id || index} style={styles.item}>
            <View style={styles.itemHead}><View style={styles.number}><Text style={styles.numberText}>{String(index + 1).padStart(2, '0')}</Text></View><Text style={styles.kind}>{item.kind === 'MEAL' ? item.type : item.kind === 'ACTIVITY' ? 'Coach exercise' : 'Healthy habit'}</Text><Pressable accessibilityLabel={`Remove ${item.name || 'item'}`} onPress={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.remove}><Ionicons name="trash-outline" size={17} color={colors.danger} /></Pressable></View>
            {item.kind === 'MEAL' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.types}>{MEAL_TYPES.map((mealType) => <Pressable key={mealType} onPress={() => changeItem(index, 'type', mealType)} style={[styles.typeOption, item.type === mealType && styles.typeOptionActive]}><Text style={[styles.typeText, item.type === mealType && styles.typeTextActive]}>{mealType}</Text></Pressable>)}</ScrollView> : null}
            <TextInput value={item.name} onChangeText={(value) => changeItem(index, 'name', value)} placeholder="Item description" placeholderTextColor={colors.muted} style={styles.itemInput} />
            <View style={styles.timeRow}><Ionicons name="time-outline" size={18} color={colors.tealMid} /><Text style={styles.timeLabel}>24-hour time</Text><TextInput accessibilityLabel={`${item.name || 'Item'} time`} value={item.time} onChangeText={(value) => changeItem(index, 'time', value)} maxLength={5} placeholder="08:00" keyboardType="numbers-and-punctuation" style={styles.timeInput} /></View>
          </View>)}
        </View>
        <View style={styles.addRow}><Pressable onPress={() => addItem('MEAL')} style={styles.add}><Ionicons name="add" size={18} color={colors.tealDark} /><Text style={styles.addText}>Add meal / product</Text></Pressable><Pressable onPress={() => addItem('HEALTHY_HABIT')} style={styles.add}><Ionicons name="leaf-outline" size={18} color={colors.tealDark} /><Text style={styles.addText}>Add habit</Text></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving }} disabled={saving} onPress={save} style={[styles.save, saving && styles.saveDisabled]}>{saving ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.saveText}>Save diet plan</Text><Ionicons name="checkmark" size={20} color={colors.white} /></>}</Pressable>
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper }, content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  topBar: { minHeight: 51, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  topTitle: { position: 'absolute', left: 80, right: 80, textAlign: 'center', color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }, accessPill: { minHeight: 32, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.accentSoft, paddingHorizontal: 10 }, accessText: { ...type.label, color: colors.tealDark, fontSize: 9 },
  heading: { marginTop: 24 }, eyebrow: { ...type.label, color: colors.tealMid, fontSize: 11 }, title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 30, lineHeight: 37, marginTop: 5 }, copy: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginTop: 6 },
  state: { minHeight: 330, alignItems: 'center', justifyContent: 'center', gap: 10 }, stateTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18 }, stateText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center' }, retry: { minHeight: 44, justifyContent: 'center', borderRadius: 14, backgroundColor: colors.tealMid, paddingHorizontal: 18 }, retryText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 12 },
  modeBanner: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginTop: 22, ...shadows.soft }, modeBannerActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent }, modeIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist }, modeIconText: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 21, lineHeight: 25 }, modeCopy: { flex: 1, minWidth: 0 }, modeLabel: { ...type.label, color: colors.tealMid, fontSize: 9 }, modeTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14, marginTop: 2 }, modeText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14, marginTop: 3 }, modeAction: { minHeight: 39, justifyContent: 'center', borderRadius: 13, backgroundColor: colors.tealMid, paddingHorizontal: 12 }, modeActionText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 11 },
  label: { ...type.label, color: colors.muted, fontSize: 10, marginTop: 24 }, planInput: { minHeight: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.ink, fontFamily: fonts.medium, fontSize: 15, paddingHorizontal: 15, marginTop: 8 }, listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, count: { color: colors.muted, fontFamily: fonts.medium, fontSize: 11 }, list: { gap: 11, marginTop: 9 },
  item: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, itemHead: { flexDirection: 'row', alignItems: 'center' }, number: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist }, numberText: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 11 }, kind: { flex: 1, color: colors.ink, fontFamily: fonts.semibold, fontSize: 13, paddingHorizontal: 10 }, remove: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center' }, types: { gap: 7, paddingVertical: 12 }, typeOption: { minHeight: 32, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.mist, paddingHorizontal: 11 }, typeOptionActive: { backgroundColor: colors.tealDark }, typeText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 10 }, typeTextActive: { color: colors.white }, itemInput: { minHeight: 49, borderRadius: 14, backgroundColor: colors.mist, color: colors.ink, fontFamily: fonts.regular, fontSize: 13, paddingHorizontal: 12 }, timeRow: { minHeight: 47, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, marginTop: 10, paddingTop: 9 }, timeLabel: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 11 }, timeInput: { width: 72, minHeight: 38, textAlign: 'center', borderRadius: 12, backgroundColor: colors.accentSoft, color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 9, marginTop: 12 }, add: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 15, backgroundColor: colors.accentSoft }, addText: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 10 }, save: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 17, backgroundColor: colors.tealMid, marginTop: 18 }, saveDisabled: { opacity: 0.6 }, saveText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
});
