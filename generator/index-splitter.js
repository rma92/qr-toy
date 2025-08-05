//var qrcode = new QRCode(document.getElementById("qrcode"), {});
//var qrcode;

//if enabled, debug to console.
var bQrSplitterDebug = false;

//strings to split header fields and header from data.
var szHeaderSeparator = "$";
var szHeaderTerminator = "$$";

// Timer to generate the next QR code
var qrGenInterval = null;

//prefix to beginning of string
//var qStrPrefix = "Q";
var qStrPrefix = "HTTP://QR.HT/";

/*
 * Start the qr code refresh timer.  Replaces any previous interval if needed.
 */
function startTimer(delay)
{
  if( bQrSplitterDebug ) console.log(" startTimer (delay) (" + delay + ")" );
  clearInterval( qrGenInterval );
  qrGenInterval = setInterval( makeNextCode, delay );
}

// Chunking functionality
var pageid = -1;
var numpages = 0;
var chunks = [];
window.chunks = chunks;
var icrc32 = 0;
var bLzma = 0;

var cachedLastQr = null;
var cachedFileContents = null;
var cachedFileContentsRaw = null;

/*
 * Scale the output canvas if the fit box is checked.
 */
function scaleCanvasOut()
{
    dCanvas = document.getElementById('cOut');
  //TODO: Change this to use the actual dimensions of the controls.
    xAdjustment = (document.getElementById('controlBox').style.display == 'none')?50:500;
    if( document.getElementById('bFit').checked )
    {
      //see if there is more vertical space or more horizontal space.
      var smallerWindowDimension = Math.min(window.innerHeight - xAdjustment, window.innerWidth - 25 );
      if( dCanvas.width > smallerWindowDimension )
      { 
        //if the canvas is too small
        dCanvas.style.width = Math.min( dCanvas.width, smallerWindowDimension) + 'px';
        dCanvas.style.height = (dCanvas.height * Math.min( dCanvas.width, smallerWindowDimension) / dCanvas.width) + 'px';
      }
      else
      {
        //if the canvas is too big
      dCanvas.style.width = Math.max( dCanvas.width, smallerWindowDimension) + 'px';
      dCanvas.style.height = (dCanvas.height * Math.max( dCanvas.width, smallerWindowDimension) / dCanvas.width) + 'px';
      }
    }
    else
    {
      dCanvas.style.width = '';
      dCanvas.style.height = '';
    }
}
/*
 * Make segments optimally
 */
