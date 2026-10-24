# Custom LKM Loader

Dynamic **Loadable Kernel Module (LKM)** manager for **Magisk / KernelSU / APatch**, with a built-in WebUI.

- Author: **[@prisma_alt](https://github.com/prisma-droid-off)**
- Credits: **[ravindu644](https://github.com/ravindu644)** for the original LKM Loader concept

---

## Why

When enabling new drivers in GKI kernels, the build system forces them to be built as loadable modules (`.ko`) instead of inline drivers. On some devices (notably certain OnePlus models) the `.ko` files placed in the `vendor_dlkm` partition are never loaded, even with a correct `modules.load`, `modules.dep` and friends. Loading them by hand with `insmod` breaks dependency resolution.

This module reproduces the stock module-loading pipeline with `modprobe`, so your custom modules load correctly — and gives you full control over **which** modules load and **when**.

## Features

- **On-demand load / unload** any module at runtime
- **Boot pinning** — choose exactly which modules load automatically at every boot
- **WebUI** (KernelSU / APatch) — search, toggle modules, manage pins with a clean black & white interface
- **Off by default** — nothing loads at boot until you pin it; pin choices persist across updates
- Boot log at `/data/adb/lkm_loader/boot.log`

## WebUI

Open the module card in **KernelSU** or **APatch** and tap **Open** / **WebUI**.

| Control | Action |
| --- | --- |
| Search field | Filter modules by name |
| Switch | Load / unload the module immediately |
| Pin icon | Include / exclude the module from boot loading |
| Load pinned | Load every pinned module now |
| Load all | Load every shipped module now |
| Unload all | Unload every loaded module (reverse dependency order) |
| Pin all / Clear pins | Bulk-edit the boot list |

Magisk does not support module WebUIs — use the CLI below.

## CLI

```sh
# list modules as JSON
sh /data/adb/modules/lkm_loader/bin/lkmctl list

# load / unload a single module (dependencies handled by modprobe)
sh /data/adb/modules/lkm_loader/bin/lkmctl load    wlan
sh /data/adb/modules/lkm_loader/bin/lkmctl unload  wlan

# boot pin management
sh /data/adb/modules/lkm_loader/bin/lkmctl pin     wlan
sh /data/adb/modules/lkm_loader/bin/lkmctl unpin   wlan
sh /data/adb/modules/lkm_loader/bin/lkmctl pinall
sh /data/adb/modules/lkm_loader/bin/lkmctl unpinall

# bulk operations
sh /data/adb/modules/lkm_loader/bin/lkmctl loadpins    # load pinned set now
sh /data/adb/modules/lkm_loader/bin/lkmctl loadall
sh /data/adb/modules/lkm_loader/bin/lkmctl unloadall
sh /data/adb/modules/lkm_loader/bin/lkmctl status
```

Only pinned modules load at boot. State lives in `/data/adb/lkm_loader/` (`known`, `pinned`, `boot.log`); pins persist across reboots and updates, while load/unload actions are runtime-only and reset on reboot.

## Installation

1. Flash the module zip in Magisk / KernelSU / APatch.
2. Reboot — nothing loads automatically; all modules start unpinned.
   Older builds auto-pinned everything on install, so upgrading clears that
   legacy list once, while your own pin choices are kept.
3. Open the WebUI (or use the CLI) to customise the set.

For GKI kernels that also ship modules in `vendor_boot`, flash the matching `vendor_boot.img` right after installing the module — see below.

---

## Requirements

⚠️ The kernel and the LKMs **must be built together** in the same build process.

- ✅ Custom kernel + matching custom `.ko` modules
- ❌ Stock kernel + custom `.ko` modules
- ❌ Custom kernel + `.ko` modules from a different kernel

Install the packaging dependencies:

```bash
sudo apt install kmod binutils-aarch64-linux-gnu -y
```

## Packaging your LKMs

### Non-GKI kernels

```bash
# stage every built module + build metadata
mkdir -p staging
for i in $(find . -name "*.ko"); do cp -ar "$i" staging/; done
cp System.map Module.symvers modules.builtin modules.order staging/
```

Clone the tools and run the packaging script:

```bash
git clone https://github.com/ravindu644/LKM_Tools.git
cd LKM_Tools && ./04.prepare_only_nethunter_modules.sh
```

Answer the prompts with your modules directory, kernel staging directory, `System.map`, output directory and strip tool (`which aarch64-linux-gnu-strip`).

Then copy the packaged modules:

```bash
cp -r <output>/vendor_dlkm/lib/modules/<kernel_version>/* \
      lkm_loader/system/vendor/lib/modules/custom/
```

### GKI kernels

GKI splits modules across two partitions:

- **`vendor_boot`** — early-boot modules, not accessible from Android userspace
- **`vendor_dlkm`** — the bulk of the modules, accessible from userspace (**put your custom modules here**)

Because `vendor_dlkm` modules can depend on `vendor_boot` modules, generate the module list from the stock `vendor_boot`'s `modules.dep`:

```bash
# dump and unpack the stock vendor_boot image
dd if=/dev/block/by-name/vendor_boot of=/sdcard/vendor_boot.img
# unpack with Android_boot_image_editor (cfig) and locate modules.dep
```

Run the LKM Tools script, then:

- copy `vendor_dlkm/lib/modules/<kernel_version>/*` → `lkm_loader/system/vendor/lib/modules/custom/`
- repack the modified `vendor_boot.img` with any `vendor_boot` modules and flash it **immediately after** installing this module, before the first reboot.

### Expected layout

```
lkm_loader/
├── bin/lkmctl
├── webroot/                 # WebUI
├── post-fs-data.sh          # boot pin loader
├── system/vendor/lib/modules/custom/
│   ├── your_module1.ko
│   ├── your_module2.ko
│   ├── modules.alias
│   ├── modules.dep
│   ├── modules.load
│   ├── modules.order
│   ├── modules.softdep
│   ├── modules.symbols
│   └── modules.weakdep
└── module.prop
```

## Troubleshooting

- **A module fails to load** — confirm it was built with the exact same kernel tree/config as the running kernel.
- **A module fails to unload** — something else is using it (`lsmod` shows a non-zero refcount); reboot or unload the dependent module first.
- **Nothing loads at boot** — expected until you pin modules; check the pin list with `lkmctl list` and `/data/adb/lkm_loader/boot.log` for failures.
- **GKI-specific issues** — make sure the matching modified `vendor_boot.img` was flashed together with this module.

## Credits

Original [LKM Loader](https://github.com/ravindu644/Magisk_LKM_Loader) by **ravindu644** — this fork keeps the same packaging model and adds runtime control, boot pinning and the WebUI.

💡 Always keep a backup of your stock `vendor_boot.img` before flashing a modified one.
