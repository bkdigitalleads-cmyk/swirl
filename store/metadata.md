# Swirl — App Store Metadata (ready to paste)

## App name (30 chars max)
`Swirl: Wine Tasting Journal` (27 — exact target phrase; the giants Vivino & CellarTracker do NOT rank for "wine tasting journal", only the broader "wine journal"/"wine tasting notes")

## Subtitle (30 chars max)
`Ratings, notes & cellar log` (27 — adds keywords NOT in the title: ratings, notes, cellar, log)

## Keywords (100 chars max, no words already in name/subtitle)
`sommelier,vino,vintage,varietal,winery,grape,bottle,red,white,rose,review,tracker,diary,pairing,taste`
(100 chars. Deliberately excludes wine/tasting/journal/ratings/notes/cellar/log — already covered by name+subtitle. Apple stems plurals, so singular forms.)

## Promotional text (170 chars max)
`Snap the label, rate the pour, jot a few notes — and never blank on a great bottle again. Your private wine journal, right on your iPhone.`

## Description
The best wine you had last month — what was it called?

Swirl makes sure you always remember. Snap the label, give it a rating, and jot what you tasted. Next time you're staring down a wall of bottles at the shop, your ratings and "buy again" list are right there in your pocket.

WHY SWIRL
• Fast to log: label photo → rating → a few notes → done
• Rate every wine and flag the ones worth buying again
• Capture producer, vintage, grape, region and price
• Filter by red, white, rosé, sparkling and more
• Works completely offline — no account, no signup

YOUR TASTING NOTEBOOK
Generate a beautiful PDF of everything you've tasted — label photos, ratings, notes, grouped by type — to keep or share with friends. Or export a CSV of your whole tasting history. Your data, always yours.

COMPLETELY PRIVATE
Your palate is nobody's business. Swirl keeps your journal on your iPhone — no cloud, no account, no tracking. Optional Face ID lock.

SWIRL PRO
Log up to 20 wines free. Pro unlocks unlimited wines, up to 6 label photos each, the PDF tasting notebook, CSV export, and Face ID lock. Subscribe yearly, or pay once for lifetime.

Pour something good tonight — and actually remember it tomorrow.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/swirl/privacy.html

## Category
Primary: Food & Drink · Secondary: Lifestyle

## Age rating
17+ (frequent/intense alcohol references — a wine app; Apple requires the alcohol flag). Content Rights: no third-party content.

## Price
Free with in-app purchases

## In-App Purchases (create in ASC)
| Product ID | Type | Price | Notes |
|---|---|---|---|
| `swirl_pro_yearly` | Auto-renewing subscription | $19.99/yr | **HERO** — recurring hobby use; charged upfront; group "Swirl Pro" |
| `swirl_pro_lifetime` | Non-consumable | $34.99 | Secondary "pay once" anchor for the subscription-averse |
RevenueCat entitlement: `pro`. Offering `default` (current): `$rc_annual`→yearly, `$rc_lifetime`→lifetime.

## Pricing rationale
Unlike StuffKeep (one-and-done home inventory → Lifetime hero), a wine journal is RECURRING use — people log bottles for years — so the **annual subscription is the hero** (higher LTV, "recurring value = subscription-shaped" per Young), with lifetime as the anchor. No separate time-limited free trial: the 20-wine free tier is the funnel (avoids the extraction-leak concern and subscription-for-a-notebook resistance).

## App Privacy labels
- Purchases → Purchase History: App Functionality, linked, no tracking
- Identifiers → User ID (RevenueCat anonymous): App Functionality, linked, no tracking
- Everything else: Data Not Collected

## Review notes
Swirl is a fully offline wine tasting journal. No login or account exists; no demo credentials needed. To test Pro, use the sandbox purchase flow on the paywall (Settings → Swirl Pro banner, or add a 21st wine). All data is on-device in SQLite; photos in the app sandbox. Camera is used only to photograph wine labels.

## Pre-submission checklist (reuse OneLine/StuffKeep lessons — do not repeat)
- [ ] EULA link present in description (done above) — avoids 3.1.2
- [ ] Content Rights answered in App Information before Add for Review
- [ ] Age rating: set the alcohol flag → 17+
- [ ] Subscription GROUP localized ("Swirl Pro") and added to the submission as its own item
- [ ] IAP review screenshot at 1284×2778
- [ ] Device screen recording ready BEFORE submitting (launch → add wine w/ label photo → rate → notebook tab → paywall → purchase) — avoids 2.1
- [ ] Review contact typed with real key events + Save
- [ ] EU-27 excluded (DSA trader status — same as OneLine/StuffKeep)
