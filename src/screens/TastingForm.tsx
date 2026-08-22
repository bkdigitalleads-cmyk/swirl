import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts } from '../theme';
import { Card, PillButton, ProBadge, StarPicker } from '../components';
import { useApp, FREE_PHOTOS_PER_ITEM, PRO_PHOTOS_PER_ITEM } from '../state';
import {
  addPhoto,
  countTastings,
  deletePhoto,
  deleteTasting,
  getPhotos,
  getTasting,
  insertTasting,
  Photo,
  updateTasting,
  WineType,
  WINE_TYPES,
} from '../db';
import { deletePhotoFile, deletePhotoFiles, photoUri, storePhoto } from '../photos';
import { centsToEditable, parseDollarsToCents } from '../money';
import { maybeRequestReview } from '../reviews';

interface Props {
  visible: boolean;
  tastingId: number | null; // null = new tasting
  onClose: () => void;
}

/** Extract a plausible 4-digit vintage year; 0 if none/invalid. */
function parseVintage(input: string): number {
  const digits = input.replace(/[^0-9]/g, '').slice(0, 4);
  if (!digits) return 0;
  const n = Number(digits);
  if (n < 1900 || n > 2100) return 0;
  return n;
}

export default function TastingFormModal({ visible, tastingId, onClose }: Props) {
  const theme = useTheme();
  const { isPro, showPaywall, bumpData } = useApp();
  const [name, setName] = useState('');
  const [producer, setProducer] = useState('');
  const [vintageText, setVintageText] = useState('');
  const [type, setType] = useState<WineType>('');
  const [varietal, setVarietal] = useState('');
  const [region, setRegion] = useState('');
  const [rating, setRating] = useState(0);
  const [priceText, setPriceText] = useState('');
  const [wouldBuy, setWouldBuy] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]); // stored filenames for a NEW tasting
  const [saving, setSaving] = useState(false);
  const editing = tastingId !== null;

  const reset = useCallback(() => {
    setName('');
    setProducer('');
    setVintageText('');
    setType('');
    setVarietal('');
    setRegion('');
    setRating(0);
    setPriceText('');
    setWouldBuy(false);
    setNotes('');
    setPhotos([]);
    setPendingPhotos([]);
  }, []);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      if (tastingId !== null) {
        const t = await getTasting(tastingId);
        if (t) {
          setName(t.name);
          setProducer(t.producer);
          setVintageText(t.vintage > 0 ? String(t.vintage) : '');
          setType(t.type);
          setVarietal(t.varietal);
          setRegion(t.region);
          setRating(t.rating);
          setPriceText(centsToEditable(t.priceCents));
          setWouldBuy(t.wouldBuy);
          setNotes(t.notes);
          setPhotos(await getPhotos(tastingId));
        }
      } else {
        reset();
      }
    })();
  }, [visible, tastingId, reset]);

  const photoCount = editing ? photos.length : pendingPhotos.length;
  const photoCap = isPro ? PRO_PHOTOS_PER_ITEM : FREE_PHOTOS_PER_ITEM;

  const pickPhoto = async (fromCamera: boolean) => {
    if (photoCount >= photoCap) {
      if (!isPro) {
        showPaywall();
      } else {
        Alert.alert('Photo limit', `Up to ${PRO_PHOTOS_PER_ITEM} photos per wine.`);
      }
      return;
    }
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera unavailable', 'Allow camera access in iOS Settings to photograph labels.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      }
      if (result.canceled || !result.assets?.length) return;
      const stored = await storePhoto(result.assets[0].uri);
      if (editing && tastingId !== null) {
        await addPhoto(tastingId, stored);
        setPhotos(await getPhotos(tastingId));
        bumpData();
      } else {
        setPendingPhotos((p) => [...p, stored]);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e: any) {
      Alert.alert('Photo failed', e?.message ?? 'Please try again.');
    }
  };

  const removePhoto = async (index: number) => {
    if (editing) {
      const p = photos[index];
      const path = await deletePhoto(p.id);
      if (path) deletePhotoFile(path);
      setPhotos(photos.filter((_, i) => i !== index));
      bumpData();
    } else {
      deletePhotoFile(pendingPhotos[index]);
      setPendingPhotos(pendingPhotos.filter((_, i) => i !== index));
    }
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Wine name required', 'Give the wine a name — e.g. “Caymus Cabernet Sauvignon”.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        name: trimmed,
        producer,
        vintage: parseVintage(vintageText),
        type,
        varietal,
        region,
        rating,
        priceCents: parseDollarsToCents(priceText),
        wouldBuy,
        notes,
      };
      if (editing && tastingId !== null) {
        await updateTasting(tastingId, input);
      } else {
        const newId = await insertTasting(input);
        for (const p of pendingPhotos) await addPhoto(newId, p);
        maybeRequestReview(await countTastings());
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      bumpData();
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!editing || tastingId === null) return;
    Alert.alert('Delete this wine?', 'Its photos are removed too. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const paths = await deleteTasting(tastingId);
          deletePhotoFiles(paths);
          bumpData();
          onClose();
        },
      },
    ]);
  };

  const cancel = () => {
    if (!editing && pendingPhotos.length) {
      deletePhotoFiles(pendingPhotos);
    }
    reset();
    onClose();
  };

  const photoTiles = editing
    ? photos.map((p) => ({ key: String(p.id), uri: photoUri(p.path) }))
    : pendingPhotos.map((f, i) => ({ key: `${f}-${i}`, uri: photoUri(f) }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cancel}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={cancel} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {editing ? 'Edit wine' : 'Add a wine'}
          </Text>
          <Pressable onPress={save} hitSlop={10} disabled={saving}>
            <Text style={[styles.headerBtn, { color: theme.accent, fontWeight: fonts.weight.bold }]}>
              {saving ? '…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.photoRow}>
            {photoTiles.map((t, i) => (
              <View key={t.key} style={styles.photoWrap}>
                <Image source={{ uri: t.uri }} style={styles.photo} />
                <Pressable
                  onPress={() => removePhoto(i)}
                  style={[styles.photoX, { backgroundColor: theme.danger }]}
                  hitSlop={8}
                >
                  <Text style={styles.photoXText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {photoTiles.length < PRO_PHOTOS_PER_ITEM && (
              <Pressable
                onPress={() => pickPhoto(true)}
                onLongPress={() => pickPhoto(false)}
                style={[styles.photoAdd, { borderColor: theme.border, backgroundColor: theme.card }]}
              >
                <Text style={styles.photoAddIcon}>📷</Text>
                <Text style={[styles.photoAddText, { color: theme.textSecondary }]}>
                  {photoTiles.length === 0 ? 'Label' : 'More'}
                </Text>
                {!isPro && photoTiles.length >= FREE_PHOTOS_PER_ITEM && <ProBadge theme={theme} />}
              </Pressable>
            )}
          </View>
          <Text style={[styles.hint, { color: theme.textFaint }]}>
            Tap for camera · hold to pick from library
          </Text>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Wine</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Caymus Cabernet Sauvignon"
              placeholderTextColor={theme.textFaint}
              returnKeyType="done"
            />
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Producer / winery</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={producer}
              onChangeText={setProducer}
              placeholder="Caymus Vineyards"
              placeholderTextColor={theme.textFaint}
            />
          </Card>

          <View style={styles.twoCol}>
            <Card theme={theme} style={{ ...styles.fieldCard, flex: 1 }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Vintage</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={vintageText}
                onChangeText={setVintageText}
                placeholder="2021"
                placeholderTextColor={theme.textFaint}
                keyboardType="number-pad"
                maxLength={4}
              />
            </Card>
            <Card theme={theme} style={{ ...styles.fieldCard, flex: 1 }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Price paid</Text>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={priceText}
                onChangeText={setPriceText}
                placeholder="$0"
                placeholderTextColor={theme.textFaint}
                keyboardType="decimal-pad"
              />
            </Card>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Type</Text>
          <View style={styles.typeChips}>
            {WINE_TYPES.map((wt) => {
              const active = type === wt;
              return (
                <Pressable
                  key={wt}
                  onPress={() => setType(active ? '' : wt)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? theme.accent : theme.card,
                      borderColor: active ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.typeChipText, { color: active ? '#FFF' : theme.textSecondary }]}>
                    {wt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Grape / varietal</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={varietal}
              onChangeText={setVarietal}
              placeholder="Cabernet Sauvignon"
              placeholderTextColor={theme.textFaint}
            />
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Region</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={region}
              onChangeText={setRegion}
              placeholder="Napa Valley, California"
              placeholderTextColor={theme.textFaint}
            />
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Your rating</Text>
            <StarPicker rating={rating} onChange={setRating} theme={theme} />
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: theme.text }]}>Buy again</Text>
                <Text style={[styles.switchSub, { color: theme.textFaint }]}>
                  Flag the ones worth a repeat pour.
                </Text>
              </View>
              <Switch
                value={wouldBuy}
                onValueChange={setWouldBuy}
                trackColor={{ true: theme.accent }}
              />
            </View>
          </Card>

          <Card theme={theme} style={styles.fieldCard}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Tasting notes</Text>
            <TextInput
              style={[styles.input, styles.notes, { color: theme.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Aroma, palate, finish — dark cherry, soft tannins, long finish. Where and with whom?"
              placeholderTextColor={theme.textFaint}
              multiline
            />
          </Card>

          {editing && (
            <View style={{ marginTop: 18 }}>
              <PillButton theme={theme} label="Delete wine" kind="ghost" onPress={onDelete} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: fonts.weight.bold },
  scroll: { padding: 20, paddingBottom: 60 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { position: 'relative' },
  photo: { width: 84, height: 84, borderRadius: 12 },
  photoX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoXText: { color: '#FFF', fontSize: 11, fontWeight: fonts.weight.bold },
  photoAdd: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddIcon: { fontSize: 20 },
  photoAddText: { fontSize: 11 },
  hint: { fontSize: 12, marginTop: 8, marginBottom: 14 },
  fieldCard: { marginBottom: 12, paddingVertical: 12 },
  twoCol: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 4 },
  input: { fontSize: 17, paddingVertical: 2 },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  sectionLabel: { fontSize: 12, fontWeight: fonts.weight.semibold, marginBottom: 8, marginTop: 4 },
  typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeChip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  typeChipText: { fontSize: 13, fontWeight: fonts.weight.medium },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchTitle: { fontSize: 15, fontWeight: fonts.weight.semibold },
  switchSub: { fontSize: 12, marginTop: 2 },
});
