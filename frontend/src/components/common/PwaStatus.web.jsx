import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isInstalled, isIOS, registerPwa } from '../../services/pwa/registration';

export default function PwaStatus() {
  const updateRequested = useRef(false);
  const [installed, setInstalled] = useState(isInstalled);
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [prompt, setPrompt] = useState(null);
  const [waiting, setWaiting] = useState(null);
  useEffect(() => {
    let stopped = false;
    const onOffline = () => setOffline(true), onOnline = () => setOffline(false);
    const onPrompt = (event) => { event.preventDefault(); setPrompt(event); };
    const onInstalled = () => setInstalled(true);
    const reload = () => { if (updateRequested.current) window.location.reload(); };
    window.addEventListener('offline', onOffline); window.addEventListener('online', onOnline);
    window.addEventListener('beforeinstallprompt', onPrompt); window.addEventListener('appinstalled', onInstalled);
    navigator.serviceWorker?.addEventListener('controllerchange', reload);
    registerPwa().then((registration) => {
      if (stopped) return;
      if (registration.waiting) setWaiting(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (!stopped && worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
    }).catch(() => {});
    return () => {
      stopped = true;
      window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled);
      navigator.serviceWorker?.removeEventListener('controllerchange', reload);
    };
  }, []);
  const install = async () => {
    if (!prompt) { setInstructions(true); return; }
    await prompt.prompt(); const choice = await prompt.userChoice;
    setPrompt(null); if (choice.outcome === 'accepted') setInstalled(true);
  };
  if (offline) return <View style={styles.bar}><Text accessibilityLiveRegion="polite" style={styles.text}>You are offline. Saved pages are available; reconnect to post meals or refresh.</Text></View>;
  if (waiting) return <View style={styles.bar}><Text style={styles.text}>A new version of Mr_Care is ready. Finish any unsaved changes before updating.</Text><Pressable accessibilityRole="button" onPress={() => { updateRequested.current = true; waiting.postMessage({ type: 'SKIP_WAITING' }); }} style={styles.button}><Text style={styles.action}>Update</Text></Pressable></View>;
  if (installed || dismissed) return null;
  return <View style={styles.bar}>
    <Text style={styles.text}>{instructions ? isIOS() ? 'In Safari, tap Share > Add to Home Screen, then open Mr_Care from its icon. Enable notifications inside the installed app.' : 'Use your browser menu: Install app or Add to Home Screen.' : 'Add Mr_Care to your Home Screen for easy access and reminders.'}</Text>
    {!instructions ? <Pressable accessibilityRole="button" onPress={install} style={styles.button}><Text style={styles.action}>Install</Text></Pressable> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss install guidance" onPress={() => setDismissed(true)} style={styles.button}><Text style={styles.action}>Dismiss</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 12, paddingTop: 16, backgroundColor: '#E3F2EF' },
  text: { flex: 1, minWidth: 180, fontSize: 12, lineHeight: 18, color: '#002E36' },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  action: { color: '#007077', fontWeight: '600', fontSize: 12 },
});
