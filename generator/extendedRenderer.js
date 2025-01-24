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
function pokeBall(ctx2, x, y, iScale, lineWidth, offsetX = 2, offsetY = 2, lineColor = "black", topFillColor = '#e00', bottomFillColor = '#eee')
{
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

function renderQr_pokeball(dCanvas, qr, scale = 2, fillStyleWhite = "#ffffff", fillStyleBlack = "#000000", backgroundStyle = "#ffffff")
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
      if(qr.modules[y][x])
      {
        pokeBall(ctx, x, y, scale, 3, offsetX, offsetY);
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
  else if( renderer == "pokeball" )
  {
    renderQr_pokeball(dCanvas, qr, scale, fillStyleWhite, fillStyleBlack, backgroundStyle);
  }
  else
  {
    renderQr_graphicsDefault(dCanvas, qr, scale, fillStyleWhite, fillStyleBlack, backgroundStyle);
  }
}

addRendererToDropdown("pokeball", "Pokeball");
