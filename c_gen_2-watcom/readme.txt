more portable c generator (which can even run on arduino)
https://github.com/ricmoo/QRCode

Compile in TCC:
tcc main.c qrcode.c
C:\local\tcc925\tcc.exe main.c qrcode.c

Compile in OpenWatcom for Windows NT:
cl main.c qrcode.c
C:\WATCOM\binnt\cl.exe main.c qrcode.c

Compile in OpenWatcom for DOS / 8086:
wcl -0 -mt main.c qrcode.c
C:\WATCOM\binnt\wcl -0 -mt main.c qrcode.c