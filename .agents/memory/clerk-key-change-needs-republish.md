---
name: Clerk instance change requires a republish
description: After switching Clerk instances/keys, the published deployment keeps the old keys and 401s every new token until it is republished.
---

Changing the Clerk instance (or its publishable/secret keys) only affects the development
API server. The **published deployment keeps running the previous build with the previous
keys**, so tokens minted by the new instance come back `401 unauthorized` from production
while the identical request succeeds against the dev domain.

**Why:** this produced a confusing bug report — "saving my country fails" — from a
TestFlight/store build that talks to the production domain, while the same flow worked in
the dev client. The app code was fine; the two ends were on different Clerk instances.

**How to apply:**
- After any Clerk instance/key change, republish before testing an installed build.
- To tell the two apart quickly: mint a session token with the Clerk Backend API
  (`POST /v1/sessions`, then `POST /v1/sessions/{id}/tokens`) and call the same endpoint on
  both the dev domain and the production domain. Same token, 200 on one and 401 on the
  other, means the deployment is stale — not an app bug. Revoke the session afterwards.
- Store builds resolve the API domain from a hard-coded production fallback when
  `EXPO_PUBLIC_DOMAIN` is absent, so they always hit production, never the dev server.
