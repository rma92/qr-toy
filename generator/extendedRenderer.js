//Hot QR extended rendering - additional drawing functionality
//Begin general drawing functions
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
    domObj.innerHTML += `
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
    domObj.innerHTML += `
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
}
addRendererToDropdown("pokeball", "Pokeball");
addRendererToDropdown("char", "RandomChar");
//TODO: Write a function to run when the renderer dropdown changes to add controls to the table if needed for the specific renderer.
