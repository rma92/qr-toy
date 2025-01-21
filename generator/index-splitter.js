//var qrcode = new QRCode(document.getElementById("qrcode"), {});
//var qrcode;

//if enabled, debug to console.
var bQrSplitterDebug = false;

// Timer to generate the next QR code
var qrGenInterval = null;

//prefix to beginning of string
var qStrPrefix = "Q";
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
var icrc32 = 0;

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
    fileData = ":B64";
  }
  else if( encodingType === 'base10' )
  {
    fileData = ":B10";
  }

  qStr = qStrPrefix + ":" + pageid + ":" + chunks.length + ":" + icrc32 + ":" + szFilename + fileData + "::" + chunks[pageid];
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
  document.getElementById("pageDataOut").value = pageid + " out of " + chunks.length;
} //makeNextCode()

//helper function to split string into array.
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


function makeCodeIntSegments (qStr, ecc)
{
  var qr;
  var strs = splitStringByCategory(qStr, 10);
  var segs = [];  
  for(var i = 0; i < strs.length; ++i )
  {
    if( /[0-9]/.test( strs[i] ) )
    {
      segs.push( qrcodegen.QrSegment.makeNumeric(strs[i]) );
    }
    else
    {
      segs.push( (qrcodegen.QrSegment.makeSegments(strs[i]))[0] );
    }
  }
  /*
  var strsflat = [];
  var segs = [];
  for(var i = 0; i < strs.length; ++i )
  {
    if( strs[i].category == "Numeric-Only" )
    {
      segs.push( qrcodegen.QrSegment.makeNumeric(strs[i].value) );
    }
    else if( strs[i].category == "Alphanumeric" )
    {
      console.log(strs[i].value);
      segs.push( qrcodegen.QrSegment.makeAlphanumeric(strs[i].value) );
    }
    else
    {
      //segs.push( qrcodegen.QrSegment.makeBytes(strs[i].value) );
      segs.push( (qrcodegen.QrSegment.makeSegments(strs[i].value))[0] );
    }
  }
  */
  console.log(strs);
  //console.log(strsflat);
  //var segs = qrcodegen.QrSegment.makeSegments(strsflat);
  /*
  var segs = [];
  for(var i = 0; i < strs.length; ++i )
  {
      segs.push( qrcodegen.QrSegment.makeSegments(strs[i]) );
  }
  */
  //segs.push( qrcodegen.QrSegment.makeSegments("qStr") );
  console.log(segs);
  /*
  var segs = [
    qrcodegen.QrSegment.makeAlphanumeric("QSTR"),
    qrcodegen.QrSegment.makeNumeric("123")];
  console.log(segs);
  qr = qrcodegen.QrCode.encodeSegments(segs, qrcodegen.QrCode.Ecc.LOW);
*/
  //var qr = qrcodegen.QrCode.encodeText(qStr, ecc);
  qr = qrcodegen.QrCode.encodeSegments(segs, ecc);
  return qr;
}

/*
 * Generates the Qr Code and puts it as text and the image.
 */
function makeCodeInt (qStr)
{
  if( bQrSplitterDebug ) console.log( "makeCodeInt( qStr ) (" + qStr + ")");
  document.getElementById('strlen').value = qStr.length;

  if( qStr.length > 12680 )
  {
    clearInterval( qrGenInterval );
    document.getElementById('pageDataOut').value = "Max length:\nH: 1268\n1663, 2331, 2953";
    return;
  }

  var eccStr = document.getElementById('eccLevel').value
  var ecc = qrcodegen.QrCode.Ecc.LOW;
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
  //var qr = qrcodegen.QrCode.encodeText(qStr, ecc);
  var qr = makeCodeIntSegments(qStr, ecc);
  var oStr = "";
  for(var y = 0; y < qr.modules.length; ++y )
  {
    for(var x = 0; x < qr.modules[y].length; ++x )
    {
      oStr += (qr.modules[y][x])?"#":" ";
    }
    oStr += "\r\n";
  }
  document.getElementById('textOut').value = oStr;

  var scale = 2;
  if( document.getElementById('scale').value )
  {
    scale = document.getElementById('scale').value;
  }

  var qrCodeSize = Math.ceil(Math.sqrt( oStr.length )) * scale;

  var offsetX = 10;
  var offsetY = 10;

  var dCanvas = document.getElementById("cOut");
  dCanvas.width = qrCodeSize + offsetX * 2;
  dCanvas.height = qrCodeSize + offsetY * 2;
  var ctx = dCanvas.getContext('2d');
  ctx.clearRect(0,0, dCanvas.width, dCanvas.height);
  for(var y = 0; y < qr.modules.length; ++y )
  {
    for(var x = 0; x < qr.modules[y].length; ++x )
    {
      ctx.fillStyle = (qr.modules[y][x])?"black":"white";
      ctx.fillRect(x*scale+offsetX, y*scale+offsetY, scale, scale);      
    }
  }
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
    reader.onload = function(e)
    {
      let encoded;
      console.log(reader.result);
      const encodingType = document.querySelector('input[name="encodeAs"]:checked').value;
      if (encodingType === 'base64')
      {
        encoded = _arrayBufferToBase64( reader.result );
      }
      else if (encodingType === 'base10')
      {
        encoded = b10encode( reader.result );
      }
      else
      {
        encoded = new TextDecoder("utf-8").decode( reader.result );
      }
      console.log( encoded );
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
        console.log("newline");
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

ui_makeCode();

document.getElementById('text').addEventListener("blur", ui_makeCode);
document.getElementById('text').addEventListener("input", ui_makeCode);
document.getElementById('scale').addEventListener("input", ui_makeCode);
document.getElementById('eccLevel').addEventListener("change", ui_makeCode);
document.getElementById('split_size').addEventListener("input", ui_makeCode);
document.getElementById('split_time').addEventListener("input", ui_makeCode);
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
document.getElementById('buttonToStaticPage').addEventListener("click", makeStaticPage);
document.getElementById('fileInput').addEventListener('change', ui_loadFileToInput);
document.querySelectorAll('input[name="encodeAs"]').forEach(radio => {
  radio.addEventListener('change', ui_loadFileToInput);
});
//atob( document.getElementById("text").value );
// b10decode( document.getElementById("text").value );

