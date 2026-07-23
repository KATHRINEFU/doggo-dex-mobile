"""
PawDex Dog Breed Inference — Hugging Face Spaces (FastAPI)

Wraps the EfficientNetV2-S TFLite model with a simple HTTP API.
The Replit API server calls POST /detect with a base64 image.

Authentication: X-API-Key header must match the HF_INFERENCE_API_KEY secret
set in the Space's Settings → Repository secrets.
"""
import os
import json
import base64
import io
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "dog_breed_classifier.tflite")
LABELS_PATH = os.path.join(SCRIPT_DIR, "labels.json")
MAPPING_PATH = os.path.join(SCRIPT_DIR, "breed_index_to_id.json")

API_KEY = os.environ.get("HF_INFERENCE_API_KEY", "")

try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow.lite as tflite

print("PawDex inference: loading model...", flush=True)
_interpreter = tflite.Interpreter(model_path=MODEL_PATH, num_threads=4)
_interpreter.allocate_tensors()
_input_details = _interpreter.get_input_details()
_output_details = _interpreter.get_output_details()

with open(LABELS_PATH) as f:
    _labels = json.load(f)
with open(MAPPING_PATH) as f:
    _index_to_id = json.load(f)

print(f"PawDex inference: model loaded ({len(_labels)} classes)", flush=True)

app = FastAPI(title="PawDex Dog Breed Inference", version="1.0.0")


class DetectRequest(BaseModel):
    imageBase64: str


def _preprocess(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((384, 384), Image.Resampling.LANCZOS)
    arr = np.array(img, dtype=np.float32)
    return np.expand_dims(arr, axis=0)


def _infer(image_base64: str) -> dict:
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        raise ValueError(f"Invalid base64: {e}")

    input_data = _preprocess(image_bytes)
    _interpreter.set_tensor(_input_details[0]["index"], input_data)
    _interpreter.invoke()
    probs = _interpreter.get_tensor(_output_details[0]["index"])[0]

    top5_indices = np.argsort(probs)[-5:][::-1]
    top5 = []
    for idx in top5_indices:
        idx = int(idx)
        dogdex_id = _index_to_id[idx] if idx < len(_index_to_id) else None
        top5.append({
            "stanford_index": idx,
            "stanford_name": _labels[idx] if idx < len(_labels) else "unknown",
            "dogdex_id": dogdex_id,
            "confidence": float(probs[idx]),
        })

    top1 = top5[0]
    return {
        "top1": top1,
        "top5": top5,
        "is_dog": top1["confidence"] > 0.3,
        "confidence": top1["confidence"],
    }


@app.get("/health")
def health():
    return {"status": "ok", "classes": len(_labels)}


@app.post("/detect")
def detect(payload: DetectRequest, x_api_key: str = Header(...)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    try:
        result = _infer(payload.imageBase64)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")
    return result
