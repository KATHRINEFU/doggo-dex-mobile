---
name: Clerk needs_client_trust
description: How to handle Clerk's needs_client_trust status on native and in Replit web preview (iframe).
---

## Rule

`needs_client_trust` means the device isn't trusted yet. Handle it per platform using the new signal-based `useSignIn` from `@clerk/expo` (SignInFuture API):

- **Native (iOS/Android) and real web:** run Clerk's documented client-trust flow — `await signIn.mfa.sendEmailCode()`, show a code-entry UI, `await signIn.mfa.verifyEmailCode({ code })`, then `await signIn.finalize({ navigate })`. Do NOT just show an error or the user dead-ends.
- **Replit dev web preview only** (`Platform.OS === "web" && __DEV__`): Turnstile is CSP-blocked in the iframe, so activate the session directly via `useClerk().setActive({ session: signIn.createdSessionId })`.

**Also:** all SignInFuture methods (`password`, `finalize`, `mfa.sendEmailCode`, `mfa.verifyEmailCode`) return an `{ error }` envelope instead of throwing — check it every time.

**Navigation:** never `router.replace` right after `setActive`/`finalize`; auth state propagates async and protected screens bounce back to sign-in. Instead navigate from a `useEffect` on `useAuth().isSignedIn`.

**Why:** Clerk creates the session but won't mark sign-in "complete" until the client is trusted. On native the email-code flow is the supported path; in the Replit iframe Turnstile can never load, so the dev-only bypass is required.
