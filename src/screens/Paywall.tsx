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

// Copy lever 1: the word "free" sits next to a feature.
const FEATURES: { icon: string; title: string; sub: string; free?: boolean }[] = [
  { icon: '🍷', title: 'Rate every wine you taste', sub: 'Stars, notes, and the label photo.', free: true },
  { icon: '♾️', title: 'Unlimited wines', sub: 'Free logs 20 wines. Pro pours are endless.' },
  { icon: '📸', title: 'Up to 6 label photos', sub: 'Front label, back label, the whole bottle.' },
  { icon: '📄', title: 'PDF tasting notebook', sub: 'A beautiful journal to keep or share.' },
  { icon: '🔒', title: 'Face ID lock', sub: 'Your cellar stays your business.' },
];

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

function trialLabel(pkg: PurchasesPackage | undefined): string | null {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const n = intro.periodNumberOfUnits;
  const unit = intro.periodUnit.toLowerCase();
  return `${n} ${unit}${n === 1 ? '' : 's'} free`;
}

function perUnit(pkg: PurchasesPackage | undefined, unit: 'week' | 'year'): string {
  return pkg ? `${pkg.product.priceString}/${unit}` : '';
}

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
      // Weekly with 3 days free is the primary plan (Young: weekly beat yearly 3x).
      const primary =
        off?.weekly ?? off?.annual ?? off?.lifetime ?? off?.availablePackages?.[0] ?? null;
      setSelected(primary);
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
      Alert.alert('You’re all set', 'Pour freely, your journal is unlimited now.');
    } else if (!res.userCancelled && res.error) {
      Alert.alert('Purchase failed', res.error);
    }
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      Alert.alert('Restored', 'Your Pro purchase is active again.');
    } else if (res.ok) {
      Alert.alert('No purchases found', 'We couldn’t find a previous Pro purchase on this Apple ID.');
    } else {
      Alert.alert('Restore failed', res.error ?? 'Please try again.');
    }
  };

  // Order: Weekly (primary), Yearly, Lifetime (anchor).
  const rank = (p: PurchasesPackage) =>
    p.packageType === 'WEEKLY' ? 0 : p.packageType === 'ANNUAL' ? 1 : p.packageType === 'LIFETIME' ? 2 : 3;
  const packages = [...(offering?.availablePackages ?? [])].sort((a, b) => rank(a) - rank(b));

  const weeklyPkg = packages.find((p) => p.packageType === 'WEEKLY');
  const annualPkg = packages.find((p) => p.packageType === 'ANNUAL');
  const lifetimePkg = packages.find((p) => p.packageType === 'LIFETIME');
  const weeklyTrial = trialLabel(weeklyPkg);
  const annualTrial = trialLabel(annualPkg);

  const fmt = (n: number, cur?: string) =>
    n.toLocaleString(undefined, { style: 'currency', currency: cur ?? 'USD' });
  // Copy lever 4: the yearly-equivalent / per-month price next to the plan.
  const annualPerMonth = annualPkg?.product.price
    ? `${fmt(annualPkg.product.price / 12, annualPkg.product.currencyCode)}/mo`
    : null;
  const weeklyPerYear = weeklyPkg?.product.price
    ? `${fmt(weeklyPkg.product.price * 52, weeklyPkg.product.currencyCode)}/yr`
    : null;

  // Always-visible 3.1.2(c) disclosure, built from whatever StoreKit returned.
  const disclosureParts: string[] = [];
  if (weeklyPkg)
    disclosureParts.push(
      `Weekly ${perUnit(weeklyPkg, 'week')} is an auto-renewing subscription billed once per week until cancelled${
        weeklyTrial ? `; it starts with ${weeklyTrial} and you are not charged until the trial ends` : ''
      }.`
    );
  if (annualPkg)
    disclosureParts.push(
      `Yearly ${perUnit(annualPkg, 'year')} is an auto-renewing subscription billed once per year until cancelled${
        annualTrial ? `; it starts with ${annualTrial} and you are not charged until the trial ends` : ''
      }.`
    );
  if (lifetimePkg) disclosureParts.push(`Lifetime ${lifetimePkg.product.priceString} is a one-time purchase.`);
  const disclosure =
    (disclosureParts.length > 0
      ? disclosureParts.join(' ')
      : 'Pro is offered as a Weekly or Yearly auto-renewing subscription, or a one-time Lifetime purchase.') +
    ' Cancel anytime in your Apple ID settings.';

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
            Never forget{'\n'}a great wine
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Start with {weeklyTrial ?? '3 days free'}. Every bottle rated, remembered, and ready when you are back in the aisle.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.featureTitleRow}>
                    <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                    {f.free && (
                      <View style={[styles.freeTag, { backgroundColor: theme.accentSoft }]}>
                        <Text style={[styles.freeTagText, { color: theme.accent }]}>FREE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.featureSub, { color: theme.textSecondary }]}>{f.sub}</Text>
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
                const isWeekly = p.packageType === 'WEEKLY';
                const title = isWeekly ? 'Weekly' : isAnnual ? 'Yearly' : isLifetime ? 'Lifetime' : p.product.title;
                // 3.1.2(c) on the row itself: trial length, then the price after it.
                const line = isWeekly
                  ? weeklyTrial
                    ? `${weeklyTrial}, then ${p.product.priceString}/week`
                    : `${p.product.priceString}/week`
                  : isAnnual
                    ? `${annualTrial ? `${annualTrial}, then ` : ''}${p.product.priceString}/year${annualPerMonth ? ` · ${annualPerMonth}` : ''}`
                    : isLifetime
                      ? 'Pay once, keep forever'
                      : '';
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
                      <View style={styles.pkgTitleRow}>
                        <Text style={[styles.pkgTitle, { color: theme.text }]}>{title}</Text>
                        {isWeekly && (
                          <View style={[styles.popular, { backgroundColor: theme.accent }]}>
                            <Text style={styles.popularText}>MOST POPULAR</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.pkgLine, { color: isWeekly || isAnnual ? theme.accent : theme.textSecondary }]}>
                        {line}
                      </Text>
                      {isWeekly && weeklyPerYear && (
                        <Text style={[styles.pkgEquiv, { color: theme.textFaint }]}>{weeklyPerYear} if kept all year</Text>
                      )}
                    </View>
                    <Text style={[styles.pkgPrice, { color: theme.text }]}>
                      {p.product.priceString}
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        {isAnnual ? '/yr' : isWeekly ? '/wk' : ''}
                      </Text>
                    </Text>
                  </Pressable>
                );
              })}
              {/* Copy lever 2: the button says Continue, never Subscribe. */}
              <PillButton
                theme={theme}
                label={purchasing ? 'One moment…' : 'Continue'}
                onPress={buy}
                disabled={purchasing || !selected}
              />
              {/* Copy lever 3: "No payment now" on trial tiers. */}
              {selected?.packageType === 'LIFETIME' ? (
                <Text style={[styles.noPayment, { color: theme.success }]}>✓ One-time purchase, no subscription</Text>
              ) : selected?.product.introPrice?.price === 0 ? (
                <Text style={[styles.noPayment, { color: theme.success }]}>✓ No payment now</Text>
              ) : null}
            </View>
          )}
        </ScrollView>

        {/*
          App Review guideline 3.1.2(c): title, length, price and functional
          Terms of Use (EULA) + Privacy Policy links live in the app itself.
          Outside the ScrollView and outside the "offering loaded" branch on
          purpose: visible without scrolling, rendered even with no products.
        */}
        <View style={[styles.legal, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <Text style={[styles.legalText, { color: theme.textSecondary }]}>
            Swirl Pro. {disclosure}
          </Text>
          <View style={styles.legalLinks}>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={onRestore}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
            <Text style={[styles.legalDot, { color: theme.textFaint }]}>·</Text>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={() => Linking.openURL(TERMS_URL)}>
              Terms of Use (EULA)
            </Text>
            <Text style={[styles.legalDot, { color: theme.textFaint }]}>·</Text>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={() => Linking.openURL(privacyUrl)}>
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
  title: { fontSize: 28, fontWeight: fonts.weight.bold, letterSpacing: -0.5, marginTop: 8 },
  subtitle: { fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 22 },
  features: { gap: 14, marginBottom: 24 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  featureIcon: { fontSize: 22 },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  featureSub: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  freeTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  freeTagText: { fontSize: 10, fontWeight: fonts.weight.bold, letterSpacing: 0.5 },
  packages: { gap: 12 },
  pkg: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: 16 },
  pkgTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pkgTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  popular: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  popularText: { fontSize: 9, fontWeight: fonts.weight.bold, color: '#FFFFFF', letterSpacing: 0.5 },
  pkgLine: { fontSize: 12, fontWeight: fonts.weight.semibold, marginTop: 3 },
  pkgEquiv: { fontSize: 11, marginTop: 2 },
  pkgPrice: { fontSize: 17, fontWeight: fonts.weight.bold, marginLeft: 10 },
  unavailable: { textAlign: 'center', marginVertical: 24, fontSize: 15 },
  noPayment: { fontSize: 13, textAlign: 'center', fontWeight: fonts.weight.semibold },
  legal: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26, gap: 6 },
  legalText: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
  legalLink: { fontSize: 12, fontWeight: fonts.weight.semibold, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12 },
});
