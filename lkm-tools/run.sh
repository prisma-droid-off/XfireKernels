#!/usr/bin/bash

# Fix variable assignment (remove spaces)
home="$GITHUB_WORKSPACE"

rm -fr modules.zip
rm -fr built_vendor
mkdir -p built_vendor

# Use correct paths anchored to $home
"$home"/lkm-tools/02.prepare_vendor_boot_modules.sh \
"$home"/lkm-tools/vendor_boot/modules_list.txt \
"$home"/out/staging/lib/modules/5.15.197@prisma-droid \
"$home"/lkm-tools/vendor_boot/modules.load \
"$home"/out/System.map \
/usr/bin/llvm-strip \
"$home"/built_vendor
