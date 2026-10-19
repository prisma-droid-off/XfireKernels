#!/system/bin/sh

MODPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

/system/bin/modprobe \
    -d "${MODPATH}/system/vendor/lib/modules/custom" \
    --all="${MODPATH}/system/vendor/lib/modules/custom/modules.load"
