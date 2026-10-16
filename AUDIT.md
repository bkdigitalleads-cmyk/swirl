# Swirl audit (Oct 15 2026)
## Findings
1. [MED] Pro status is read only once at launch: there is no CustomerInfo listener and no refresh on foreground
   - Where: src/state.tsx:61-66 (single `getIsPro()`), src/state.tsx:84-86 (`refreshPro` is never called)
   - What happens: entitlement changes that happen outside the in-app paywall are invisible until the app is killed or the user taps Restore. For example, the yearly subscriber's renewal hits a billing issue (with no grace period, Pro is false at the next launch). Apple then recovers the payment while Swirl sits in memory, and the user stays capped at 20 wines with the PDF locked although they are paying again. The same applies to offer or promo code redemptions and Ask to Buy approvals. In the other direction, a lapsed weekly trial keeps Pro while the app stays resident.
   - Fix: after `initPurchases()`, when billing is available, add `Purchases.addCustomerInfoUpdateListener(info => setIsPro(isProFromCustomerInfo(info)))`. Also call `refreshPro()` on AppState 'active'.

2. [MED] Face ID lock wipes an in-progress tasting form, and new label photos are left as orphan files
   - Where: src/LockGate.tsx:42-44 and src/LockGate.tsx:53 (replaces `children` while locked), src/screens/TastingForm.tsx:86-108 (`reset()` on remount for a new tasting)
   - What happens: a Pro user with the lock on photographs the label, types the producer and notes, then switches to Safari to look up the region or grape. On return, the tree was unmounted at 'background', so after Face ID the form reopens blank. The typed notes are lost, and the stored label JPEGs stay in Documents/photos with no database row. Unsaved edits to an existing tasting are lost the same way.
   - Fix: keep `children` mounted and render the lock screen as an absolute-fill overlay on top of it.

3. [MED] Prices typed with a comma decimal are stored 100x too high
   - Where: src/money.ts:8 (strips every comma), src/screens/TastingForm.tsx:323 (`keyboardType="decimal-pad"`)
   - What happens: with a comma-decimal region (most of Europe and Latin America outside Mexico), the decimal pad shows ",". The user enters `24,99` for a bottle, and it is saved and shown as $2,499 in the list, the PDF notebook and the CSV.
   - Fix: when the input has a comma and no period, and the comma is followed by 1 or 2 trailing digits, treat it as the decimal point. Otherwise strip it as a thousands separator. (Alternatively, normalize using the locale's decimal separator.)

4. [MED] Tapping the photo ✕ permanently deletes the label photo right away, and Cancel does not bring it back
   - Where: src/screens/TastingForm.tsx:149-155 (`deletePhoto` plus `deletePhotoFile` on tap), src/screens/TastingForm.tsx:252-258 (small ✕ with no confirmation), src/screens/TastingForm.tsx:215-221 (Cancel only cleans up pending photos)
   - What happens: while editing a tasting, an accidental tap on the ✕ deletes the label photo row and file immediately. Tapping Cancel does not restore it.
   - Fix: show a confirmation Alert before `removePhoto` when editing, or defer removals until Save.

5. [LOW] CSV "date" column is the UTC date, so evening tastings are dated the next day
   - Where: src/db.ts:324 (`new Date(t.createdAt).toISOString().slice(0, 10)`)
   - What happens: a wine logged at 8pm Pacific on Oct 14 exports with date 2026-10-15. Wine is mostly logged in the evening, so a large share of rows will be off by one.
   - Fix: build the date from local getters (getFullYear, getMonth + 1, getDate).

6. [LOW] Face ID lock has two dead ends: a lapsed subscriber cannot turn it off, and a removed passcode locks the user out
   - Where: src/screens/Settings.tsx:25-29 (Pro is required to toggle in either direction), src/LockGate.tsx:19-30 (`res.error` is ignored)
   - What happens: (a) after the subscription lapses, turning the lock off opens the paywall. (b) If the user removes their device passcode, `authenticateAsync` fails with `passcode_not_set` on every attempt and the journal cannot be opened, with no explanation.
   - Fix: only require Pro when turning the lock on. Handle 'passcode_not_set', 'not_enrolled' and 'not_available' with an explanatory alert or by unlocking.

## Checked and fine
- Paying yearly subscriber: no code path sets `isPro` to false except a launch read or a Restore that genuinely returns no entitlement. Paywall buy and restore set Pro only on an active 'pro' entitlement. Onboarding skips the paywall when Pro, and the onboarded flag has existed since v1.0, so updating users are not re-onboarded.
- photos.ts (identical to StuffKeep): stores filenames only, which survives container path changes on update; write is verified; files are removed on tasting delete and on delete-all
- db.ts: the schema is unchanged since the first release (verified in git), so no migration is needed. The mapper defaults every column (`?? ''`, `?? 0`). Foreign key cascade is on. LIKE wildcards are escaped.
- Stats: AVG covers rated tastings only and is wrapped in COALESCE; avg is shown only when ratedCount > 0, so there is no NaN or division by zero; formatCents handles 0
- Vintage parsing is clamped to 1900-2100, and 0 means non-vintage
- Report: the PDF is gated to Pro and refuses to run with 0 tastings; HTML is escaped; a missing photo just omits the thumbnail
- Free tier: the 20-wine cap is enforced at the FAB and the 1-photo cap in `pickPhoto`; lapsed users keep and can edit all data. No path gives Pro for free.
- reviews.ts: asks once after the first saved wine or the first PDF; guarded by `hasAction()`
- Settings JSON.parse is wrapped in try/catch; the camera and photo usage strings are present in app.json
