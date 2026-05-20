//Hot QR extended rendering - additional drawing functionality
//Begin general drawing functions
let halftoneBgImage;
let halftoneLastSizeUsed = 0;
//var halftoneiPixelSize = 6;
//var halftoneiBlockSize = (3 * halftoneiPixelSize);

function roundBall(ctx2, x, y, iScale, lineWidth)
{
  ctx2.strokeStyle = "black";
  ctx2.lineWidth = lineWidth;
  ctx2.beginPath();
  ctx2.moveTo( x * iScale + 1, y * iScale + iScale / 2 + 1);
  ctx2.arc( x * iScale + iScale/ 2 - 1, y * iScale + iScale / 2 - 1, iScale/2 - 2, 0, (Math.PI), true);
  ctx2.fillStyle = '#000';
  ctx2.fill();
  ctx2.stroke();

  ctx2.strokeStyle = "black";
  ctx2.lineWidth = lineWidth;
  ctx2.beginPath();
  ctx2.moveTo( x * iScale + 1, y * iScale + iScale / 2 + 1);
  ctx2.arc( x * iScale + iScale/ 2 - 1, y * iScale + iScale / 2 - 1, iScale/2 - 2, 0, (Math.PI), false);
  ctx2.fillStyle = '#000';
  ctx2.fill();
  ctx2.stroke();
}

function square(ctx2, x, y, iScale, lineWidth)
{
  ctx2.strokeStyle = "black";
  ctx2.fillStyle = "black";
  ctx2.fillRect( x * iScale, y * iScale, iScale , iScale );
}

function square_spacer(ctx2, x, y, iScale, lineWidth)
{
  var dx = iScale / 10;
  var dy = iScale / 10;
  ctx2.strokeStyle = "black";
  ctx2.fillStyle = "black";
  ctx2.fillRect( x * iScale + dx, y * iScale + dy, iScale - dx * 2, iScale - dy * 2 );
}
//end drawing functions
/*
 * Draw a Poke ball (or a Polandball) with the top right corner at x, y.
 *
 * Top colors:
 * Poke ball: #e00 (default)
 * Great Ball: #00e
 * Ultra ball: #222
 * Master ball: #a349a3
 */
function pokeBall(ctx2, x, y, iScale, lineWidth, offsetX = 2, offsetY = 2, lineColor = "black", topFillColor = '#e00', bottomFillColor = '#bbb')
{
  if(bQrSplitterDebug && bQrSplitterDebug == true) console.log(topFillColor);
  ctx2.strokeStyle = lineColor;
  ctx2.lineWidth = lineWidth;
  ctx2.beginPath();
  ctx2.moveTo( offsetX + x * iScale, offsetY + y * iScale + iScale / 2);
  ctx2.arc( offsetX + x * iScale + iScale/ 2, offsetY +  y * iScale + iScale / 2, iScale/2, 0, (Math.PI), true);
  ctx2.fillStyle = topFillColor;
  ctx2.fill();
  ctx2.stroke();

  ctx2.strokeStyle = lineColor;
  ctx2.lineWidth = lineWidth;
  ctx2.beginPath();
  ctx2.moveTo( offsetX + x * iScale, offsetY + y * iScale + iScale / 2);
  ctx2.arc( offsetX + x * iScale + iScale/ 2, offsetY + y * iScale + iScale / 2, iScale/2, 0, (Math.PI), false);
  ctx2.fillStyle = bottomFillColor;
  ctx2.fill();
  ctx2.stroke();
}

//End pokeball drawing functions

//Add the renderers to the dropdown.
// Get the dropdown element by its id
function addRendererToDropdown(szValue, szName, szDropdownId = "szRenderer")
{
  var dropdown = document.getElementById(szDropdownId);
  var newOption = document.createElement('option');

  newOption.value = szValue;
  newOption.text = szName;

  dropdown.appendChild(newOption);
} 

