import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import StaggeredView from '../../components/auth/StaggeredView';
import MealSchedule, { getMealStatus } from '../../components/meal/MealSchedule';
import Screen from '../../components/common/Screen';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function MealLogScreen({ navigation }) {
  const meals = useSelector((state) => state.meals);
  const user = useSelector((state) => state.auth.user);
  const nextMeal = meals.items.find((meal) => !meal.consumed);
  const openCamera = (category, targetMealId) => navigation.navigate('MealCapture', { category, targetMealId: category === 'meal' ? (targetMealId ?? nextMeal?.id) : null });

  return (
    <Screen>
      <View style={styles.nav}><Pressable accessibilityLabel="Go back" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.getParent()?.navigate('Today')} style={styles.back}><Ionicons name="arrow-back" size={19} color={colors.ink} /></Pressable><Text style={styles.navTitle}>Log an entry</Text><View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.slice(0, 2).toUpperCase() || 'AN'}</Text></View></View>
      <StaggeredView delay={40} style={styles.head}><Text style={styles.kicker}>PHOTO CHECK-IN</Text><Text style={styles.title}>What are you logging?</Text><Text style={styles.body}>Choose a category, then frame the item clearly for analysis.</Text></StaggeredView>
      <StaggeredView delay={120} style={styles.options}>
        <Pressable onPress={() => openCamera('meal')} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
          <View style={styles.preview}><Ionicons name="restaurant-outline" size={31} color={colors.tealDark} /><View style={styles.camera}><Ionicons name="camera" size={17} color={colors.white} /></View></View>
          <View style={styles.optionCopy}><Text style={styles.optionLabel}>PLANNED MEAL</Text><Text style={styles.optionTitle}>{nextMeal?.type || 'Daily meal'}</Text><Text style={styles.optionMeta}>{nextMeal ? `${nextMeal.name} · ${nextMeal.time}` : 'All planned meals are complete'}</Text></View>
          <View style={styles.arrow}><Ionicons name="arrow-forward" size={18} color={colors.tealDark} /></View>
        </Pressable>
        <Pressable onPress={() => openCamera('product')} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
          <View style={[styles.preview, styles.productPreview]}><Ionicons name="leaf-outline" size={32} color={colors.tealDark} /><View style={styles.camera}><Ionicons name="camera" size={17} color={colors.white} /></View></View>
          <View style={styles.optionCopy}><Text style={styles.optionLabel}>NUTRITION PRODUCT</Text><Text style={styles.optionTitle}>Shake or supplement</Text><Text style={styles.optionMeta}>Capture the serving and product together</Text></View>
          <View style={styles.arrow}><Ionicons name="arrow-forward" size={18} color={colors.tealDark} /></View>
        </Pressable>
      </StaggeredView>
      <StaggeredView delay={220} style={styles.sheet}>
        <View style={styles.sheetHead}><View><Text style={styles.sheetLabel}>TODAY’S MEAL SHEET</Text><Text style={styles.sheetTitle}>{meals.planName}</Text></View><Text style={styles.coach}>{meals.consultant}</Text></View>
        <MealSchedule items={meals.items} compact onLog={(meal) => getMealStatus(meal) !== 'logged' && openCamera('meal', meal.id)} />
      </StaggeredView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.soft }, navTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.accent, fontFamily: fonts.semibold, fontSize: 12 },
  head: { marginTop: 28 }, kicker: { ...type.label, color: colors.tealMid }, title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 34, lineHeight: 38, letterSpacing: -1.2, marginTop: 7 }, body: { ...type.body, color: colors.muted, marginTop: 7, maxWidth: 340 },
  options: { gap: 14, marginTop: 24 }, option: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadows.soft }, pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] }, preview: { height: 104, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, productPreview: { backgroundColor: colors.mist }, camera: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.tealMid, alignItems: 'center', justifyContent: 'center' }, optionCopy: { padding: 17, paddingRight: 54 }, optionLabel: { ...type.label, color: colors.tealMid, fontSize: 8 }, optionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, marginTop: 4 }, optionMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, marginTop: 4 }, arrow: { position: 'absolute', right: 15, bottom: 23, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  sheet: { marginTop: 31 }, sheetHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, sheetLabel: { ...type.label, color: colors.muted, fontSize: 8 }, sheetTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 17, marginTop: 4 }, coach: { color: colors.tealMid, fontFamily: fonts.medium, fontSize: 10 },
});
