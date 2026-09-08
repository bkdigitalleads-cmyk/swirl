import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const ASKED_KEY = 'swirl.reviewAsked.v1';

async function askOnce(): Promise<void> {
  try {
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing affect the journal
  }
}

/**
 * Ask for an App Store rating exactly once, at a happy moment.
 * Trigger 1: right after the user's 5th wine is saved (they're invested).
 */
export async function maybeRequestReview(tastingCount: number): Promise<void> {
  if (tastingCount < 5) return;
  await askOnce();
}

/**
 * Trigger 2: right after a successful PDF export — the moment the app just
 * produced the thing they came for. Same once-only guard as trigger 1.
 */
export async function maybeRequestReviewAfterExport(): Promise<void> {
  await askOnce();
}