//draws a character or string (str)
function drawCharacter(ctx2, x, y, str, iScale, offsetX = 2, offsetY = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff", fontStyle = "48px serif")
{
  iScale = parseFloat(iScale);
  ctx2.fillStyle = fillStyleBlack;
  ctx2.font = fontStyle;
  ctx2.fillText(str, offsetX + x * iScale, iScale / 2 + offsetY +  y * iScale);
}

function renderQr_char(dCanvas, qr, scale = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff")
{
  var qrCodeSize = (qr.modules.length)* scale;
  scale = parseFloat(scale);
  //var szCharList = "%&x1F60A;"; 
  var szCharList = "\uD83D\uDE00"
  if( document.getElementById("szRenderCharList").value && document.getElementById("szRenderCharList").value.length > 0 )
  {
    szCharList = document.getElementById("szRenderCharList").value;
  }
  var aNonEmojis = szCharList.match(/[^\p{Emoji}]/gu);
  var aEmojis = szCharList.match(/\p{Emoji}/gu);
  if( aNonEmojis == null ) aNonEmojis = [];
  if( aEmojis == null ) aEmojis = [];
  var aCharList = aEmojis.concat(aNonEmojis);
  aCharList = aCharList.filter(item => item !== null);
  var szFontStyle = "serif"; 
  if( document.getElementById("szCharFontStyle").value )
  {
    szFontStyle = document.getElementById("szCharFontStyle").value;
  }
  var iFontSize = scale; 
  if( document.getElementById("iCharFontSize").value )
  {
    iFontSize = parseInt(document.getElementById("iCharFontSize").value);
  }
  if( iFontSize <= 0 )
  {
    iFontSize = scale;
  }
  var offsetX = scale;
  var offsetY = scale;
  dCanvas.width = qrCodeSize + offsetX * 2;
  dCanvas.height = qrCodeSize + offsetY * 2;

  var szFontStyle = iFontSize + "px " + szFontStyle;
  var ctx = dCanvas.getContext('2d');
  ctx.clearRect(0,0, dCanvas.width, dCanvas.height);
  ctx.fillStyle = backgroundStyle;
  ctx.fillRect(0,0, dCanvas.width, dCanvas.height);
  for(var y = 0; y < qr.modules.length; ++y )
  {
    for(var x = 0; x < qr.modules[y].length; ++x )
    {
      if(qr.modules[y][x])
      {
        //var renderChar = szCharList.charAt(Math.floor(Math.random() * szCharList.length));
        var renderChar = aCharList[Math.floor(Math.random()*aCharList.length)];
        drawCharacter(ctx, x, y, renderChar, scale, offsetX, offsetY, "#ffffff", "#000000", "ffffff", szFontStyle);
      }
    }
  }
}

function renderQr_pokeball(dCanvas, qr, scale = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff")
{
  var qrCodeSize = (qr.modules.length)* scale;

  var iLineWidth = -1; 
  if( document.getElementById("iPokeballLineWidth").value )
  {
    iLineWidth = parseInt(document.getElementById("iPokeballLineWidth").value);
  }
  if( iLineWidth == -1 )
  {
    iLineWidth = parseInt( scale / 4 );
  }
  var szLineColor = "#0a0"; 
  if( document.getElementById("szPokeballLineColor").value )
  {
    szLineColor = document.getElementById("szPokeballLineColor").value;
  }
  var szBottomColor = "#000"; 
  if( document.getElementById("szPokeballBottomColor").value )
  {
    szBottomColor = document.getElementById("szPokeballBottomColor").value;
  }
  var colorList = ""; 
  if( document.getElementById("szPokemonCustomColor").value )
  {
    colorList = document.getElementById("szPokeballColor").value;
  }
  var szRenderer = "poke";
  if(  document.getElementById("szPokeballColor").value )
  {
    szRenderer = document.getElementById("szPokeballColor").value;
  }
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
      if(qr.modules[y][x])
      {
        if( szRenderer == "poke" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, "#e00", szBottomColor);
        }
        else if( szRenderer == "great" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, "#00e", szBottomColor);
        }
        else if( szRenderer == "ultra" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, "#222", szBottomColor);
        }
        else if( szRenderer == "master" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, "#a349a3", szBottomColor);
        }
        else if( szRenderer == "polandball" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, szBottomColor, "#e00");

        }
        else if( szRenderer == "voltorb" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, "#e00", szBottomColor);
        }
        else if( szRenderer == "electrode" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, szBottomColor, "#e00");
        }
        else if( szRenderer == "randompokeball" )
        {
          var topColors = ["#e00", "#00e", "#222", "#a349a3"];
          var tC = topColors[Math.floor(Math.random()*topColors.length)];
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, tC);
        }
        else if( szRenderer == "randompokeballelectrode" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, szBottomColor);
        }
        else if( szRenderer == "custom" )
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY, szLineColor, szBottomColor);
        }
        else
        {
          pokeBall(ctx, x, y, scale, iLineWidth, offsetX, offsetY);
        }
      }
      else
      {

      }
    }
  }
}//renderQr_pokeball

