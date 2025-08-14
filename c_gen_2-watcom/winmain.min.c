#include <windows.h>
#include "qrcode.h"

#define MAX_DATA_LEN 4096
#define QR_SCALE 4  // Scale each QR module to 4x4 pixels

QRCode qrcode;
char qrcodeData[MAX_DATA_LEN];
char inputData[MAX_DATA_LEN] = "HELLO WINDOWS QR!";
int version = 1;
int eccLevel = ECC_LOW;

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam)
{
  int y;
  int x;
  switch (msg) {
    case WM_PAINT: {
                     PAINTSTRUCT ps;
                     HDC hdc = BeginPaint(hwnd, &ps);
                     HDC memDC = CreateCompatibleDC(hdc);
                     int size = qrcode.size * QR_SCALE;

                     HBITMAP bmp = CreateCompatibleBitmap(hdc, size, size);
                     SelectObject(memDC, bmp);

                     // Fill background
                     RECT rect = {0, 0, size, size};
                     FillRect(memDC, &rect, (HBRUSH)(COLOR_WINDOW + 1));

                     // Draw QR modules
                     for (y = 0; y < qrcode.size; y++) {
                       for (x = 0; x < qrcode.size; x++) {
                         if (qrcode_getModule(&qrcode, x, y)) {
                           RECT r = {
                             x * QR_SCALE,
                             y * QR_SCALE,
                             (x + 1) * QR_SCALE,
                             (y + 1) * QR_SCALE
                           };
                           FillRect(memDC, &r, (HBRUSH)GetStockObject(BLACK_BRUSH));
                         }
                       }
                     }

                     BitBlt(hdc, 0, 0, size, size, memDC, 0, 0, SRCCOPY);
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

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
  int winSize;
  // Generate QR code
  if (qrcode_initText(&qrcode, (uint8_t *)qrcodeData, version, eccLevel, inputData) != 0) {
    MessageBox(NULL, "QR code generation failed", "Error", MB_ICONERROR);
    return 1;
  }

  // Register window class
  WNDCLASS wc = {0};
  wc.lpfnWndProc = WndProc;
  wc.hInstance = hInstance;
  wc.lpszClassName = "QRCodeWindow";
  wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
  RegisterClass(&wc);

  // Create window
  winSize = qrcode.size * QR_SCALE;
  HWND hwnd = CreateWindow("QRCodeWindow", "QR Code Viewer",
      WS_OVERLAPPEDWINDOW,
      CW_USEDEFAULT, CW_USEDEFAULT,
      winSize + 16, winSize + 39, // Adjust for borders
      NULL, NULL, hInstance, NULL);

  if (!hwnd) return 1;

  ShowWindow(hwnd, nCmdShow);
  UpdateWindow(hwnd);

  // Message loop
  MSG msg;
  while (GetMessage(&msg, NULL, 0, 0)) {
    TranslateMessage(&msg);
    DispatchMessage(&msg);
  }

  return (int)msg.wParam;
}

