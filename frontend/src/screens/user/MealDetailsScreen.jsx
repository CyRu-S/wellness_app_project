import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import Image from '../../components/common/ProtectedImage';
import PrimaryButton from '../../components/common/PrimaryButton';
import Screen from '../../components/common/Screen';
import UserHeader from '../../components/user/UserHeader';
import { colors, fonts, radius, type } from '../../theme';
import { protectedImageSource } from '../../utils/memberJournal';

export default function MealDetailsScreen({ navigation, route }) {
  const meals = useSelector((state) => state.meals);
  const token = useSelector((state) => state.auth.token);
  const plannedMeal = meals.items.find((item) => String(item.id) === String(route.params?.mealId));
  const post = route.params?.postId != null
    ? meals.postHistory.find((item) => String(item.id) === String(route.params.postId))
    : meals.postHistory.find((item) => String(item.targetMealId) === String(route.params?.mealId));
  const meal = plannedMeal || post ? {
    ...plannedMeal,
    ...(post ? {
      ...post,
      consumed: true,
      name: post.name || plannedMeal?.name,
      type: post.type || plannedMeal?.type,
      calories: post.calories ?? plannedMeal?.calories ?? 0,
      protein: post.protein ?? plannedMeal?.protein ?? 0,
      imageUri: post.imageUri || plannedMeal?.imageUri,
      time: post.loggedAt || plannedMeal?.time,
    } : {}),
    ingredients: plannedMeal?.ingredients || post?.ingredients || [],
  } : null;

  if (!meal) return <Screen><UserHeader navigation={navigation} title="Meal details" /><Text>This meal is no longer available.</Text></Screen>;
  const imageSource = protectedImageSource(meal, token);

  return (
    <Screen>
      <UserHeader navigation={navigation} title="Meal details" />
      <View style={styles.visual}>
        {imageSource ? <Image accessibilityLabel={`${meal.type} photo`} source={imageSource} resizeMode="cover" style={styles.photo} /> : <View style={styles.plate}><Ionicons name="leaf" size={78} color={colors.moss} /></View>}
        <View style={styles.timePill}><Text style={styles.time}>{meal.time}</Text></View>
      </View>
      <Text style={styles.type}>{meal.type}</Text>
      <Text style={styles.title}>{meal.name}</Text>
      <View style={styles.nutrition}>
        <View><Text style={styles.value}>{meal.calories}</Text><Text style={styles.label}>kcal</Text></View>
        <View><Text style={styles.value}>{meal.protein}g</Text><Text style={styles.label}>protein</Text></View>
      </View>
      {meal.ingredients.length ? <><Text style={styles.ingredients}>INGREDIENTS</Text>{meal.ingredients.map((item, index) => <View key={`${item}-${index}`} style={styles.ingredient}><Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.ingredientText}>{item}</Text></View>)}</> : null}
      <View style={styles.button}><PrimaryButton title={meal.consumed ? 'Meal logged' : 'Log meal photo'} disabled={meal.consumed} onPress={() => navigation.navigate('MealCapture', { targetMealId: meal.id, category: 'meal' })} /></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: { height: 240, overflow: 'hidden', backgroundColor: colors.accentSoft, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  photo: { width: '100%', height: '100%' },
  plate: { width: 158, height: 158, borderRadius: 79, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 12, borderColor: colors.white },
  timePill: { position: 'absolute', right: 14, top: 14, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.9)' },
  time: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 },
  type: { ...type.label, color: colors.moss, marginTop: 25 },
  title: { ...type.h1, color: colors.ink, marginTop: 5 },
  nutrition: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 24, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  value: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 20 },
  label: { color: colors.muted, marginTop: 3 },
  ingredients: { ...type.label, color: colors.muted, marginTop: 27 },
  ingredient: { flexDirection: 'row', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  index: { color: colors.moss, width: 42, fontFamily: fonts.semibold },
  ingredientText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 16 },
  button: { marginTop: 27 },
});
