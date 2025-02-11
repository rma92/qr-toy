$(function () {

    const pixelSize = 6;
    const blockSize = (3 * pixelSize);

    let image;
    let has_image = false;

    function halftoneQR(QRBytes, controlBytes) {

        var canvas = $('#output').get(0);
        canvas.width = canvas.height = QRBytes.length * (3 * pixelSize);
      console.log( "WIDTH: " + canvas.width );
        var ctx = canvas.getContext('2d');
        var background = 'image';

        $('#imageColour, #imageThreshold, #imagePixel').attr({
            width: canvas.width,
            height: canvas.height
        });
        if (has_image) {
            // Re-draw image (incase size changed)
            drawImage();
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var canvasThreshold = $('#imageThreshold').get(0);
        var ctxThreshold = canvasThreshold.getContext('2d');

        if (has_image && background === 'image') {
            ctx.drawImage(canvasThreshold, 0, 0, canvas.width, canvas.height);
        }

        for (var byteRow = 0; byteRow < QRBytes.length; byteRow++) {
            for (var byteCell = 0; byteCell < QRBytes[byteRow].length; byteCell++) {
                if ((background === 'image' && !has_image) || background === 'noise') {
                    // Draw random bytes
                    ctx.fillStyle = 'pink';
                    for (var subRow = 0; subRow < 3; subRow++) {
                        for (var subCell = 0; subCell < 3; subCell++) {
                            ctx.fillStyle = 'red';
                            if (Math.random() < 0.5) {
                                ctx.fillStyle = 'green';
                            }
                            ctx.fillRect(byteRow * blockSize + (subRow * pixelSize), byteCell * blockSize + (subCell * pixelSize), pixelSize, pixelSize);
                        }
                    }
                }

                // Middle Cell
                ctx.fillStyle = QRBytes[byteRow][byteCell] ? 'yellow' : 'brown';
                ctx.fillRect(byteRow * blockSize + pixelSize, byteCell * blockSize + pixelSize, pixelSize, pixelSize);
            }
        }

        // Re-draw control bytes
        for (var byteRow = 0; byteRow < controlBytes.length; byteRow++) {
            for (var byteCell = 0; byteCell < controlBytes[byteRow].length; byteCell++) {
                if (controlBytes[byteRow][byteCell] !== null) {
                    if (controlBytes[byteRow][byteCell] === true) {
                        ctx.fillStyle = 'black';
                    } else {
                        ctx.fillStyle = 'white';
                    }
                    ctx.fillRect(byteRow * blockSize, byteCell * blockSize, blockSize, blockSize);
                }
            };
        };

        $('#download').attr('href', $('#output').get(0).toDataURL());

    }

    function drawImage() {
        var canvasColour = $('#imageColour').get(0);
        var ctxColour = canvasColour.getContext('2d');

        ctxColour.clearRect(0, 0, canvasColour.width, canvasColour.height);
        ctxColour.drawImage(image, 0, 0, canvasColour.width, canvasColour.height);

        drawPixel();
    }

    function drawPixel() {
        var canvasColour = $('#imageColour').get(0);
        var canvasPixel = $('#imagePixel').get(0);
        var ctxPixel = canvasPixel.getContext('2d');
        var canvasTemp = document.createElement('canvas');
        canvasTemp.width = canvasTemp.height = (canvasPixel.width / pixelSize);
      console.log("drawPixel Width: " + canvasTemp.width );
      console.log("pixelSize: " + pixelSize );
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
        var width = Math.sqrt(d.length / 4) / pixelSize;
      console.log("drawThreshold Width: " + width );
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
    }

    function init() {
        var imageColour = new Image();
        imageColour.onload = function () {
            has_image = true;
            image = this;
            regen();
        }
    }

    function regen() {
        var text = $('#input').val();

        var errorLevel = $('#error_level').val();

        var sizes = {
            L: [152, 272, 440, 640, 864, 1088, 1248, 1552, 1856, 1240],
            M: [128, 224, 352, 512, 688, 864, 992, 700, 700, 524],
            Q: [104, 176, 272, 384, 286, 608, 508, 376, 608, 434],
            H: [72, 128, 208, 288, 214, 480, 164, 296, 464, 346]
        };

        var userSize = parseInt($('#size').val());
        var QRsize = -1;
        if (userSize === 0) {
            for (var i = 0; i < sizes[errorLevel].length; i++) {
                if (text.length < sizes[errorLevel][i]) {
                    QRsize = i + 1 + 10;
                    break;
                }
            };
        } else {
            if (text.length < sizes[errorLevel][userSize - 1]) {
                QRsize = userSize;
            }
        }
        if (QRsize == -1) {
            if (userSize === 0) {
                if (errorLevel === 'H') {
                    alert('Too much text.');
                } else {
                    alert('Too much text. Try decreasing the error level.');
                }
            } else {
                alert('Too much text. Try decreasing the error level or increasing the size.');
            }
            return;
        }

        var qr = qrcode(QRsize, errorLevel);
        qr.addData(text);
        try {
            qr.make();
        } catch (e) {
            alert(e);
        }

        var controls = qrcode(QRsize, errorLevel);
        controls.addData(text);
        controls.make(true);

        halftoneQR(qr.returnByteArray(), controls.returnByteArray());

    };

    $('#size').on('input', function () {
        regen();
    });

    $('#error_level').on('input', function () {
        regen();
    });

    let debounce = null;
    $('#input').on('input', function (e) {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
            regen();
        }, 150);
    });

    init();

    window.handleUpload = (e) => {
        const file = e.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
            var imageColour = new Image();
            imageColour.onload = function () {
                has_image = true;
                image = this;
                drawImage();
                regen();
            }
            imageColour.src = event.target.result;
        };
        reader.readAsDataURL(file);
        return false;
    }
});
