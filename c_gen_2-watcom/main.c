#include "qrcode.h"
#include <stdio.h>
//#include <malloc.h>
QRCode qrcode;

void main()
{
  char x = 0;
  char y = 0;
  char s[255];
//int8_t qrcode_initText(QRCode *qrcode, uint8_t *modules, uint8_t version, uint8_t ecc, const char *data)
  char* qrcodeData = (char*)malloc(qrcode_getBufferSize(8));
  qrcode_initText(&qrcode, qrcodeData, 8, 0, "HTTP://RM.VG/");

  for (y = 0; y < qrcode.size; y+=2)
  {
    if( y != 0 )printf("\n");    
    for (x = 0; x < qrcode.size; x++)
    {
      char o = ' ';
      if( qrcode_getModule(&qrcode, x, y) & qrcode_getModule(&qrcode, x, y+1) )
      {
        o = 219; //full block
      }
      else if( qrcode_getModule(&qrcode, x, y) )
      {
        o = 223; //only top
      }
      else if( qrcode_getModule(&qrcode, x, y+1) )
      {
        o = 220; //only bottom
      }

      printf("%c", o);
    }
  }
  gets(s);
}
