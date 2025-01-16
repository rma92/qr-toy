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
  return size > 0 ? str.match(new RegExp('.{1,' + size + '}', 'g')) : [str];
}
 

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

  qStr = "Q:" + pageid + ":" + chunks.length + "\n" + chunks[pageid];
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
