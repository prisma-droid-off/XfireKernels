#!/system/bin/sh

export KEYCHECK="/system/bin/keycheck"
MODPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

# BASIC FUNCTIONS - START

ui_print() { echo "$1"; }

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

# BASIC FUNCTIONS - END

ui_print " "
ui_print "*************************************"
ui_print "        - Custom LKM loader -        "
ui_print "           by ravindu644             "
ui_print "*************************************"
ui_print " "

ui_print "[?] Do you want to load your kernel modules now..?"
ui_print ""  

if volume_key_selector; then
    ui_print "Okay, starting to load all the custom LKMs..."
    ui_print ""

    # Capture both stdout and stderr from modprobe
    modprobe_output=$(/system/bin/modprobe \
        -d "${MODPATH}/system/vendor/lib/modules/custom" \
        --all="${MODPATH}/system/vendor/lib/modules/custom/modules.load" 2>&1)
    modprobe_exit_code=$?

    # Print the output line by line
    if [ -n "$modprobe_output" ]; then
        ui_print "--- modprobe output ---"
        echo "$modprobe_output" | while IFS= read -r line; do
            ui_print "$line"
        done
        ui_print "--- end output ---"
    else
        ui_print "No output from modprobe"
    fi

    ui_print ""
    
    # Check exit status and provide feedback
    if [ $modprobe_exit_code -eq 0 ]; then
        ui_print "✓ All modules loaded successfully!"
    else
        ui_print "✗ modprobe exited with code: $modprobe_exit_code"
        ui_print "Some modules may have failed to load"
    fi

    ui_print ""
else
    ui_print "Okay, Exiting..."
    exit 1
fi
