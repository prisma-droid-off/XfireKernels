export ZIPFILE="$ZIPFILE"

SKIPMOUNT=false
PROPFILE=false
# scripts are extracted with the module itself in on_install()
POSTFSDATA=false
LATESTARTSERVICE=false

ui_print " "
ui_print "*************************************"
ui_print "        - Custom LKM Loader -        "
ui_print "            by @prisma_alt           "
ui_print "        credits to ravindu644        "
ui_print "*************************************"
ui_print " "

on_install() {
  ui_print "- Extracting module files"
  unzip -o "$ZIPFILE" -x 'META-INF/*' -d "$MODPATH" >&2

  ui_print "- Setting up module manager state"
  mkdir -p /data/adb/lkm_loader
  [ -f /data/adb/lkm_loader/known ]  || : > /data/adb/lkm_loader/known
  [ -f /data/adb/lkm_loader/pinned ] || : > /data/adb/lkm_loader/pinned

  chmod 755 "$MODPATH/bin/lkmctl"
  # register shipped modules; nothing is pinned/loaded by default
  "$MODPATH/bin/lkmctl" sync >&2

  ui_print " "
  ui_print "- Nothing loads at boot by default."
  ui_print "- Pin modules in the WebUI to load them"
  ui_print "  automatically on every boot."
  ui_print " "
}

set_permissions() {
  set_perm_recursive $MODPATH 0 0 0755 0644

  set_perm $MODPATH/post-fs-data.sh 0 0 0755
  set_perm $MODPATH/bin/lkmctl 0 0 0755
  set_perm_recursive $MODPATH/webroot 0 0 0755 0644

  set_perm $MODPATH/system/bin/keycheck 0 2000 0755 u:object_r:system_file:s0
  set_perm_recursive $MODPATH/system/vendor/lib/modules/custom 0 2000 0755 0644 u:object_r:vendor_file:s0
}
