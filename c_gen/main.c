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
			printf("%s", (qrcodegen_getModule(qrcode, x, y) ? "##" : "  "));
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


int main()
{
  printf("Test");
  doBasicDemo();
}

