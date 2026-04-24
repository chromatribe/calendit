#!/usr/bin/env bash
# Build Swift release binary and assemble CalenditEventKitBridge.app (ad-hoc codesign).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

swift build -c release

APP="$ROOT/.build/CalenditEventKitBridge.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp "$ROOT/.build/release/eventkit-bridge" "$APP/Contents/MacOS/eventkit-bridge"
cp "$ROOT/AppBundle/Info.plist" "$APP/Contents/Info.plist"
cp "$ROOT/AppBundle/PkgInfo" "$APP/Contents/PkgInfo"
chmod +x "$APP/Contents/MacOS/eventkit-bridge"

if command -v codesign >/dev/null 2>&1; then
  codesign --force --deep --sign - "$APP" || true
fi

echo "Built: $APP"
echo "Try: open \"$APP\"   # first run: grant Calendar in System Settings"
echo "Or:  \"$APP/Contents/MacOS/eventkit-bridge\" serve"
