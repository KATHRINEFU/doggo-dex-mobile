---
name: Clerk token cache bleeds across instances
description: After switching Clerk instances, the persisted session token is replayed and rejected 401 because the cache key is not namespaced by instance.
---

# A Clerk instance switch strands the old session token

Clerk's token cache key (`__clerk_client_jwt`) is **not namespaced by instance**.
After pointing an app at a different Clerk instance, the previously stored
session JWT is still read back and sent on every request. The server (holding
the new instance's secret key) cannot verify it against the new JWKS and rejects
it, producing a stream of 401s that look like a broken endpoint or an expired
session rather than a configuration problem.

The giveaway is the token's `iss` claim: it names the **old** instance host while
the client startup log names the new one. Those two disagreeing is proof of a
stale cached token, not a wrong publishable key.

Storage differs by platform and both must be cleared:

- web — `localStorage`
- native — `expo-secure-store`, which writes to the iOS Keychain and **survives
  deleting and reinstalling the app**, so a reinstall does not clear it

**Why:** An Apple-OAuth debugging session found the running client correctly
configured for the new instance while the API server logged tokens issued by the
old one. Time went into rebuilding and re-keying the client when the actual
residue was a persisted JWT.

**How to apply:** When auth 401s survive a correct key, decode the rejected
token's `iss` before touching client config. If it names a retired instance,
clear the token cache (sign out, or delete the secure-store/localStorage entry)
instead of rebuilding. When migrating instances deliberately, namespace the cache
key by the publishable key's instance host so old sessions are abandoned rather
than replayed.

Separately: an instance mismatch also explains "`oauth_<provider>` does not match
one of the allowed values for parameter strategy" — compare enabled providers
across both instances via `<fapi>/v1/environment` before changing any app code.
