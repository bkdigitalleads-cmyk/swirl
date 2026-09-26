import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, fonts } from './src/theme';
import { AppProvider, useApp } from './src/state';
import LockGate from './src/LockGate';
import HomeScreen from './src/screens/Home';
import ReportScreen from './src/screens/Report';
import SettingsScreen from './src/screens/Settings';
import TastingFormModal from './src/screens/TastingForm';
import PaywallModal from './src/screens/Paywall';
import Onboarding from './src/screens/Onboarding';

const ONBOARDED_KEY = 'swirl.onboarded.v1';

const PRIVACY_URL = 'https://bkdigitalleads-cmyk.github.io/swirl/privacy.html';

type Tab = 'wines' | 'notebook' | 'settings';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'wines', label: 'Wines', icon: '🍷' },
  { key: 'notebook', label: 'Notebook', icon: '📄' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, isPro, showPaywall, paywallVisible } = useApp();
  const [tab, setTab] = useState<Tab>('wines');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // Onboarding order: paywall first, then the setup and attribution questions.
  const [paywallShown, setPaywallShown] = useState(false);
  const paywallOpened = useRef(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((v) => setOnboarded(v === '1'))
      .catch(() => setOnboarded(true)); // fail open: never trap the user
  }, []);

  // Paywall in onboarding, before anything else (Young, Gate 3).
  useEffect(() => {
    if (!ready || onboarded !== false || paywallOpened.current) return;
    paywallOpened.current = true;
    if (isPro) {
      setPaywallShown(true);
      return;
    }
    showPaywall();
  }, [ready, onboarded, isPro, showPaywall]);

  // When the paywall closes (purchase or ✕), move on to the setup questions.
  useEffect(() => {
    if (paywallOpened.current && !paywallVisible) setPaywallShown(true);
  }, [paywallVisible]);

  const finishOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
  };

  const openNewTasting = () => {
    setEditingId(null);
    setFormVisible(true);
  };

  const openTasting = (id: number) => {
    setEditingId(id);
    setFormVisible(true);
  };

  if (!ready || onboarded === null) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        {paywallShown ? <Onboarding onDone={finishOnboarding} /> : null}
        <PaywallModal privacyUrl={PRIVACY_URL} />
      </View>
    );
  }

  return (
    <LockGate>
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <View style={{ flex: 1 }}>
          {tab === 'wines' && <HomeScreen onAddTasting={openNewTasting} onOpenTasting={openTasting} />}
          {tab === 'notebook' && <ReportScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </View>
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabIcon, { opacity: active ? 1 : 0.45 }]}>
                  {t.icon}
                </Text>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? theme.accent : theme.textFaint },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TastingFormModal
          visible={formVisible}
          tastingId={editingId}
          onClose={() => setFormVisible(false)}
        />
        <PaywallModal privacyUrl={PRIVACY_URL} />
      </View>
    </LockGate>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, fontWeight: fonts.weight.medium },
});
