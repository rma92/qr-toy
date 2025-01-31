//regex to check if is base64
var base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
//strings to split header fields and header from data.
var szHeaderSeparator = "$";
var szHeaderTerminator = "$$";

var bDebug = false;
//dictionary to hold scans - key is the scan data to facilitate keeping unique ones only.
var dScans = {};

/*
 * key is the crc values.
 *
 * knownCRCLength value is the number of chunks for this crc (the 3rd item)
 * knownCRCScans value is an array of the scans.
 * knownCRCFilename value is the file name if it was specified, otherwise <crc>.txt.
 * finishedFiles value is the concatenated values of the files once all parts have been scanned.
 * finishedFilesArrayBuffer value is the files uncompressed (if needed) as an arraybuffer.
 */
var knownCRCLength = {};
var knownCRCScans = {};
var knownCRCFilename = {};
var knownCRCEncoding = {};
var finishedFiles = {};
var finishedFilesArrayBuffer = {};
//caching of last scan info for viewer
var szCachedLastScan = "";
var iCachedLastScanID = 0;
var szCachedLastScanCRC = "";
//cached file data for debugging or log output
var cachedOutString = "";
var cachedB10Decode = "";
var cachedLZMAOut = "";
var cachedDecode = "";
var cachedArrayBuffer = "";

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

