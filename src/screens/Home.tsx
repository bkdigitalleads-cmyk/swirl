import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, fonts } from '../theme';
import { Card, Stars } from '../components';
import { useApp, FREE_TASTING_LIMIT } from '../state';
import { getTastings, getStats, Tasting, Stats, WineType, WINE_TYPES } from '../db';
import { photoUri } from '../photos';
import { formatCents } from '../money';

export default function HomeScreen({
  onAddTasting,
  onOpenTasting,
}: {
  onAddTasting: () => void;
  onOpenTasting: (id: number) => void;
}) {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion } = useApp();
  const [tastings, setTastings] = useState<Tasting[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [typeFilter, setTypeFilter] = useState<WineType | 'all'>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const opts: { type?: WineType; query?: string } = {};
    if (typeFilter !== 'all') opts.type = typeFilter;
    if (query.trim()) opts.query = query.trim();
    setTastings(await getTastings(opts));
    setStats(await getStats());
  }, [typeFilter, query]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const atFreeLimit = !isPro && (stats?.tastingCount ?? 0) >= FREE_TASTING_LIMIT;
  const nearFreeLimit =
    !isPro && !atFreeLimit && (stats?.tastingCount ?? 0) >= FREE_TASTING_LIMIT - 4;

  const handleAdd = () => {
    if (atFreeLimit) {
      showPaywall();
      return;
    }
    onAddTasting();
  };

  const subtitle = (t: Tasting): string => {
    const parts: string[] = [];
    if (t.producer) parts.push(t.producer);
    if (t.vintage > 0) parts.push(String(t.vintage));
    if (!parts.length && t.varietal) parts.push(t.varietal);
    if (!parts.length && t.type) parts.push(t.type);
    return parts.join(' · ');
  };

  const renderItem = ({ item }: { item: Tasting }) => (
    <Pressable onPress={() => onOpenTasting(item.id)}>
      <Card theme={theme} style={styles.itemCard}>
        <View style={styles.itemRow}>
          {item.coverPath ? (
            <Image source={{ uri: photoUri(item.coverPath) }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.cardAlt }]}>
              <Text style={styles.thumbEmoji}>🍷</Text>
            </View>
          )}
          <View style={styles.itemBody}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {subtitle(item) ? (
              <Text style={[styles.itemMeta, { color: theme.textFaint }]} numberOfLines={1}>
                {subtitle(item)}
              </Text>
            ) : null}
            <View style={styles.itemBottom}>
              {item.rating > 0 && <Stars rating={item.rating} theme={theme} size={13} />}
              {item.priceCents > 0 && (
                <Text style={[styles.itemPrice, { color: theme.textSecondary }]}>
                  {formatCents(item.priceCents)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  const avg = stats?.avgRating ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={tastings}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={[styles.brand, { color: theme.accent }]}>Swirl</Text>
            <Card theme={theme} style={styles.heroCard}>
              <Text style={[styles.heroValue, { color: theme.text }]}>
                {stats?.tastingCount ?? 0}
              </Text>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>
                {(stats?.tastingCount ?? 0) === 1 ? 'wine tasted' : 'wines tasted'}
              </Text>
              {(stats?.ratedCount ?? 0) > 0 && (
                <View style={styles.heroStars}>
                  <Stars rating={Math.round(avg)} theme={theme} size={16} />
                  <Text style={[styles.heroAvg, { color: theme.textFaint }]}>
                    {avg.toFixed(1)} avg
                  </Text>
                </View>
              )}
            </Card>

            {!isPro && (
              <Pressable onPress={showPaywall}>
                <Card theme={theme} style={{ ...styles.limitCard, backgroundColor: theme.accentSoft }}>
                  <Text style={[styles.limitText, { color: theme.accent }]}>
                    {atFreeLimit
                      ? `Free plan is full (${FREE_TASTING_LIMIT} wines). Go Pro for unlimited →`
                      : `${FREE_TASTING_LIMIT - (stats?.tastingCount ?? 0)} free wines left. Go Pro for unlimited →`}
                  </Text>
                </Card>
              </Pressable>
            )}

            <TextInput
              style={[
                styles.search,
                { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="Search wine, producer, region, notes…"
              placeholderTextColor={theme.textFaint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />

            <View style={styles.chips}>
              <Chip
                label="All"
                active={typeFilter === 'all'}
                onPress={() => setTypeFilter('all')}
                theme={theme}
              />
              {WINE_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  active={typeFilter === t}
                  onPress={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                  theme={theme}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Card theme={theme} style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🍷</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {query || typeFilter !== 'all' ? 'Nothing here yet' : 'Log your first wine'}
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              {query || typeFilter !== 'all'
                ? 'Try a different search or type.'
                : 'Snap the label, rate it, jot what you tasted. Next time you’re in the aisle, you’ll remember exactly which ones to buy again.'}
            </Text>
          </Card>
        }
      />
      <Pressable
        onPress={handleAdd}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityLabel="Add a wine"
      >
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.card,
          borderColor: active ? theme.accent : theme.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 120 },
  brand: { fontSize: 15, fontWeight: fonts.weight.bold, marginBottom: 8, letterSpacing: 0.3 },
  heroCard: { alignItems: 'center', paddingVertical: 22 },
  heroValue: { fontSize: 44, fontWeight: fonts.weight.bold, letterSpacing: -1 },
  heroLabel: { fontSize: 13, fontWeight: fonts.weight.medium, marginTop: -2 },
  heroStars: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  heroAvg: { fontSize: 13 },
  limitCard: { marginTop: 10, paddingVertical: 12, borderWidth: 0 },
  limitText: { fontSize: 14, fontWeight: fonts.weight.semibold, textAlign: 'center' },
  search: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 14 },
  chip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: fonts.weight.medium },
  itemCard: { marginBottom: 10, padding: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 22 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: fonts.weight.semibold },
  itemMeta: { fontSize: 13, marginTop: 2 },
  itemBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  itemPrice: { fontSize: 13, fontWeight: fonts.weight.medium },
  emptyCard: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: fonts.weight.bold },
  emptyBody: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabPlus: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: fonts.weight.semibold },
});
