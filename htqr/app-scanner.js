(function () {
  "use strict";

  const generatePanel = document.getElementById("generatePanel");
  const readPanel = document.getElementById("readPanel");
  const tabGenerate = document.getElementById("tabGenerate");
  const tabRead = document.getElementById("tabRead");

  const cameraSelector = document.getElementById("cameraSelector");
  const focusControl = document.getElementById("focusControl");
  const cameraResolution = document.getElementById("cameraResolution");
  const cameraFrameRate = document.getElementById("cameraFrameRate");
  const format = document.getElementById("format");
  const mode = document.getElementById("mode");
  const canvas = document.getElementById("canvas");
  const resultElement = document.getElementById("result");
  const startButton = document.getElementById("buttonStartCamera");
  const stopButton = document.getElementById("buttonStopCamera");
  const clearReaderButton = document.getElementById("buttonClearReader");
  const colorSweep = document.getElementById("colorSweep");
  const invertSweep = document.getElementById("invertSweep");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const video = document.createElement("video");

  video.setAttribute("id", "video");
  video.setAttribute("autoplay", "");
  video.setAttribute("playsinline", "");
  video.muted = true;

  let zxingInstance = null;
  let zxingReady = false;
  let stream = null;
  let scannerRunning = false;
  let activeTab = "generate";
  let rafId = 0;
  let lastDecodeAt = 0;
  let decodeBusy = false;
  let decodeIntervalMs = 140;
  const wasmHeapCache = { ptr: 0, bytes: 0 };
  const filterCache = {};

  ZXing().then((instance) => {
    zxingInstance = instance;
    zxingReady = true;
  }).catch((err) => {
    resultElement.textContent = `ZXing failed to load: ${err && err.message ? err.message : err}`;
  });

  function isPhone() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  cameraSelector.value = isPhone() ? "environment" : "user";

  function startGeneratorTimer() {
    if (typeof makeNextCode !== "function" || typeof startTimer !== "function") return;
    if (Number(document.getElementById("split_size").value) <= 0) {
      document.getElementById("pageDataOut").value = "Set Split size above 0 to use the timer";
      return;
    }
    if (!window.chunks || window.chunks.length === 0) {
      ui_makeCode();
    }
    makeNextCode();
    startTimer(Number(document.getElementById("split_time").value) || 130);
  }

  function stopGeneratorTimer() {
    if (typeof qrGenInterval !== "undefined") {
      clearInterval(qrGenInterval);
      qrGenInterval = null;
    }
    document.getElementById("pageDataOut").value = "Timer stopped";
  }

  function getCameraSettings() {
    const [widthRaw, heightRaw] = (cameraResolution.value || "0x0").split("x").map((v) => Number(v));
    const fps = Number(cameraFrameRate.value) || 0;
    decodeIntervalMs = fps > 0 ? Math.max(60, Math.round(1000 / fps)) : 140;

    const video = {
      facingMode: cameraSelector.value,
      advanced: [{ focusMode: "continuous" }]
    };
    if (widthRaw > 0 && heightRaw > 0) {
      video.width = { ideal: widthRaw };
      video.height = { ideal: heightRaw };
    }
    if (fps > 0) {
      video.frameRate = { ideal: fps, max: fps };
    }
    return video;
  }

  function setActiveTab(next) {
    activeTab = next;
    const reading = next === "read";
    generatePanel.classList.toggle("active", !reading);
    readPanel.classList.toggle("active", reading);
    tabGenerate.classList.toggle("active", !reading);
    tabRead.classList.toggle("active", reading);
    tabGenerate.setAttribute("aria-selected", String(!reading));
    tabRead.setAttribute("aria-selected", String(reading));

    if (reading) {
      startScanner();
    } else {
      stopScanner("Camera stopped");
    }
  }

  function ensureHeap(bytes) {
    if (!zxingInstance || !zxingInstance._malloc) return 0;
    if (wasmHeapCache.bytes !== bytes) {
      if (wasmHeapCache.ptr) {
        try { zxingInstance._free(wasmHeapCache.ptr); } catch (e) {}
      }
      wasmHeapCache.ptr = zxingInstance._malloc(bytes);
      wasmHeapCache.bytes = bytes;
    }
    return wasmHeapCache.ptr;
  }

  function readBarcodeFromBuffer(rgbaBuffer, imgWidth, imgHeight, formatName, tryHarder) {
    if (!zxingReady || !zxingInstance.readBarcodeFromPixmap) return null;
    const ptr = ensureHeap(rgbaBuffer.byteLength);
    if (!ptr) return null;
    zxingInstance.HEAPU8.set(rgbaBuffer, ptr);
    return zxingInstance.readBarcodeFromPixmap(ptr, imgWidth, imgHeight, tryHarder, formatName);
  }

  function filteredBuffer(src, pass) {
    let out = filterCache[pass];
    if (!out || out.length !== src.length) {
      out = new Uint8ClampedArray(src.length);
      filterCache[pass] = out;
    }

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
      let y;
      if (pass.startsWith("red")) y = r;
      else if (pass.startsWith("green")) y = g;
      else if (pass.startsWith("blue")) y = b;
      else y = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
      if (pass.endsWith("-invert")) y = 255 - y;
      out[i] = y;
      out[i + 1] = y;
      out[i + 2] = y;
      out[i + 3] = a;
    }
    return out;
  }

  function decodeAll(imageData) {
    const results = [];
    const seen = new Set();
    const tryHarder = mode.value === "true";
    const formatName = format.value;
    const push = (res, pass) => {
      if (res && res.format && !res.error && res.text && !seen.has(res.text)) {
        seen.add(res.text);
        results.push({ code: res, pass });
      }
    };

    if (colorSweep.checked) {
      const passes = invertSweep.checked ? ["red-invert", "green-invert", "blue-invert"] : ["red", "green", "blue"];
      for (const pass of passes) {
        push(readBarcodeFromBuffer(filteredBuffer(imageData.data, pass), imageData.width, imageData.height, formatName, tryHarder), pass);
      }
      return results;
    }

    push(readBarcodeFromBuffer(imageData.data, imageData.width, imageData.height, formatName, tryHarder), "original");
    return results;
  }

  function drawCodeOutline(targetCtx, code, scaleX, scaleY, color) {
    if (!code.position) return;
    targetCtx.beginPath();
    targetCtx.lineWidth = 3;
    targetCtx.strokeStyle = color;
    const p = code.position;
    targetCtx.moveTo(p.topLeft.x * scaleX, p.topLeft.y * scaleY);
    targetCtx.lineTo(p.topRight.x * scaleX, p.topRight.y * scaleY);
    targetCtx.lineTo(p.bottomRight.x * scaleX, p.bottomRight.y * scaleY);
    targetCtx.lineTo(p.bottomLeft.x * scaleX, p.bottomLeft.y * scaleY);
    targetCtx.closePath();
    targetCtx.stroke();
  }

  function channelFromPass(pass) {
    if (pass.startsWith("red")) return "red";
    if (pass.startsWith("green")) return "green";
    if (pass.startsWith("blue")) return "blue";
    return pass;
  }

  function updateRgbPreviews(imageData, detections) {
    const box = document.getElementById("rgb-previews");
    box.style.display = colorSweep.checked ? "block" : "none";
    if (!colorSweep.checked) return;

    [
      ["prev-red", "red"],
      ["prev-green", "green"],
      ["prev-blue", "blue"]
    ].forEach(([id, pass]) => {
      const preview = document.getElementById(id);
      const pctx = preview.getContext("2d", { willReadFrequently: true });
      const tmp = document.createElement("canvas");
      tmp.width = imageData.width;
      tmp.height = imageData.height;
      const filterPass = invertSweep.checked ? `${pass}-invert` : pass;
      tmp.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(filteredBuffer(imageData.data, filterPass)), imageData.width, imageData.height), 0, 0);
      pctx.clearRect(0, 0, preview.width, preview.height);
      pctx.drawImage(tmp, 0, 0, preview.width, preview.height);
      (detections[channelFromPass(filterPass)] || []).forEach((code) => {
        drawCodeOutline(pctx, code, preview.width / imageData.width, preview.height / imageData.height, "#d62424");
      });
    });
  }

  function drawResult(code) {
    drawCodeOutline(ctx, code, 1, 1, "#d62424");
  }

  function groupDetections(codes) {
    const grouped = { red: [], green: [], blue: [], original: [] };
    codes.forEach((entry) => {
      const channel = channelFromPass(entry.pass);
      if (!grouped[channel]) grouped[channel] = [];
      grouped[channel].push(entry.code);
    });
    return grouped;
  }

  function handleCodes(entries) {
    if (!entries.length) {
      resultElement.textContent = "No barcode found";
      return;
    }

    resultElement.textContent = entries.map((entry) => `${entry.pass}: ${entry.code.text}`).join("\n");
    for (const entry of entries) {
      const code = entry.code;
      if (typeof recordDecodedScan === "function") {
        recordDecodedScan(code.text);
      }
      drawResult(code);
    }
  }

  function frameLoop(now) {
    if (!scannerRunning) return;
    rafId = requestAnimationFrame(frameLoop);
    if (!video.videoWidth || decodeBusy || now - lastDecodeAt < decodeIntervalMs) return;

    lastDecodeAt = now;
    decodeBusy = true;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const codes = decodeAll(imageData);
      updateRgbPreviews(imageData, groupDetections(codes));
      handleCodes(codes);
    } catch (err) {
      resultElement.textContent = err && err.message ? err.message : String(err);
    } finally {
      decodeBusy = false;
    }
  }

  async function startScanner() {
    if (activeTab !== "read" || document.hidden || scannerRunning) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      resultElement.textContent = "Camera API is not available in this context";
      return;
    }

    stopScanner("Starting camera");
    scannerRunning = true;
    resultElement.textContent = zxingReady ? "Starting camera" : "Loading decoder";

    const constraints = {
      audio: false,
      video: getCameraSettings()
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!scannerRunning || activeTab !== "read") {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
        return;
      }
      video.srcObject = stream;
      await video.play();

      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
      if (capabilities.focusDistance) {
        focusControl.disabled = false;
        focusControl.min = capabilities.focusDistance.min;
        focusControl.max = capabilities.focusDistance.max;
        focusControl.step = capabilities.focusDistance.step || 1;
      } else {
        focusControl.disabled = true;
      }
      focusControl.oninput = async () => {
        try {
          await track.applyConstraints({ advanced: [{ focusMode: "manual", focusDistance: Number(focusControl.value) }] });
        } catch (e) {}
      };

      rafId = requestAnimationFrame(frameLoop);
    } catch (err) {
      scannerRunning = false;
      resultElement.textContent = `Camera error: ${err && err.message ? err.message : err}`;
    }
  }

  function stopScanner(message) {
    scannerRunning = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    if (message) resultElement.textContent = message;
  }

  tabGenerate.addEventListener("click", () => setActiveTab("generate"));
  tabRead.addEventListener("click", () => setActiveTab("read"));
  startButton.addEventListener("click", () => {
    if (activeTab !== "read") setActiveTab("read");
    else startScanner();
  });
  stopButton.addEventListener("click", () => stopScanner("Camera stopped"));
  clearReaderButton.addEventListener("click", () => {
    if (typeof clearReaderData === "function") clearReaderData();
  });
  cameraSelector.addEventListener("change", () => {
    if (scannerRunning) {
      stopScanner("Switching camera");
      startScanner();
    }
  });
  cameraResolution.addEventListener("change", () => {
    if (scannerRunning) {
      stopScanner("Changing resolution");
      startScanner();
    }
  });
  cameraFrameRate.addEventListener("change", () => {
    if (scannerRunning) {
      stopScanner("Changing frame rate");
      startScanner();
    }
  });
  document.getElementById("buttonStartTimer").addEventListener("click", startGeneratorTimer);
  document.getElementById("buttonStopTimer").addEventListener("click", stopGeneratorTimer);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopScanner("Camera stopped");
  });
  window.addEventListener("pagehide", () => stopScanner());
  window.addEventListener("beforeunload", () => stopScanner());

  window.hotqrStopScanner = stopScanner;
  window.hotqrStartScanner = startScanner;
})();
