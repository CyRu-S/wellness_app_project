import React, { useCallback, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LocalizedText as Text } from '../common/LocalizedText';
import { loadHydrationStatus, nudgeClubHydration } from '../../store/slices/adminSlice';
import { adminColors, adminFonts } from '../../theme/admin';

// Keep the countdown local so charts and member lists do not render each second.
export default function ClubHydrationReminder() {
  const dispatch = useDispatch();
  const hydrationNudge = useSelector((state) => state.admin.hydrationNudge);
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => {
    if (hydrationNudge.status === 'loading') return undefined;
    const sync = () => { if ((!AppState.currentState || AppState.currentState === 'active') && (typeof document === 'undefined' || !document.hidden)) dispatch(loadHydrationStatus()); };
    sync();
    const timer = setInterval(sync, 30000);
    return () => clearInterval(timer);
  }, [dispatch, hydrationNudge.status]));
  useFocusEffect(useCallback(() => {
    if (!hydrationNudge.availableAt) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (!(Date.parse(hydrationNudge.availableAt) > timestamp)) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [hydrationNudge.availableAt]));
  const remaining = Math.max(0, Math.ceil((Date.parse(hydrationNudge.availableAt) - now) / 1000)) || 0;
  const hydrationDisabled = hydrationNudge.status === 'loading' || remaining > 0;
  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const sendHydrationReminder = () => dispatch(nudgeClubHydration());
  return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send a hydration reminder to all active members"
          accessibilityState={{ busy: hydrationNudge.status === 'loading', disabled: hydrationDisabled }}
          disabled={hydrationDisabled}
          onPress={sendHydrationReminder}
          style={({ pressed }) => [styles.hydrationAction, pressed && styles.pressed]}
        >
          <View style={styles.hydrationIcon}><Ionicons name="water" size={21} color={adminColors.white} /></View>
          <View style={styles.hydrationCopy}>
            <Text style={styles.hydrationLabel}>CLUB HYDRATION</Text>
            <Text style={styles.hydrationTitle}>{hydrationNudge.status === 'loading' ? 'Sending reminder…' : remaining ? `${hydrationNudge.notified > 0 ? 'Reminder sent' : 'On cooldown'} · ${countdown}` : 'Remind every member'}</Text>
            <Text accessibilityLiveRegion="polite" style={styles.hydrationMeta}>{hydrationNudge.error
              ? `${hydrationNudge.error} Check the status before trying again.`
              : remaining ? 'Reminders unlock automatically after 30 minutes.' : 'One notification reaches all active members.'}</Text>
          </View>
          <Ionicons name="notifications-outline" size={21} color={adminColors.deepTeal} />
        </Pressable>
  );
}

const styles = StyleSheet.create({
  hydrationAction: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14, padding: 14, borderRadius: 22, backgroundColor: adminColors.aqua, borderWidth: 1, borderColor: '#C4E2DC' },
  hydrationIcon: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.teal },
  hydrationCopy: { flex: 1, minWidth: 0 },
  hydrationLabel: { color: adminColors.teal, fontFamily: adminFonts.semibold, fontSize: 10, letterSpacing: 1 },
  hydrationTitle: { color: adminColors.ink, fontFamily: adminFonts.semibold, fontSize: 16, marginTop: 2 },
  hydrationMeta: { color: adminColors.muted, fontFamily: adminFonts.regular, fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.68 },
});
