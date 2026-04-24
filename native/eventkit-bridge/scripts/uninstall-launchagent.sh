#!/usr/bin/env bash
# Unload and remove the Calendit EventKit bridge LaunchAgent.
set -euo pipefail
LABEL="com.chromatribe.calendit.eventkit-bridge"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"

if [[ -f "$PLIST" ]]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed: $PLIST"
else
  echo "No plist at $PLIST (nothing to do)"
fi
