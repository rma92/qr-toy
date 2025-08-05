set PATH=%PATH%;C:\local\codeblocks8\MinGW\bin\;C:\local\crinkler23\Win32\
gcc.exe -c main.c -o main.o
gcc.exe -std=c99 -c qrcode.c -o qrcode.o
REM gcc.exe -std=c99 -c qrcode.c -o qrcode.o
REM Crinkler.exe main.o qrcode.o /OUT:qr2.exe /SUBSYSTEM:CONSOLE /LIBPATH:"C:\MSVC4\LIB" user32.lib kernel32.lib msvcrt.lib
Crinkler.exe main.o /OUT:qr2.exe /SUBSYSTEM:CONSOLE /LIBPATH:"C:\MSVC4\LIB" user32.lib kernel32.lib msvcrt.lib
REM Crinkler.exe win32.o win32.res /OUT:win32c.exe /SUBSYSTEM:WINDOWS /ENTRY:_start /LIBPATH:"C:\MSVC4\LIB" winmm.lib gdi32.lib user32.lib kernel32.lib

REM C:\local\crinkler23\Win32\Crinkler.exe win32.o win32.res /OUT:win32c.exe /SUBSYSTEM:WINDOWS /ENTRY:_start /LIBPATH:"C:\MSVC4\LIB" winmm.lib gdi32.lib user32.lib kernel32.lib


pause
