(function () {
  "use strict";

  const generatePanel = document.getElementById("generatePanel");
  const readPanel = document.getElementById("readPanel");
  const settingsPanel = document.getElementById("settingsPanel");
  const tabGenerate = document.getElementById("tabGenerate");
  const tabRead = document.getElementById("tabRead");
  const tabSettings = document.getElementById("tabSettings");
  const genActions = document.getElementById("toolbar");

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
  const invalidateCacheButton = document.getElementById("buttonInvalidateCache");
  const cacheStatus = document.getElementById("cacheStatus");
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
  const passStyles = {
    original: { label: "Original", color: "#d62424" },
    red: { label: "Red", color: "#d62424" },
    green: { label: "Green", color: "#188a42" },
    blue: { label: "Blue", color: "#2469d6" },
    "red-invert": { label: "Red inverted", color: "#d62424" },
    "green-invert": { label: "Green inverted", color: "#188a42" },
    "blue-invert": { label: "Blue inverted", color: "#2469d6" }
  };

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
    const generating = next === "generate";
    const settings = next === "settings";
    generatePanel.classList.toggle("active", generating);
    readPanel.classList.toggle("active", reading);
    settingsPanel.classList.toggle("active", settings);
    tabGenerate.classList.toggle("active", generating);
    tabRead.classList.toggle("active", reading);
    tabSettings.classList.toggle("active", settings);
    tabGenerate.setAttribute("aria-selected", String(generating));
    tabRead.setAttribute("aria-selected", String(reading));
    tabSettings.setAttribute("aria-selected", String(settings));
    genActions.style.display = generating ? "flex" : "none";

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

  function clonePoint(point) {
    if (!point) return null;
    return { x: Number(point.x) || 0, y: Number(point.y) || 0 };
  }

  function normalizeReadResult(result, pass) {
    if (!result) return null;
    const normalized = {
      text: result.text || "",
      format: result.format || "",
      error: result.error || "",
      pass
    };
    if (result.position) {
      normalized.position = {
        topLeft: clonePoint(result.position.topLeft),
        topRight: clonePoint(result.position.topRight),
        bottomRight: clonePoint(result.position.bottomRight),
        bottomLeft: clonePoint(result.position.bottomLeft)
      };
    }
    if (result.symbologyIdentifier) normalized.symbologyIdentifier = result.symbologyIdentifier;
    return normalized;
  }

  function readBarcodesFromBuffer(rgbaBuffer, imgWidth, imgHeight, formatName, tryHarder, pass) {
    if (!zxingReady || (!zxingInstance.readBarcodesFromPixmap && !zxingInstance.readBarcodeFromPixmap)) return [];
    const ptr = ensureHeap(rgbaBuffer.byteLength);
    if (!ptr) return [];
    zxingInstance.HEAPU8.set(rgbaBuffer, ptr);

    const readSingle = () => {
      if (!zxingInstance.readBarcodeFromPixmap) return [];
      const result = zxingInstance.readBarcodeFromPixmap(ptr, imgWidth, imgHeight, tryHarder, formatName);
      try {
        return result ? [normalizeReadResult(result, pass)] : [];
      } finally {
        if (result && typeof result.delete === "function") result.delete();
      }
    };

    if (zxingInstance.readBarcodesFromPixmap) {
      try {
        let vector = null;
        const results = [];
        try {
          vector = zxingInstance.readBarcodesFromPixmap(ptr, imgWidth, imgHeight, tryHarder, formatName);
          const size = vector && typeof vector.size === "function" ? vector.size() : 0;
          for (let i = 0; i < size; i += 1) {
            let result = null;
            try {
              result = vector.get(i);
              results.push(normalizeReadResult(result, pass));
            } finally {
              if (result && typeof result.delete === "function") result.delete();
            }
          }
        } finally {
          if (vector && typeof vector.delete === "function") vector.delete();
        }
        const normalized = results.filter(Boolean);
        return normalized.length ? normalized : readSingle();
      } catch (e) {
        return readSingle();
      }
    }

    return readSingle();
  }

  function percentileFromHistogram(histogram, total, percentile) {
    const target = Math.max(0, Math.min(total - 1, Math.floor(total * percentile)));
    let count = 0;
    for (let i = 0; i < histogram.length; i += 1) {
      count += histogram[i];
      if (count > target) return i;
    }
    return histogram.length - 1;
  }

  function stretchSignalToLuma(signal, low, high) {
    if (high <= low) return signal > low ? 0 : 255;
    const stretched = Math.max(0, Math.min(255, ((signal - low) * 255) / (high - low)));
    return 255 - (stretched | 0);
  }

  function rgbChannelSignal(src, i, channelOffset, invert) {
    const value = src[i + channelOffset];
    const direct = invert ? value : 255 - value;
    if (invert) return direct;

    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const otherAverage = channelOffset === 0 ? (g + b) / 2 : (channelOffset === 1 ? (r + b) / 2 : (r + g) / 2);
    const opponent = Math.max(0, Math.min(255, (otherAverage - value) * 2));
    return Math.max(direct, opponent) | 0;
  }

  function filteredBuffer(src, pass) {
    let out = filterCache[pass];
    if (!out || out.length !== src.length) {
      out = new Uint8ClampedArray(src.length);
      filterCache[pass] = out;
    }

    const invert = pass.endsWith("-invert");
    const channel = channelFromPass(pass);

    if (channel === "red" || channel === "green" || channel === "blue") {
      const channelOffset = channel === "red" ? 0 : channel === "green" ? 1 : 2;
      const histogram = new Uint32Array(256);
      for (let i = 0; i < src.length; i += 4) {
        const signal = rgbChannelSignal(src, i, channelOffset, invert);
        histogram[signal] += 1;
      }

      const total = src.length / 4;
      const low = percentileFromHistogram(histogram, total, 0.01);
      let high = percentileFromHistogram(histogram, total, 0.99);
      if (high <= low) high = percentileFromHistogram(histogram, total, 0.999);

      for (let i = 0; i < src.length; i += 4) {
        const signal = rgbChannelSignal(src, i, channelOffset, invert);
        const y = stretchSignalToLuma(signal, low, high);
        out[i] = y;
        out[i + 1] = y;
        out[i + 2] = y;
        out[i + 3] = src[i + 3];
      }
      return out;
    }

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i], g = src[i + 1], b = src[i + 2], a = src[i + 3];
      let y = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0;
      if (invert) y = 255 - y;
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
    const push = (codes, pass) => {
      for (const code of codes) {
        if (!code || !code.format || code.error || !code.text) continue;
        const key = `${code.format}\n${code.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ code, pass });
        }
      }
    };

    push(readBarcodesFromBuffer(imageData.data, imageData.width, imageData.height, formatName, tryHarder, "original"), "original");

    if (colorSweep.checked) {
      const passes = ["red", "green", "blue"];
      if (invertSweep.checked) passes.push("red-invert", "green-invert", "blue-invert");
      for (const pass of passes) {
        push(readBarcodesFromBuffer(filteredBuffer(imageData.data, pass), imageData.width, imageData.height, formatName, tryHarder, pass), pass);
      }
    }

    return results;
  }

  function styleForPass(pass) {
    return passStyles[pass] || passStyles[channelFromPass(pass)] || passStyles.original;
  }

  function drawCodeOutline(targetCtx, code, scaleX, scaleY, color, label) {
    if (!code.position) return;
    const p = code.position;
    if (!p.topLeft || !p.topRight || !p.bottomRight || !p.bottomLeft) return;
    const points = [p.topLeft, p.topRight, p.bottomRight, p.bottomLeft].map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY
    }));
    targetCtx.beginPath();
    targetCtx.lineWidth = 3;
    targetCtx.strokeStyle = color;
    targetCtx.moveTo(points[0].x, points[0].y);
    targetCtx.lineTo(points[1].x, points[1].y);
    targetCtx.lineTo(points[2].x, points[2].y);
    targetCtx.lineTo(points[3].x, points[3].y);
    targetCtx.closePath();
    targetCtx.stroke();

    if (label) {
      const labelX = Math.max(0, Math.min(...points.map((point) => point.x)));
      const labelY = Math.max(0, Math.min(...points.map((point) => point.y)) - 18);
      targetCtx.save();
      targetCtx.font = "13px sans-serif";
      targetCtx.textBaseline = "top";
      const width = Math.ceil(targetCtx.measureText(label).width) + 8;
      targetCtx.fillStyle = color;
      targetCtx.fillRect(labelX, labelY, width, 17);
      targetCtx.fillStyle = "#fff";
      targetCtx.fillText(label, labelX + 4, labelY + 2);
      targetCtx.restore();
    }
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
      const filterPass = pass;
      tmp.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(filteredBuffer(imageData.data, filterPass)), imageData.width, imageData.height), 0, 0);
      pctx.clearRect(0, 0, preview.width, preview.height);
      pctx.drawImage(tmp, 0, 0, preview.width, preview.height);
      (detections[channelFromPass(filterPass)] || []).forEach((entry) => {
        const style = styleForPass(entry.pass);
        drawCodeOutline(pctx, entry.code, preview.width / imageData.width, preview.height / imageData.height, style.color, style.label);
      });
    });
  }

  function drawResult(entry) {
    const style = styleForPass(entry.pass);
    drawCodeOutline(ctx, entry.code, 1, 1, style.color, style.label);
  }

  function groupDetections(codes) {
    const grouped = { red: [], green: [], blue: [], original: [] };
    codes.forEach((entry) => {
      const channel = channelFromPass(entry.pass);
      if (!grouped[channel]) grouped[channel] = [];
      grouped[channel].push(entry);
    });
    return grouped;
  }

  function handleCodes(entries) {
    if (!entries.length) {
      resultElement.textContent = "No barcode found";
      return;
    }

    resultElement.textContent = entries.map((entry) => `${styleForPass(entry.pass).label}: ${entry.code.text}`).join("\n");
    const texts = entries.map((entry) => entry.code && entry.code.text).filter(Boolean);
    if (typeof recordDecodedScans === "function") {
      recordDecodedScans(texts);
    } else {
      for (const text of texts) {
        if (typeof recordDecodedScan === "function") recordDecodedScan(text);
      }
    }
    for (const entry of entries) {
      drawResult(entry);
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

  async function invalidateCacheAndReload() {
    if (cacheStatus) cacheStatus.textContent = "Clearing offline cache...";
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      const url = new URL(window.location.href);
      url.searchParams.set("reload", Date.now().toString());
      if (cacheStatus) cacheStatus.textContent = "Reloading from network...";
      window.location.replace(url.toString());
    } catch (err) {
      if (cacheStatus) cacheStatus.textContent = err && err.message ? err.message : String(err);
    }
  }

  tabGenerate.addEventListener("click", () => setActiveTab("generate"));
  tabRead.addEventListener("click", () => setActiveTab("read"));
  tabSettings.addEventListener("click", () => setActiveTab("settings"));
  startButton.addEventListener("click", () => {
    if (activeTab !== "read") setActiveTab("read");
    else startScanner();
  });
  stopButton.addEventListener("click", () => stopScanner("Camera stopped"));
  clearReaderButton.addEventListener("click", () => {
    if (typeof clearReaderData === "function") clearReaderData();
  });
  invalidateCacheButton.addEventListener("click", invalidateCacheAndReload);
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
