
      var zxing = ZXing().then(function(instance) {
        zxing = instance; // this line is supposedly not required but with current emsdk it is :-/
      });

      function generateBarcode() {
        var text = document.getElementById("input_text").value;
        var format = document.getElementById("input_format").value;
        var charset = document.getElementById("input_charset").value;
        var margin = parseInt(document.getElementById("input_margin").value);
        var width = parseInt(document.getElementById("input_width").value);
        var height = parseInt(document.getElementById("input_height").value);
        var eccLevel = parseInt(document.getElementById("input_ecclevel").value);

        var container = document.getElementById("write_result")
        var result = zxing.generateBarcode(text, format, charset, margin, width, height, eccLevel);
        if (result.image) {
          showImage(container, result.image);
        } else {
          container.innerHTML = '<font color="red">Error: ' + result.error + '</font>';
          container.style.width = '300px';
        }
        result.delete();
      }

      function showImage(container, fileData) {
        container.innerHTML = '';
        var img = document.createElement("img");
        img.addEventListener('load', function() {
          container.style.width = img.width + 'px';
          container.style.height = img.height + 'px';
        });
        img.src = URL.createObjectURL(new Blob([fileData]))
        container.appendChild(img);
      }