function renderQr_halftone(dCanvas, qr, scale = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff")
{
  //get the radius.
  var fRadiusIntX = scale/4;
  var fRadiusIntY = scale/4;
  if( document.getElementById('halftoneQRsize').value != -1 )
  {
    fRadiusIntX = document.getElementById('halftoneQRsize').value;
    fRadiusIntY = document.getElementById('halftoneQRsize').value;
  }
  var qrCodeSize = (qr.modules.length)* scale;

  var offsetX = 10;
  var offsetY = 10;

  dCanvas.width = qrCodeSize + offsetX * 2;
  dCanvas.height = qrCodeSize + offsetY * 2;
  var ctx = dCanvas.getContext('2d');
  ctx.clearRect(0,0, dCanvas.width, dCanvas.height);
  ctx.fillStyle = backgroundStyle;
  ctx.fillRect(0,0, dCanvas.width, dCanvas.height);
  if( halftoneBgImage != null )
  {
    //Resize the canvases, and redraw the image.
    if( halftoneLastSizeUsed != qr.modules.length * 3 * scale )
    {
      console.log("Halftone Background Resize");
      $('#imageColour, #imageThreshold, #imagePixel').attr({
        width: qr.modules.length * 3 * scale,
        height: qr.modules.length * 3 * scale
      });
      
      drawImage();
    }
    var canvasThreshold = $('#imageThreshold').get(0);
    var ctxThreshold = canvasThreshold.getContext('2d');
    ctx.drawImage(canvasThreshold, 0, 0, dCanvas.width, dCanvas.height);
    //ctx.drawImage(halftoneBgImage, 0, 0, dCanvas.width, dCanvas.height);
  }
  var iModuleSizeOverride = document.getElementById('halftoneQRsize').value;
  for(var y = 0; y < qr.modules.length; ++y )
  {
    for(var x = 0; x < qr.modules[y].length; ++x )
    {
      //Draw random bytes from halftone gen
      //Function to draw random colors
      //pixelSize = scale/2;
      //blockSize = 3 * pixelSize;
      //ctx.fillStyle = `rgb(${128 + Math.floor(Math.random() * 128)}, ${128 + Math.floor(Math.random() * 128)}, ${128 + Math.floor(Math.random() * 128)})`;
      //ctx.fillRect( x * scale + offsetX , y * scale + offsetY, scale, scale );
      /*
      //Function to generate random noise.
      for (var subRow = 0; subRow < 3; subRow++)
      {
        for (var subCell = 0; subCell < 3; subCell++)
        {
          //ctx.fillStyle = `rgb(${128 + Math.floor(Math.random() * 128)}, ${128 + Math.floor(Math.random() * 128)}, ${128 + Math.floor(Math.random() * 128)})`;
          ctx.fillStyle = '#0000050';
          if (Math.random() < 0.5) {
            ctx.fillStyle = '#ffffff50';
          }
          ctx.fillRect( x * scale + offsetX + (subRow * scale / 3) , y * scale + offsetY + (subCell * scale / 3), scale / 3, scale / 3);

        }
      }
      */
      //end draw random bytes.
      if( isControlItem(x, y, qr.modules.length ) )
      {
        ctx.fillStyle = (qr.modules[y][x])?fillStyleBlack:fillStyleWhite;
        
        ctx.fillRect( x * scale + offsetX , y * scale + offsetY, scale, scale );
      }
      else
      {
        ctx.fillStyle = (qr.modules[y][x])?fillStyleBlack:fillStyleWhite;
        if( iModuleSizeOverride != -1 )
        {
          ctx.fillRect( 
            x * scale + offsetX + Math.floor(scale / 2) - iModuleSizeOverride / 2, y * scale + offsetY + Math.floor(scale / 2) - iModuleSizeOverride / 2,
            iModuleSizeOverride, iModuleSizeOverride);
        }
        else
        {
          ctx.fillRect( x * scale + offsetX + scale / 3, y * scale + offsetY + scale / 3, scale / 3, scale / 3);
          //ctx.fillRect( x * scale + offsetX + scale / 3 - 1, y * scale + offsetY + scale / 3 - 1, scale / 3 + 2, scale / 3 + 2);
        }
      }
      /*
      //Circles, TODO make optionally available
      ctx.beginPath();      
      ctx.ellipse(x*scale+offsetX + scale /2 , y*scale+offsetY + scale / 2, fRadiusIntX, fRadiusIntY, 0, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = fillStyleBlack;
      ctx.strokeStyle = fillStyleBlack;
      ctx.beginPath();      
      ctx.ellipse(x*scale+offsetX + scale /2 , y*scale+offsetY + scale / 2, fRadiusIntX, fRadiusIntY, 0, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.stroke();
      */
    }
  }
}//renderQr_halftone

//Halftone Helper functions
function isControlItem(x, y, width) {
    // Function to check if a coordinate is within a finder pattern
    function isFinderPattern(x, y) {
        //return (x < 7 && y < 7) || (x < 7 && y >= width - 7) || (x >= width - 7 && y < 7);
        return (x < 8 && y < 8) || (x < 8 && y >= width - 8) || (x >= width - 8 && y < 8);
    }

    // Function to check if a coordinate is within the timing pattern
    function isTimingPattern(x, y) {
        return (x === 6 || y === 6) && !isFinderPattern(x, y);
    }

    const alignmentPatternLocations = {
        2: [6, 18],
        3: [6, 22],
        4: [6, 26],
        5: [6, 30],
        6: [6, 34],
        7: [6, 22, 38],
        8: [6, 24, 42],
        9: [6, 26, 46],
        10: [6, 28, 50],
        11: [6, 30, 54],
        12: [6, 32, 58],
        13: [6, 34, 62],
        14: [6, 26, 46, 66],
        15: [6, 26, 48, 70],
        16: [6, 26, 50, 74],
        17: [6, 30, 54, 78],
        18: [6, 30, 56, 82],
        19: [6, 30, 58, 86],
        20: [6, 34, 62, 90],
        21: [6, 28, 50, 72, 94],
        22: [6, 26, 50, 74, 98],
        23: [6, 30, 54, 78, 102],
        24: [6, 28, 54, 80, 106],
        25: [6, 32, 58, 84, 110],
        26: [6, 30, 58, 86, 114],
        27: [6, 34, 62, 90, 118],
        28: [6, 26, 50, 74, 98, 122],
        29: [6, 30, 54, 78, 102, 126],
        30: [6, 26, 52, 78, 104, 130],
        31: [6, 30, 56, 82, 108, 134],
        32: [6, 34, 60, 86, 112, 138],
        33: [6, 30, 58, 86, 114, 142],
        34: [6, 34, 62, 90, 118, 146],
        35: [6, 30, 54, 78, 102, 126, 150],
        36: [6, 24, 50, 76, 102, 128, 154],
        37: [6, 28, 54, 80, 106, 132, 158],
        38: [6, 32, 58, 84, 110, 136, 162],
        39: [6, 26, 54, 82, 110, 138, 166],
        40: [6, 30, 58, 86, 114, 142, 170]
    };
    // Function to get alignment pattern locations based on QR code width
    function getAlignmentPatternLocations(width) {
        const version = (width - 17) / 4;
        return alignmentPatternLocations[Math.floor(version)] || [];
    }

    // Function to check if a coordinate is within any alignment pattern
    function isAlignmentPattern(x, y, width, onlyOneLocator = false) {
      const centers = getAlignmentPatternLocations(width);
      if(  (x < 10 && y < 10)
        || (x < 10 && y > width - 10)
        || (x > width - 10 && y < 10 )

      )
      {
      console.log( x, y );
        
        return false;
      }
      if( onlyOneLocator )
      {
        return x >= width - 9 && x < width - 4 && y >= width - 9 && y < width - 4;
      }
      else
      {
        for (let cx of centers) {
            for (let cy of centers) {
                if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) {
                    return true;
                }
            }
        }
        return false;
      }
    }

    var singleAlignment = document.getElementById('halftoneSingleAlignment').checked;    
    return isFinderPattern(x, y) || isTimingPattern(x, y) || isAlignmentPattern(x, y, width, singleAlignment);
}

    function drawImage() {
        var canvasColour = $('#imageColour').get(0);
        var ctxColour = canvasColour.getContext('2d');

        ctxColour.clearRect(0, 0, canvasColour.width, canvasColour.height);
        ctxColour.drawImage(halftoneBgImage, 0, 0, canvasColour.width, canvasColour.height);

        drawPixel();
    }

    function drawPixel() {
        var canvasColour = $('#imageColour').get(0);
        var canvasPixel = $('#imagePixel').get(0);
        var ctxPixel = canvasPixel.getContext('2d');
        var canvasTemp = document.createElement('canvas');
        canvasTemp.width = canvasTemp.height = (canvasPixel.width / parseInt(document.getElementById("scale").value / 2));
        //console.log("drawPixel Width: " + canvasTemp.width );
        var ctxTemp = canvasTemp.getContext('2d');

        ctxPixel.imageSmoothingEnabled = false;
        ctxTemp.imageSmoothingEnabled = false;

        ctxTemp.drawImage(canvasColour, 0, 0, canvasTemp.width, canvasTemp.height);
        ctxPixel.drawImage(canvasTemp, 0, 0, canvasPixel.width, canvasPixel.height);

        drawThreshold();
    }

    function drawThreshold() {
        var canvasPixel = $('#imagePixel').get(0);
        var ctxPixel = canvasPixel.getContext('2d');
        var canvasThreshold = $('#imageThreshold').get(0);
        var ctxThreshold = canvasThreshold.getContext('2d');

        var pixels = ctxPixel.getImageData(0, 0, canvasPixel.width, canvasPixel.height);
        var d = pixels.data;
        var width = Math.sqrt(d.length / 4) / parseInt(document.getElementById("scale").value);
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var grey = (r * 0.2126 + g * 0.7152 + b * 0.0722);
            //var v = (grey >= 127) ? 255 : 0;
            //d[i] = d[i+1] = d[i+2] = v;
            d[i] = d[i + 1] = d[i + 2] = grey;
        }

        for (var i = 0; i < d.length; i += 4) {
            var grey = d[i];
            var v = (grey >= 127) ? 255 : 0;

            // Dithering
            var error = (grey - v) / 8;
            var i2 = i / 4;
            var row = Math.floor(i2 / width);
            var cell = i2 % width;

            d[i] = d[i + 1] = d[i + 2] = v;

            d[(((row + 0) * width) + (cell + 1)) * 4] = d[(((row + 0) * width) + (cell + 1)) * 4 + 1] = d[(((row + 0) * width) + (cell + 1)) * 4 + 2] = d[(((row + 0) * width) + (cell + 1)) * 4] + error;
            d[(((row + 0) * width) + (cell + 2)) * 4] = d[(((row + 0) * width) + (cell + 2)) * 4 + 1] = d[(((row + 0) * width) + (cell + 2)) * 4 + 2] = d[(((row + 0) * width) + (cell + 2)) * 4] + error;
            d[(((row + 1) * width) + (cell - 1)) * 4] = d[(((row + 1) * width) + (cell - 1)) * 4 + 1] = d[(((row + 1) * width) + (cell - 1)) * 4 + 2] = d[(((row + 1) * width) + (cell - 1)) * 4] + error;
            d[(((row + 1) * width) + (cell + 0)) * 4] = d[(((row + 1) * width) + (cell + 0)) * 4 + 1] = d[(((row + 1) * width) + (cell + 0)) * 4 + 2] = d[(((row + 1) * width) + (cell + 0)) * 4] + error;
            d[(((row + 1) * width) + (cell + 1)) * 4] = d[(((row + 1) * width) + (cell + 1)) * 4 + 1] = d[(((row + 1) * width) + (cell + 1)) * 4 + 2] = d[(((row + 1) * width) + (cell + 1)) * 4] + error;
            d[(((row + 2) * width) + (cell + 0)) * 4] = d[(((row + 2) * width) + (cell + 0)) * 4 + 1] = d[(((row + 2) * width) + (cell + 0)) * 4 + 2] = d[(((row + 2) * width) + (cell + 0)) * 4] + error;
        }
        ctxThreshold.putImageData(pixels, 0, 0);
      halftoneLastSizeUsed = canvasPixel.width;
    }

