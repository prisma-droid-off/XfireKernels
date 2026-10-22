# Custom LKM Loader — XfireKernels

> Dynamic loadable kernel module (LKM) loader for Magisk / KernelSU / APatch.
> Base module by [ravindu644](https://github.com/ravindu644) · Maintained by [@prisma-droid-off](https://github.com/prisma-droid-off).

---

## v1.25

**Release date:** 2026-10-22

### Source Commit
- [`29f04d590`](https://github.com/prisma-droid-off/XfireKernels/commit/29f04d5900b7a418fc3410c2bcd801a99e1693fc) update: fix non prefixed CONFIG's in custom.config (built from)

### Overview
This release refreshes the bundled custom LKMs (vendor / `vendor_dlkm` modules) shipped with the latest XfireKernels build, keeping your device's kernel modules in sync with the newest kernel Image.

### Notes
- Module metadata (`module.prop`, `update.json`) is synchronized automatically by CI on every build.
- Requires the matching XfireKernels AnyKernel3 image (`XfireKernels_v1.25.zip`) to be flashed first.

### Installation
1. Flash the matching XfireKernels kernel image.
2. Flash `Custom-LKM-Loader-v1.25.zip` in Magisk / KernelSU / APatch.
3. Reboot and verify modules load via `modprobe`.

---

## Support
For issues and updates, see the [XfireKernels repository](https://github.com/prisma-droid-off/XfireKernels) or open a GitHub issue.
