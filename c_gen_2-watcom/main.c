#include "qrcode.h"
#include <stdio.h>
#include "stdint.h"

void main()
{
  unsigned char x = 0;
  unsigned char y = 0;
  QRCode qrcode;
  //buffer size: (4 * version ( 41 ) + 17) ^ 2 + 7 / 8 ) = 4096
  unsigned char qrcodeData[4096];
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
