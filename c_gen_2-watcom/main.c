#include "qrcode.h"
#include <stdio.h>
//#include <malloc.h>
QRCode qrcode;

void main()
{
  char x = 0;
  char y = 0;

  char* qrcodeData = (char*)malloc(qrcode_getBufferSize(3));
  qrcode_initText(&qrcode, qrcodeData, 3, 0, "HELLO WORLD");

  for (y = 0; y < qrcode.size; y++)
  {
    for (x = 0; x < qrcode.size; x++)
    {    
      printf("%s", qrcode_getModule(&qrcode, x, y) ? "##":"  ");
    }
    printf("\n");
  }
}
