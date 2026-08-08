---
name: Device-local progress is per-account
description: Why the Dex/XP/streak/badge state lives on the device but must be namespaced per Clerk user, and what to do with pre-existing unscoped data.
---

The Dex collection, XP, streak and badge share-images are intentionally **device-local**
(AsyncStorage + documents dir). Only aggregate leaderboard numbers live on the server.

Every local key and every generated badge image filename must be namespaced by the Clerk
user id, and the in-memory state must be blanked whenever the signed-in user id changes
or becomes null. The React Query cache must be cleared on the same transition.

**Why:** with device-global keys, signing out left the previous owner's Dex, XP, level and
badges fully visible, and a brand-new account signing in on that device inherited them.
This looked like a server-side data leak but nothing had left the phone.

**How to apply:**
- Any new persisted mobile state that represents user progress gets the same treatment —
  a per-user key, cleared on auth transition.
- Guard writes with a "state currently belongs to user X" ref, so an update in flight while
  accounts switch cannot be written under the new account's key.
- Pre-existing unscoped data is **discarded, not migrated** — there is no way to know which
  account it belonged to. This was an explicit product decision, not an oversight.
- Consequence to keep in mind: progress does not follow a user to another device. If
  cross-device sync is ever wanted, it needs real server-side collection storage.
