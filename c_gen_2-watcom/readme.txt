more portable c generator (which can even run on arduino)
https://github.com/ricmoo/QRCode

Compile in TCC:
tcc main.c qrcode.c
C:\local\tcc925\tcc.exe main.c qrcode.c

Compile in OpenWatcom for Windows NT:
cl main.c qrcode.c
C:\WATCOM\binnt\cl.exe main.c qrcode.c

Compile in OpenWatcom for DOS / 8086:
wcl -0 -mt -DDOS_BUILD -fe=qrdos.com main.c qrcode.c
C:\WATCOM\binnt\wcl -0 -mt -DDOS_BUILD -fe=qrdos.com main.c qrcode.c

Windows Port (winmain):
compile in tcc:
C:\local\tcc925\tcc.exe winmain.c qrcode.c -o winqr.exe

Compile with MSVC2:
set INCLUDE=S:\MSVC4\INCLUDE
set LIB=S:\MSVC4\LIB
cl /Fewinqr32x.exe winmain.c qrcode.c /link  user32.lib gdi32.lib
cl /Fewinqr326.exe winqr16.c qrcode.c /link  user32.lib gdi32.lib


Compile WinQr16.c for Windows 3.1
set WATCOM=C:\WATCOM
set PATH=%WATCOM%\BINNT;%PATH%
set INCLUDE=%WATCOM%\H;%WATCOM%\h\win
set LIB=%WATCOM%\LIB286;%WATCOM%\LIB286\win
C:\WATCOM\binnt\wcc winqr16.c -bt=windows -ms
C:\WATCOM\binnt\wcc qrcode.c -bt=windows -ms
C:\WATCOM\binnt\wlink system windows name winqr16 file winqr16.obj,qrcode.obj library user,gdi,kernel
C:\local\otvdm-v0.9.0\otvdm.exe winqr16.exe