//End Halftone helper functions
/*
 * Additional renderer function that is attempted to be called if render is set to something other than the builtins.
 */
function renderQr_Extended(renderer, dCanvas, qr, scale = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff")
{
  if( renderer == "pokeball" )
  {
    renderQr_pokeball(dCanvas, qr, scale, fillStyleWhite, fillStyleBlack, backgroundStyle);
  }
  else if( renderer == "char" )
  {
    renderQr_char(dCanvas, qr, scale, fillStyleWhite, fillStyleBlack, backgroundStyle);
  }
  else if( renderer == "halftone" )
  {
    renderQr_halftone(dCanvas, qr, scale, fillStyleWhite, fillStyleBlack, backgroundStyle);
  }
  else
  {
    renderQr_graphicsDefault(dCanvas, qr, scale, fillStyleWhite, fillStyleBlack, backgroundStyle);
  }
}

/*
 * Call this to add the renderer's options to the HTML element with the id domidControlsOut.
 */
function rendererDropdownChangedEx(szRenderer, domidControlsOut)
{
  var domObj = document.getElementById(domidControlsOut);
  if( !domObj )
  {
    console.log("No output for controls - rendererDropdownChangedEx!");
    return;
  }
  if( szRenderer == "pokeball" )
  {
    domObj.innerHTML = `
        <table>
        <tr>
        <td>
          Pokeball Color:
          <select id="szPokeballColor" name="szPokeballColor" style="width: 50px">
            <option value="poke">Poke</option>
            <option value="great">Great</option>
            <option value="ultra">Ultra</option>
            <option value="master">Master</option>
            <option value="polandball">Polandball</option>
            <!--<option value="voltorb">Voltorb</option>-->
            <!--<option value="electrode">Electrode</option>-->
            <option value="randompokeball">RandomPokeball</option>
            <!--<option value="randompokeballelectrode">RandomPokeball+Electrode</option>-->
            <!--<option value="custom">Custom</option>-->
          </select>
          </td>
          <td>
          Custon Pokeball Top Color<br/>
          <input id="szPokemonCustomColor" value="#e00" style="width: 60px"/>
          </td>
          <td>
          LineWidth (-1 for auto):<br/>
          <input type="number" id="iPokeballLineWidth" value="-1" min="-1" max="32"/>          
          </td>
          <td>
          LineColor:<br/>
          <input id="szPokeballLineColor" value="#222"  style="width: 60px"/>          
          </td>
          <td>
          BottomColor:<br/>
          <input id="szPokeballBottomColor" value="#bbb"  style="width: 60px"/>          
          </td>
          </tr>
          </table>
    `;
    document.getElementById('szPokeballColor').addEventListener("input", ui_makeCode);
    document.getElementById('szPokemonCustomColor').addEventListener("input", ui_makeCode);
    document.getElementById('iPokeballLineWidth').addEventListener("input", ui_makeCode);
    document.getElementById('szPokeballLineColor').addEventListener("input", ui_makeCode);
    document.getElementById('szPokeballBottomColor').addEventListener("input", ui_makeCode);
  }//szRenderer == "pokeball"
  else if( szRenderer == "char" )
  {
    domObj.innerHTML = `
        <table>
        <tr>
        <td>
        PossibleChars:<br/>
        <input id="szRenderCharList" value="&#x1F603;&#x1F622;"/>
        </td>
        <td>
        FontSize:<br/>
        <input type="number" id="iCharFontSize" value="-1" min="-1" max="1000"/>                  
        </td>
        <td>
        FontStyle:<br/>
        <input id="szCharFontStyle" value="serif"/>                  
        </td>
        </tr>
        </table>`
    document.getElementById('szRenderCharList').addEventListener("input", ui_makeCode);
    document.getElementById('iCharFontSize').addEventListener("input", ui_makeCode);
    document.getElementById('szCharFontStyle').addEventListener("input", ui_makeCode);
  }
  else if( szRenderer == "halftone" )
  {
    domObj.innerHTML = `
        <table>
        <tr>
        <td>
        Background:<br/>
        <label for="halftoneInputImage" class="form-label"><strong>Image</strong></label>
        <input id="halftoneInputImage" class="form-control" type="file" accept="image/*" onchange="handleHalftoneBgUpload(this)" />
        </td>
        <td>
        ModuleSize Override (-1 = default):<br/>
        <input type="number" id="halftoneQRsize" value="-1" min="-1" max="1000"/>
        </td>
        <td>
        Single Alignment:
        <input id="halftoneSingleAlignment" type="checkbox">
        </td>
        </tr>
        <tr>
        <td>
        <div style="display: none">
        <div class="col"><canvas id="imageColour" class="img-thumbnail"></canvas></div>
        <div class="col"><canvas id="imagePixel" class="img-thumbnail"></canvas></div>
        <div class="col"><canvas id="imageThreshold" class="img-thumbnail"></canvas></div>
        </div>
        </td>
        </tr>
        </table>`

    window.handleHalftoneBgUpload = (e) => {
        const file = e.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
            var imageColour = new Image();
            imageColour.onload = function () {
                has_image = true;
                halftoneBgImage = this;
                drawImage();
                //regen();
                ui_makeCode();
            }
            imageColour.src = event.target.result;
        };
        reader.readAsDataURL(file);
        return false;
    }
    document.getElementById('scale').value = 6;
    document.getElementById('iMinVersion').value = 6;
    document.getElementById('halftoneQRsize').addEventListener("input", ui_makeCode);
    document.getElementById('halftoneSingleAlignment').addEventListener("input", ui_makeCode);
  }
}
addRendererToDropdown("pokeball", "Pokeball");
addRendererToDropdown("char", "RandomChar");
addRendererToDropdown("halftone", "halftone");
//TODO: Write a function to run when the renderer dropdown changes to add controls to the table if needed for the specific renderer.
