#!/bin/bash
# Wrapper script for TFLite inference.
# Usage: ./infer.sh <base64_image_string>
# Returns JSON with prediction results.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/tflite_infer.py" <<< "$1"
