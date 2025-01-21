#include "qrcode.h"
#include <stdio.h>
#include <malloc.h>
void main()
{
  uint8_t x = 0;
  uint8_t y = 0;
  QRCode qrcode;
  uint8_t* qrcodeData = malloc(qrcode_getBufferSize(3));
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
