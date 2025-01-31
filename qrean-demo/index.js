import { Qrean } from "./qrean.js";

const setsel = (sel, types) => {
  for (const name in types) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  }
};
setsel(seltype, Qrean.CODE_TYPES);
setsel(seldatatype, Qrean.DATA_TYPES);
setsel(seleci, Qrean.QR_ECI_CODES);

const defaultset = "123456789012,tQR,AUTO,ShiftJIS";
const set = (location.hash.substring(1) || defaultset).split(",");
if (set && set.length == 4) {
  intext.value = decodeURIComponent(set[0]);
  seltype.value = set[1];
  seldatatype.value = set[2];
  seleci.value = set[3];
}

function imageToDataURI(img) {
  if (!img) return '';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(img.width, img.height);
  imageData.data.set(img.data);
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
}


const qrean = new Qrean({
  // debug: true,
});

seltype.oninput = seldatatype.oninput = intext.oninput = async () => {
  divimg.innerHTML = "";
  const imgd = await qrean.encode(intext.value, {
    codeType: seltype.value,
    dataType: seldatatype.value
  }).then(imageToDataURI);
  if (!imgd) {
    console.log("ERROR");
    return;
  }

  const img = new Image();
  img.src = imgd;
  divimg.appendChild(img);

  const set = `${encodeURIComponent(intext.value)},${seltype.value},${seldatatype.value},${seleci.value}`;
  if (set == defaultset) {
    location.hash = '';
  } else {
    location.hash = set;
  }
};
seleci.oninput = () => {
  const set = `${encodeURIComponent(intext.value)},${seltype.value},${seldatatype.value},${seleci.value}`;
  if (set == defaultset) {
    location.hash = '';
  } else {
    location.hash = set;
  }
};

intext.oninput();

let recording = false;
const video = document.createElement("video");
const ctx = canvas.getContext("2d");

async function detectOnCanvas() {
  try {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { digitized, detected } = await qrean.detect(img, {
      gamma: gamma.value,
      eciCode: seleci.value,
    });
    decodeResult.value = detected.map(({ type, text, qr }) => `${type}${qr ? JSON.stringify(qr) : ''}: ${text}`).join('\n');

    if (digitize.checked) {
      img.data.set(digitized.data);
      ctx.putImageData(img, 0, 0);
    }

    // draw found rectangle
    detected.forEach(({ points }) => {
      ctx.beginPath();
      ctx.strokeStyle = 'red';
      ctx.moveTo(... points[0]);
      ctx.lineTo(... points[1]);
      ctx.lineTo(... points[2]);
      ctx.lineTo(... points[3]);
      ctx.lineTo(... points[0]);
      ctx.stroke();
    });

  } catch (e) {
    console.error(e);
  }
}

file.onchange = (e) => {
  if (recording) return;

  const f = file.files?.[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  const img = new Image();

  img.onload = async function() {
    URL.revokeObjectURL(img.src);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

    await detectOnCanvas();
  };
  img.src = url;
  file.value = '';
};

async function tick() {
  if (!recording) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const w = video.videoWidth * scale;
    const h = video.videoHeight * scale;

    ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

    await detectOnCanvas();
  }

  requestAnimationFrame(tick);
}

camera.onclick = () => {
  recording = !recording;
  file.disabled = recording ? 'disabled' : '';

  if (recording) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
      video.srcObject = stream;
      video.setAttribute("playsinline", true);
      video.play();
      requestAnimationFrame(tick);
    });
  }
}

