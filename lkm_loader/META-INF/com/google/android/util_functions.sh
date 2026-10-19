#!/system/bin/sh

TMPDIR=/dev/tmp
export KEYCHECK="$TMPDIR/META-INF/com/google/android/keycheck"

volume_key_selector(){
  ui_print ""
  ui_print "[+] Press Volume up for 'YES' "
  ui_print "[+] Press Volume down for 'NO' "
  ui_print ""

  chmod 755 "$KEYCHECK"
  "$KEYCHECK"
  key=$?

  case "$key" in
    42) return 0 ;;  # YES
    41) return 1 ;;  # NO
    *) abort "Invalid key pressed! Exiting..." ;;
  esac
}

boot_scripts(){

  ui_print ""
  ui_print "[?] Do you want to auto-load your modules during the boot time..?"

  if volume_key_selector; then
    ui_print "Okay..Copying boot scripts..."
    unzip -o "$ZIPFILE" 'post-fs-data.sh' -d $MODPATH >&2
  else
    ui_print "Skipping installing the boot scripts..."
    unzip -o "$ZIPFILE" 'action.sh' -d $MODPATH >&2
    ui_print "To load modules manually, press the "Action" button in your AP/KSU/Magisk Manager app."

  fi

  ui_print ""

}


install_modules(){

  ui_print "Copying modules to: /vendor/lib/modules/custom"

  unzip -o "$ZIPFILE" 'system/*' -d $MODPATH >&2

  boot_scripts

}
