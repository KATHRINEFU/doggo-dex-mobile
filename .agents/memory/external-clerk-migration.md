---
name: External Clerk instance
description: Project switched from Replit-managed Clerk to the user's own Clerk account (Aug 2026)
---

The user replaced `CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` secrets with keys from their **own external Clerk account** because Replit's Expo Launch publish kept failing and they are shipping to the App Store via their own EAS account.

**Why:** Replit-managed Clerk never exposes `pk_live` keys in Secrets; live keys are only injected during Replit's publish flow, which was unusable for them.

**How to apply:**
- API server uses plain `clerkMiddleware()` reading env keys directly; the host-based `publishableKeyFromHost` rewriting and the `/api/__clerk` FAPI proxy middleware were deleted. Do not reintroduce them unless migrating back to Replit-managed Clerk.
- Production Expo bundles get the key via `scripts/build.js`, which maps `CLERK_PUBLISHABLE_KEY` → `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` at Metro time (dev script does the same in package.json).
- Their Clerk dashboard must have: email+password with email_code verification, username, Google/Apple SSO, email-code device verification (needs_client_trust), and native app config for bundle `com.lizhen.doggodex` with `mobile://` redirect.
