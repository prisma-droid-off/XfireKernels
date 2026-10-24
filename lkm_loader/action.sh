#!/system/bin/sh
#
# Action button (KernelSU / APatch / Magisk):
#   - if any module is loaded: unload everything
#   - otherwise: load the pinned modules
#

MODDIR=$(cd "$(dirname "$0")" && pwd)
STATE_DIR=/data/adb/lkm_loader

mkdir -p "$STATE_DIR"
chmod 755 "$MODDIR/bin/lkmctl" 2>/dev/null

LKMCTL_PLAIN=1 "$MODDIR/bin/lkmctl" toggleall 2>&1

if [ -f "$MODDIR/webroot/index.html" ]; then
    echo ""
    echo "Tip: open the module WebUI for per-module control."
fi
