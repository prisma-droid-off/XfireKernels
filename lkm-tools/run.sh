#!/usr/bin/bash

# Fix variable assignment (remove spaces)
home="$GITHUB_WORKSPACE"
MODDIR=$(ls -d "$home"/out/staging/lib/modules/*/ | head -n1)

rm -fr built_dlkm built_vendor prepare_dlkm custom_dlkm
mkdir -p built_vendor built_dlkm prepare_dlkm custom_dlkm

# manually copy kernel modules to prepare_dlkm folder
# Define modules as a Bash array
custom_modules=(
    "macvlan.ko"
    "ip_vs.ko"
    "br_netfilter.ko"
)

# Loop through the array properly
for module in "${custom_modules[@]}"; do
    # Search for the module inside MODDIR and copy it to prepare_dlkm
    find "$MODDIR" -type f -name "$module" -exec cp {} prepare_dlkm/ \;
done

# only OEM modules go here
"$home"/lkm-tools/02.prepare_vendor_boot_modules.sh \
"$home"/lkm-tools/vendor_boot/modules_list.txt \
"$MODDIR" \
"$home"/lkm-tools/vendor_boot/modules.load \
"$home"/out/System.map \
/usr/bin/llvm-strip \
"$home"/built_vendor

# here i can prepare vendor_dlkm
"$home"/lkm-tools/03.prepare_vendor_dlkm.sh \
"$home"/lkm-tools/vendor_dlkm/modules_list.txt \
"$MODDIR" \
"$home"/lkm-tools/vendor_dlkm/modules.load \
"$home"/out/System.map \
/usr/bin/llvm-strip \
"$home"/built_dlkm \
"$home"/lkm-tools/vendor_boot/modules_list.txt \
"" # "$home"/prepare_dlkm, let me remove these modules from vdlkm

# here i can send my custom enabled features
"$home"/lkm-tools/04.prepare_only_nethunter_modules.sh \
"$home"/prepare_dlkm \
"$MODDIR" \
"$home"/lkm-tools/vendor_boot/modules_list.txt \
"$home"/lkm-tools/vendor_dlkm/modules_list.txt \
"$home"/out/System.map \
"$home"/custom_dlkm \
/usr/bin/llvm-strip
