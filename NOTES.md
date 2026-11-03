# Swirl change log

Newest first. One entry per commit: date, version/build, what changed and why.

- 2026-11-03: Website only, no app build (app.json still 1.1.3 build 8). Support address on the website changed from the personal Gmail to bkdigitalleads@gmail.com in docs/index.html, docs/privacy.html. App source, app.json and store/ untouched; the in-app support address changes in the next release.
  - Checked: .eas/workflows/deploy.yml only runs on pushes to main that touch app.json, eas.json, package*.json, App.tsx, index.ts, src/ or assets/, so this commit (website files and NOTES.md only) starts no EAS build or submit. git grep shows no brianwkershner left in the changed files.
- 2026-10-15: Added CLAUDE.md, AUDIT.md (read-only bug check from Cowork) and this log. No app code changed. Live version 1.1.3 build 8.
