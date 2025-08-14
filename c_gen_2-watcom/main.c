#include "qrcode.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

//wcl -0 -mt -DDOS_BUILD main.c qrcode.c
#ifdef DOS_BUILD
  #define MAX_DATA_LEN 512
#else
  #define MAX_DATA_LEN 4096
#endif

const int qr_binary_capacity[40][4] = {
  {17, 14, 11, 7},    {32, 26, 20, 14},   {53, 42, 32, 24},   {78, 62, 46, 34},
  {106, 84, 60, 44},  {134, 106, 74, 58}, {154, 122, 86, 64}, {192, 152, 108, 84},
  {230, 180, 130, 98}, {271, 213, 151, 119}, {321, 251, 177, 137}, {367, 287, 203, 155},
  {425, 331, 241, 177}, {458, 362, 258, 194}, {520, 412, 292, 220}, {586, 450, 322, 250},
  {644, 504, 364, 280}, {718, 560, 394, 310}, {792, 624, 442, 338}, {858, 666, 482, 382},
  {929, 711, 509, 403}, {1003, 779, 565, 439}, {1091, 857, 611, 461}, {1171, 911, 661, 511},
  {1273, 997, 715, 535}, {1367, 1059, 751, 593}, {1465, 1125, 805, 625}, {1528, 1190, 868, 658},
  {1628, 1264, 908, 698}, {1732, 1370, 982, 742}, {1840, 1452, 1030, 790}, {1952, 1538, 1112, 842},
  {2068, 1628, 1168, 898}, {2188, 1722, 1228, 958}, {2303, 1809, 1283, 983}, {2431, 1911, 1351, 1051},
  {2563, 1989, 1423, 1093}, {2699, 2099, 1499, 1139}, {2809, 2213, 1579, 1219}, {2953, 2331, 1663, 1273}
};

int select_version(int data_len, int eccLevel)
{ 
  int v;
  for (v = 0; v < 40; v++)
  {
    if (qr_binary_capacity[v][eccLevel] >= data_len)
      return v + 1;
  }
  return -1; // Data too large
}

void print_qr(QRCode *pQrcode)
{
  int x, y;
  for (y = 0; y < pQrcode->size; y += 2)
  {
    if (y != 0) printf("\n");
    for (x = 0; x < pQrcode->size; x++)
    {
      char o = ' ';
      if (qrcode_getModule(pQrcode, x, y) && qrcode_getModule(pQrcode, x, y + 1))
        o = 219; // full block
      else if (qrcode_getModule(pQrcode, x, y))
        o = 223; // top half
      else if (qrcode_getModule(pQrcode, x, y + 1))
        o = 220; // bottom half
      printf("%c", o);
    }
  }
  printf("\n");
}

int main(int argc, char *argv[])
{
  int version = 40;
  int eccLevel = 0;
  char inputData[MAX_DATA_LEN] = {0};
  char *filename = NULL;
  int i;
  QRCode qrcode;
  //char *qrcodeData = (char *)malloc(qrcode_getBufferSize( 30));
  //40 is 3917, so made 4096 on non-DOS.
  char qrcodeData[MAX_DATA_LEN];

  if (argc < 2)
  {
    printf("Usage: %s [OPTION] ... [STRING]\n", argv[0]);
    printf("General Options:\n");
    printf("  -s Read data from stdin until EOF (Ctrl+Z)\n");
    printf("  -i Read data from file\n");
    printf("  -b Read binary from file\n");
    printf("  -v VERSION    QR version (1...40)\n");
    printf("  -l ECC LEVEL  Error correction level (0=Low, 1=Medium, 2=Quartile, 3=High)\n");
    return 1;
  }

  for (i = 1; i < argc; i++)
  {
    if (strcmp(argv[i], "-s") == 0)
    {
      int ch, pos = 0;
      //printf("Enter input (Ctrl+Z to end):\n");
      
      while ((ch = getchar()) != EOF && pos < MAX_DATA_LEN - 1)
      {
          inputData[pos++] = (char)ch;
      }
      inputData[pos] = '\0';

      /* Optional: Strip trailing newline */
      if (pos > 0 && inputData[pos - 1] == '\n')
      {
        inputData[pos - 1] = '\0';
      }
    }
    else if (strcmp(argv[i], "-i") == 0 && i + 1 < argc)
    {
      FILE *fp;
      filename = argv[++i];
      fp = fopen(filename, "r");
      if (!fp)
      {
        fprintf(stderr, "Error: Cannot open file %s\n", filename);
        return 1;
      }
      fgets(inputData, MAX_DATA_LEN, fp);
      fclose(fp);
    }
    else if (strcmp(argv[i], "-v") == 0 && i + 1 < argc)
    {
      version = atoi(argv[++i]);
      if (version < 1 || version > 40)
      {
        fprintf(stderr, "Error: Invalid version %d\n", version);
        return 1;
      }
    }
    else if (strcmp(argv[i], "-l") == 0 && i + 1 < argc)
    {
      eccLevel = atoi(argv[++i]);
      if (eccLevel < 0 || eccLevel > 3)
      {
        fprintf(stderr, "Error: Invalid ECC level %d\n", eccLevel);
        return 1;
      }
    }
    else if (argv[i][0] != '-')
    {
      strncpy(inputData, argv[i], MAX_DATA_LEN - 1);
    }
  }

  if (inputData[0] == '\0')
  {
    fprintf(stderr, "Error: No input data provided\n");
    return 1;
  }


  if (version == 40) // default, not overridden
  {
    int auto_version = select_version(strlen(inputData), eccLevel);
    if (auto_version == -1)
    {
      fprintf(stderr, "Error: Data too large for QR code\n");
      return 1;
    }
    version = auto_version;
  }

  if (!qrcodeData)
  {
    fprintf(stderr, "Error: Memory allocation failed\n");
    return 1;
  }

  if (qrcode_initText(&qrcode, qrcodeData, version, eccLevel, inputData) != 0)
  {
    fprintf(stderr, "Error: QR code generation failed\n");
    free(qrcodeData);
    return 1;
  }

  print_qr(&qrcode);
  free(qrcodeData);
  return 0;
}

