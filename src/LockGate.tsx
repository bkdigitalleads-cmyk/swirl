import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme, fonts } from './theme';
import { PillButton } from './components';
import { useApp } from './state';

/**
 * When Face ID lock is enabled, blurs the app behind an unlock screen
 * on launch and whenever the app returns from background.
 */
export default function LockGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { settings, ready } = useApp();
  const [locked, setLocked] = useState(settings.lockEnabled);
  const [authInFlight, setAuthInFlight] = useState(false);
  const wasBackground = useRef(false);

  const unlock = useCallback(async () => {
    if (authInFlight) return;
    setAuthInFlight(true);
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your journal',
      });
      if (res.success) setLocked(false);
    } finally {
      setAuthInFlight(false);
    }
  }, [authInFlight]);

  // Lock state must follow the setting once loaded.
  useEffect(() => {
    if (!ready) return;
    setLocked(settings.lockEnabled);
    if (settings.lockEnabled) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.lockEnabled]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wasBackground.current = true;
        if (settings.lockEnabled) setLocked(true);
      } else if (state === 'active' && wasBackground.current) {
        wasBackground.current = false;
        if (settings.lockEnabled) unlock();
      }
    });
    return () => sub.remove();
  }, [settings.lockEnabled, unlock]);

  if (!settings.lockEnabled || !locked) return <>{children}</>;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={[styles.title, { color: theme.text }]}>Swirl is locked</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Your tasting journal is protected with Face ID.
      </Text>
      <View style={{ marginTop: 20 }}>
        <PillButton theme={theme} label="Unlock" onPress={unlock} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: fonts.weight.bold },
  sub: { fontSize: 15, marginTop: 6, textAlign: 'center' },
});
