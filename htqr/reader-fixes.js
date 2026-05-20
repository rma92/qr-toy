(function () {
  "use strict";

  const CHUNK_LOCAL_ENCODINGS = new Set(["B64C", "LB6C", "B10C", "LB1C"]);
  const LEGACY_ENCODINGS = new Set(["B64", "LB6", "B10", "LB1"]);
  window.filesByCrc = {};
  window.finishedFileBlobs = {};

  function bytesToArrayBuffer(value) {
    if (value instanceof ArrayBuffer) return value;
    if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    if (typeof value === "string") return new TextEncoder().encode(value).buffer;
    return new Uint8Array(value || []).buffer;
  }

  function asUint8Array(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (typeof value === "string") return new TextEncoder().encode(value);
    return new Uint8Array(value || []);
  }

  window.copyTextToClipboard = async function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {}
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
    return ok;
  };

  window.b10decode = function b10decodeChunked(s, forcedLength) {
    s = String(s || "").replace(/\s+/g, "");
    const decodedLength = forcedLength != null ? Number(forcedLength) : Math.floor(s.length / B10CONV_DIGITS_PER_BYTE);
    const out = new Uint8Array(Math.max(0, decodedLength));
    if (!s || /^0+$/.test(s)) return out;

    let digits = [];
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i) - 48;
      if (code < 0 || code > 9) throw new Error("Invalid Base10 digit");
      digits.push(code);
    }

    let outPos = out.length - 1;
    while (digits.length && outPos >= 0) {
      const next = [];
      let carry = 0;
      for (let i = 0; i < digits.length; i++) {
        const value = carry * 10 + digits[i];
        const q = Math.floor(value / 256);
        carry = value % 256;
        if (q || next.length) next.push(q);
      }
      out[outPos--] = carry;
      digits = next;
    }
    return out;
  };

  window.base64ToUint8ArrayChunked = function base64ToUint8ArrayChunked(s) {
    const clean = String(s || "").replace(/\s+/g, "");
    const parts = [];
    let total = 0;
    const chunkChars = 32768;
    for (let i = 0; i < clean.length;) {
      let end = Math.min(i + chunkChars, clean.length);
      if (end < clean.length) end -= (end - i) % 4;
      const binary = atob(clean.slice(i, end));
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      parts.push(bytes);
      total += bytes.length;
      i = end;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  };

  function parseHotQrScan(scan) {
    const parts = String(scan || "").split(szHeaderTerminator);
    if (parts.length !== 2) return null;
    const headers = parts[0].split(szHeaderSeparator);
    if (headers.length < 4) return null;
    const page = Number(headers[1]);
    const total = Number(headers[2]);
    if (!Number.isInteger(page) || !Number.isInteger(total) || page < 0 || total <= 0) return null;
    return {
      raw: scan,
      page,
      total,
      crc: headers[3],
      filename: headers[4] || `${headers[3]}.txt`,
      encoding: headers[5] || "",
      byteLength: headers[6] != null && headers[6] !== "" ? Number(headers[6]) : null,
      payload: parts[1]
    };
  }

  function isFileScan(parsed) {
    if (!parsed) return false;
    return parsed.total > 1 || parsed.filename || parsed.encoding;
  }

  function getOrCreateSession(parsed) {
    let session = filesByCrc[parsed.crc];
    if (!session) {
      session = filesByCrc[parsed.crc] = {
        crc: parsed.crc,
        filename: parsed.filename,
        encoding: parsed.encoding,
        total: parsed.total,
        receivedCount: 0,
        received: new Uint8Array(parsed.total),
        chunks: new Array(parsed.total),
        decodedParts: CHUNK_LOCAL_ENCODINGS.has(parsed.encoding) ? new Array(parsed.total) : null,
        blob: null,
        error: null,
        complete: false,
        objectUrl: null
      };
    }
    session.filename = parsed.filename || session.filename;
    session.encoding = parsed.encoding || session.encoding;
    session.total = Math.max(session.total, parsed.total);
    return session;
  }

  function decodeChunk(parsed) {
    if (parsed.encoding === "B64C" || parsed.encoding === "LB6C") {
      return window.base64ToUint8ArrayChunked(parsed.payload);
    }
    if (parsed.encoding === "B10C" || parsed.encoding === "LB1C") {
      return window.b10decode(parsed.payload, parsed.byteLength);
    }
    if (parsed.encoding === "") {
      return new TextEncoder().encode(parsed.payload);
    }
    return null;
  }

  function decodeLegacyCompleted(session) {
    let outString = "";
    for (let i = 0; i < session.total; i++) outString += session.chunks[i] || "";
    if (bDebug) cachedOutString = outString;

    if (session.encoding === "LB1") return asUint8Array(LZMA.decompress(window.b10decode(outString)));
    if (session.encoding === "B10") return window.b10decode(outString);
    if (session.encoding === "LB6") return asUint8Array(LZMA.decompress(window.base64ToUint8ArrayChunked(outString)));
    if (session.encoding === "B64" || base64regex.test(outString)) return window.base64ToUint8ArrayChunked(outString);
    return new TextEncoder().encode(outString);
  }

  function finalizeSessionIfComplete(session) {
    if (session.complete || session.finalizing || session.receivedCount < session.total) return;
    try {
      let blobParts;
      if (CHUNK_LOCAL_ENCODINGS.has(session.encoding)) {
        blobParts = session.decodedParts.map((part) => part || new Uint8Array());
        if (session.encoding === "LB6C" || session.encoding === "LB1C") {
          session.finalizing = true;
          const compressedBlob = new Blob(blobParts, { type: "application/octet-stream" });
          compressedBlob.arrayBuffer().then((buffer) => {
            try {
              const bytes = asUint8Array(LZMA.decompress(new Uint8Array(buffer)));
              session.blob = new Blob([bytes], { type: "application/octet-stream" });
              session.complete = true;
              session.finalizing = false;
              finishedFileBlobs[session.crc] = session.blob;
              finishedFilesArrayBuffer[session.crc] = bytes.buffer;
              update_file_download_links();
              renderFileSessions();
            } catch (err) {
              session.error = err && err.message ? err.message : String(err);
              session.finalizing = false;
              renderFileSessions();
            }
          });
          return;
        }
      } else {
        blobParts = [decodeLegacyCompleted(session)];
      }
      session.blob = new Blob(blobParts, { type: "application/octet-stream" });
      session.complete = true;
      finishedFileBlobs[session.crc] = session.blob;
      finishedFilesArrayBuffer[session.crc] = session.blob;
      update_file_download_links();
    } catch (err) {
      session.error = err && err.message ? err.message : String(err);
    }
  }

  function addFileScan(parsed) {
    const session = getOrCreateSession(parsed);
    if (!session.received[parsed.page]) {
      session.received[parsed.page] = 1;
      session.receivedCount++;
    }
    session.chunks[parsed.page] = parsed.payload;
    if (CHUNK_LOCAL_ENCODINGS.has(parsed.encoding)) {
      session.decodedParts[parsed.page] = decodeChunk(parsed);
    }
    knownCRCLength[parsed.crc] = parsed.total;
    knownCRCScans[parsed.crc] = knownCRCScans[parsed.crc] || {};
    knownCRCScans[parsed.crc][parsed.page] = true;
    knownCRCFilename[parsed.crc] = parsed.filename;
    knownCRCEncoding[parsed.crc] = parsed.encoding;
    szCachedLastScanCRC = parsed.crc;
    iCachedLastScanID = parsed.page;
    finalizeSessionIfComplete(session);
  }

  function shouldStoreRawScan(parsed) {
    const debug = document.getElementById("debugStoreAllScans");
    return !isFileScan(parsed) || (debug && debug.checked);
  }

  window.recordDecodedScan = function recordDecodedScan(scan) {
    const parsed = parseHotQrScan(scan);
    if (shouldStoreRawScan(parsed)) dScans[scan] = "1";
    if (isFileScan(parsed)) {
      addFileScan(parsed);
    }
    szCachedLastScan = scan;
    processScanData();
  };

  window.clearReaderData = function clearReaderData() {
    dScans = {};
    knownCRCLength = {};
    knownCRCScans = {};
    knownCRCFilename = {};
    knownCRCEncoding = {};
    finishedFiles = {};
    finishedFilesArrayBuffer = {};
    window.filesByCrc = {};
    window.finishedFileBlobs = {};
    szCachedLastScan = "";
    iCachedLastScanID = 0;
    szCachedLastScanCRC = "";
    cachedOutString = "";
    cachedB10Decode = "";
    cachedLZMAOut = "";
    cachedDecode = "";
    cachedArrayBuffer = "";
    ["qr-reader-results", "scanview", "file-links"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
    const result = document.getElementById("result");
    if (result) result.textContent = "Cleared";
    const info = document.getElementById("inputTextOut");
    if (info) info.value = "";
  };

  function appendButtonCell(row, label, onClick) {
    const td = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    td.appendChild(button);
    row.appendChild(td);
  }

  function renderRawScanList() {
    const resultContainer = document.getElementById("qr-reader-results");
    resultContainer.textContent = "";
    const table = document.createElement("table");
    table.className = "resultsTable";
    Object.keys(dScans).sort().forEach((scan) => {
      const row = document.createElement("tr");
      const previewCell = document.createElement("td");
      const preview = document.createElement("div");
      preview.className = "tdScanPreview";
      preview.textContent = scan;
      previewCell.appendChild(preview);
      row.appendChild(previewCell);
      appendButtonCell(row, "View", () => makePopupOfString(scan));
      appendButtonCell(row, "Copy", () => window.copyTextToClipboard(scan));
      table.appendChild(row);
    });
    resultContainer.appendChild(table);
  }

  function renderFileSessions() {
    const scanView = document.getElementById("scanview");
    scanView.textContent = "";
    Object.keys(filesByCrc).sort().forEach((crc) => {
      const session = filesByCrc[crc];
      const crcTable = document.createElement("table");
      const headerRow = document.createElement("tr");
      const th = document.createElement("th");
      th.colSpan = 10;
      const status = session.error ? `error: ${session.error}` : (session.complete ? "complete" : `${session.receivedCount}/${session.total}`);
      th.textContent = `${session.filename} (${crc}) ${session.encoding || "raw"} ${status}`;
      headerRow.appendChild(th);
      crcTable.appendChild(headerRow);
      let row = document.createElement("tr");
      for (let j = 0; j < session.total; j++) {
        if (j > 0 && j % 10 === 0) {
          crcTable.appendChild(row);
          row = document.createElement("tr");
        }
        const td = document.createElement("td");
        td.className = session.received[j] ? "chunk-present" : "chunk-missing";
        if (crc === szCachedLastScanCRC && String(j) === String(iCachedLastScanID)) {
          const b = document.createElement("b");
          b.textContent = String(j);
          td.appendChild(b);
        } else {
          td.textContent = String(j);
        }
        row.appendChild(td);
      }
      crcTable.appendChild(row);
      scanView.appendChild(crcTable);
    });
  }

  window.processScanData = function processScanDataSafe() {
    renderRawScanList();
    renderFileSessions();
    Object.keys(filesByCrc).forEach((crc) => finalizeSessionIfComplete(filesByCrc[crc]));
  };

  window.downloadContentByCrc = function downloadContentByCrcSafe(crc) {
    const session = filesByCrc[crc];
    const filename = (session && session.filename) || knownCRCFilename[crc] || "file.bin";
    const blob = (session && session.blob) || finishedFileBlobs[crc];
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.downloadArrayBuffer = function downloadArrayBufferSafe(arrayBuffer, fileName) {
    const blob = new Blob([bytesToArrayBuffer(arrayBuffer)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window.update_file_download_links = function updateFileDownloadLinksSafe() {
    const d = document.getElementById("file-links");
    d.textContent = "";
    const ul = document.createElement("ul");
    Object.keys(filesByCrc).sort().forEach((crc) => {
      const session = filesByCrc[crc];
      if (!session.complete || !session.blob) return;
      const li = document.createElement("li");
      const download = document.createElement("button");
      download.type = "button";
      download.textContent = session.filename;
      download.addEventListener("click", () => downloadContentByCrc(crc));
      li.appendChild(download);
      li.append(" ");
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Open As Text";
      open.addEventListener("click", () => makePopupOfCrc(crc));
      li.appendChild(open);
      ul.appendChild(li);
      if (hasImageExtensionRegex(session.filename)) {
        const img = document.createElement("img");
        img.alt = session.filename;
        img.src = URL.createObjectURL(session.blob);
        li.appendChild(img);
      }
    });
    d.appendChild(ul);
  };

  window.makePopupOfCrc = async function makePopupOfCrcSafe(crc) {
    const session = filesByCrc[crc];
    if (!session || !session.blob) return;
    const text = await session.blob.text();
    makePopupOfString(text);
  };

  window.makePopupOfString = function makePopupOfStringSafe(value) {
    const popupWindow = window.open("", "popupWindow", "width=600,height=400");
    if (!popupWindow) return;
    const doc = popupWindow.document;
    doc.open();
    doc.write("<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>HotQR Content</title></head><body></body></html>");
    doc.close();
    const controls = doc.createElement("div");
    const close = doc.createElement("button");
    close.textContent = "Close";
    close.onclick = () => popupWindow.close();
    const copy = doc.createElement("button");
    copy.textContent = "Copy";
    const download = doc.createElement("button");
    download.textContent = "Download";
    controls.append(close, copy, download);
    const content = doc.createElement("pre");
    content.id = "popupContent";
    content.style.whiteSpace = "pre-wrap";
    content.style.wordBreak = "break-word";
    content.textContent = String(value || "");
    doc.body.append(controls, content);
    copy.onclick = () => window.copyTextToClipboard(content.textContent);
    download.onclick = () => {
      const blob = new Blob([content.textContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = doc.createElement("a");
      a.href = url;
      a.download = "content.txt";
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  };
})();
