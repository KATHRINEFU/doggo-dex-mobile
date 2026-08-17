---
name: Clerk instance parity (app vs API)
description: Why "session expired" 401s appear in store builds, and the rule that keeps the mobile bundle and the API on the same Clerk instance.
---

A 401 on every authenticated route, with the server diagnostic showing a token
that was issued seconds ago and has ~1 minute left, is never an expiry problem.
It means the bundle signed the user in against one Clerk instance while the API
verifies against a different one. Compare the token's `iss` host with the host
encoded in the API's own publishable key — if they differ, that is the bug.

**Rule:** the mobile bundle's publishable key and the API's publishable/secret
pair must decode to the same frontend-API host, in every environment.

**Why:** DoggoDex shipped a TestFlight build pointing at the Clerk Production
instance (custom domain) while the published API still held the old test
instance's keys. Every request 401'd and the UI reported "Your session expired",
which sent debugging down the wrong path for a long time.

**How to apply:**
- A publishable key is public and self-describing: `base64(<key body>)` decodes
  to `<frontend-api-host>$`. Use that to identify an instance without ever
  printing a secret.
- Never hardcode a single canonical instance in the client to "protect" against
  stale keys — that pin is what silently blocks a legitimate migration to a new
  instance. Resolve the key from env first, then app config.
- Verify a secret key's instance with
  `GET https://api.clerk.com/v1/instance` using it as a bearer token; the
  response reports `environment_type` without revealing anything sensitive.
- Clerk keys and the API domain are inlined into the native binary at bundle
  time, so changing either requires a new TestFlight/App Store build, not just
  a republish of the API.
- Never surface a 401 to users as "session expired". Say the sign-in was
  rejected and the app may need an update.