function makeSegmentsOptimally(text, ecl, minVersion, maxVersion) {
  if (typeof text == 'string')
  {
    text = CodePoint.toArray(text);
  }
  if (!(0 <= ecl && ecl <= 3))
    throw new RangeError("Invalid error correction level");
  if (!(1 <= minVersion && minVersion <= maxVersion && maxVersion <= 40))
    throw new RangeError("Invalid version range");
  // Iterate through version numbers, and make tentative segments
  let segs = []; // Dummy initial value
  for (let version = minVersion; version <= maxVersion; version++) {
    if (version == minVersion || version == 10 || version == 27)
      segs = makeSegmentsOptimallyForVersion(text, version);
    // Check if the segments fit
    const dataCapacityBits = NUM_DATA_CODEWORDS[version][ecl] * 8;
    const dataUsedBits = getTotalBits(segs, version);
    if (dataUsedBits <= dataCapacityBits)
      return [version, segs];
  }
  // The data is too long to fit in any QR Code symbol at any version in
  // the range [minVersion, maxVersion] with ecl level error correction
  return null;
}
// Returns a new array of segments that is optimal for the given text at the given version number.
function makeSegmentsOptimallyForVersion(text, version) {
  if (typeof text == 'string')
  {
    text = CodePoint.toArray(text);
  }
  if (text.length == 0)
    return [];
  const charModes = computeCharacterModes(text, version);
  return splitIntoSegments(text, charModes);
}
// Returns a new array representing the optimal mode per code point based on the given text and version.
function computeCharacterModes(text, version) {
  if (text.length == 0)
    throw new RangeError("Empty string");
  const modeTypes = ["BYTE", "ALPHANUMERIC", "NUMERIC", "KANJI"];
  // Segment header sizes, measured in 1/6 bits
  const headCosts = modeTypes.map(mode => (4 + getNumCharCountBits(mode, version)) * 6);
  // charModes[i][j] represents the mode to encode the code point at
  // index i such that the final segment ends in modeTypes[j] and the
  // total number of bits is minimized over all possible choices
  let charModes = [];
  // At the beginning of each iteration of the loop below,
  // prevCosts[j] is the exact minimum number of 1/6 bits needed to
  // encode the entire string prefix of length i, and end in modeTypes[j]
  let prevCosts = headCosts.slice();
  // Calculate costs using dynamic programming
  for (const c of text) {
    let cModes = modeTypes.map(_ => null);
    let curCosts = modeTypes.map(_ => Infinity);
    { // Always extend a byte mode segment
      curCosts[0] = prevCosts[0] + c.utf8.length * 8 * 6;
      cModes[0] = modeTypes[0];
    }
    // Extend a segment if possible
    if (isAlphanumeric(c.utf32)) {
      curCosts[1] = prevCosts[1] + 33; // 5.5 bits per alphanumeric char
      cModes[1] = modeTypes[1];
    }
    if (isNumeric(c.utf32)) {
      curCosts[2] = prevCosts[2] + 20; // 3.33 bits per digit
      cModes[2] = modeTypes[2];
    }
    /*
            if (isKanji(c.utf32)) {
                curCosts[3] = prevCosts[3] + 78; // 13 bits per Shift JIS char
                cModes[3] = modeTypes[3];
            }
            */
    // Start new segment at the end to switch modes
    modeTypes.forEach((_, j) => {
      modeTypes.forEach((fromMode, k) => {
        const newCost = Math.ceil(curCosts[k] / 6) * 6 + headCosts[j];
        if (cModes[k] !== null && newCost < curCosts[j]) {
          curCosts[j] = newCost;
          cModes[j] = fromMode;
        }
      });
    });
    charModes.push(cModes);
    prevCosts = curCosts;
  }
  // Find optimal ending mode
  let curModeIndex = 0;
  modeTypes.forEach((mode, i) => {
    if (prevCosts[i] < prevCosts[curModeIndex])
      curModeIndex = i;
  });
  // Get optimal mode for each code point by tracing backwards
  let result = [];
  for (let i = text.length - 1; i >= 0; i--) {
    const curMode = charModes[i][curModeIndex];
    curModeIndex = modeTypes.indexOf(curMode);
    result.push(curMode);
  }
  result.reverse();
  return result;
}
// Returns a new array of segments based on the given text and modes, such that
// consecutive code points in the same mode are put into the same segment.
function splitIntoSegments(text, charModes) {
  if (text.length == 0)
    throw new RangeError("Empty string");
  if (text.length != charModes.length)
    throw new RangeError("Mismatched lengths");
  let result = [];
  // Accumulate run of modes
  let curMode = charModes[0];
  let start = 0;
  for (let i = 1;; i++) {
    if (i < text.length && charModes[i] == curMode)
      continue;
    result.push(new Segment(text.slice(start, i), curMode));
    if (i >= text.length)
      return result;
    curMode = charModes[i];
    start = i;
  }
}
class Segment {
  constructor(text, mode) {
    this.mode = mode;
    this.text = text.map(c => c.utf16).join("");
    if (mode == "BYTE") {
      this.numChars = 0;
      for (const c of text)
        this.numChars += c.utf8.length;
      this.numDataBits = this.numChars * 8;
    }
    else {
      this.numChars = text.length;
      switch (mode) {
        case "NUMERIC":
          this.numDataBits = Math.ceil(this.numChars * 10 / 3);
          break;
        case "ALPHANUMERIC":
          this.numDataBits = Math.ceil(this.numChars * 11 / 2);
          break;
        case "KANJI":
          this.numDataBits = this.numChars * 13;
          break;
        default:
          throw new RangeError("Invalid mode");
      }
    }
  }
}
// Calculates and returns the number of bits needed to encode the given segments at the given
// version. The result is infinity if a segment has too many characters to fit its length field.
function getTotalBits(segs, version) {
  let result = 0;
  for (const seg of segs) {
    const ccbits = getNumCharCountBits(seg.mode, version);
    if (seg.numChars >= (1 << ccbits))
      return Infinity; // The segment's length doesn't fit the field's bit width
    result += 4 + ccbits + seg.numDataBits;
  }
  return result;
}
/*---- Low-level computation functions ----*/
// Returns the bit width of the character count field for a segment
// in the given mode in a QR Code at the given version number.
function getNumCharCountBits(mode, version) {
  if (version < 1 || version > 40)
    throw new RangeError("Invalid version");
  return {
    NUMERIC: [10, 12, 14],
    ALPHANUMERIC: [9, 11, 13],
    BYTE: [8, 16, 16],
    KANJI: [8, 10, 12],
  }[mode][Math.floor((version + 7) / 17)];
}
// NUM_DATA_CODEWORDS[v][e] is the number of 8-bit data codewords (excluding error correction codewords)
// in a QR Code symbol at version v (from 1 to 40 inclusive) and error correction e (0=L, 1=M, 2=Q, 3=H).
const NUM_DATA_CODEWORDS = [
  //  L,    M,    Q,    H    // Error correction level
  [-1, -1, -1, -1],
  [19, 16, 13, 9],
  [34, 28, 22, 16],
  [55, 44, 34, 26],
  [80, 64, 48, 36],
  [108, 86, 62, 46],
  [136, 108, 76, 60],
  [156, 124, 88, 66],
  [194, 154, 110, 86],
  [232, 182, 132, 100],
  [274, 216, 154, 122],
  [324, 254, 180, 140],
  [370, 290, 206, 158],
  [428, 334, 244, 180],
  [461, 365, 261, 197],
  [523, 415, 295, 223],
  [589, 453, 325, 253],
  [647, 507, 367, 283],
  [721, 563, 397, 313],
  [795, 627, 445, 341],
  [861, 669, 485, 385],
  [932, 714, 512, 406],
  [1006, 782, 568, 442],
  [1094, 860, 614, 464],
  [1174, 914, 664, 514],
  [1276, 1000, 718, 538],
  [1370, 1062, 754, 596],
  [1468, 1128, 808, 628],
  [1531, 1193, 871, 661],
  [1631, 1267, 911, 701],
  [1735, 1373, 985, 745],
  [1843, 1455, 1033, 793],
  [1955, 1541, 1115, 845],
  [2071, 1631, 1171, 901],
  [2191, 1725, 1231, 961],
  [2306, 1812, 1286, 986],
  [2434, 1914, 1354, 1054],
  [2566, 1992, 1426, 1096],
  [2702, 2102, 1502, 1142],
  [2812, 2216, 1582, 1222],
  [2956, 2334, 1666, 1276], // Version 40
];
// Tests whether the given code point can be encoded in numeric mode.
function isNumeric(cp) {
  return cp < 128 && "0123456789".includes(String.fromCodePoint(cp));
}
// Tests whether the given code point can be encoded in alphanumeric mode.
function isAlphanumeric(cp) {
  return cp < 128 && "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:".includes(String.fromCodePoint(cp));
}
/*---- Helper class ----*/
class CodePoint {
  constructor(utf32) {
    this.utf32 = utf32;
    this.utf16 = String.fromCodePoint(utf32);
    if (utf32 < 0)
      throw new RangeError("Invalid code point");
    else if (utf32 < 0x80)
      this.utf8 = [utf32];
    else {
      let n;
      if (utf32 < 0x800)
        n = 2;
      else if (utf32 < 0x10000)
        n = 3;
      else if (utf32 < 0x110000)
        n = 4;
      else
        throw new RangeError("Invalid code point");
      this.utf8 = [];
      for (let i = 0; i < n; i++, utf32 >>>= 6)
        this.utf8.unshift(0x80 | (utf32 & 0x3F));
      this.utf8[0] |= (0xF00 >>> n) & 0xFF;
    }
  }
  static toArray(s) {
    let result = [];
    for (const ch of s) {
      const cc = ch.codePointAt(0);
      if (0xD800 <= cc && cc < 0xE000)
        throw new RangeError("Invalid UTF-16 string");
      result.push(new CodePoint(cc));
    }
    return result;
  }
}

