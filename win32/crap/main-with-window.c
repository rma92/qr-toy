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
  /*
    // Register the window class
    const char szClassName[] = "SampleWindowClass";
    WNDCLASS wc = {0};

    wc.lpfnWndProc = WindowProc;
    wc.hInstance = GetModuleHandle(NULL);;
    wc.lpszClassName = szClassName;
    wc.hIcon = LoadIcon(NULL, IDI_APPLICATION);
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);

    RegisterClass(&wc);

    // Create the main window
    HWND hwndMain = CreateWindowEx(
        0, szClassName, "Main Window", WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, 300, 200,
        NULL, NULL, wc.hInstance, NULL);

    if (hwndMain == NULL) {
        ExitProcess(0);
    }

    // Show the window
    ShowWindow(hwndMain, 0);
    UpdateWindow(hwndMain);
*/
    // Load the dialog resource and display it
    DialogBox(GetModuleHandle(NULL), MAKEINTRESOURCE(100), 0, WindowProc);

    // Enter the message loop
    /*
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    */
    //ExitProcess(0);
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nShowCmd) {
  MessageBox(0, "A", "A", 0);
  xmain();
}
