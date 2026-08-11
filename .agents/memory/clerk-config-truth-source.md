---
name: Clerk config truth source
description: Verify Clerk auth capabilities against the live FAPI environment endpoint, not the dashboard's wording, before changing app code.
---

# Read Clerk's live config before debugging auth code

When an auth provider or strategy "looks enabled" in the Clerk dashboard but the
app still rejects it, query the instance directly instead of trusting the
dashboard labels or changing app code:

```
curl -s "https://<frontend-api-host>/v1/environment?_is_native=1"
```

The frontend-API host is encoded in the publishable key: base64-decode the part
after `pk_test_` / `pk_live_` and strip the trailing `$`.

Read `user_settings.attributes.<attr>`:

- `enabled` — the attribute exists on the instance
- `required` — required at sign-up
- `used_for_first_factor` + `first_factors` — **whether it can be used to sign in**

`enabled: true` with `used_for_first_factor: false` means the attribute is
collected at sign-up but cannot authenticate anyone. For password specifically,
the dashboard's "Sign-up with password" / "Add password to account" toggles only
affect sign-up; sign-in requires password to appear under the *authentication
strategies* (first factors).

To check whether a specific strategy is accepted end-to-end, POST it and read
the error rather than guessing:

```
curl -s -X POST "https://<fapi>/v1/client/sign_ins?_is_native=1" \
  -d "strategy=oauth_apple" -d "redirect_url=<scheme>://sso-callback"
```

A `status` with an `external_verification_redirect_url` means the strategy is
allowed. `"<x> does not match one of the allowed values for parameter strategy"`
is a **server-side** rejection from that instance — `@clerk/expo`'s `useSSO`
passes `strategy` straight through and has no client-side whitelist, so that
message always means the instance being contacted lacks the provider.

**Why:** A long debugging session chased app code and republished the server for
an Apple-strategy error, while the live endpoint showed Apple was already
allowed — proving the failing client was pointed at a different instance, not
that the code was wrong.

**How to apply:** For any "provider/strategy not allowed" or "identifier not
valid" auth bug, check the live environment endpoint first. Also log which
instance a build is using — decode the publishable key at startup and print the
host (publishable keys are public and safe to log; secret keys are not). A build
carrying a stale key from a previous Clerk instance fails exactly this way while
the workspace looks correctly configured.
