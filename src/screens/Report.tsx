import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts } from '../theme';
import { Card, PillButton, ProBadge, SectionTitle } from '../components';
import { useApp } from '../state';
import { getStats, Stats, exportCsv } from '../db';
import { generateAndSharePdf } from '../report';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export default function ReportScreen() {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getStats().then(setStats);
  }, [dataVersion]);

  const requirePro = (fn: () => void) => () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    fn();
  };

  const onPdf = requirePro(async () => {
    if ((stats?.tastingCount ?? 0) === 0) {
      Alert.alert('Nothing to export yet', 'Log a few wines first, then create your notebook.');
      return;
    }
    try {
      setBusy(true);
      await generateAndSharePdf();
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  });

  const onCsv = requirePro(async () => {
    try {
      setBusy(true);
      const csv = await exportCsv();
      const file = new File(Paths.cache, 'swirl-tastings.csv');
      if (file.exists) file.delete();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export your tastings',
        });
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  });

  const avg = (stats?.ratedCount ?? 0) > 0 ? (stats?.avgRating ?? 0).toFixed(1) : '—';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={[styles.title, { color: theme.text }]}>Your notebook</Text>
      <Text style={[styles.sub, { color: theme.textSecondary }]}>
        Every wine you’ve tasted — labels, ratings, producers, regions and notes — as a
        beautiful PDF to keep or share, or a spreadsheet you own.
      </Text>

      <Card theme={theme} style={styles.statsCard}>
        <View style={styles.statRow}>
          <Stat label="Wines" value={String(stats?.tastingCount ?? 0)} theme={theme} />
          <Stat label="Avg rating" value={avg} theme={theme} />
          <Stat label="Buy again" value={String(stats?.wouldBuyCount ?? 0)} theme={theme} />
        </View>
      </Card>

      <SectionTitle theme={theme}>Export</SectionTitle>
      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.exportTitleRow}>
              <Text style={[styles.exportTitle, { color: theme.text }]}>PDF notebook</Text>
              {!isPro && <ProBadge theme={theme} />}
            </View>
            <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
              A polished tasting journal with label photos, grouped by type — great to share
              with friends or bring to the wine shop.
            </Text>
          </View>
        </View>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Create PDF'} onPress={onPdf} disabled={busy} />
      </Card>

      <Card theme={theme} style={styles.exportCard}>
        <View style={styles.exportRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.exportTitleRow}>
              <Text style={[styles.exportTitle, { color: theme.text }]}>CSV spreadsheet</Text>
              {!isPro && <ProBadge theme={theme} />}
            </View>
            <Text style={[styles.exportBody, { color: theme.textSecondary }]}>
              Every tasting as a spreadsheet — your data, yours to keep and back up.
            </Text>
          </View>
        </View>
        <PillButton theme={theme} label={busy ? 'Working…' : 'Export CSV'} onPress={onCsv} disabled={busy} kind="ghost" />
      </Card>

      <Text style={[styles.tip, { color: theme.textFaint }]}>
        Tip: snap the label the moment you open a bottle — you’ll never blank on “what was that
        great one?” again.
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  sub: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  statsCard: { marginTop: 16, paddingVertical: 16 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: fonts.weight.bold },
  statLabel: { fontSize: 12, marginTop: 2 },
  exportCard: { marginBottom: 12, gap: 12 },
  exportRow: { flexDirection: 'row' },
  exportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  exportBody: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  tip: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
});
