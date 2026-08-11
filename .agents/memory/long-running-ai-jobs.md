---
name: Long-running AI image jobs
description: Why badge/share image generation is a server-owned job record instead of a synchronous request, and the constraints that keeps
---

# Long-running AI image generation must be a server-owned job

`gpt-image-2` image generation takes roughly 20-60s (observed ~20s bare, ~46s
through the old synchronous endpoint). Any flow that makes the client wait for
the bytes is wrong here.

The rule: the **database row owns the lifecycle**, not the client.
- Start endpoint creates/updates a `pending` row and returns immediately.
- Generation runs after the response is sent; every exit path writes a terminal
  status (`ready` or `failed`).
- Image bytes go to Object Storage; the row keeps only the `/objects/...` path.
- Client polls status and re-checks on app foreground.

**Why:** the user must be able to background the app, navigate away, or fully
restart it and still get the image. A synchronous request loses the work on any
of those, and mobile networks make a 45s request unreliable regardless.

**How to apply:** for any generation that can exceed a few seconds (images,
video, long LLM reports). Two constraints that are easy to miss:
- Never start a second generation for a key that is already `pending` — the
  start endpoint must be idempotent, or double-taps burn duplicate API spend.
- A failure that never writes a terminal status makes the client poll forever;
  wrap the failure write in its own try/catch and log if even that fails.
- For completed mobile images, separate "open/preview" from "download/share":
  fetching into the app cache for an in-app preview is not the same as offering
  the native save/share sheet. The user should explicitly choose the latter.

## Object path convention

`PRIVATE_OBJECT_DIR` is `/<bucket>/<prefix>`. When uploading directly (not via
a signed URL), split it into bucket + prefix yourself and store the path as
`/objects/<entityId>`, where entityId excludes the prefix — that is the only
form `getObjectEntityFile` can resolve back. Storing the raw
`gs://`/bucket-qualified path will resolve to a 404 on read.

## Per-user scoping

Serve generated files through a route that looks the row up by
`(clerkId, key)` from the session, not by object path from the client.
Otherwise one account can fetch another account's generated image by guessing
the key.
