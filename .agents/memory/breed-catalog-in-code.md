---
name: Breed catalog lives in code
description: Where the PawDex breed catalog lives and the mapping-sync rule for the TFLite model
---

The breed catalog is code, not DB: `DOG_BREEDS` in `artifacts/api-server/src/routes/dogs.ts` plus `DOG_BREEDS_EXTRA` in `dogBreedsExtra.ts` (143 total as of Aug 2026). **Why:** a formal DB migration task was cancelled; the app reads this array directly, so appending entries in code is the agreed approach.

**How to apply:** when adding breeds, append to `DOG_BREEDS_EXTRA` and update `breed_index_to_id.json` in ALL THREE copies (`artifacts/mobile/assets/ml/`, `artifacts/api-server/src/ml/`, `artifacts/api-server/dist/ml/`) — they must stay byte-identical, and every non-null id must exist in the served catalog. Non-breed model classes (dhole, dingo, african hunting dog, fila, chinese rural dog, black sable) stay `null` (detection-only) by user decision. User builds locally on Mac — remind them to `git pull` after pushes.
