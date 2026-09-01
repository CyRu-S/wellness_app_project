import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { colors, fonts, type } from '../../theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080/api';
const EMPTY_POST = {};

const imageUriFor = (post) => post?.imageUrl || post?.imageUri || (post?.postId ? `/api/meal-posts/${post.postId}/image` : null);

const resolveSource = (post, token) => {
  const rawUri = imageUriFor(post);
  if (!rawUri) return null;
  if (typeof rawUri !== 'string') return rawUri;
  let uri = rawUri;
  if (!/^(https?:|file:|data:|blob:)/i.test(rawUri)) {
    const origin = API_URL.replace(/\/api\/?$/, '');
    uri = rawUri.startsWith('/api/') ? `${origin}${rawUri}` : `${API_URL.replace(/\/$/, '')}/${rawUri.replace(/^\//, '')}`;
  }
  return { uri, ...(token && /^https?:/i.test(uri) ? { headers: { Authorization: `Bearer ${token}` } } : {}) };
};

const formatClock = (value) => {
  if (!value) return 'today';
  if (/^\d{2}:\d{2}/.test(value)) {
    const [hour, minute] = value.split(':').map(Number);
    const stamp = new Date();
    stamp.setHours(hour, minute, 0, 0);
    return stamp.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export default function SharedPhotoScreen({ navigation, route }) {
  const token = useSelector((state) => state.auth.token);
  const post = route.params?.post || EMPTY_POST;
  const memberName = route.params?.memberName || 'Member';
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const source = useMemo(() => resolveSource(post, token), [post, token]);
  const nutrition = post.nutrition || {};
  const calories = Number(nutrition.calories ?? post.calories) || 0;
  const protein = Number(nutrition.proteinGrams ?? post.proteinGrams ?? post.protein) || 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close meal photo" onPress={() => navigation.goBack()} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={23} color={colors.white} />
        </Pressable>
        <View style={styles.topCopy}><Text numberOfLines={1} style={styles.topTitle}>{post.type || 'Meal check-in'}</Text><Text numberOfLines={1} style={styles.topMeta}>{memberName} · Read only</Text></View>
        <View style={styles.lock}><Ionicons name="lock-closed" size={16} color={colors.accent} /></View>
      </View>

      <View style={styles.photoStage}>
        {source && !failed ? (
          <Image
            accessibilityLabel={`${post.type || 'Meal'} photo posted by ${memberName}`}
            source={source}
            resizeMode="contain"
            style={styles.photo}
            onLoadStart={() => { setLoading(true); setFailed(false); }}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }}
          />
        ) : null}
        {loading && source && !failed ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.accent} /><Text style={styles.loadingText}>Loading protected photo…</Text></View> : null}
        {(!source || failed) ? <View style={styles.failed}><View style={styles.failedIcon}><Ionicons name="image-outline" size={31} color={colors.accent} /></View><Text style={styles.failedTitle}>Photo unavailable</Text><Text style={styles.failedText}>This protected image could not be loaded. Return to the member’s timeline and try again.</Text></View> : null}
      </View>

      <View style={styles.caption}>
        <LinearGradient colors={['rgba(3,35,36,0)', '#042D2D']} style={styles.captionFade} />
        <Text style={styles.captionLabel}>TODAY’S CHECK-IN</Text>
        <Text style={styles.captionTitle}>{post.name || 'Meal post'}</Text>
        <Text style={styles.captionMeta}>Posted {formatClock(post.postedAt || post.uploadedAt)}{post.scheduledTime ? ` · Planned ${formatClock(post.scheduledTime)}` : ''}</Text>
        <View style={styles.nutrition}>
          <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{calories}</Text><Text style={styles.nutritionLabel}>KCAL</Text></View>
          <View style={styles.nutritionRule} />
          <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{protein}g</Text><Text style={styles.nutritionLabel}>PROTEIN</Text></View>
          <View style={styles.privateNote}><Ionicons name="eye-outline" size={15} color="#B9D8D3" /><Text style={styles.privateText}>TODAY ONLY</Text></View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#032727' },
  topBar: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, zIndex: 3 },
  closeButton: { width: 44, height: 44, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  topCopy: { flex: 1, paddingHorizontal: 13 },
  topTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
  topMeta: { color: '#B7D8D3', fontFamily: fonts.medium, fontSize: 11, marginTop: 3 },
  lock: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(39,195,178,0.12)', alignItems: 'center', justifyContent: 'center' },
  photoStage: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 13 },
  loadingText: { color: '#B9D8D3', fontFamily: fonts.medium, fontSize: 11 },
  failed: { alignItems: 'center', paddingHorizontal: 36 },
  failedIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: 'rgba(39,195,178,0.12)', alignItems: 'center', justifyContent: 'center' },
  failedTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 20, marginTop: 17 },
  failedText: { color: '#9EC4BF', fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  caption: { paddingHorizontal: 22, paddingTop: 21, paddingBottom: 17, backgroundColor: '#042D2D', zIndex: 2 },
  captionFade: { position: 'absolute', left: 0, right: 0, height: 74, top: -74 },
  captionLabel: { ...type.label, color: colors.accent, fontSize: 11 },
  captionTitle: { color: colors.white, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, marginTop: 5 },
  captionMeta: { color: '#BBD8D4', fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: 5 },
  nutrition: { minHeight: 64, flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  nutritionItem: { minWidth: 65 },
  nutritionValue: { color: colors.white, fontFamily: fonts.semibold, fontSize: 17 },
  nutritionLabel: { color: '#A9CFCA', fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14, letterSpacing: 0.6, marginTop: 2 },
  nutritionRule: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 13 },
  privateNote: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  privateText: { ...type.label, color: '#CBE4E0', fontSize: 10 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
});
