export ARCH=arm64
export HOSTCC=gcc
export HOSTCXX=g++
export HOST_EXTRACFLAGS="-I$PREFIX/include/ncursesw -Dbcmp=memcmp"
make s5e8535-m14xnsxx_defconfig custom.config
make menuconfig
