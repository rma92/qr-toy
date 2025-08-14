#include <windows.h>
#include <string.h>
#include <stdlib.h>
#include "qrcode.h"

#define MAX_DATA_LEN 4096
#define QR_SCALE_MIN 2
#define QR_SCALE_MAX 2000

QRCode qrcode;
char qrcodeData[MAX_DATA_LEN];
char inputData[MAX_DATA_LEN] = "HELLO WINDOWS QR!";
int version = 1;
int eccLevel = ECC_LOW;
BOOL maximizeWindow = FALSE;
int windowWidth = 0, windowHeight = 0;

void ParseCommandLine(LPSTR lpCmdLine) {
  char *token = strtok(lpCmdLine, " ");
  while (token) {
    if (strcmp(token, "-v") == 0) {
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
    }
    token = strtok(NULL, " ");
  }
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
  switch (msg) {
    case WM_SIZE:
      windowWidth = LOWORD(lParam);
      windowHeight = HIWORD(lParam);
      InvalidateRect(hwnd, NULL, TRUE);
      return 0;

    case WM_PAINT: 
      {
        int qrSize = qrcode.size;
        int scale;
        int bmpWidth;
        int bmpHeight;
        int x;
        int y;
        int scaleX;
        int scaleY;
        int xOffset;
        int yOffset;
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        HDC memDC = CreateCompatibleDC(hdc);

    // Calculate dynamic scale
    scaleX = windowWidth / qrSize;
    scaleY = windowHeight / qrSize;
    scale = min(scaleX, scaleY);
    scale = max(QR_SCALE_MIN, min(scale, QR_SCALE_MAX));

    bmpWidth = qrSize * scale;
    bmpHeight = qrSize * scale;

    HDC memDC = CreateCompatibleDC(hdc);
    HBITMAP bmp = CreateCompatibleBitmap(hdc, bmpWidth, bmpHeight);
    SelectObject(memDC, bmp);

    RECT bg = {0, 0, bmpWidth, bmpHeight};
    FillRect(memDC, &bg, (HBRUSH)(COLOR_WINDOW + 1));

    for (y = 0; y < qrSize; y++) {
        for (x = 0; x < qrSize; x++) {
            if (qrcode_getModule(&qrcode, x, y)) {
                RECT r = {
                    x * scale,
                    y * scale,
                    (x + 1) * scale,
                    (y + 1) * scale
                };
                FillRect(memDC, &r, (HBRUSH)GetStockObject(BLACK_BRUSH));
            }
        }
    }

    xOffset = (windowWidth - bmpWidth) / 2;
    yOffset = (windowHeight - bmpHeight) / 2;
    BitBlt(hdc, xOffset, yOffset, bmpWidth, bmpHeight, memDC, 0, 0, SRCCOPY);

    DeleteObject(bmp);
    DeleteDC(memDC);
    EndPaint(hwnd, &ps);
    return 0;
}

    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
  }
  return DefWindowProc(hwnd, msg, wParam, lParam);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
  ParseCommandLine(lpCmdLine);

  if (qrcode_initText(&qrcode, (uint8_t *)qrcodeData, version, eccLevel, inputData) != 0) {
    MessageBox(NULL, "QR code generation failed", "Error", MB_ICONERROR);
    return 1;
  }
  HWND hwnd;
  MSG msg;
  WNDCLASS wc = {0};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = hInstance;
  wc.lpszClassName = "QRCodeWindow";
  wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
  wc.hCursor = LoadCursor(NULL, IDC_ARROW);  
  RegisterClass(&wc);

  hwnd = CreateWindow("QRCodeWindow", "QR Code Viewer",
      WS_OVERLAPPEDWINDOW,
      CW_USEDEFAULT, CW_USEDEFAULT,
      400, 400, NULL, NULL, hInstance, NULL);

  if (!hwnd) return 1;

  if (maximizeWindow) {
    ShowWindow(hwnd, SW_MAXIMIZE);
  } else {
    ShowWindow(hwnd, nCmdShow);
  }

  UpdateWindow(hwnd);

  while (GetMessage(&msg, NULL, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }

  return (int)msg.wParam;
}

