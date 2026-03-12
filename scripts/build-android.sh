#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLATFORM_DIR="$ROOT_DIR/platforms/android-tv"
BUILD_DIR="$ROOT_DIR/dist"
ASSETS_DIR="$PLATFORM_DIR/app/src/main/assets"

if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: dist/ not found. Run 'npm run build' first."
  exit 1
fi

echo "==> Copying web assets into Android project..."
rm -rf "$ASSETS_DIR"
mkdir -p "$ASSETS_DIR"
cp -r "$BUILD_DIR"/* "$ASSETS_DIR"/

if command -v "$PLATFORM_DIR/gradlew" &>/dev/null || [ -f "$PLATFORM_DIR/gradlew" ]; then
  echo "==> Building APK with Gradle..."
  cd "$PLATFORM_DIR"
  ./gradlew assembleDebug
  mkdir -p "$ROOT_DIR/output"
  cp app/build/outputs/apk/debug/*.apk "$ROOT_DIR/output/" 2>/dev/null || true
  echo "==> Done. APK created in output/"
elif command -v gradle &>/dev/null; then
  echo "==> Building APK with system Gradle..."
  cd "$PLATFORM_DIR"
  gradle assembleDebug
  mkdir -p "$ROOT_DIR/output"
  cp app/build/outputs/apk/debug/*.apk "$ROOT_DIR/output/" 2>/dev/null || true
  echo "==> Done. APK created in output/"
else
  echo "==> Gradle not found. Skipping APK build."
  echo "    Install Android Studio or the Gradle wrapper."
  echo "    Web assets copied to: $ASSETS_DIR"
fi
