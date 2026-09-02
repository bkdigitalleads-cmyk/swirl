import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useTheme, fonts } from '../theme';
import { PillButton } from '../components';
import { useApp } from '../state';
import {
  getOffering,
  purchasePackage,
  restorePurchases,
  isBillingAvailable,
} from '../purchases';

const FEATURES: { icon: string; title: string; sub: string }[] = [
  { icon: '🍷', title: 'Unlimited wines', sub: 'Free logs 20 wines. Pro pours are endless.' },
  { icon: '📸', title: 'Up to 6 label photos', sub: 'Front label, back label, the whole bottle.' },
  { icon: '📄', title: 'PDF tasting notebook', sub: 'A beautiful journal to keep or share.' },
  { icon: '🧾', title: 'CSV export', sub: 'Your full tasting history as a spreadsheet, anytime.' },
  { icon: '🔒', title: 'Face ID lock', sub: 'Your cellar stays your business.' },
];

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function PaywallModal({ privacyUrl }: { privacyUrl: string }) {
  const theme = useTheme();
  const { paywallVisible, hidePaywall, setIsPro } = useApp();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!paywallVisible) return;
    setLoading(true);
    (async () => {
      const off = await getOffering();
      setOffering(off);
      // Swirl is recurring-use — people log wines for years — so the annual
      // subscription is the hero and default. Lifetime is offered as a
      // secondary "pay once" anchor for the subscription-averse. The 20-wine
      // free tier is the funnel, so there's no separate time-limited trial.
      const annual =
        off?.annual ?? off?.lifetime ?? off?.availablePackages?.[0] ?? null;
      setSelected(annual);
      setLoading(false);
    })();
  }, [paywallVisible]);

  const buy = async () => {
    if (!selected) return;
    setPurchasing(true);
    const res = await purchasePackage(selected);
    setPurchasing(false);
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      Alert.alert('Welcome to Pro ✨', 'Pour freely — your journal is unlimited now.');
    } else if (!res.userCancelled && res.error) {
      Alert.alert('Purchase failed', res.error);
    }
  };

  // Annual is the hero for this recurring-use app — show it first.
  const rank = (p: PurchasesPackage) =>
    p.packageType === 'ANNUAL' ? 0 : p.packageType === 'LIFETIME' ? 1 : 2;
  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      Alert.alert('Restored', 'Your Swirl Pro purchase is active again.');
    } else if (res.ok) {
      Alert.alert(
        'No purchases found',
        'We couldn’t find a previous Swirl Pro purchase on this Apple ID.',
      );
    } else {
      Alert.alert('Restore failed', res.error ?? 'Please try again.');
    }
  };

  const packages = [...(offering?.availablePackages ?? [])].sort(
    (a, b) => rank(a) - rank(b),
  );

  // Localized prices for the always-visible disclosure below. They are blank
  // until StoreKit answers — the disclosure still renders without them.
  const annualPrice = packages.find((p) => p.packageType === 'ANNUAL')?.product
    .priceString;
  const lifetimePrice = packages.find((p) => p.packageType === 'LIFETIME')
    ?.product.priceString;

  return (
    <Modal
      visible={paywallVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={hidePaywall}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={hidePaywall} hitSlop={12} style={styles.close}>
            <Text style={[styles.closeText, { color: theme.textFaint }]}>✕</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.text }]}>
            Never forget a great wine
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Build a tasting journal you’ll actually use — every bottle rated,
            remembered, and ready when you’re back in the aisle. Unlock unlimited
            wines, the PDF notebook, and more.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                  <Text style={[styles.featureSub, { color: theme.textSecondary }]}>
                    {f.sub}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={theme.accent} />
          ) : packages.length === 0 || !isBillingAvailable() ? (
            <Text style={[styles.unavailable, { color: theme.textSecondary }]}>
              Purchases aren’t available right now. Please try again later.
            </Text>
          ) : (
            <View style={styles.packages}>
              {packages.map((p) => {
                const active = selected?.identifier === p.identifier;
                const isAnnual = p.packageType === 'ANNUAL';
                const isLifetime = p.packageType === 'LIFETIME';
                const monthly =
                  isAnnual && p.product.price
                    ? `just ${(p.product.price / 12).toLocaleString(undefined, {
                        style: 'currency',
                        currency: p.product.currencyCode ?? 'USD',
                      })}/month`
                    : null;
                return (
                  <Pressable
                    key={p.identifier}
                    onPress={() => setSelected(p)}
                    style={[
                      styles.pkg,
                      {
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? theme.accentSoft : theme.card,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pkgTitle, { color: theme.text }]}>
                        {isAnnual ? 'Yearly' : isLifetime ? 'Lifetime' : p.product.title}
                      </Text>
                      {isAnnual && (
                        <Text style={[styles.pkgBadge, { color: theme.accent }]}>
                          {monthly ? `Best value · ${monthly}` : 'Best value · billed yearly'}
                        </Text>
                      )}
                      {isLifetime && (
                        <Text style={[styles.pkgBadge, { color: theme.textSecondary }]}>
                          Or pay once, yours forever
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.pkgPrice, { color: theme.text }]}>
                      {p.product.priceString}
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        {isAnnual ? '/yr' : isLifetime ? '' : '/mo'}
                      </Text>
                    </Text>
                  </Pressable>
                );
              })}
              <PillButton
                theme={theme}
                label={purchasing ? 'One moment…' : 'Continue'}
                onPress={buy}
                disabled={purchasing || !selected}
              />
              {selected?.packageType === 'LIFETIME' && (
                <Text style={[styles.noPayment, { color: theme.success }]}>
                  ✓ One-time purchase — no subscription
                </Text>
              )}
              <Text style={[styles.fine, { color: theme.textFaint }]}>
                Subscriptions auto-renew until cancelled. Cancel anytime in Settings.{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
                  Terms
                </Text>{' '}
                ·{' '}
                <Text style={styles.link} onPress={() => Linking.openURL(privacyUrl)}>
                  Privacy
                </Text>
              </Text>
            </View>
          )}
        </ScrollView>

        {/*
          App Review guideline 3.1.2(c): the subscription's title, length, price
          and functional Terms of Use (EULA) + Privacy Policy links must be in
          the app itself. This block sits OUTSIDE the ScrollView and OUTSIDE the
          "offering loaded" branch on purpose — it stays on screen without
          scrolling and still renders if StoreKit returns no products.
          (Pattern validated by the StuffKeep approval.)
        */}
        <View
          style={[
            styles.legal,
            { borderTopColor: theme.border, backgroundColor: theme.bg },
          ]}
        >
          <Text style={[styles.legalText, { color: theme.textSecondary }]}>
            Swirl Pro — Yearly{annualPrice ? ` ${annualPrice}` : ''}, an
            auto-renewing subscription billed once per year until cancelled; or
            Lifetime{lifetimePrice ? ` ${lifetimePrice}` : ''}, a one-time
            purchase. Cancel anytime in your Apple ID settings.
          </Text>
          <View style={styles.legalLinks}>
            <Text
              style={[styles.legalLink, { color: theme.accent }]}
              onPress={onRestore}
            >
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
            <Text style={[styles.legalDot, { color: theme.textFaint }]}>·</Text>
            <Text
              style={[styles.legalLink, { color: theme.accent }]}
              onPress={() => Linking.openURL(TERMS_URL)}
            >
              Terms of Use (EULA)
            </Text>
            <Text style={[styles.legalDot, { color: theme.textFaint }]}>·</Text>
            <Text
              style={[styles.legalLink, { color: theme.accent }]}
              onPress={() => Linking.openURL(privacyUrl)}
            >
              Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 20, paddingBottom: 40 },
  close: { alignSelf: 'flex-end', padding: 4 },
  closeText: { fontSize: 22 },
  title: {
    fontSize: 28,
    fontWeight: fonts.weight.bold,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: { fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 24 },
  features: { gap: 16, marginBottom: 28 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: { fontSize: 22 },
  featureTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  featureSub: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  packages: { gap: 12 },
  pkg: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
  },
  pkgTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  pkgBadge: { fontSize: 12, fontWeight: fonts.weight.semibold, marginTop: 2 },
  pkgPrice: { fontSize: 17, fontWeight: fonts.weight.bold },
  unavailable: { textAlign: 'center', marginVertical: 24, fontSize: 15 },
  noPayment: { fontSize: 13, textAlign: 'center', fontWeight: fonts.weight.semibold },
  fine: { fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: 4 },
  link: { textDecorationLine: 'underline' },
  legal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
    gap: 6,
  },
  legalText: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: fonts.weight.semibold,
    textDecorationLine: 'underline',
  },
  legalDot: { fontSize: 12 },
});
