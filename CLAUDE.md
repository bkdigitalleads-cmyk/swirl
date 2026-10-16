@AGENTS.md

# Swirl (swirl)

Part of Brian's iOS app portfolio (nine apps, seller bkdigitalleads-cmyk). Expo SDK 57, React Native, TypeScript, expo-sqlite, RevenueCat.

- Bundle ID: com.bwk.swirl. App Store app ID: 6804315875. GitHub: bkdigitalleads-cmyk/swirl.
- Live in the store as of Oct 15, 2026: version 1.1.3, build 8.
- Wine tasting journal. Has a paying yearly subscriber: be extra careful with anything touching Pro status or purchases.

## How shipping works (read before every push)

- A push to `main` that touches app.json, eas.json, package*.json, App.tsx, index.ts, src/ or assets/ starts an EAS workflow (.eas/workflows/deploy.yml). It builds iOS in the cloud and uploads the build to App Store Connect / TestFlight. Every such push costs a paid build credit.
- Pushes that only change Markdown files (CLAUDE.md, NOTES.md, AUDIT.md, README.md) do not build.
- Version numbers are local (`appVersionSource: local`, no auto-increment). Before any push that builds: raise `ios.buildNumber` in app.json by 1, and raise `version` (for example 1.0.3 to 1.0.4) when it will become a new App Store release. A build number that was already used makes the upload fail.
- Before every commit: run `npx tsc --noEmit` and fix every error.
- Batch the changes for one app into one push. Ask Brian before any push that builds, and say what is in it.
- Submitting a version for App Review, release dates, prices, In-App Events, subtitles, keywords and screenshots all happen in App Store Connect. Brian and his Cowork session handle that side. Do not try to do it from here.

## Rules

- Brian handles every credential and sign-in. Never type, paste, print or store passwords, tokens or API keys. If git push asks for credentials, stop and tell Brian.
- No spending (paid services, extra builds beyond what Brian approved) without Brian saying go.
- Never change the RevenueCat entitlement id `pro`, product ids, or the logic in src/purchases.ts without Brian asking. Paying users must never lose Pro.
- The SQLite schema must stay backward compatible: never drop or rename columns or tables. New columns go in through a migration that runs on existing installs. Existing user data must survive every update.
- Do not change the app name, subtitle, keywords or the rating-prompt trigger without asking. Rankings and the rating prompt were tuned on purpose.
- Keep changes small. Fix what the task needs and tidy only the files you already touch. List anything else you notice in NOTES.md under "Noticed, not changed" instead of fixing it. No broad refactors, dependency upgrades or Expo SDK upgrades unless Brian asks.
- Any text Brian will send to other people (emails, posts, review replies): no em dashes, plain human wording.

## Logging (so Brian's Cowork session can follow along)

- With every commit, add an entry at the top of NOTES.md in the same commit: date, version/build, what changed and why, and how it was checked.
- AUDIT.md is the Oct 15, 2026 read-only bug check. When you fix an item, mark it `FIXED in <version> (<commit>)` there in the same commit.

## Testing

- Type check: `npx tsc --noEmit`. Health check: `npx expo-doctor`.
- Simulator (needs Xcode): `npx expo start --ios`. Purchases do not complete in the simulator; check paywall layout and flows only.
- Real-device check: TestFlight build from the EAS workflow, on Brian's iPhone.

