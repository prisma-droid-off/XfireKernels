#!/bin/bash
# Copyright (c) 2026 ravindu644 <droidcasts@protonmail.com>
# SPDX-License-Identifier: GPL-2.0-or-later
#
# Linux 5.15 (GKI 2.0) arm64 kernel build script.
# Toolchain: clang-r450784e (LLVM only -- no GCC cross compiler needed)
#
# Put this in your kernel root, edit the settings below, then run:
#   chmod +x build_5.15.sh && ./build_5.15.sh

set -euo pipefail

# ---------------------------------------------------------------------------
#  SETTINGS -- the only part you normally need to touch
# ---------------------------------------------------------------------------
DEFCONFIG="s5e8535-m14xnsxx_defconfig"      # name from arch/arm64/configs (also: vendor/foo_defconfig)
EXTRA_CONFIGS=(custom.config)               # fragments merged on top, e.g. (custom.config)
KERNEL_IMAGE="Image"           # Image | Image.gz | Image.gz-dtb  (MediaTek needs Image.gz)
USE_OUT_DIR=1                  # 0 = build in-tree; most Samsung Exynos trees need 0
MENUCONFIG=0                   # 0 = skip the menuconfig GUI
export KBUILD_BUILD_USER="@prisma_droid"
export DTC_FLAGS="-@"
export PLATFORM_VERSION=13
export ANDROID_MAJOR_VERSION=t
export LLVM=1
export DEPMOD=depmod
export ARCH=arm64
export TARGET_SOC=s5e8535

# Some OEM trees need extra variables -- check README_Kernel.txt or build_kernel.sh:
# export TARGET_SOC=s5e9925 PLATFORM_VERSION=12 ANDROID_MAJOR_VERSION=s
# ---------------------------------------------------------------------------

KERNEL_ROOT="$(dirname "$(readlink -f "$0")")"
CLANG="${HOME}/toolchains/clang-r450784e"
cd "${KERNEL_ROOT}"

info(){ echo -e "\n[INFO]: $*\n"; }
die(){ echo -e "\n[ERROR]: $*\n" >&2; exit 1; }

# fetch <dir> <url> [strip-components] -- does nothing if <dir> already exists
fetch(){
    [ -d "$1" ] && return 0
    info "Downloading $(basename "$1")..."
    mkdir -p "$1"
    local z=z; case "$2" in *.xz) z=J;; esac   # tar can't sniff compression off a pipe
    curl -Lf --progress-bar "$2" | tar -x"$z" -C "$1" --strip-components="${3:-0}" \
        || { rm -rf "$1"; die "Failed to download $2"; }
}

DEB_PKGS=(build-essential bc bison flex pkg-config git curl tar xz-utils zip unzip cpio rsync
          kmod perl python3 python-is-python3 libssl-dev libelf-dev pahole libncurses-dev clang
          zlib1g-dev libyaml-dev lz4 zstd device-tree-compiler llvm-dev llvm-runtime llvm)

install_deps(){
    local missing=() available=() p
       for p in "${DEB_PKGS[@]}"; do
            [ "$(dpkg-query -W -f='${db:Status-Status}' "$p" 2>/dev/null)" = installed ] || missing+=("$p")
        done
        [ "${#missing[@]}" = 0 ] && return 0
        # drop whatever this release no longer ships (e.g. libtinfo5 on Ubuntu 24.04+)
        for p in "${missing[@]}"; do apt-cache show "$p" &>/dev/null && available+=("$p"); done
        [ "${#available[@]}" = 0 ] && return 0
        info "Installing: ${available[*]}"
        sudo apt update && sudo apt install -y "${available[@]}" || die "apt failed"
}

[ -f Makefile ] && [ -d arch/arm64 ] || die "Run this from the kernel source root."
install_deps
[ -f .gitmodules ] && git submodule update --init --recursive

fetch "${CLANG}" "https://github.com/ravindu644/Android-Kernel-Tutorials/releases/download/toolchains/clang-r450784e.tar.gz"
export PATH="${CLANG}/bin:${PATH}"
export LD_LIBRARY_PATH="${CLANG}/lib:${CLANG}/lib64:${LD_LIBRARY_PATH:-}"

# LLVM=1 points every tool (clang, ld.lld, llvm-ar, ...) at the toolchain above.
# 5.15+ picks its own --target, so no CROSS_COMPILE and no GCC are involved.
BUILD_OPTIONS=(
    -j"$(nproc)"
    ARCH=arm64
    LLVM=1
    LLVM_IAS=1
    HOSTCC=gcc
    HOSTCXX=g++
)

if command -v ccache >/dev/null && [ "${USE_CCACHE:-0}" = 1 ]; then
    BUILD_OPTIONS+=(CC="ccache clang" HOSTCC="ccache gcc" HOSTCXX="ccache g++")
else
    BUILD_OPTIONS+=(HOSTCC=gcc HOSTCXX=g++)
fi

if [ "${USE_OUT_DIR}" = 1 ]; then
    BUILD_OPTIONS+=(O="${KERNEL_ROOT}/out")
    BOOT_DIR="${KERNEL_ROOT}/out/arch/arm64/boot"
else
    BOOT_DIR="${KERNEL_ROOT}/arch/arm64/boot"
fi

build_kernel(){
    info "Kernel $(make kernelversion) | defconfig: ${DEFCONFIG}"

    make "${BUILD_OPTIONS[@]}" "${DEFCONFIG}" "${EXTRA_CONFIGS[@]}" || die "Failed to write .config"

    if [ "${MENUCONFIG}" = 1 ]; then
        make "${BUILD_OPTIONS[@]}" menuconfig
    fi

    make "${BUILD_OPTIONS[@]}" "${KERNEL_IMAGE}" || die "Build failed"

    # --- Add these lines to build and install modules ---
    info "Building kernel modules..."
    make "${BUILD_OPTIONS[@]}" modules || die "Modules build failed"

    info "Installing modules to staging directory..."
    make "${BUILD_OPTIONS[@]}" INSTALL_MOD_PATH="${KERNEL_ROOT}/out/staging" modules_install || die "Modules install failed"
    # --------------------------------------------------

    mkdir -p "${KERNEL_ROOT}/build"
    cp "${BOOT_DIR}/${KERNEL_IMAGE}" "${KERNEL_ROOT}/build/"
    info "Done -> build/${KERNEL_IMAGE}"
}

build_kernel
