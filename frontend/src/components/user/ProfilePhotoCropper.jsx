import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, shadows, type } from '../../theme';
import { cropProfilePhoto } from '../../utils/profilePhoto';

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

const geometryFor = (photo, viewportSize, zoom) => {
  const baseScale = Math.max(viewportSize / photo.width, viewportSize / photo.height);
  const renderedScale = baseScale * zoom;
  const width = photo.width * renderedScale;
  const height = photo.height * renderedScale;
  return { width, height, maxX: Math.max(0, (width - viewportSize) / 2), maxY: Math.max(0, (height - viewportSize) / 2) };
};

export default function ProfilePhotoCropper({ photo, onCancel, onConfirm }) {
  const { width: screenWidth } = useWindowDimensions();
  const viewportSize = Math.min(280, screenWidth - 72);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const photoRef = useRef(photo);
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  const viewportRef = useRef(viewportSize);
  const dragStart = useRef({ x: 0, y: 0 });

  photoRef.current = photo;
  zoomRef.current = zoom;
  offsetRef.current = offset;
  viewportRef.current = viewportSize;

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError('');
  }, [photo]);

  const constrainedOffset = (nextOffset, nextZoom = zoomRef.current) => {
    const geometry = geometryFor(photoRef.current, viewportRef.current, nextZoom);
    return { x: clamp(nextOffset.x, -geometry.maxX, geometry.maxX), y: clamp(nextOffset.y, -geometry.maxY, geometry.maxY) };
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
    onPanResponderGrant: () => { dragStart.current = offsetRef.current; },
    onPanResponderMove: (_, gesture) => {
      const next = constrainedOffset({ x: dragStart.current.x + gesture.dx, y: dragStart.current.y + gesture.dy });
      offsetRef.current = next;
      setOffset(next);
    },
  })).current;

  if (!photo) return null;
  const geometry = geometryFor(photo, viewportSize, zoom);
  const changeZoom = (amount) => {
    const nextZoom = clamp(Number((zoom + amount).toFixed(2)), 1, 3);
    const nextOffset = constrainedOffset(offset, nextZoom);
    zoomRef.current = nextZoom;
    offsetRef.current = nextOffset;
    setZoom(nextZoom);
    setOffset(nextOffset);
  };
  const reset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };
  const confirm = async () => {
    if (processing) return;
    setProcessing(true);
    setError('');
    try {
      onConfirm(await cropProfilePhoto(photo, { viewportSize, zoom, offset }));
    } catch (cropError) {
      setError(cropError.message || 'The photo could not be cropped. Please choose another image.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}><View><Text style={styles.eyebrow}>PROFILE PICTURE</Text><Text style={styles.title}>Crop your photo</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close cropper" onPress={onCancel} style={styles.close}><Ionicons name="close" size={20} color={colors.ink} /></Pressable></View>
          <Text style={styles.hint}>Drag to reposition, then zoom until your photo fits the square.</Text>
          <View {...panResponder.panHandlers} style={[styles.viewport, { width: viewportSize, height: viewportSize }]}>
            <Image source={{ uri: photo.uri }} resizeMode="cover" style={{ position: 'absolute', width: geometry.width, height: geometry.height, left: (viewportSize - geometry.width) / 2 + offset.x, top: (viewportSize - geometry.height) / 2 + offset.y }} />
            <View pointerEvents="none" style={styles.cropBorder} />
            <View pointerEvents="none" style={[styles.gridLine, styles.gridVerticalOne]} /><View pointerEvents="none" style={[styles.gridLine, styles.gridVerticalTwo]} />
            <View pointerEvents="none" style={[styles.gridLine, styles.gridHorizontalOne]} /><View pointerEvents="none" style={[styles.gridLine, styles.gridHorizontalTwo]} />
          </View>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => changeZoom(-0.15)} style={styles.control}><Ionicons name="remove" size={20} color={colors.tealDark} /></Pressable>
            <View style={styles.zoomCopy}><Ionicons name="search-outline" size={17} color={colors.muted} /><Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => changeZoom(0.15)} style={styles.control}><Ionicons name="add" size={20} color={colors.tealDark} /></Pressable>
            <Pressable accessibilityRole="button" onPress={reset} style={styles.reset}><Text style={styles.resetText}>Reset</Text></Pressable>
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}><Pressable accessibilityRole="button" disabled={processing} onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable accessibilityRole="button" disabled={processing} onPress={confirm} style={[styles.confirm, processing && styles.disabled]}>{processing ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.confirmText}>Use photo</Text><Ionicons name="checkmark" size={18} color={colors.white} /></>}</Pressable></View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(8,56,61,0.72)' },
  sheet: { width: '100%', maxWidth: 390, padding: 20, borderRadius: radius.xl, backgroundColor: colors.paper, ...shadows.raised },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { ...type.label, color: colors.tealMid, fontSize: 9 },
  title: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 24, lineHeight: 29, marginTop: 3 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  hint: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 16 },
  viewport: { alignSelf: 'center', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.ink },
  cropBorder: { ...StyleSheet.absoluteFillObject, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.white },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.42)' },
  gridVerticalOne: { top: 0, bottom: 0, left: '33.33%', width: StyleSheet.hairlineWidth },
  gridVerticalTwo: { top: 0, bottom: 0, left: '66.66%', width: StyleSheet.hairlineWidth },
  gridHorizontalOne: { left: 0, right: 0, top: '33.33%', height: StyleSheet.hairlineWidth },
  gridHorizontalTwo: { left: 0, right: 0, top: '66.66%', height: StyleSheet.hairlineWidth },
  controls: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 },
  control: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  zoomCopy: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  zoomText: { minWidth: 38, color: colors.ink, fontFamily: fonts.semibold, fontSize: 12 },
  reset: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 10 },
  resetText: { color: colors.tealMid, fontFamily: fonts.semibold, fontSize: 12 },
  error: { color: colors.danger, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancel: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  cancelText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 14 },
  confirm: { flex: 1.4, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, backgroundColor: colors.tealMid },
  confirmText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
  disabled: { opacity: 0.55 },
});
