SET vcvars=C:\MSVC4\BIN\VCVARS32.BAT

CALL %vcvars% x86

REM cl /c /O1 /GS- main2.c
cl /c /O1 main.c
link main.obj user
REM link main.obj user32.lib /nologo /subsystem:WINDOWS,3.10 /OSVERSION:3.1