function processSingleScan(szScan)
{
   var a = szScan.split( szHeaderTerminator );
    if( a.length == 2 )
    {
      var aheaders = a[0].split( szHeaderSeparator );
      if( aheaders.length >= 4 )
      {
        var crc = aheaders[3];
        var currentScan = aheaders[1];
        iCachedLastScanID = currentScan;
        szCachedLastScanCRC = crc;
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

/*
 * gets the string value of Object.keys(dScans)[keyId]
 *
 * Used to get the contents of an array for save and view buttons for
 * individual scans in the table.
 *
 * This sorts the keys.  Since processScanData is called and redraws
 * the table when a new scan is added to dScans, the indexes here should
 * be the same.
 */
function getScanContentsByKeyId(keyId)
{
  var keys = Object.keys( dScans );
  keys = keys.sort();
  return keys[keyId];
}

function downloadArrayBuffer(arrayBuffer, fileName) {
    // Create a blob from the ArrayBuffer
    const blob = new Blob([new Uint8Array(arrayBuffer)], { type: 'application/octet-stream' });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    // Append the link to the document body and trigger the download
    document.body.appendChild(a);
    a.click();

    // Remove the link from the document
    document.body.removeChild(a);

    // Revoke the object URL to free up memory
    URL.revokeObjectURL(url);
}

/*
 * Accepts an array buffer (e.g. from finishedFilesArrayBuffer[ keysFf[i] ]) and
 * returns an image url.
 */
function arrayBufferToBlobUrl(arrayBuffer, mimeType) {
    // Create a blob from the ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: mimeType });

    // Create a URL for the blob
    return URL.createObjectURL(blob);
}

function downloadContentByCrc(szCrc) {
  var filename = "file.txt";
  if( knownCRCFilename[ szCrc ] )
  {
    filename = knownCRCFilename[ szCrc ];
  }
  downloadArrayBuffer(finishedFilesArrayBuffer[szCrc], filename);
}

/*
 * Analyze the scanned data.
 */
function processScanData()
{
  var keys = Object.keys( dScans );
  var resultContainer = document.getElementById('qr-reader-results');
  processSingleScan(szCachedLastScan);
  keys = keys.sort();
  var szResultOut = "<table class=\"resultsTable\">";
  for(var i = 0; i < keys.length; ++i )
  {
    szResultOut += "<tr><td><div class=\"tdScanPreview\">" + keys[i].replaceAll("\n", "<br/>") + "</div></td>";
    szResultOut += "<td><button onClick=\"makePopupOfString( getScanContentsByKeyId(" + i + ").replaceAll('\\n','<br/>') );\">View</button></td></tr>";

    //Sample string:
    //"Q:3:10:15748754::Four score seven years ago"
    //processSingleScan( keys[i] );
  }
  szResultOut += "</table>";
  resultContainer.innerHTML = szResultOut;
  //Create the table of CRCs
  var knownCRCKeys = Object.keys( knownCRCScans );
  var tableOut = "";
  for(var i = 0; i < knownCRCKeys.length; ++i )
  {
    tableOut += "<table><tr><th colspan=10>" + knownCRCFilename[ knownCRCKeys[i] ] + "(" + knownCRCKeys[i] + ")</th></tr>";
    for(var j = 0; j < knownCRCLength[ knownCRCKeys[i] ]; ++j )
    {
      if( knownCRCScans[ knownCRCKeys[i] ][ j ] != null )
      {
        if( knownCRCKeys[i] == szCachedLastScanCRC && j == iCachedLastScanID )
        {

          tableOut += "<td bgcolor=lime><b>" + j + "</b></td>";
        }
        else
        {
          tableOut += "<td bgcolor=lime>" + j + "</td>";
        }
      }
      else
      {
        tableOut += "<td bgcolor=red>" + j + "</td>";
      }
      if( j % 10 == 9 )
      {
        tableOut += "</tr><tr>";
      }
    }

    tableOut += "</tr></table>";
  }
  document.getElementById("scanview").innerHTML = tableOut;
  //check if any Crcs are fully ready.
  knownCRCLengthKeys = Object.keys(knownCRCLength);
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
      if( bDebug )
      {
        console.log( "data:text/plain;base64," + 
        btoa(unescape(encodeURIComponent(outString ))) );
      }
      finishedFiles[ currentCrc ] = outString;
      //parse the file.
      //new TextDecoder("Latin1").decode( new Uint8Array( finishedFilesArrayBuffer[1021043213] ) );
      if( knownCRCEncoding[ currentCrc ] == 'LB1' )
      {
        cachedOutString = outString;
        cachedB10Decode = b10decode( outString );
        cachedLZMAOut = LZMA.decompress( cachedB10Decode );
        //cachedDecode = new TextDecoder("Latin1").decode( new Uint8Array( cachedLZMAOut ) );
        //cachedArrayBuffer = new TextEncoder("Latin1").encode( cachedDecode ).buffer;
        finishedFilesArrayBuffer[ currentCrc ] = cachedLZMAOut;
      }
      else if( knownCRCEncoding[ currentCrc ] == 'B10' )
      {
        finishedFilesArrayBuffer[ currentCrc ] = b10decode( outString );
      }
      else if( knownCRCEncoding[ currentCrc ] == 'LB6' )
      {
        const binaryString = atob(outString);
        var bytes = new Uint8Array( binaryString.length );
        for( let i = 0; i < binaryString.length; ++i )
        {
          bytes[i] = binaryString.charCodeAt(i);
        }
        cachedLZMAOut = LZMA.decompress( bytes );
        finishedFilesArrayBuffer[ currentCrc ] = cachedLZMAOut;
      }
      else if( knownCRCEncoding[ currentCrc ] == 'B64' || base64regex.test( outString ) ) //base64, but not labeled as base64
      {
        const binaryString = atob(outString);
        var bytes = new Uint8Array( binaryString.length );
        for( let i = 0; i < binaryString.length; ++i )
        {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        finishedFilesArrayBuffer[ currentCrc ] = bytes.buffer;
      }
      else
      {
        finishedFilesArrayBuffer[ currentCrc ] = outString;
      } //if filetype
      update_file_download_links();
    }
  }
}//process can data

/**
 * Checks if a filename ends with a valid image extension.
 * @param {string} filename - The name of the file to check.
 * @returns {boolean} - Returns true if the filename ends with a valid image extension, false otherwise.
 */
function hasImageExtensionRegex(filename) {
    const regex = /\.(png|jpe?g|gif|webp)$/i;
    return regex.test(filename);
}

/**
 * Extracts the file extension from a filename.
 * @param {string} filename - The name of the file.
 * @returns {string|null} - The file extension in lowercase without the dot, or null if none found.
 */
function getFileExtension(filename) {
    const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : null;
}

/**
 * Returns the MIME type based on the file extension.
 * @param {string} extension - The file extension (without the dot).
 * @returns {string|null} - The corresponding MIME type or null if unsupported.
 */
function getMimeType(extension) {
    const mimeTypes = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp"
    };
    return mimeTypes[extension] || null;
}

/*
 * Call from processScanData when a new file is finished to update the links.
 */
function update_file_download_links()
{
  var d = document.getElementById("file-links");
  var keysFf = Object.keys( finishedFilesArrayBuffer );
  var szLinksTableOut = "<ul>";
  for( var i = 0; i < keysFf.length; ++i )
  {
    var filename = knownCRCFilename[ keysFf[i] ];
    szLinksTableOut += "<li><a download=\""
                + filename
                + "\" onclick=\""
                + "downloadContentByCrc(" + keysFf[i] + ")"
                + "\">"
                + filename
                + "</a>"
                + " (<a onclick=\""
                + "makePopupOfCrc(" + keysFf[i]
                + ")\")>Open As Text</a>)"
                + "</li>\n";
    if( hasImageExtensionRegex( filename ) )
    {
      const extension = getFileExtension( filename );
      const mimeType = getMimeType(extension);
      const blobUrl = arrayBufferToBlobUrl(new Uint8Array( finishedFilesArrayBuffer[ keysFf[i] ]), mimeType);
      szLinksTableOut += `<br/><img src="${blobUrl}" alt="image" />`;
    }
  }
  szLinksTableOut += "</ul>";
  d.innerHTML = szLinksTableOut;
}

/*
 * Given a CRC, decodes as text and displays in the popup window using makePopupOfString.
 */
function makePopupOfCrc(szCrc)
{
    makePopupOfString( new TextDecoder("Latin1").decode( new Uint8Array( finishedFilesArrayBuffer[szCrc] ) ).replaceAll("\n", "<br/>") );
}

/*
 * Given a string, generates a popup window of the viewer.
 *
 * TODO: expand the viewer to be mime aware and support other types of files.
 */
function makePopupOfString(szString)
{
  const popupWindow = window.open("", "popupWindow", "width=600,height=400");
  popupWindow.document.innerHTML = "";
  pageid = 0;

  var iFontsize = "12px";
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
      <body>
      <table><tr><td>
        <button onclick="window.close()">Close</button>
        </td><td>
        <button onclick="copyToClipboard()">Copy</button>        
      </td>
      <td>
        <button onclick="downloadContent()">Download</button>      
      </td>
      </tr>
      </table>
      <div id="popupContent">
  `);
    popupWindow.document.write(szString)
    popupWindow.document.write(`</div></body>`);
    popupWindow.document.write(`
        <script>
            function copyToClipboard() {
                const content = document.getElementById('popupContent').innerText;
                navigator.clipboard.writeText(content).then(() => {
                    alert('Content copied to clipboard!');
                }).catch(err => {
                    alert('Failed to copy content: ' + err);
                });
            }

            function downloadContent() {
                const content = document.getElementById('popupContent').innerText;
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'content.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        </script>
    `);
    popupWindow.document.write(`</html>`);
}
/*
 * When the page is ready and interactive, scanning attempts start.
 */
function runScanner()
{
  var resultContainer = document.getElementById('qr-reader-results');
  var lastResult, countResults = 0;
  var ifps = 20;
  var iqrbox = 500;
  ifps = parseInt(document.getElementById("ifps").value);
  iqrbox = parseInt(document.getElementById("ibox").value);
  
  function onScanSuccess(decodedText, decodedResult)
  {
    if (decodedText !== lastResult)
    {
      ++countResults;
      lastResult = decodedText;
      //add the scan.
      dScans[ decodedText ] = '1';
      szCachedLastScan = lastResult;
      processScanData();
    }
  }

  //var html5QrcodeScanner = new Html5QrcodeScanner( "qr-reader", { fps: ifps, qrbox: iqrbox });
  var html5QrcodeScanner = new Html5QrcodeScanner( "qr-reader", { fps: ifps });
  html5QrcodeScanner.render(onScanSuccess);
}

//docReady(runScanner);

document.getElementById("buttonClearHistory").addEventListener("click",function()
  {
    reset();
    document.getElementById('qr-reader-results').innerHTML = "";
  });

document.getElementById("buttonStart").addEventListener("click",function()
  {
    runScanner();
  });

function testShortScan()
{
  var s1 = "HTTP://QR.HT/$0$2$3497144816$out.txt$$http://r";
  var s2 = "HTTP://QR.HT/$1$2$3497144816$out.txt$$m.vg/";
  processSingleScan( s1 );
  processSingleScan( s2 );
  dScans[ s1 ] = 1;
  dScans[ s2 ] = 1;
}