/*
 * End Make Segments Optimally.
 */
/*
 * Given a string str, returns an array containing str split into multiple strings of length size (or less).
 */
function stringChop (str, size)
{
  if( bQrSplitterDebug ) console.log(" stringChop (str, size) (" + str + ", " + size + ")" );

  if (str == null)
  {
    return [];
  }
  str = String(str);
  icrc32 = b_crc32( str );
  //TODO: make this ignore returns.  Currently if there is a return present, it starts a new chunk
  return size > 0 ? str.match(new RegExp('.{1,' + size + '}', 'g')) : [str];
}

/*
 * Returns the CRC32 of str as a number.
 */
var a_table = "00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D";
var b_table = a_table.split(' ').map(function(s){ return parseInt(s,16) });

function b_crc32 (str) {
  var crc = -1;
  for(var i=0, iTop=str.length; i<iTop; i++) {
    crc = ( crc >>> 8 ) ^ b_table[( crc ^ str.charCodeAt( i ) ) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
};

/*
 * Base 10 encode/decode - encodes or decodes bytes or strings into a Base 10 string.
 * 
 * It's more efficient to store Base10 than Base64 or binary in a QR Code.
 *
 * See: https://huonw.github.io/blog/2024/03/qr-base10-base64/
 */
const B10CONV_DIGITS_PER_BYTE = Math.log10(Math.pow(2, 8));

function b10encode( arrayBuffer ) {
  let byteArray = new Uint8Array(arrayBuffer);
  let raw = BigInt('0x' + Array.from(byteArray).map(byte => byte.toString(16).padStart(2, '0')).join('')).toString();
  let encodedLength = Math.ceil(byteArray.length * B10CONV_DIGITS_PER_BYTE);
  let prefix = '0'.repeat(encodedLength - raw.length);
  return prefix + raw;
}

function b10decode(s)
{
  let decodedLength = Math.floor(s.length / B10CONV_DIGITS_PER_BYTE);
  let num = BigInt(s);
  let hex = num.toString(16).padStart(decodedLength * 2, '0');
  let byteArray = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  return byteArray;
}

function b10decode_totext(s)
{
  var decoder = new TextDecoder();  
  return decoder.decode( b10decode(s) );
}

function base64encode(data) {
  let encoder = new TextEncoder();
  let byteArray = encoder.encode(data);
  let binaryString = String.fromCharCode(...byteArray);
  return btoa(binaryString);
}

function _arrayBufferToBase64( buffer ) {
  var binary = '';
  var bytes = new Uint8Array( buffer );
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode( bytes[ i ] );
  }
  return window.btoa( binary );
}

/*
 * If the split_size is 0, makes a Qr Code
 * 
 * If the split_size is nonzero:
 * - splits the string into chunks of length split_size and stores in chunks (global variable)
 * - generates the first QR code
 * - starts the timer to run makeNextCode to make subsequent codes.
 */
function makeCode()
{
  if( bQrSplitterDebug ) console.log( "makeCode" );
  if( document.getElementById('split_size').value == 0 )
  {
    var elText = document.getElementById("text");
    var qStr = "";
    if (elText.value)
    {
      qStr = elText.value;
    }
    makeCodeInt( qStr );
  }
  else
  {
    //split the string into chunks and store in chunks.
    if( chunks.length == 0 )
    {
      chunks = stringChop( document.getElementById("text").value, document.getElementById('split_size').value);
    }
    makeNextCode();
    startTimer( document.getElementById('split_time').value );
  }
} //makeCode()

function makeCodeByChunkId( pageid )
{
  var szFilename = document.getElementById("szFilename").value;
  //fileData contains the encoding - B10 or B64 if applicable.
  var fileData = "";
  const encodingType = document.querySelector('input[name="encodeAs"]:checked').value;
  if( encodingType === 'base64' )
  {
    fileData = (bLzma)?"LB6":"B64";
  }
  else if( encodingType === 'base10' )
  {
    fileData = (bLzma)?"LB1":"B10";
  }

  qStr = qStrPrefix + szHeaderSeparator + pageid + szHeaderSeparator + chunks.length + szHeaderSeparator + icrc32 + szHeaderSeparator + szFilename + szHeaderSeparator + fileData + szHeaderTerminator + chunks[pageid];
  //qStr = "Q:" + pageid + ":" + chunks.length + ":" + icrc32 + "::" + chunks[pageid];
  if( bQrSplitterDebug ) console.log( "makeNextCode - qString: " + qStr);
  makeCodeInt( qStr );
}

function makeNextCode()
{
  if( bQrSplitterDebug ) console.log( "makeNextCode()  pageid: " + pageid );
  ++pageid;
  if( pageid >= chunks.length ) pageid = 0;
  makeCodeByChunkId( pageid );
  document.getElementById("pageDataOut").value = pageid + " out of " + chunks.length + " v: " + cachedLastQr.version + " mask: " + cachedLastQr.mask + " size: " + cachedLastQr.size;
} //makeNextCode()

//helper function to split string into array.
/*
function splitStringByCategory(input, min_length) {
    const result = [];
    let current = '';
    let isNumeric = !isNaN(input[0]);

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        const charIsNumeric = !isNaN(char) && char !== ' ';

        if (charIsNumeric === isNumeric) {
            current += char;
        } else {
            result.push(current);
            current = char;
            isNumeric = charIsNumeric;
        }
    }

    if (current) {
        result.push(current);
    }

    return result;
}
*/

/*
 * Render and return a qrcodegen.QrCode.
 *
 * The only required parameter is an array of segments.
 *
 * This is usually be called from generateQr
 */
function generateQrFromSegs(aSegs, eccStr = 'L', minVersion = 1, maxVersion = 40, mask = -1, boostEcl = true )
{
  //TODO: Add any graphical functionality to this function
  var ecc;
  if( eccStr == 'L' )
  {
    ecc = qrcodegen.QrCode.Ecc.LOW;
  }
  else if( eccStr == 'M' )
  {
    ecc = qrcodegen.QrCode.Ecc.MEDIUM;
  }
  else if( eccStr == 'Q' )
  {
    ecc = qrcodegen.QrCode.Ecc.QUARTILE;
  }
  else
  {
    ecc = qrcodegen.QrCode.Ecc.HIGH;
  }
  var qr = qrcodegen.QrCode.encodeSegments(aSegs, ecc, parseInt(minVersion), parseInt(maxVersion), parseInt(mask), boostEcl);
  return qr;
}

/*
 * Segments a string by character type to fit into the QR code more efficiently,
 * then generates the QR code.
 */
function generateQr(qStr, eccStr = 'L', minVersion = 1, maxVersion = 40, mask = -1, boostEcl = true )
{
  var qr;
  var iEccLevel = 0;
  var segs = [];
  if( eccStr == 'M' ) iEccLevel = 1;
  else if( eccStr == 'Q' ) iEccLevel = 2;
  else if( eccStr == 'H' ) iEccLevel = 3;

  try
  {
    var xsegs = makeSegmentsOptimally(qStr, iEccLevel, minVersion, maxVersion);
    var aSegList = xsegs[1];
    if(bQrSplitterDebug) console.log(aSegList);
    for(var i = 0; i < aSegList.length; ++i )
    {
      if( aSegList[i].mode == "NUMERIC" )
      {
        segs.push( qrcodegen.QrSegment.makeNumeric(aSegList[i].text) );
      }
      else if(aSegList[i].mode == "ALPHANUMERIC")
      {
        segs.push( qrcodegen.QrSegment.makeAlphanumeric(aSegList[i].text) );
      }
      else
      {
        segs.push( (qrcodegen.QrSegment.makeSegments(aSegList[i].text))[0] );      
      }
    }
    //console.log(segs);
  }
  catch(ex)
  {
    console.log("Error optimizing segments in QR - the code is probably too large:" + ex);
    segs.push( (qrcodegen.QrSegment.makeSegments(qStr))[0] );      
  }
  qr = generateQrFromSegs(segs, eccStr, minVersion, maxVersion, mask, boostEcl)
  return qr;
}

/*
 * Render a qrcodegen.QrCode to a string
 */
function renderQrToString(qr)
{
  var oStr = "";
  for(var y = 0; y < qr.modules.length; ++y )
  {
    for(var x = 0; x < qr.modules[y].length; ++x )
    {
      oStr += (qr.modules[y][x])?"#":" ";
    }
    oStr += "\r\n";
  }
  return oStr;
}

/*
renderQr the normal way - just pixels of specified color/fillstyle

Manual invocation:
renderQr_graphicsDefault(document.getElementById('cOut'), cachedLastQr, parseInt(document.getElementById('scale').value)); 
 */
function renderQr_graphicsDefault(dCanvas, qr, scale = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff")
{
  var qrCodeSize = (qr.modules.length)* scale;

  var offsetX = 10;
  var offsetY = 10;

  dCanvas.width = qrCodeSize + offsetX * 2;
  dCanvas.height = qrCodeSize + offsetY * 2;
  var ctx = dCanvas.getContext('2d');
  ctx.clearRect(0,0, dCanvas.width, dCanvas.height);
  ctx.fillStyle = backgroundStyle;
  ctx.fillRect(0,0, dCanvas.width, dCanvas.height);
  for(var y = 0; y < qr.modules.length; ++y )
  {
    for(var x = 0; x < qr.modules[y].length; ++x )
    {
      ctx.fillStyle = (qr.modules[y][x])?fillStyleBlack:fillStyleWhite;
      ctx.fillRect(x*scale+offsetX, y*scale+offsetY, scale, scale);      
    }
  }
}//renderQr_graphicsDefault

function renderQr_graphicsCircle(dCanvas, qr, scale = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff")
{
  var qrCodeSize = (qr.modules.length)* scale;

  var offsetX = 10;
  var offsetY = 10;

  dCanvas.width = qrCodeSize + offsetX * 2;
  dCanvas.height = qrCodeSize + offsetY * 2;
  var ctx = dCanvas.getContext('2d');
  ctx.clearRect(0,0, dCanvas.width, dCanvas.height);
  ctx.fillStyle = backgroundStyle;
  ctx.fillRect(0,0, dCanvas.width, dCanvas.height);
  for(var y = 0; y < qr.modules.length; ++y )
  {
    for(var x = 0; x < qr.modules[y].length; ++x )
    {
      ctx.fillStyle = (qr.modules[y][x])?fillStyleBlack:fillStyleWhite;
      //ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
      ctx.beginPath();      
      ctx.ellipse(x*scale+offsetX + scale /2 , y*scale+offsetY + scale / 2, scale/2, scale/2, 0, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}//renderQr_graphicsCircle

function renderQr_graphicsCircle2(dCanvas, qr, scale = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff")
{
  var qrCodeSize = (qr.modules.length)* scale;

  var offsetX = 10;
  var offsetY = 10;

  dCanvas.width = qrCodeSize + offsetX * 2;
  dCanvas.height = qrCodeSize + offsetY * 2;
  var ctx = dCanvas.getContext('2d');
  ctx.clearRect(0,0, dCanvas.width, dCanvas.height);
  ctx.fillStyle = backgroundStyle;
  ctx.fillRect(0,0, dCanvas.width, dCanvas.height);
  for(var y = 0; y < qr.modules.length; ++y )
  {
    for(var x = 0; x < qr.modules[y].length; ++x )
    {
      ctx.fillStyle = (qr.modules[y][x])?fillStyleBlack:fillStyleWhite;
      //ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
      ctx.beginPath();      
      ctx.ellipse(x*scale+offsetX + scale /2 , y*scale+offsetY + scale / 2, scale/2, scale/2, 0, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = fillStyleBlack;
      ctx.strokeStyle = fillStyleBlack;
      ctx.beginPath();      
      ctx.ellipse(x*scale+offsetX + scale /2 , y*scale+offsetY + scale / 2, scale/2, scale/2, 0, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.stroke();
    }
  }
}//renderQr_graphicsCircle2

/*
 * Render a qrcodegen.QrCode to the text and canvas.
 */
function renderQr(qr)
{
  //text render
  var oStr = renderQrToString(qr);
  document.getElementById('textOut').value = oStr;

  //graphics render
  var scale = 2;
  var renderer = "general";
  var whiteColor = "#ffffff";
  var blackColor = "#000000";
  if( document.getElementById('scale').value ) scale = document.getElementById('scale').value;
  if( document.getElementById('szRenderer').value ) renderer = document.getElementById('szRenderer').value;
  if( document.getElementById('szWhiteColor').value ) whiteColor = document.getElementById('szWhiteColor').value;
  if( document.getElementById('szBlackColor').value ) blackColor = document.getElementById('szBlackColor').value;
  
  var backgroundStyle = "#ffffff";

  var dCanvas = document.getElementById('cOut');
  if( renderer == "circle" )
  {
    renderQr_graphicsCircle(dCanvas, qr, scale, whiteColor, blackColor, backgroundStyle);
  }
  else if( renderer == "circle2" )
  {
    renderQr_graphicsCircle2(dCanvas, qr, scale, whiteColor, blackColor, backgroundStyle);
  }
  else if( renderer == "general" )
  {
    renderQr_graphicsDefault(dCanvas, qr, scale, whiteColor, blackColor, backgroundStyle);
  }
  else
  {
    renderQr_Extended(renderer, dCanvas, qr, scale, whiteColor, blackColor, backgroundStyle);
  }
  scaleCanvasOut();
  
}//renderQr

/*
 * Generates the Qr Code and puts it as text and the image.
 *
 * This is the main mid-level invocation to creating a code from the user side.
 */
function makeCodeInt (qStr)
{
  //Error checking
  if( bQrSplitterDebug ) console.log( "makeCodeInt( qStr ) (" + qStr + ")");
  document.getElementById('strlen').value = qStr.length;

  if( qStr.length > 12680 )
  {
    clearInterval( qrGenInterval );
    document.getElementById('pageDataOut').value = "Max length:\nH: 1268\n1663, 2331, 2953";
    return;
  }

  //Make the QR Code
  var eccStr = document.getElementById('eccLevel').value;
  var minVersion = document.getElementById('iMinVersion').value;
  var maxVersion = document.getElementById('iMaxVersion').value;
  var iMask = document.getElementById('iMask').value;
  //generateQr(qStr, eccStr = 'L', minVersion = 1, maxVersion = 40, mask = -1, boostEcl = true )
  try
  {
    var qr = generateQr(qStr, eccStr, minVersion, maxVersion, iMask, true);
  }
  catch(ex)
  {
    document.getElementById("pageDataOut").value = ex.message;
    console.log(ex.message);
    return;
  }
  cachedLastQr = qr;
  renderQr(qr);
  //Draw the QR code.

}//makeCodeInt(qStr)

//Calls makecode in response to a UI change.
function ui_makeCode()
{
  chunks = [];
  makeCode();
}

/*
 * Load the file selected in the file picker to the input box.
 */
function ui_loadFileToInput()
{
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (file)
  {
    const reader = new FileReader();
    document.getElementById('szFilename').value = file.name;
    bLzma = document.getElementById('lzmaEnable').checked;
    reader.onload = function(e)
    {
      let encoded;
      //console.log(reader.result);
      const encodingType = document.querySelector('input[name="encodeAs"]:checked').value;
      var fileContents = new Uint8Array( reader.result );
      if( bQrSplitterDebug )
      {
        console.log(fileContents);
      }
      cachedFileContentsRaw = fileContents;
      document.getElementById("fileSizeOut").innerHTML = cachedFileContentsRaw.byteLength;
      if( bLzma )
      {
        fileContents = new Uint8Array( LZMA.compress( new Uint8Array(fileContents), 9 ) );
        if(bQrSplitterDebug) console.log(fileContents);
        document.getElementById("fileSizeOut").innerHTML = fileContents.byteLength;
      }

      cachedFileContents = fileContents;

      if (encodingType === 'base64')
      {
        //if the split_size is a default, change ui settings for splitter
        if( document.getElementById("split_size").value == 0
        || document.getElementById("split_size").value == 410
        || document.getElementById("split_size").value == 1400
        || document.getElementById("split_size").value == 1100
        )
        {
          document.getElementById("split_size").value = 410;
          document.getElementById("eccLevel").value = 'L';
          document.getElementById("iMinVersion").value = 17;
          document.getElementById("scale").value = 9;
        }
        encoded = _arrayBufferToBase64( fileContents );
      }
      else if (encodingType === 'base10')
      {
        //in base 10 M correction, module size changes around: 
        //400, 490, 580, 680, 760, 875, 966, 1100, 1237, 1400
        //if the split_size is a default, change ui settings for splitter
        if( document.getElementById("split_size").value == 0
        || document.getElementById("split_size").value == 410
        || document.getElementById("split_size").value == 1100
        || document.getElementById("split_size").value == 1400
        )
        {
          console.log("A");
          if( window.innerWidth < 500 )
          { //Phone
            document.getElementById("split_size").value = 1100;
            document.getElementById("eccLevel").value = 'L';
            document.getElementById("scale").value = 5;
            document.getElementById("iMinVersion").value = 17;            
          }
          else
          {
            document.getElementById("split_size").value = 1400;
            document.getElementById("eccLevel").value = 'L';
            document.getElementById("scale").value = 9;
            document.getElementById("iMinVersion").value = 17;            
          }
        }
        encoded = b10encode( fileContents );
      }
      else
      {
        encoded = new TextDecoder("utf-8").decode( fileContents );
      }
      //console.log( encoded );
      document.getElementById('text').value = encoded;
      ui_makeCode();
    }
    reader.readAsArrayBuffer(file);
  }
}

function makeStaticPage()
{
  const popupWindow = window.open("", "popupWindow", "width=600,height=400");
  popupWindow.document.innerHTML = "";
  pageid = 0;
  // Write the random text to the new window
  var iFontsize = document.getElementById('staticPageFontSize').value;
  var iTablecolumns = document.getElementById('staticPageTableColumns').value;
  popupWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
          body{
          font-size: ` + iFontsize + `px;
          }
        </style>
       <title>Static Page</title>
      </head>
      <body>`);
  ui_makeCode();
  clearInterval( qrGenInterval );

  const pageType = document.querySelector('input[name="staticPageAs"]:checked').value;
  const bLabel = document.getElementById('staticPageLabel').checked;

  if( pageType === 'lines' )
  {
    for( var i = 0; i < chunks.length; ++i )
    {
      pageid = i;
      makeCodeByChunkId(i);

      if( bLabel ) popupWindow.document.write("" + i + ": ");
      popupWindow.document.write("<img src=\"" + document.getElementById("cOut").toDataURL() + "\" /><br/>");
    }
  }
  else if( pageType === 'table' )
  {
    popupWindow.document.write("<table><tr>");
    for( var i = 0; i < chunks.length; ++i )
    {
      if( i % iTablecolumns == 0 && i != 0 )
      {
        //console.log("newline");
        popupWindow.document.write("</tr><tr>\n");
      }

      pageid = i;
      makeCodeByChunkId(i);

      if( bLabel ) popupWindow.document.write("<td>" + i + "</td>");
      popupWindow.document.write("<td><img src=\"" + document.getElementById("cOut").toDataURL() + "\" /></td>");
      //console.log( "i, iTablecolumns, i % iTablecolumns" + i + " : " + iTablecolumns + ":" + (i % iTablecolumns ) );

    }
    popupWindow.document.write("</tr></table>");
  }
  else //raw
  {
    for( var i = 0; i < chunks.length; ++i )
    {
      pageid = i;
      makeCodeByChunkId(i);

      if( bLabel ) popupWindow.document.write("" + i + ": ");
      popupWindow.document.write("<img src=\"" + document.getElementById("cOut").toDataURL() + "\" />");
    }
  }

  popupWindow.document.write(`
    </body>
    </html>
  `);
}

//called when the renderer dropdown is changed.
function rendererDropdownChanged() {
  var szRenderer = document.getElementById('szRenderer').value;
  var domidControlsOut = "domExpandedRenderOptions";

  if( szRenderer == 'general' || szRenderer == 'circle' || szRenderer == 'circle2' )
  {
    document.getElementById(domidControlsOut).innerHTML = "";
  }
  else
  {
    if(rendererDropdownChangedEx)
    {
      rendererDropdownChangedEx(szRenderer, domidControlsOut );
    }
  }
}

ui_makeCode();

document.getElementById('text').addEventListener("blur", ui_makeCode);
document.getElementById('text').addEventListener("input", ui_makeCode);
document.getElementById('scale').addEventListener("input", ui_makeCode);
document.getElementById('eccLevel').addEventListener("change", ui_makeCode);
document.getElementById('split_size').addEventListener("input", ui_makeCode);
document.getElementById('split_time').addEventListener("input", ui_makeCode);
document.getElementById('iMask').addEventListener("input", ui_makeCode);
document.getElementById('iMinVersion').addEventListener("input", ui_makeCode);
document.getElementById('iMaxVersion').addEventListener("input", ui_makeCode);
document.getElementById('szWhiteColor').addEventListener("input", ui_makeCode);
document.getElementById('szBlackColor').addEventListener("input", ui_makeCode);
document.getElementById('szRenderer').addEventListener("input", function()
  {
    rendererDropdownChanged();
    ui_makeCode();
  });
document.getElementById('buttomImageMode').addEventListener("click",function()
  {
    document.getElementById('tab1').style.display = "block";
    document.getElementById('tab2').style.display = "none";
  });
document.getElementById('buttonTextMode').addEventListener("click",function()
  {
    document.getElementById('tab1').style.display = "none";
    document.getElementById('tab2').style.display = "block";
  });
document.getElementById('buttonToggleDebug').addEventListener("click",function()
  {
    bQrSplitterDebug = !bQrSplitterDebug;
    console.log("Debug now set to: " + bQrSplitterDebug );
  });
document.getElementById('buttonToggleControls').addEventListener("click",function()
  {
    var x = document.getElementById('controlBox');
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
    scaleCanvasOut();
  });
document.getElementById('bFit').addEventListener("change",function()
  {

  });
document.getElementById('buttonToStaticPage').addEventListener("click", makeStaticPage);
document.getElementById('fileInput').addEventListener('change', ui_loadFileToInput);
document.getElementById('lzmaEnable').addEventListener('change', ui_loadFileToInput);
document.querySelectorAll('input[name="encodeAs"]').forEach(radio => {
  radio.addEventListener('change', ui_loadFileToInput);
});
//atob( document.getElementById("text").value );
// b10decode( document.getElementById("text").value );

