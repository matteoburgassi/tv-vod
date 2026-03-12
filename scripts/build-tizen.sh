#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLATFORM_DIR="$ROOT_DIR/platforms/tizen"
BUILD_DIR="$ROOT_DIR/dist"
OUTPUT_DIR="$ROOT_DIR/output/tizen"

if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: dist/ not found. Run 'npm run build' first."
  exit 1
fi

echo "==> Preparing Tizen package..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

cp -r "$BUILD_DIR"/* "$OUTPUT_DIR"/
cp "$PLATFORM_DIR/config.xml" "$OUTPUT_DIR"/

for asset in icon.png; do
  if [ -f "$PLATFORM_DIR/$asset" ]; then
    cp "$PLATFORM_DIR/$asset" "$OUTPUT_DIR"/
  fi
done

if command -v tizen &>/dev/null; then
  echo "==> Packaging .wgt..."
  tizen package -t wgt -s "$OUTPUT_DIR" -- "$OUTPUT_DIR"
  mv "$OUTPUT_DIR"/*.wgt "$ROOT_DIR/output/" 2>/dev/null || true
  echo "==> Done. WGT created in output/"
else
  echo "==> Tizen CLI not found. Skipping .wgt packaging."
  echo "    Install Tizen Studio: https://developer.tizen.org/development/tizen-studio/download"
  echo "    Raw app files are in output/tizen/"
fi
