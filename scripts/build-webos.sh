#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLATFORM_DIR="$ROOT_DIR/platforms/webos"
BUILD_DIR="$ROOT_DIR/dist"
OUTPUT_DIR="$ROOT_DIR/output/webos"

if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: dist/ not found. Run 'npm run build' first."
  exit 1
fi

echo "==> Preparing webOS package..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

cp -r "$BUILD_DIR"/* "$OUTPUT_DIR"/
cp "$PLATFORM_DIR/appinfo.json" "$OUTPUT_DIR"/

for asset in icon.png largeIcon.png splash.png; do
  if [ -f "$PLATFORM_DIR/$asset" ]; then
    cp "$PLATFORM_DIR/$asset" "$OUTPUT_DIR"/
  fi
done

if command -v ares-package &>/dev/null; then
  echo "==> Packaging .ipk..."
  ares-package --no-minify "$OUTPUT_DIR" -o "$ROOT_DIR/output"
  echo "==> Done. IPK created in output/"
else
  echo "==> ares-cli not found. Skipping .ipk packaging."
  echo "    Install: npm install -g @aspect/webos-tv-cli"
  echo "    Or: https://webostv.developer.lge.com/develop/tools/cli"
  echo "    Raw app files are in output/webos/"
fi
