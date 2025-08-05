REM TCC
C:\local\codeblocks8\MinGW\bin\windres.exe -O coff resource.rc -o res.res
C:\local\tcc925\tcc.exe main.c res.res -luser32 -o main-tcc.exe

REM Visual C++ 4.0
