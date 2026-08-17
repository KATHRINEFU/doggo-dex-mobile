---
name: Breed photo ids are not trustworthy
description: The Unsplash ids used for breed imagery frequently show the wrong subject, so any marketing asset must verify photos visually before shipping.
---

A large share of the Unsplash photo ids referenced by the breed catalog do not
show the breed they are attached to. Two distinct failure modes:

1. **Dead ids.** Several return a tiny non-image error body instead of a photo.
   They decode as "cannot identify image file" rather than failing the request,
   so a naive download loop silently produces broken files.
2. **Wrong subject.** Others return a valid photo of something else entirely —
   forests, mountains and lakes appear among them. Multiple breeds also share a
   single id, and some ids show a different breed than their label claims.

In the app this is cosmetic and largely invisible, because a card is small and
most users never compare a photo against the breed name. In App Store artwork
it is a correctness problem: a screenshot captioned "Golden Retriever" showing
a pine forest is the kind of thing review and users both notice.

**Why:** the catalog's images were assigned by id without a visual pass, and an
id that still resolves looks healthy to any automated check.

**How to apply:** whenever breed photos feed a user-facing or store-facing
asset, download the candidates, tile them into a single contact sheet, and look
at it before choosing. Pair each photo with the breed it actually depicts
rather than trusting the catalog pairing, drop the dead ids, and keep the
verified files checked in so the asset build does not depend on a live fetch.
Rarity labels, unlike photos, can be trusted straight from the catalog.
