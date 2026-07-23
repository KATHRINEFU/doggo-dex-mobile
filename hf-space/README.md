---
title: PawDex Dog Breed Inference
emoji: 🐾
colorFrom: amber
colorTo: orange
sdk: docker
pinned: false
---

# PawDex Dog Breed Inference

EfficientNetV2-S TFLite model served via FastAPI for the PawDex mobile app.

## Endpoints

- `GET /health` — liveness check
- `POST /detect` — run breed inference

```json
POST /detect
Headers: x-api-key: <your secret>
Body: { "imageBase64": "<base64 JPEG string>" }
```

## Files needed in this Space

Upload these from `artifacts/api-server/src/ml/` in your repo:

| File | Description |
|------|-------------|
| `dog_breed_classifier.tflite` | EfficientNetV2-S model (78 MB) — upload via Git LFS |
| `labels.json` | 122 Stanford Dog Dataset class names |
| `breed_index_to_id.json` | Maps model output index → PawDex breed ID |

## Secrets (Space Settings → Variables and secrets)

| Name | Value |
|------|-------|
| `HF_INFERENCE_API_KEY` | Any strong random string — must match `HF_INFERENCE_API_KEY` in your Replit secrets |
