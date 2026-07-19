---
name: Clerk Expo legacy hooks
description: Correct import paths for legacy Clerk auth hooks in Expo v3.7.4
---

## Problem
`@clerk/expo@3.7.4` exports `useSignIn` and `useSignUp` from the new v6 signal-based `@clerk/react` API. These return `SignInSignalValue`/`SignUpSignalValue` (with `signIn`, `signUp`, `errors`, `fetchStatus` properties) rather than the legacy object-based API (`isLoaded`, `setActive`, `signIn.create()` returning `{ createdSessionId }`).

## How to apply
For legacy-style custom auth flows (password create, email verification, etc.), import from the dedicated sub-export:

```tsx
import { useSignIn } from "@clerk/expo/legacy";
import { useSignUp } from "@clerk/expo/legacy";
```

The `legacy` sub-module re-exports `@clerk/react/legacy`, which provides the familiar API:
- `useSignIn()` returns `{ isLoaded, signIn, setActive }`
- `signIn.create({ strategy: "password", identifier, password })` returns `{ createdSessionId, status }`
- `signUp.create({ ... })` returns `{ createdSessionId, status, missingFields, unverifiedFields }`
- `signUp.prepareEmailAddressVerification({ strategy: "email_code" })`
- `signUp.attemptEmailAddressVerification({ code })`

## Why
Clerk v6 introduced a new signal-based architecture, but the `@clerk/expo` package keeps the legacy API available via a separate sub-export to avoid breaking existing custom flows. The default export path now serves the new signal API.
