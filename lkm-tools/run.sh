#!/usr/bin/bash

# Fix variable assignment (remove spaces)
home="$GITHUB_WORKSPACE"
MODDIR=$(ls -d "$home"/out/staging/lib/modules/*/ | head -n1)

rm -fr modules.zip
rm -fr built_vendor
rm -fr vendor_dlkm
mkdir -p built_vendor
mkdir -p built_dlkm

# only OEM modules go here
"$home"/lkm-tools/02.prepare_vendor_boot_modules.sh \
"$home"/lkm-tools/vendor_boot/modules_list.txt \
"$MODDIR" \
"$home"/lkm-tools/vendor_boot/modules.load \
"$home"/out/System.map \
/usr/bin/llvm-strip \
"$home"/built_vendor

# here i can send my custom enabled features
"$home"/lkm-tools/03.prepare_vendor_dlkm.sh \
"$home"/lkm-tools/vendor_dlkm/modules_list.txt \
"$MODDIR" \
"$home"/lkm-tools/vendor_dlkm/modules.load \
"$home"/out/System.map \
/usr/bin/llvm-strip \
"$home"/built_dlkm \
"$home"/lkm-tools/vendor_boot/modules_list.txt