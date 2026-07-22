#!/usr/bin/env python3
"""
Persistent TFLite inference worker.

Protocol (length-prefixed JSON on stdin/stdout):
  Node sends:  <length as 8 hex chars> + <JSON payload>
  Python replies: <length as 8 hex chars> + <JSON result>

Example: 00000042{"image":"base64..."}
"""
import sys
import json
import base64
import os
import numpy as np
from PIL import Image
import io

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "dog_breed_classifier.tflite")
LABELS_PATH = os.path.join(SCRIPT_DIR, "labels.json")
MAPPING_PATH = os.path.join(SCRIPT_DIR, "breed_index_to_id.json")

# Load TFLite
print("TFLite worker: loading model...", flush=True)
try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow.lite as tflite

_interpreter = tflite.Interpreter(model_path=MODEL_PATH, num_threads=4)
_interpreter.allocate_tensors()
_input_details = _interpreter.get_input_details()
_output_details = _interpreter.get_output_details()

with open(LABELS_PATH) as f:
    _labels = json.load(f)
with open(MAPPING_PATH) as f:
    _index_to_id = json.load(f)

print("TFLite worker: model loaded", flush=True)


def _write_payload(obj):
    """Write JSON line to stdout (NDJSON)."""
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def preprocess(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((384, 384), Image.Resampling.LANCZOS)
    arr = np.array(img, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)
    return arr


def infer(image_base64):
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        return {"error": f"Invalid base64: {str(e)}"}

    input_data = preprocess(image_bytes)
    _interpreter.set_tensor(_input_details[0]["index"], input_data)
    _interpreter.invoke()
    output = _interpreter.get_tensor(_output_details[0]["index"])[0]

    # Model includes a softmax output layer — use raw output directly as probabilities
    probs = output
    top5_indices = np.argsort(probs)[-5:][::-1]

    top5 = []
    for idx in top5_indices:
        dogdex_id = _index_to_id[idx] if idx < len(_index_to_id) else None
        top5.append({
            "stanford_index": int(idx),
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


if __name__ == "__main__":
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except Exception:
            _write_payload({"error": "Invalid JSON"})
            continue

        # Keepalive ping — no model work, just keeps process warm
        if payload.get("ping"):
            _write_payload({"ping": "ok"})
            continue

        image_b64 = payload.get("image", "")
        if not image_b64:
            _write_payload({"error": "Missing 'image' field"})
            continue

        try:
            result = infer(image_b64)
            _write_payload(result)
        except Exception as e:
            _write_payload({"error": f"Inference error: {str(e)}"})

    print("TFLite worker: shutting down", flush=True)
