import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const ASKED_KEY = 'swirl.reviewAsked.v1';

/**
 * Ask for an App Store rating exactly once, at a happy moment:
 * right after the user's 5th wine is saved (they're invested).
 */
export async function maybeRequestReview(tastingCount: number): Promise<void> {
  try {
    if (tastingCount < 5) return;
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing affect the inventory
  }
}
