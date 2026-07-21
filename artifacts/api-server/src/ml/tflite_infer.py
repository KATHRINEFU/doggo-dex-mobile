#!/usr/bin/env python3
"""
TFLite dog breed inference script for DogDex API server.
Reads a base64-encoded image from stdin, runs EfficientNetV2-S TFLite model,
returns JSON with top prediction and confidence.

Usage: echo '<base64_image>' | python3 tflite_infer.py
"""
import sys
import json
import base64
import os
import numpy as np
from PIL import Image
import io

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "dog_breed_classifier.tflite")
LABELS_PATH = os.path.join(SCRIPT_DIR, "labels.json")
MAPPING_PATH = os.path.join(SCRIPT_DIR, "breed_index_to_id.json")

# TFLite imports
try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow.lite as tflite


_interpreter = None

def load_model():
    """Load TFLite interpreter with XNNPACK delegate (cached globally)."""
    global _interpreter
    if _interpreter is not None:
        return _interpreter
    _interpreter = tflite.Interpreter(
        model_path=MODEL_PATH,
        num_threads=2,
    )
    _interpreter.allocate_tensors()
    return _interpreter


def preprocess(image_bytes):
    """Decode image bytes to 384x384 float32 array."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((384, 384), Image.Resampling.LANCZOS)
    arr = np.array(img, dtype=np.float32)
    # Model expects [0, 255] range (EfficientNetV2 handles normalization internally)
    arr = np.expand_dims(arr, axis=0)
    return arr


def infer(image_base64):
    """Run inference and return results dict."""
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        return {"error": f"Invalid base64: {str(e)}"}

    # Load model (cached in module scope)
    interpreter = load_model()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # Preprocess
    input_data = preprocess(image_bytes)

    # Run inference
    interpreter.set_tensor(input_details[0]["index"], input_data)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]["index"])[0]

    # Softmax to probabilities
    exp_out = np.exp(output - np.max(output))
    probs = exp_out / np.sum(exp_out)

    # Top-5 predictions
    top5_indices = np.argsort(probs)[-5:][::-1]

    # Load labels and mapping
    with open(LABELS_PATH) as f:
        labels = json.load(f)
    with open(MAPPING_PATH) as f:
        index_to_id = json.load(f)

    top5 = []
    for idx in top5_indices:
        dogdex_id = index_to_id[idx] if idx < len(index_to_id) else None
        top5.append({
            "stanford_index": int(idx),
            "stanford_name": labels[idx] if idx < len(labels) else "unknown",
            "dogdex_id": dogdex_id,
            "confidence": float(probs[idx]),
        })

    top1 = top5[0]
    result = {
        "top1": top1,
        "top5": top5,
        "is_dog": top1["confidence"] > 0.3,
        "confidence": top1["confidence"],
    }
    return result


if __name__ == "__main__":
    # Read base64 from stdin
    image_base64 = sys.stdin.read().strip()
    if not image_base64:
        print(json.dumps({"error": "No input provided"}), flush=True)
        sys.exit(1)

    result = infer(image_base64)
    print(json.dumps(result), flush=True)
