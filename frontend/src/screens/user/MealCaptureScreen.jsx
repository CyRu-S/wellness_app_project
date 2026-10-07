import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { analyzeCapturedMeal } from '../../services/api/capturedMealAnalysis';
import { changeFoodPortion, changeFoodReference, editFoodReference, hasFoodNutrition, hasValidFoodPortions, isManualProduct, portionWeight, toggleFoodExcluded } from '../../utils/mealAnalysis';
import { formatNutrition } from '../../utils/formatNutrition';
import { postMeal } from '../../store/slices/mealSlice';
import { preparePhotoUpload } from '../../utils/preparePhotoUpload';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function MealCaptureScreen({ navigation, route }) {
  const focused = useIsFocused();
  const { height } = useWindowDimensions();
  const category = route.params?.category || 'meal';
  const targetMealId = route.params?.targetMealId;
  const allMeals = useSelector((state) => state.meals.items);
  const pendingPost = useSelector((state) => state.meals.pendingPost);
  const targetMeal = useSelector((state) => state.meals.items.find((meal) => meal.id === targetMealId));
  const manualProduct = isManualProduct(targetMeal) || isManualProduct(category);
  const analysisCategory = manualProduct ? 'product' : 'meal';
  const token = useSelector((state) => state.auth.token);
  const userId = useSelector((state) => state.auth.user?.id);
  const dispatch = useDispatch();
  const camera = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [posting, setPosting] = useState(false);
  const needsPortions = !!analysis?.items?.length;
  const portionsReady = !needsPortions || hasValidFoodPortions(analysis);
  const clientRequestId = useRef(null);
  const [scan] = useState(() => new Animated.Value(0));
  const [sheet] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!analyzing) { scan.stopAnimation(); scan.setValue(0); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 1150, useNativeDriver: true }),
      Animated.timing(scan, { toValue: 0, duration: 1150, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [analyzing, scan]);

  useEffect(() => {
    if (analysis) Animated.spring(sheet, { toValue: 1, speed: 15, bounciness: 4, useNativeDriver: true }).start();
  }, [analysis, sheet]);

  const processPhoto = async (uri) => {
    clientRequestId.current = `${userId || 'member'}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setPhoto(uri);
    setAnalysis(null);
    setAnalyzing(true);
    sheet.setValue(0);
    try {
      const prepared = await preparePhotoUpload({ uri });
      setPhoto(prepared.uri);
      const result = await analyzeCapturedMeal({ uri: prepared.uri, meal: targetMeal, category: analysisCategory, token });
      setAnalysis(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      setPhoto(null);
      Alert.alert('Photo unavailable', error.message || 'Retake the photo or choose another image.');
    } finally {
      setAnalyzing(false);
    }
  };

  const capture = async () => {
    if (!camera.current || analyzing) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const result = await camera.current.takePictureAsync({ quality: 0.76, skipProcessing: false });
      await processPhoto(result.uri);
    } catch (error) {
      Alert.alert('Camera unavailable', error.message || 'Please try again.');
    }
  };

  const choosePhoto = async () => {
    if (analyzing || posting) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.78 });
      if (!result.canceled && result.assets?.[0]?.uri) await processPhoto(result.assets[0].uri);
    } catch (error) { Alert.alert('Photo unavailable', error.message || 'Choose another image.'); }
  };

  const retake = () => {
    if (posting) return;
    clientRequestId.current = null;
    setPhoto(null);
    setAnalysis(null);
    sheet.setValue(0);
  };

  const confirm = async () => {
    if (posting || pendingPost || !analysis || !photo) return;
    if (!targetMeal || targetMeal.consumed) { Alert.alert('No meal available', 'Choose an unlogged meal from your assigned plan.'); return; }
    if (!portionsReady) { Alert.alert('Complete food details', 'Enter any missing per-100-g nutrition and the eaten weight of each included food, up to 2000 g each.'); return; }
    const nutritionLimits = { calories: 10000, protein: 1000, carbs: 2000, fat: 1000 };
    const nutrition = Object.fromEntries(Object.keys(nutritionLimits).map((key) => [key, Number(String(analysis[key]).replace(',', '.'))]));
    if (!analysis.name.trim() || Object.entries(nutrition).some(([key, value]) =>
      !/^\d+(?:[.,]\d{1,4})?$/.test(String(analysis[key])) || !Number.isFinite(value) || value > nutritionLimits[key])) {
      Alert.alert('Check meal details', 'Enter a meal name and nutrition values with up to four decimal places.'); return;
    }
    setPosting(true);


    const operation = dispatch(postMeal({
      plannedMealId: Number(targetMealId),
      mealType: targetMeal.type,
      mealName: analysis.name,
      calories: nutrition.calories,
      proteinGrams: nutrition.protein,
      carbsGrams: nutrition.carbs,
      fatGrams: nutrition.fat,
      clientRequestId: clientRequestId.current,
      imageUri: photo,
      optimisticCompletion: Math.min(100, Math.round((allMeals.filter((meal) => meal.consumed).length + 1) * 100 / allMeals.length)),
    }));
    // The dashboard shows the local post immediately, and retains retry data.
    operation.then((result) => {
      if (postMeal.fulfilled.match(result)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
    const routeNames = navigation.getState().routeNames;
    if (routeNames.includes('Dashboard')) navigation.navigate('Dashboard');
    else {
      const parent = navigation.getParent();
      navigation.goBack();
      parent?.navigate('Today');
    }
  };

  if (!targetMeal) return <SafeAreaView style={styles.permission}><Text style={styles.permissionTitle}>No meal assigned</Text><Text style={styles.permissionCopy}>Your admin must assign a diet plan before you can post a meal.</Text><Pressable onPress={() => navigation.goBack()}><Text style={styles.libraryLink}>Go back</Text></Pressable></SafeAreaView>;
  if (!permission && !photo) return <View style={styles.loading} />;
  if (!permission?.granted && !photo) {
    return <SafeAreaView style={styles.permission}><Ionicons name="camera-outline" size={42} color={colors.accent} /><Text style={styles.permissionTitle}>Camera access is needed</Text><Text style={styles.permissionCopy}>Use the camera to log meals and estimate their nutritional values.</Text><Pressable onPress={requestPermission} style={styles.permissionButton}><Text style={styles.permissionButtonText}>Allow camera</Text></Pressable><Pressable onPress={choosePhoto}><Text style={styles.libraryLink}>Choose from photo library</Text></Pressable></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.visual}>
        {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : focused && permission?.granted ? <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} enableTorch={torch} /> : null}
        <View pointerEvents="none" style={styles.scrim} />
        <View style={styles.topbar}>
          <Pressable accessibilityLabel="Close camera" onPress={() => navigation.goBack()} style={styles.roundButton}><Ionicons name="close" size={21} color={colors.white} /></Pressable>
          <View style={styles.category}><Text style={styles.categoryText}>{category === 'meal' ? (targetMeal?.type || 'DAILY MEAL') : 'NUTRITION PRODUCT'}</Text></View>
          <Pressable accessibilityLabel="Toggle camera" onPress={() => setFacing((value) => value === 'back' ? 'front' : 'back')} style={styles.roundButton}><Ionicons name="camera-reverse-outline" size={20} color={colors.white} /></Pressable>
        </View>

        <View style={styles.instruction}><Text style={styles.instructionTitle}>{analyzing ? 'Analysing your photo' : analysis ? 'Review the estimate' : manualProduct ? 'Photograph your serving' : 'Frame the complete meal'}</Text><Text style={styles.instructionCopy}>{analyzing ? 'Identifying foods and estimating nutrition…' : analysis ? 'Review the food and nutrition before saving.' : manualProduct ? 'You will enter product nutrition manually.' : 'Keep the complete meal inside the guides and hold steady.'}</Text></View>

        {!analysis ? <View pointerEvents="none" style={styles.frame}><View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} /><View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />{analyzing ? <Animated.View style={[styles.scan, { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }) }] }]} /> : <View style={styles.centerTarget}><Ionicons name="scan-outline" size={27} color="rgba(255,255,255,0.75)" /></View>}</View> : null}

        {!analysis ? <View style={styles.controls}><Pressable accessibilityLabel="Choose from library" onPress={choosePhoto} style={styles.smallControl}><Ionicons name="images-outline" size={20} color={colors.white} /></Pressable><Pressable accessibilityLabel="Take photo" onPress={capture} disabled={analyzing || !!photo} style={styles.shutter}><View style={styles.shutterInner}>{analyzing ? <Ionicons name="sparkles" size={22} color={colors.tealDark} /> : <Ionicons name="camera" size={22} color={colors.tealDark} />}</View></Pressable><Pressable accessibilityLabel="Toggle flash" onPress={() => setTorch((value) => !value)} style={[styles.smallControl, torch && styles.controlActive]}><Ionicons name={torch ? 'flash' : 'flash-off-outline'} size={20} color={colors.white} /></Pressable></View> : null}
      </View>

      {analysis ? <Animated.View style={[styles.result, { maxHeight: height * 0.6, flexShrink: 1 }, { opacity: sheet, transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }] }]}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.resultHandle} />
        <View style={styles.resultTop}><View><Text style={styles.resultLabel}>{analysis.source === 'live' ? 'ESTIMATED FOOD NUTRITION' : manualProduct ? 'MANUAL PRODUCT ENTRY' : 'ENTER MEAL DETAILS'}</Text><Text style={styles.resultTitle}>{analysis.name}</Text></View></View>
        {analysis.items?.length ? <View style={styles.foodItems}>
          <Text style={styles.servingTitle}>Detected foods & portion weights</Text>
          <Text style={styles.demoText}>Nutrition is shown per 100 g. Enter how many grams you ate of each food. Remove any incorrectly detected food.</Text>
          {analysis.items.map((item, index) => <View key={`${item.name}-${index}`} style={styles.foodItem}>
            <Text style={styles.foodName}>{item.name}</Text>
            {hasFoodNutrition(item) ? <Text style={styles.demoText}>{formatNutrition(item.calories)} kcal | P {formatNutrition(item.protein)} g | C {formatNutrition(item.carbs)} g | F {formatNutrition(item.fat)} g per 100 g</Text> : <Text style={styles.portionError}>Nutrition unavailable. Enter all four values per 100 g below.</Text>}
            {item.nutritionReference && item.nutritionSource !== 'manual' ? <Text style={styles.demoText}>{item.nutritionReference}</Text> : null}
            {!hasFoodNutrition(item) || item.nutritionSource === 'manual' ? <View style={styles.referenceFields}>
              {['calories', 'protein', 'carbs', 'fat'].map((key) => <View key={key} style={styles.referenceField}>
                <Text style={styles.demoText}>{key === 'calories' ? 'Calories (kcal)' : `${key[0].toUpperCase()}${key.slice(1)} (g)`} / 100 g</Text>
                <TextInput accessibilityLabel={`${item.name} ${key} per 100 grams`} keyboardType="decimal-pad" placeholder="Enter value" maxLength={10}
                  editable={!item.excluded && !posting} value={item.referenceInputs?.[key] ?? ''} style={[styles.portionInput, item.excluded && styles.disabled]}
                  onChangeText={(value) => setAnalysis((current) => changeFoodReference(current, index, key, value))} />
              </View>)}
              <Text style={styles.demoText}>Use recipe or label values: 0–1000 kcal and 0–100 g per nutrient, up to four decimal places.</Text>
            </View> : <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.name} nutrition per 100 grams`} disabled={posting || item.excluded}
              onPress={() => setAnalysis((current) => editFoodReference(current, index))}><Text style={styles.editReference}>Edit per-100-g values</Text></Pressable>}
            <View style={styles.servingControls}>
              <View style={styles.portionField}><Text style={styles.demoText}>{item.excluded ? 'Excluded' : 'Portion eaten (g)'}</Text>
                <TextInput accessibilityLabel={`${item.name} portion in grams`} keyboardType="decimal-pad" placeholder="Enter grams" maxLength={8}
                  editable={!item.excluded && !posting} value={item.consumedGrams} style={[styles.portionInput, item.excluded && styles.disabled]}
                  onChangeText={(value) => setAnalysis((current) => changeFoodPortion(current, index, value))} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${item.excluded ? 'Include' : 'Remove'} ${item.name}`} disabled={posting}
                style={styles.servingButton} onPress={() => setAnalysis((current) => toggleFoodExcluded(current, index))}><Text>{item.excluded ? 'Include' : 'Remove'}</Text></Pressable>
            </View>
            {!item.excluded && item.consumedGrams && portionWeight(item.consumedGrams) === null ? <Text style={styles.portionError}>Enter a weight above 0 and up to 2000 g, with at most 2 decimal places.</Text> : null}
          </View>)}
        </View> : null}
        {needsPortions ? <Text style={styles.totalLabel}>TOTAL FOR ENTERED PORTIONS</Text> : null}
        <View style={styles.nutrition}>{['calories', 'protein', 'carbs', 'fat'].map((key) => <View key={key}>
          <Text style={styles.value}>{!portionsReady ? '—' : `${formatNutrition(analysis[key])}${key === 'calories' ? '' : 'g'}`}</Text>
          <Text style={styles.valueLabel}>{key === 'calories' ? 'KCAL' : key.toUpperCase()}</Text>
        </View>)}</View>
        {analysis.warning ? <View style={styles.demoNote}><Ionicons name="information-circle-outline" size={16} color={colors.tealDark} /><Text style={styles.demoText}>{analysis.warning}</Text></View> : null}
        <TextInput accessibilityLabel="Meal name" value={analysis.name} onChangeText={(name) => setAnalysis((current) => ({ ...current, name }))} style={{ padding: 8, color: colors.ink }} />
        {!needsPortions ? <View style={{ flexDirection: 'row', gap: 8 }}>{['calories', 'protein', 'carbs', 'fat'].map((key) => <View key={key} style={{ flex: 1 }}><Text>{key}</Text><TextInput accessibilityLabel={key} keyboardType="decimal-pad" value={String(analysis[key] ?? '')} onChangeText={(value) => setAnalysis((current) => ({ ...current, [key]: value }))} style={{ padding: 8, borderBottomWidth: 1, color: colors.ink }} /></View>)}</View> : null}
        {needsPortions && !portionsReady ? <Text style={styles.demoText}>Include at least one food and complete its nutrition and eaten weight to save. Complete all included foods.</Text> : null}
        <View style={styles.resultActions}><Pressable onPress={retake} disabled={posting} style={[styles.retake, posting && styles.disabled]}><Text style={styles.retakeText}>Retake</Text></Pressable><Pressable accessibilityState={{ busy: posting, disabled: posting || !portionsReady }} onPress={confirm} disabled={posting || !portionsReady} style={[styles.confirm, (posting || !portionsReady) && styles.disabled]}><Text style={styles.confirmText}>{posting ? 'Saving meal…' : 'Add to dashboard'}</Text><Ionicons name={posting ? 'cloud-upload-outline' : 'arrow-forward'} size={17} color={colors.white} /></Pressable></View>
        </ScrollView>
      </Animated.View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  referenceFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }, referenceField: { width: '48%' },
  editReference: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 12, paddingVertical: 8 },
  loading: { flex: 1, backgroundColor: colors.ink }, page: { flex: 1, backgroundColor: colors.ink }, visual: { flex: 1, minHeight: 160, overflow: 'hidden' }, scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,30,34,0.37)' },
  topbar: { position: 'absolute', top: 15, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,46,54,0.72)', alignItems: 'center', justifyContent: 'center' }, category: { borderRadius: radius.pill, backgroundColor: 'rgba(0,46,54,0.8)', paddingVertical: 9, paddingHorizontal: 14 }, categoryText: { ...type.label, color: colors.white, fontSize: 11 },
  instruction: { position: 'absolute', top: 80, left: 25, right: 25, alignItems: 'center' }, instructionTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 16 }, instructionCopy: { color: '#B8D2D3', fontFamily: fonts.regular, fontSize: 11, marginTop: 4, textAlign: 'center' },
  frame: { position: 'absolute', left: 38, right: 38, top: 175, height: 240, overflow: 'hidden' }, corner: { position: 'absolute', width: 25, height: 25, borderColor: colors.accent }, tl: { left: 0, top: 0, borderLeftWidth: 2, borderTopWidth: 2, borderTopLeftRadius: 9 }, tr: { right: 0, top: 0, borderRightWidth: 2, borderTopWidth: 2, borderTopRightRadius: 9 }, bl: { left: 0, bottom: 0, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 9 }, br: { right: 0, bottom: 0, borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 9 }, centerTarget: { position: 'absolute', alignSelf: 'center', top: 92, width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(0,46,54,0.42)', borderWidth: 1, borderColor: 'rgba(17,184,191,0.45)', alignItems: 'center', justifyContent: 'center' }, scan: { position: 'absolute', left: 4, right: 4, top: 5, height: 2, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.8, shadowRadius: 8 },
  controls: { position: 'absolute', bottom: 27, left: 30, right: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, smallControl: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(0,46,54,0.78)', alignItems: 'center', justifyContent: 'center' }, controlActive: { backgroundColor: colors.tealMid }, shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }, shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  result: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5, backgroundColor: colors.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 11, paddingBottom: 22, ...shadows.raised }, resultHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 16 }, resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, resultLabel: { ...type.label, color: colors.tealMid, fontSize: 11 }, resultTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 22, marginTop: 4 }, confidence: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, confidenceValue: { color: colors.tealDark, fontFamily: fonts.bold, fontSize: 14 }, confidenceLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 13, letterSpacing: 0.5 },
  nutrition: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, value: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 19, textAlign: 'center' }, valueLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.5, marginTop: 2, textAlign: 'center' }, demoNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }, demoText: { flex: 1, color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 17 },
  resultActions: { flexDirection: 'row', gap: 10, marginTop: 15 }, retake: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 19 }, retakeText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 }, confirm: { flex: 1, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.tealMid, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, confirmText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 13 },
  foodItems: { marginTop: 16, gap: 10 }, servingTitle: { fontFamily: fonts.semibold, color: colors.ink, fontSize: 15 },
  foodItem: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, gap: 4 },
  foodName: { fontFamily: fonts.semibold, color: colors.ink, fontSize: 14 },
  servingControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  servingButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft, borderRadius: 12 },
  totalLabel: { ...type.label, color: colors.tealMid, fontSize: 10, marginTop: 12 },
  portionField: { flex: 1, gap: 4 }, portionInput: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 10, color: colors.ink, backgroundColor: colors.white },
  portionError: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  disabled: { opacity: 0.58 },
  permission: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 30 }, permissionTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 24, marginTop: 18 }, permissionCopy: { color: '#A9C7C9', fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 }, permissionButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.tealMid, paddingHorizontal: 26, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, permissionButtonText: { color: colors.white, fontFamily: fonts.semibold }, libraryLink: { color: colors.accent, fontFamily: fonts.medium, marginTop: 20 },
});
