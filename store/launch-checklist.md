# OneLine — Launch Checklist

## Done (built & verified)
- [x] Full app built: Today (write + streaks + prompts + On This Day), Story timeline (search, free/Pro gating), Settings (reminders, Face ID lock, CSV export, restore purchases, delete-all)
- [x] Freemium paywall wired for RevenueCat (safe fallback if unconfigured)
- [x] 100% on-device SQLite storage — no servers, no accounts
- [x] TypeScript compiles clean; date/streak logic unit-tested (leap years, month boundaries, streak edge cases)
- [x] iOS-specific notification trigger bug caught and fixed (DAILY is Android-only)
- [x] App icon designed (1024×1024)
- [x] Privacy policy written (needs hosting)
- [x] App Store metadata: name, subtitle, keywords, description, pricing, privacy label answers, review notes

## Needs Brian (quick account steps — I drive, you tap)
1. **Expo account** (free, expo.dev) → create an access token (expo.dev → Account Settings → Access tokens) and paste it to me. I then run all EAS builds from here.
2. **RevenueCat account** (free, revenuecat.com) → I'll walk through connecting it to App Store Connect and creating the `pro` entitlement + products; then I drop the API key into the app config.
3. **App Store Connect**: create the app record (bundle ID `com.bwk.oneline`) + the two subscriptions from metadata.md. I can drive this in your Chrome — you just handle Apple 2FA prompts.
4. **Privacy policy hosting**: a GitHub account lets me put it on GitHub Pages in 2 minutes (also gives us the Support URL).

## Then (me, ~1–2 days)
- [ ] EAS production build (`eas build -p ios`)
- [ ] TestFlight build → you tap through the app on your phone (the one QA step only a human with the phone can do)
- [ ] App Store screenshots (6.5" set) from the running app
- [ ] `eas submit` + fill all App Store Connect fields + submit for review

## Timeline
- Accounts day: today/tomorrow
- Build + TestFlight: 1–2 days after tokens
- Submit: within ~5 days
- Apple review: 1–3 days (expect one bounce; I've pre-armored the usual rejection reasons: privacy label mismatches, missing restore button, subscription terms text, broken privacy URL)

## Indicator dashboard (starts at launch)
Weekly: impressions & product-page views (App Store Connect), downloads, trial starts, trial→paid conversion, keyword rank for "one line a day". Kill/iterate rules per the venture plan.
