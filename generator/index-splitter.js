//var qrcode = new QRCode(document.getElementById("qrcode"), {});
var qrcode;

//if enabled, debug to console.
var bQrSplitterDebug = false;

// Timer to generate the next QR code
var qrGenInterval = null;

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
 * Initializes the QR Code library with the error level set to 'L', 'M', 'Q', or 'H' (character).
 *
 * This must be called before trying to create a code.
 */
function initqr(correctLevel)
{
  if( bQrSplitterDebug ) console.log(" initqr: " + correctLevel );
  var cL;
  if( correctLevel == 'L' )
  {
    qrcode = new QRCode(null, {
      correctLevel: QRCode.CorrectLevel.L
    });
  }
  else if( correctLevel == 'M' )
  {
    qrcode = new QRCode(null, {
      correctLevel: QRCode.CorrectLevel.M
    });
  }
  else if( correctLevel == 'Q' )
  {
    qrcode = new QRCode(null, {
      correctLevel: QRCode.CorrectLevel.Q
    });
  }
  else
  {
    qrcode = new QRCode(null, {
      correctLevel: QRCode.CorrectLevel.H
    });
  }
}//initqr

/*
 * calls initqr with the ecc code set based on the dropdown.
 */
function initqr_gui()
{
  initqr( document.getElementById('eccLevel').value );
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

function makeNextCode()
{
  if( bQrSplitterDebug ) console.log( "makeNextCode()  pageid: " + pageid );
  ++pageid;
  if( pageid >= chunks.length ) pageid = 0;

  qStr = "Q:" + pageid + ":" + chunks.length + ":" + icrc32 + "::" + chunks[pageid];
  if( bQrSplitterDebug ) console.log( "makeNextCode - qString: " + qStr);
  makeCodeInt( qStr );
  document.getElementById("pageDataOut").value = pageid + " out of " + chunks.length;
} //makeNextCode()

function makeCodeInt (qStr)
{
  if( bQrSplitterDebug ) console.log( "makeCodeInt( qStr ) (" + qStr + ")");
  document.getElementById('strlen').value = qStr.length;
  if( qStr.length > 12680 )
  {
    clearInterval( qrGenInterval );
    alert("Max length:\nH: 1268\n1663, 2331, 2953");
    return;
  }
  var oStr = qrcode.makeCodeString(qStr);
  document.getElementById('textOut').value = oStr;

  var nC = qrcode._oQRCode.getModuleCount();
  var scale = 2;
  if( document.getElementById('scale').value )
  {
    scale = document.getElementById('scale').value;
  }
  var offsetX = 10;
  var offsetY = 10;
  var dCanvas = document.getElementById("cOut");
  var ctx = dCanvas.getContext('2d');
  ctx.clearRect(0,0, dCanvas.width, dCanvas.height);
  for(var r = 0; r < nC; ++r)
  {
    for(var c = 0; c < nC; ++c)
    {
      if( qrcode._oQRCode.isDark(r,c) )
      {
        ctx.fillStyle = "black";
      }
      else
      {
        ctx.fillStyle = "white";
      }
      ctx.fillRect(r*scale+offsetX, c*scale+offsetY, scale, scale);
    }
  }
}//makeCodeInt(qStr)

//Calls makecode in response to a UI change.
function ui_makeCode()
{
  initqr_gui();
  chunks = [];
  makeCode();
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
