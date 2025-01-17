//regex to check if is base64
var base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

//dictionary to hold scans - key is the scan data to facilitate keeping unique ones only.
var dScans = {};

/*
 * key is the crc values.
 *
 * knownCRCLength value is the number of chunks for this crc (the 3rd item)
 * knownCRCScans value is an array of the scans.
 * knownCRCFilename value is the file name if it was specified, otherwise <crc>.txt.
 * finishedFiles value is the concatenated values of the files once all parts have been scanned.
 */
var knownCRCLength = {};
var knownCRCScans = {};
var knownCRCFilename = {};
var knownCRCEncoding = {};
var finishedFiles = {};
/*
 * Resets the stored data
 */
function reset()
{
  knownCRCLength = {};
  knownCRCScans = {};
  dScans = {};
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
 * Waits until the doc is ready/interactive.
 */
function docReady(fn)
{
  // see if DOM is already available
  if (document.readyState === "complete"
    || document.readyState === "interactive")
  {
    // call on next available tick
    setTimeout(fn, 1);
  }
  else
  {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

/*
 * Analyze the scanned data.
 */
function processScanData()
{
  var keys = Object.keys( dScans );
  var resultContainer = document.getElementById('qr-reader-results');
  
  keys = keys.sort();
  resultContainer.innerHTML = "";
  for(var i = 0; i < keys.length; ++i )
  {
    resultContainer.innerHTML += keys[i] + "<br/>";

    //Sample string:
    //"Q:3:10:15748754::Four score seven years ago"
    var a = keys[i].split("::");
    if( a.length == 2 )
    {
      var aheaders = a[0].split(':');
      if( aheaders.length >= 4 )
      {
        var crc = aheaders[3];
        var currentScan = aheaders[1];
        var totalScansForThisCRC = aheaders[2];

        knownCRCLength[crc] = totalScansForThisCRC;
        if( knownCRCScans[crc] == null )
        {
          knownCRCScans[crc] = {};
        }
        knownCRCScans[crc][currentScan] = a[1];

        //filename
        if( aheaders.length >= 5 )
        {
          //Add the filename if there is one
          knownCRCFilename[crc] = aheaders[4];
        }
        else
        {
          knownCRCFilename[crc] = crc + ".txt";
        }

        if( aheaders.length >= 6 )
        {
          knownCRCEncoding[crc] = aheaders[5];
        }
      }
    }
  }

  //check if any Crcs are fully ready.
  knownCRCLengthKeys = Object.keys(knownCRCLength);
  console.log("CRC");
  for(var i = 0; i < knownCRCLengthKeys.length; ++i )
  {
    var currentCrc = knownCRCLengthKeys[i];
    if( knownCRCScans[ currentCrc ] == null || finishedFiles[ currentCrc ] != null )
    {
      continue;
    }
    var currentCrcScanKeys = Object.keys(knownCRCScans[currentCrc])
    if( currentCrcScanKeys.length >= knownCRCLength[ currentCrc ] )
    {
      var outString = "";
      document.getElementById("inputTextOut").value = currentCrc + " is done";
      for(var j = 0; j < currentCrcScanKeys.length; ++j )
      {
        outString += knownCRCScans[currentCrc][ currentCrcScanKeys[j] ];
      }
      console.log( "data:text/plain;base64," + 
        btoa(unescape(encodeURIComponent(outString ))) );
      finishedFiles[ currentCrc ] = outString;
      update_file_download_links();
    }
  }
}//process can data

/*
 * Call from processScanData when a new file is finished to update the links.
 */
function update_file_download_links()
{
  var d = document.getElementById("file-links");
  var keysFf = Object.keys( finishedFiles );
  d.innerHTML = "<ul>";
  for( var i = 0; i < keysFf.length; ++i )
  {
    var outString = finishedFiles[ keysFf[i]];
    if( knownCRCEncoding[ keysFf[i] ] == 'B10' )
    {
      d.innerHTML += "<li><a download=\""
                  + knownCRCFilename[ keysFf[i] ]
                  + "\" href=\""
                  + "data:text/plain;base64," + _arrayBufferToBase64( b10decode( outString ) )
                  + "\">"
                  + knownCRCFilename[ keysFf[i] ]
                  + "</a></li>\n";
    }
    else if( knownCRCEncoding[ keysFf[i] ] == 'B64' || base64regex.test( outString ) ) //base64, but not labeled as base64
    {
      //Is Base64
      d.innerHTML += "<li><a download=\""
                  + knownCRCFilename[ keysFf[i] ]
                  + "\" href=\""
                  + "data:text/plain;base64," + outString
                  + "\">"
                  + knownCRCFilename[ keysFf[i] ]
                  + "</a></li>\n";
    }
    else
    {
      d.innerHTML += "<li><a download=\""
                  + knownCRCFilename[ keysFf[i] ]
                  + "\" href=\""
                  + "data:text/plain;base64," + btoa(unescape(encodeURIComponent(outString ))) 
                  + "\">"
                  + knownCRCFilename[ keysFf[i] ]
                  + "</a></li>\n";
    }
  }
  d.innerHTML += "</ul>";
}
/*
 * When the page is ready and interactive, scanning attempts start.
 */
docReady(function ()
{
  var resultContainer = document.getElementById('qr-reader-results');
  var lastResult, countResults = 0;
  function onScanSuccess(decodedText, decodedResult)
  {
    if (decodedText !== lastResult)
    {
      ++countResults;
      lastResult = decodedText;
      //add the scan.
      dScans[ decodedText ] = '1';
      processScanData();
    }
  }

  var html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader", { fps: 20, qrbox: 500 });
  html5QrcodeScanner.render(onScanSuccess);
});

document.getElementById("buttonClearHistory").addEventListener("click",function()
  {
    reset();
    document.getElementById('qr-reader-results').innerHTML = "";
  });

function testShortScan()
{
  var s1 = "Q:0:2:3497144816:out.txt::http://r";
  var s2 = "Q:1:2:3497144816:out.txt::m.vg/";
  dScans[ s1 ] = 1;
  dScans[ s2 ] = 1;
}
