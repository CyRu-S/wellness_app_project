import { LocalizedText as Text } from '../../components/common/LocalizedText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '../../utils/appAlert';
import { deleteMealPost } from '../../store/slices/mealSlice';
import Image from '../../components/common/ProtectedImage';
import PrimaryButton from '../../components/common/PrimaryButton';
import Screen from '../../components/common/Screen';
import UserHeader from '../../components/user/UserHeader';
import { colors, fonts, radius, type } from '../../theme';
import { protectedImageSource } from '../../utils/memberJournal';
import { fixedHerbalifeCalories, isUnlistedHerbalife } from '../../utils/mealAnalysis';

export default function MealDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
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
      carbs: post.carbsGrams ?? 0,
      fat: post.fatGrams ?? 0,
      imageUri: post.imageUri || plannedMeal?.imageUri,
      time: post.loggedAt || plannedMeal?.time,
    } : {}),
    ingredients: plannedMeal?.ingredients || post?.ingredients || [],
  } : null;

  if (!meal) return <Screen><UserHeader navigation={navigation} title="Meal details" /><Text>This meal is no longer available.</Text></Screen>;
  const productCalories = fixedHerbalifeCalories(meal);
  const imageSource = protectedImageSource(meal, token);
  const confirmDelete = () => Alert.alert('Delete this post?', 'The photo and check-in will be permanently removed so you can upload the correct one.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete post', style: 'destructive', onPress: async () => {
      try { await dispatch(deleteMealPost(post.id)).unwrap(); navigation.goBack(); }
      catch (error) { Alert.alert('Post not deleted', error.message || 'Please try again.'); }
    } },
  ]);

  return (
    <Screen>
      <UserHeader navigation={navigation} title="Meal details" />
      <View style={styles.visual}>
        {imageSource ? <Image accessibilityLabel={`${meal.type} photo`} source={imageSource} resizeMode="cover" style={styles.photo} /> : <View style={styles.plate}><Ionicons name="leaf" size={78} color={colors.moss} /></View>}
        <View style={styles.timePill}><Text style={styles.time}>{meal.time}</Text></View>
      </View>
      <Text style={styles.type}>{meal.type}</Text>
      <Text style={styles.title}>{meal.name}</Text>
      {!isUnlistedHerbalife(meal) ? <View style={styles.nutrition}>
        <View style={styles.nutritionItem}><Text style={styles.value}>{post ? meal.calories : productCalories ?? meal.calories}</Text><Text style={styles.label}>kcal</Text></View>
        {productCalories === null ? <View style={styles.nutritionItem}><Text style={styles.value}>{meal.protein}g</Text><Text style={styles.label}>protein</Text></View> : null}
        {post && productCalories === null ? <View style={styles.nutritionItem}><Text style={styles.value}>{meal.carbs}g</Text><Text style={styles.label}>carbs</Text></View> : null}
        {post && productCalories === null ? <View style={styles.nutritionItem}><Text style={styles.value}>{meal.fat}g</Text><Text style={styles.label}>fat</Text></View> : null}
      </View> : null}
      {meal.ingredients.length ? <><Text style={styles.ingredients}>INGREDIENTS</Text>{meal.ingredients.map((item, index) => <View key={`${item}-${index}`} style={styles.ingredient}><Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.ingredientText}>{item}</Text></View>)}</> : null}
      <View style={styles.button}><PrimaryButton title={meal.consumed ? 'Meal logged' : 'Log meal photo'} disabled={meal.consumed} onPress={() => navigation.navigate('MealCapture', { targetMealId: meal.id, category: 'meal' })} /></View>
      {post ? <Pressable accessibilityRole="button" disabled={String(meals.deletingPostId) === String(post.id)} onPress={confirmDelete} style={styles.deleteButton}><Ionicons name="trash-outline" size={18} color={colors.danger} /><Text style={styles.deleteText}>{String(meals.deletingPostId) === String(post.id) ? 'Deleting…' : 'Delete incorrect post'}</Text></Pressable> : null}
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
  nutrition: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 18, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  nutritionItem: { width: '50%', paddingVertical: 6 },
  value: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
  label: { color: colors.muted, marginTop: 3 },
  ingredients: { ...type.label, color: colors.muted, marginTop: 27 },
  ingredient: { flexDirection: 'row', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  index: { color: colors.moss, width: 42, fontFamily: fonts.semibold },
  ingredientText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 16 },
  button: { marginTop: 27 },
  deleteButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  deleteText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 14 },
});
