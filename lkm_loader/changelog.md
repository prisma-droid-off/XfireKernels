# Custom LKM Loader — XfireKernels

> Dynamic loadable kernel module (LKM) loader for Magisk / KernelSU / APatch.
> Base module by [ravindu644](https://github.com/ravindu644) · Maintained by [@prisma-droid-off](https://github.com/prisma-droid-off).

---

## v1.22

**Release date:** 2026-10-22

### Source Commit
- [`c938cf002`](https://github.com/prisma-droid-off/XfireKernels/commit/c938cf00229fc6174a8febff7fb9c13774b9c53a) nuke: defex, and test more custom.config (built from)

### Overview
This release refreshes the bundled custom LKMs (vendor / `vendor_dlkm` modules) shipped with the latest XfireKernels build, keeping your device's kernel modules in sync with the newest kernel Image.

### Notes
- Module metadata (`module.prop`, `update.json`) is synchronized automatically by CI on every build.
- Requires the matching XfireKernels AnyKernel3 image (`XfireKernels_v1.22.zip`) to be flashed first.

### Installation
1. Flash the matching XfireKernels kernel image.
2. Flash `Custom-LKM-Loader-v1.22.zip` in Magisk / KernelSU / APatch.
3. Reboot and verify modules load via `modprobe`.

---

## Support
For issues and updates, see the [XfireKernels repository](https://github.com/prisma-droid-off/XfireKernels) or open a GitHub issue.
