import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { analyzeMealPhoto } from '../../services/api/mealAnalysisApi';
import { logMealNutrition } from '../../store/slices/dashboardSlice';
import { logDetectedMeal } from '../../store/slices/mealSlice';
import { colors, fonts, radius, shadows, type } from '../../theme';

export default function MealCaptureScreen({ navigation, route }) {
  const category = route.params?.category || 'meal';
  const targetMealId = route.params?.targetMealId;
  const targetMeal = useSelector((state) => state.meals.items.find((meal) => meal.id === targetMealId));
  const analysisCategory = targetMeal?.type === 'Herbalife product' ? 'product' : category;
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const camera = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const scan = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;

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
    setPhoto(uri);
    setAnalysis(null);
    setAnalyzing(true);
    sheet.setValue(0);
    try {
      const result = await analyzeMealPhoto({ uri, category: analysisCategory, token });
      setAnalysis(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Analysis unavailable', error.message || 'Please try another photo.');
      setPhoto(null);
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.78 });
    if (!result.canceled && result.assets?.[0]?.uri) await processPhoto(result.assets[0].uri);
  };

  const retake = () => { setPhoto(null); setAnalysis(null); sheet.setValue(0); };

  const confirm = () => {
    const postedAt = new Date();
    const loggedAt = postedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const payload = { id: postedAt.getTime(), targetMealId, analysis, imageUri: photo, loggedAt, postedAt: postedAt.toISOString() };
    dispatch(logDetectedMeal(payload));
    dispatch(logMealNutrition({ ...analysis, loggedAt }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const routeNames = navigation.getState().routeNames;
    if (routeNames.includes('Dashboard')) navigation.navigate('Dashboard');
    else navigation.getParent()?.navigate('Today');
  };

  if (!permission) return <View style={styles.loading} />;
  if (!permission.granted) {
    return <SafeAreaView style={styles.permission}><Ionicons name="camera-outline" size={42} color={colors.accent} /><Text style={styles.permissionTitle}>Camera access is needed</Text><Text style={styles.permissionCopy}>Use the camera to log meals and estimate their nutritional values.</Text><Pressable onPress={requestPermission} style={styles.permissionButton}><Text style={styles.permissionButtonText}>Allow camera</Text></Pressable><Pressable onPress={choosePhoto}><Text style={styles.libraryLink}>Choose from photo library</Text></Pressable></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.visual}>
        {photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} enableTorch={torch} />}
        <View pointerEvents="none" style={styles.scrim} />
        <View style={styles.topbar}>
          <Pressable accessibilityLabel="Close camera" onPress={() => navigation.goBack()} style={styles.roundButton}><Ionicons name="close" size={21} color={colors.white} /></Pressable>
          <View style={styles.category}><Text style={styles.categoryText}>{category === 'meal' ? (targetMeal?.type || 'DAILY MEAL') : 'NUTRITION PRODUCT'}</Text></View>
          <Pressable accessibilityLabel="Toggle camera" onPress={() => setFacing((value) => value === 'back' ? 'front' : 'back')} style={styles.roundButton}><Ionicons name="camera-reverse-outline" size={20} color={colors.white} /></Pressable>
        </View>

        <View style={styles.instruction}><Text style={styles.instructionTitle}>{analyzing ? 'Analysing your photo' : analysis ? 'Review the estimate' : category === 'meal' ? 'Frame the complete meal' : 'Frame the serving and label'}</Text><Text style={styles.instructionCopy}>{analyzing ? 'Identifying foods and estimating nutrition…' : analysis ? 'Adjustments can be added after saving.' : 'Keep the item inside the guides and hold steady.'}</Text></View>

        {!analysis ? <View pointerEvents="none" style={styles.frame}><View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} /><View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />{analyzing ? <Animated.View style={[styles.scan, { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }) }] }]} /> : <View style={styles.centerTarget}><Ionicons name="scan-outline" size={27} color="rgba(255,255,255,0.75)" /></View>}</View> : null}

        {!analysis ? <View style={styles.controls}><Pressable accessibilityLabel="Choose from library" onPress={choosePhoto} style={styles.smallControl}><Ionicons name="images-outline" size={20} color={colors.white} /></Pressable><Pressable accessibilityLabel="Take photo" onPress={capture} disabled={analyzing || !!photo} style={styles.shutter}><View style={styles.shutterInner}>{analyzing ? <Ionicons name="sparkles" size={22} color={colors.tealDark} /> : <Ionicons name="camera" size={22} color={colors.tealDark} />}</View></Pressable><Pressable accessibilityLabel="Toggle flash" onPress={() => setTorch((value) => !value)} style={[styles.smallControl, torch && styles.controlActive]}><Ionicons name={torch ? 'flash' : 'flash-off-outline'} size={20} color={colors.white} /></Pressable></View> : null}
      </View>

      {analysis ? <Animated.View style={[styles.result, { opacity: sheet, transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }] }]}>
        <View style={styles.resultHandle} />
        <View style={styles.resultTop}><View><Text style={styles.resultLabel}>{analysis.source === 'live' ? 'LIVE ANALYSIS' : 'PREVIEW ESTIMATE'}</Text><Text style={styles.resultTitle}>{analysis.name}</Text></View><View style={styles.confidence}><Text style={styles.confidenceValue}>{analysis.confidence}%</Text><Text style={styles.confidenceLabel}>MATCH</Text></View></View>
        <View style={styles.nutrition}><View><Text style={styles.value}>{analysis.calories}</Text><Text style={styles.valueLabel}>KCAL</Text></View><View><Text style={styles.value}>{analysis.protein}g</Text><Text style={styles.valueLabel}>PROTEIN</Text></View><View><Text style={styles.value}>{analysis.carbs}g</Text><Text style={styles.valueLabel}>CARBS</Text></View><View><Text style={styles.value}>{analysis.fat}g</Text><Text style={styles.valueLabel}>FAT</Text></View></View>
        {analysis.source !== 'live' ? <View style={styles.demoNote}><Ionicons name="information-circle-outline" size={16} color={colors.tealDark} /><Text style={styles.demoText}>Demo estimate. Connect the meal-analysis endpoint for live food recognition.</Text></View> : null}
        <View style={styles.resultActions}><Pressable onPress={retake} style={styles.retake}><Text style={styles.retakeText}>Retake</Text></Pressable><Pressable onPress={confirm} style={styles.confirm}><Text style={styles.confirmText}>Add to dashboard</Text><Ionicons name="arrow-forward" size={17} color={colors.white} /></Pressable></View>
      </Animated.View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.ink }, page: { flex: 1, backgroundColor: colors.ink }, visual: { flex: 1, minHeight: 520, overflow: 'hidden' }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,30,34,0.37)' },
  topbar: { position: 'absolute', top: 15, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, roundButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,46,54,0.72)', alignItems: 'center', justifyContent: 'center' }, category: { borderRadius: radius.pill, backgroundColor: 'rgba(0,46,54,0.76)', paddingVertical: 8, paddingHorizontal: 14 }, categoryText: { ...type.label, color: colors.white, fontSize: 8 },
  instruction: { position: 'absolute', top: 80, left: 25, right: 25, alignItems: 'center' }, instructionTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 16 }, instructionCopy: { color: '#B8D2D3', fontFamily: fonts.regular, fontSize: 11, marginTop: 4, textAlign: 'center' },
  frame: { position: 'absolute', left: 38, right: 38, top: 175, height: 240, overflow: 'hidden' }, corner: { position: 'absolute', width: 25, height: 25, borderColor: colors.accent }, tl: { left: 0, top: 0, borderLeftWidth: 2, borderTopWidth: 2, borderTopLeftRadius: 9 }, tr: { right: 0, top: 0, borderRightWidth: 2, borderTopWidth: 2, borderTopRightRadius: 9 }, bl: { left: 0, bottom: 0, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 9 }, br: { right: 0, bottom: 0, borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 9 }, centerTarget: { position: 'absolute', alignSelf: 'center', top: 92, width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(0,46,54,0.42)', borderWidth: 1, borderColor: 'rgba(17,184,191,0.45)', alignItems: 'center', justifyContent: 'center' }, scan: { position: 'absolute', left: 4, right: 4, top: 5, height: 2, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.8, shadowRadius: 8 },
  controls: { position: 'absolute', bottom: 27, left: 30, right: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, smallControl: { width: 46, height: 46, borderRadius: 16, backgroundColor: 'rgba(0,46,54,0.78)', alignItems: 'center', justifyContent: 'center' }, controlActive: { backgroundColor: colors.tealMid }, shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }, shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  result: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5, backgroundColor: colors.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 11, paddingBottom: 22, ...shadows.raised }, resultHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 16 }, resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, resultLabel: { ...type.label, color: colors.tealMid, fontSize: 8 }, resultTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 21, marginTop: 4 }, confidence: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, confidenceValue: { color: colors.tealDark, fontFamily: fonts.semibold, fontSize: 13 }, confidenceLabel: { ...type.label, color: colors.muted, fontSize: 6 },
  nutrition: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, value: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center' }, valueLabel: { ...type.label, color: colors.muted, fontSize: 7, marginTop: 2, textAlign: 'center' }, demoNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }, demoText: { flex: 1, color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  resultActions: { flexDirection: 'row', gap: 10, marginTop: 15 }, retake: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 19 }, retakeText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 }, confirm: { flex: 1, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.tealMid, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, confirmText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 13 },
  permission: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 30 }, permissionTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 24, marginTop: 18 }, permissionCopy: { color: '#A9C7C9', fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 }, permissionButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.tealMid, paddingHorizontal: 26, alignItems: 'center', justifyContent: 'center', marginTop: 24 }, permissionButtonText: { color: colors.white, fontFamily: fonts.semibold }, libraryLink: { color: colors.accent, fontFamily: fonts.medium, marginTop: 20 },
});
