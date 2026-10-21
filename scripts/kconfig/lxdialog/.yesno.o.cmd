cmd_scripts/kconfig/lxdialog/yesno.o := gcc -Wp,-MMD,scripts/kconfig/lxdialog/.yesno.o.d -Wall -Wmissing-prototypes -Wstrict-prototypes -O2 -fomit-frame-pointer -std=gnu89     -I/data/data/com.termux/files/usr/include/ncursesw -Dbcmp=memcmp -DNCURSES_WIDECHAR -I/data/data/com.termux/files/usr/include -c -o scripts/kconfig/lxdialog/yesno.o scripts/kconfig/lxdialog/yesno.c

source_scripts/kconfig/lxdialog/yesno.o := scripts/kconfig/lxdialog/yesno.c

deps_scripts/kconfig/lxdialog/yesno.o := \
  scripts/kconfig/lxdialog/dialog.h \
  /data/data/com.termux/files/usr/include/ncursesw/ncurses.h \
  /data/data/com.termux/files/usr/include/ncursesw/ncurses_dll.h \
  /data/data/com.termux/files/usr/include/ncursesw/unctrl.h \
  /data/data/com.termux/files/usr/include/ncursesw/curses.h \

scripts/kconfig/lxdialog/yesno.o: $(deps_scripts/kconfig/lxdialog/yesno.o)

$(deps_scripts/kconfig/lxdialog/yesno.o):
