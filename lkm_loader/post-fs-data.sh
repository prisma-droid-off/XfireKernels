#!/system/bin/sh
#
# Load pinned LKMs at boot (post-fs-data stage).
# Only modules pinned in /data/adb/lkm_loader/pinned are loaded.
#

MODDIR=$(cd "$(dirname "$0")" && pwd)
STATE_DIR=/data/adb/lkm_loader

mkdir -p "$STATE_DIR"
chmod 755 "$MODDIR/bin/lkmctl" 2>/dev/null

"$MODDIR/bin/lkmctl" loadpins >> "$STATE_DIR/boot.log" 2>&1
