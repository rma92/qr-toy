#include <windows.h>
#include <stdlib.h>
#include "qrcode.h"

#define MAX_DATA_LEN 4096
#define MAX_CMDLINE_LEN 4096
#define QR_SCALE_MIN 2
#define QR_SCALE_MAX 2000

QRCode qrcode;
char * qrcodeData;
char * inputData;
int version = 1;
int eccLevel = ECC_LOW;
BOOL maximizeWindow = FALSE;
int windowWidth = 0, windowHeight = 0;

void ParseCommandLine(LPSTR lpCmdLine) {
  char cmdCopy[MAX_DATA_LEN];
  char *token;
  int i;

  // Copy until null or newline or max length
  for (i = 0; i < MAX_CMDLINE_LEN - 1; i++) {
    if (lpCmdLine[i] == '\r' || lpCmdLine[i] == '\n' || lpCmdLine[i] == '\0') break;
    cmdCopy[i] = lpCmdLine[i];
  }
  cmdCopy[i] = '\0'; // Ensure null termination

  token = strtok(cmdCopy, " ");
  while (token) {

    if (strcmp(token, "-?") == 0 || strcmp(token, "/?") == 0 || strcmp(token, "-h") == 0) {
      MessageBox(0, "WinQR - Generate QR Code\r\nUsage: WinQR.exe [flags] [string]\r\n/? -? -h Display this help\r\n-v [1-40] specify the QR code version (size)\r\n-e [L|M|Q|H] Set ECC level\r\n-M open the window maximized", "WinQR Help", 0);
    } else if (strcmp(token, "-v") == 0) {
      token = strtok(NULL, " ");
      if (token) version = atoi(token);
    } else if (strcmp(token, "-e") == 0) {
      token = strtok(NULL, " ");
      if (token) {
        if (strcmp(token, "L") == 0) eccLevel = ECC_LOW;
        else if (strcmp(token, "M") == 0) eccLevel = ECC_MEDIUM;
        else if (strcmp(token, "Q") == 0) eccLevel = ECC_QUARTILE;
        else if (strcmp(token, "H") == 0) eccLevel = ECC_HIGH;
      }
    } else if (strcmp(token, "-M") == 0) {
      maximizeWindow = TRUE;
    } else {
      strncpy(inputData, token, MAX_DATA_LEN - 1);
      inputData[MAX_DATA_LEN - 1] = '\0';
    }

    token = strtok(NULL, " ");
  }
}

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
LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam) {
  switch (message) {
    case WM_SIZE:
      windowWidth = LOWORD(lParam);
      windowHeight = HIWORD(lParam);
      InvalidateRect(hWnd, NULL, TRUE);
      return 0;
    case WM_PAINT: 
      {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hWnd, &ps);

        int bmpWidth;
        int bmpHeight;
        int xOffset;
        int yOffset;
        int qrSize = qrcode.size;
        int scaleX = windowWidth / qrSize;
        int scaleY = windowHeight / qrSize;
        int scale = min(scaleX, scaleY);
        int y;
        int x;
        RECT bg;
        scale = max(QR_SCALE_MIN, min(scale, QR_SCALE_MAX));

        bmpWidth = qrSize * scale;
        bmpHeight = qrSize * scale;
        xOffset = (windowWidth - bmpWidth) / 2;
        yOffset = (windowHeight - bmpHeight) / 2;

        // Fill background
        bg.left = xOffset;
        bg.top = yOffset;
        bg.right = xOffset + bmpWidth;
        bg.bottom = yOffset + bmpHeight;
        FillRect(hdc, &bg, (HBRUSH)GetStockObject(WHITE_BRUSH));

        // Draw QR modules directly
        for (y = 0; y < qrSize; y++) {
          for (x = 0; x < qrSize; x++) {
            if (qrcode_getModule(&qrcode, x, y)) {
              RECT r;
              r.left   = xOffset + x * scale;
              r.top    = yOffset + y * scale;
              r.right  = r.left + scale;
              r.bottom = r.top + scale;
              FillRect(hdc, &r, (HBRUSH)GetStockObject(BLACK_BRUSH));
            }
          }
        }

        EndPaint(hWnd, &ps);
        return 0;
      }

    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
  }
  return DefWindowProc(hWnd, message, wParam, lParam);
}

// WinMain: Entry point for Win16 applications
int PASCAL WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance,
    LPSTR lpCmdLine, int nCmdShow) {
  WNDCLASS wc;
  HWND hWnd;
  MSG msg;
  inputData = calloc(4096, 1);
  qrcodeData = calloc( 4096, 1);
  strcpy(inputData, "HELLO WINDOWS QR!");
  ParseCommandLine(lpCmdLine);

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
  if (!RegisterClass(&wc)) {
    return 0;
  }

  //if (qrcode_initText(&qrcode, (uint8_t *)qrcodeData, version, eccLevel, inputData) != 0) {
  if (qrcode_initText(&qrcode, (uint8_t *)qrcodeData, version, eccLevel, inputData) != 0) {
    MessageBox(NULL, "QR code generation failed", "Error", 0);
    return 1;
  }

  // Create window
  hWnd = CreateWindow("SimpleWin16Window", "Hello Win16",
      WS_OVERLAPPEDWINDOW,
      CW_USEDEFAULT, CW_USEDEFAULT,
      300, 200,
      NULL, NULL, hInstance, NULL);

  if (!hWnd) {
    return 0;
  }

  //    ShowWindow(hWnd, nCmdShow);
  if (maximizeWindow) {
    ShowWindow(hWnd, SW_MAXIMIZE);
  } else {
    ShowWindow(hWnd, nCmdShow);
  }
  UpdateWindow(hWnd);

  // Message loop
  while (GetMessage(&msg, NULL, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }

  return msg.wParam;
}

