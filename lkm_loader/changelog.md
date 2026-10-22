# Custom LKM Loader — XfireKernels

> Dynamic loadable kernel module (LKM) loader for Magisk / KernelSU / APatch.
> Base module by [ravindu644](https://github.com/ravindu644) · Maintained by [@prisma-droid-off](https://github.com/prisma-droid-off).

---

## v1.21

**Release date:** 2026-10-22

### Source Commit
- [`1a669f62e`](https://github.com/prisma-droid-off/XfireKernels/commit/1a669f62e271117d4dd5ce86b1e53f0815a4f47d) update: refined custom.config (built from)

### Overview
This release refreshes the bundled custom LKMs (vendor / `vendor_dlkm` modules) shipped with the latest XfireKernels build, keeping your device's kernel modules in sync with the newest kernel Image.

### Notes
- Module metadata (`module.prop`, `update.json`) is synchronized automatically by CI on every build.
- Requires the matching XfireKernels AnyKernel3 image (`XfireKernels_v1.21.zip`) to be flashed first.

### Installation
1. Flash the matching XfireKernels kernel image.
2. Flash `Custom-LKM-Loader-v1.21.zip` in Magisk / KernelSU / APatch.
3. Reboot and verify modules load via `modprobe`.

---

## Support
For issues and updates, see the [XfireKernels repository](https://github.com/prisma-droid-off/XfireKernels) or open a GitHub issue.
