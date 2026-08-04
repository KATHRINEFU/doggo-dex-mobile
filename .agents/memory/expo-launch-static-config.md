---
name: Expo Launch needs static app.json
description: Why the mobile artifact must use app.json, not app.config.js, and how env-injected extras were replaced
---

Replit's Expo Launch (App Store publishing) build breaks with a dynamic `app.config.js`/`app.config.ts`. The project must use a static `app.json`.

**Why:** The "Something unexpected happened" publish failure (Aug 2026) coincided with a dynamic config; the expo skill explicitly forbids dynamic config files for Expo Launch.

**How to apply:** Keep all Expo settings in `artifacts/mobile/app.json`. Values previously injected via `process.env` in `extra` (Clerk key, API domain) now come from `EXPO_PUBLIC_*` env vars, with a hard-coded production-domain fallback in `app/_layout.tsx` for store/TestFlight builds where no env is injected. If the production URL changes, update that fallback.
