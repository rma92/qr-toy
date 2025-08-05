#include <windows.h>
#include "resource.h"  // Include the header file for the dialog resource

// Window procedure for the main window
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
  switch (uMsg) {
    case WM_COMMAND:
      if (LOWORD(wParam) == IDOK || LOWORD(wParam) == IDCANCEL) {
        EndDialog(hwnd, LOWORD(wParam)); // Close the dialog
        return TRUE;
      }
      break;
    case WM_DESTROY:
      PostQuitMessage(0);
      return 0;
  }
  return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

void xmain()
{
  DialogBox(GetModuleHandle(NULL), MAKEINTRESOURCE(100), 0, WindowProc);
  ExitProcess(0);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nShowCmd) {
  xmain();
}
