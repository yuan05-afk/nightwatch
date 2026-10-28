#!/usr/bin/env bash
# Build, validate and render the deck.
#   PPTX_SKILL_DIR=<pptx skill dir> bash deck/build.sh
set -euo pipefail
cd "$(dirname "$0")"
NODE_PATH="$PWD/node_modules" node build_deck.js
if [ -n "${PPTX_SKILL_DIR:-}" ]; then
  python "$PPTX_SKILL_DIR/scripts/office/validate.py" NIGHTWATCH-DataNova2026.pptx
fi
powershell -NoProfile -ExecutionPolicy Bypass -File render.ps1 > /dev/null
echo "rendered to deck/render/"
