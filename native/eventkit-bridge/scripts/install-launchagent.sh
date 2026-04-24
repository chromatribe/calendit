#!/usr/bin/env bash
# Install LaunchAgent to run the EventKit bridge at login (user GUI session).
# Usage:
#   ./install-launchagent.sh [path-to-eventkit-bridge-binary]
# Default: .build/CalenditEventKitBridge.app/Contents/MacOS/eventkit-bridge (run build-app-bundle.sh first)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_BIN="$ROOT/.build/CalenditEventKitBridge.app/Contents/MacOS/eventkit-bridge"
TARGET="${1:-$DEFAULT_BIN}"

if [[ ! -x "$TARGET" ]]; then
  echo "Executable not found: $TARGET" >&2
  echo "Run first: $ROOT/scripts/build-app-bundle.sh" >&2
  exit 1
fi

LABEL="com.chromatribe.calendit.eventkit-bridge"
PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST="${PLIST_DIR}/${LABEL}.plist"
mkdir -p "$PLIST_DIR" "${HOME}/Library/Logs"

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
rm -f "$PLIST"

export CALENDIT_BRIDGE_INSTALL_TARGET="$TARGET"
export CALENDIT_BRIDGE_INSTALL_PLIST="$PLIST"
python3 <<'PY'
import os
import pathlib
import plistlib

target = pathlib.Path(os.environ["CALENDIT_BRIDGE_INSTALL_TARGET"]).resolve()
plist_path = pathlib.Path(os.environ["CALENDIT_BRIDGE_INSTALL_PLIST"])
home = pathlib.Path.home()
label = "com.chromatribe.calendit.eventkit-bridge"
data = {
    "Label": label,
    "ProgramArguments": [str(target), "serve"],
    "RunAtLoad": True,
    "KeepAlive": True,
    "StandardOutPath": str(home / "Library/Logs/calendit-eventkit-bridge.log"),
    "StandardErrorPath": str(home / "Library/Logs/calendit-eventkit-bridge.err.log"),
}
plist_path.write_bytes(plistlib.dumps(data, fmt=plistlib.FMT_XML))
PY
unset CALENDIT_BRIDGE_INSTALL_TARGET CALENDIT_BRIDGE_INSTALL_PLIST

launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed and loaded: $PLIST"
echo "Logs: ${HOME}/Library/Logs/calendit-eventkit-bridge.log"
