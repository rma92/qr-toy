#include <windows.h>
//test program for Win16
/*
  set WATCOM=C:\WATCOM
  set PATH=%WATCOM%\BINNT;%PATH%
  set INCLUDE=%WATCOM%\H;%WATCOM%\h\win
  set LIB=%WATCOM%\LIB286;%WATCOM%\LIB286\win
  C:\WATCOM\binnt\wcc win16.c -bt=windows -ms
  C:\WATCOM\binnt\wlink system windows name win16 file win16.obj library user,gdi,kernel
*/
// Window procedure
LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
  switch (message) 
  {
    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
  }
  return DefWindowProc(hWnd, message, wParam, lParam);
}

// WinMain: Entry point for Win16 applications
int PASCAL WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance,
    LPSTR lpCmdLine, int nCmdShow)
{
  WNDCLASS wc;
  HWND hWnd;
  MSG msg;

  // Define window class
  wc.style = CS_HREDRAW | CS_VREDRAW;
  wc.lpfnWndProc = WndProc;
  wc.cbClsExtra = 0;
  wc.cbWndExtra = 0;
  wc.hInstance = hInstance;
  wc.hIcon = LoadIcon(NULL, IDI_APPLICATION);
  wc.hCursor = LoadCursor(NULL, IDC_ARROW);
  wc.hbrBackground = GetStockObject(WHITE_BRUSH);
  wc.lpszMenuName = NULL;
  wc.lpszClassName = "SimpleWin16Window";

  // Register window class
  if (!RegisterClass(&wc))
  {
    return 0;
  }

  // Create window
  hWnd = CreateWindow("SimpleWin16Window", "Hello Win16",
      WS_OVERLAPPEDWINDOW,
      CW_USEDEFAULT, CW_USEDEFAULT,
      300, 200,
      NULL, NULL, hInstance, NULL);

  if (!hWnd)
  {
    return 0;
  }

  ShowWindow(hWnd, nCmdShow);
  UpdateWindow(hWnd);

  // Message loop
  while (GetMessage(&msg, NULL, 0, 0))
  {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }

  return msg.wParam;
}

