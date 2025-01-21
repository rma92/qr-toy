//only for the program
#include <stdio.h>
#include "qrcodegen.h"
//make: tcc main.c qrcodegen.c

//Utility function to print qr code to stdout
static void printQr(const uint8_t qrcode[]) {
  int size = qrcodegen_getSize(qrcode);
  int border = 4;
  for (int y = -border; y < size + border; y++) {
    for (int x = -border; x < size + border; x++) {
      printf("%s", (qrcodegen_getModule(qrcode, x, y) ? "\xB2\xDB" : "  "));
    }
    printf("\n");
  }
  printf("\n");
}


//interactive program
static void doBasicDemo(void) {
  const char *text = "Hello, world!";                // User-supplied text
  enum qrcodegen_Ecc errCorLvl = qrcodegen_Ecc_LOW;  // Error correction level

  // Make and print the QR Code symbol
  uint8_t qrcode[qrcodegen_BUFFER_LEN_MAX];
  uint8_t tempBuffer[qrcodegen_BUFFER_LEN_MAX];
  bool ok = qrcodegen_encodeText(text, tempBuffer, qrcode, errCorLvl,
      qrcodegen_VERSION_MIN, qrcodegen_VERSION_MAX, qrcodegen_Mask_AUTO, true);
  if (ok)
    printQr(qrcode);
}

static void genStringQrCode(char* text, int length) {
  enum qrcodegen_Ecc errCorLvl = qrcodegen_Ecc_LOW;  // Error correction level

  // Make and print the QR Code symbol
  uint8_t qrcode[qrcodegen_BUFFER_LEN_MAX];
  uint8_t tempBuffer[qrcodegen_BUFFER_LEN_MAX];
  bool ok = qrcodegen_encodeText(text, tempBuffer, qrcode, errCorLvl,
      qrcodegen_VERSION_MIN, qrcodegen_VERSION_MAX, qrcodegen_Mask_AUTO, true);
  if (ok)
    printQr(qrcode);
}

static void doSegmentDemo(void)
{
  // Illustration "silver"
  const char *silver0 = "THE SQUARE ROOT OF 2 IS 1.";
  const char *silver1 = "41421356237309504880168872420969807856967187537694807317667973799";
  uint8_t qrcode[qrcodegen_BUFFER_LEN_MAX];
  uint8_t tempBuffer[qrcodegen_BUFFER_LEN_MAX];
  bool ok;
  {
    char *concat = calloc(strlen(silver0) + strlen(silver1) + 1, sizeof(char));
    if (concat == NULL) {
      perror("calloc");
      exit(1);
    }
    strcat(concat, silver0);
    strcat(concat, silver1);
    ok = qrcodegen_encodeText(concat, tempBuffer, qrcode, qrcodegen_Ecc_LOW,
        qrcodegen_VERSION_MIN, qrcodegen_VERSION_MAX, qrcodegen_Mask_AUTO, true);
    if (ok)
      printQr(qrcode);
    free(concat);
  }
  {
    uint8_t *segBuf0 = malloc(qrcodegen_calcSegmentBufferSize(qrcodegen_Mode_ALPHANUMERIC, strlen(silver0)) * sizeof(uint8_t));
    uint8_t *segBuf1 = malloc(qrcodegen_calcSegmentBufferSize(qrcodegen_Mode_NUMERIC, strlen(silver1)) * sizeof(uint8_t));
    if (segBuf0 == NULL || segBuf1 == NULL)
    {
      perror("malloc");
      exit(1);
    }

    struct qrcodegen_Segment * segs = calloc( 5, sizeof( struct qrcodegen_Segment ) );

    segs[0] = qrcodegen_makeAlphanumeric(silver0, segBuf0);
    segs[1] = qrcodegen_makeNumeric(silver1, segBuf1);
    ok = qrcodegen_encodeSegments(segs, sizeof(segs) / sizeof(segs[0]), qrcodegen_Ecc_LOW, tempBuffer, qrcode);
    free(segBuf0);
    free(segBuf1);
    if (ok)
      printQr(qrcode);
  }
}
int main()
{
  char * str1 = "Hello, World!";
  //char * str2 = "THE SQUARE ROOT OF 2 IS 1.41421356237309504880168872420969807856967187537694807317667973799";
  genStringQrCode(str1, strlen(str1));
  //genStringQrCode(str2, strlen(str2));
  doSegmentDemo();
}

