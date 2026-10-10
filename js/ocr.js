/*
 * On-phone word check for the card photo. Tesseract is hosted in this repo
 * (vendor/tesseract), so nothing leaves the phone for the check itself.
 */
(function () {
  let workerPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.Tesseract) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function absolute(path) { return new URL(path, document.baseURI).href; }

  /** Start downloading and initialising the reader in the background. */
  function warm() {
    if (workerPromise) return workerPromise;
    workerPromise = loadScript("vendor/tesseract/tesseract.min.js")
      .then(() => window.Tesseract.createWorker("eng", 1, {
        workerPath: absolute("vendor/tesseract/worker.min.js"),
        corePath: absolute("vendor/tesseract/core"),
        langPath: absolute("vendor/tesseract/lang"),
        workerBlobURL: false
      }))
      .catch(err => { workerPromise = null; throw err; });
    return workerPromise;
  }

  function lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i].concat(new Array(n).fill(0)));
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[m][n];
  }

  /** True when the recognised text contains the word, allowing a couple of misread letters. */
  function matches(text, word) {
    const W = word.toUpperCase();
    const up = (text || "").toUpperCase().replace(/0/g, "O").replace(/1/g, "I");
    if (up.replace(/[^A-Z]/g, "").includes(W)) return true;
    const tokens = up.split(/[^A-Z]+/).filter(t => t.length >= W.length - 2);
    const slack = W.length >= 6 ? 2 : 1;
    if (tokens.some(t => lev(t, W) <= slack)) return true;
    // a long word split into two by the reader ("PIG EON")
    const joined = up.replace(/[^A-Z\n]/g, "").split("\n");
    return joined.some(line => line.length >= W.length - 1 && lev(line.slice(0, W.length + 1), W) <= slack);
  }

  function canvasFor(bmp, rotate) {
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const c = document.createElement("canvas");
    const side = rotate % 180 !== 0;
    c.width = side ? h : w;
    c.height = side ? w : h;
    const g = c.getContext("2d");
    g.translate(c.width / 2, c.height / 2);
    g.rotate(rotate * Math.PI / 180);
    g.filter = "grayscale(1) contrast(1.4)";
    g.drawImage(bmp, -w / 2, -h / 2, w, h);
    return c;
  }

  /** Read the photo, trying sideways orientations if the card was shot rotated. */
  async function check(file, word, onStep) {
    const worker = await warm();
    const bmp = await window.Outbox.loadBitmap(file);
    let seen = "";
    for (const rot of [0, 90, 270, 180]) {
      if (onStep) onStep(rot);
      const { data } = await worker.recognize(canvasFor(bmp, rot));
      seen += "\n" + data.text;
      if (matches(data.text, word)) return { ok: true, text: data.text.trim() };
    }
    return { ok: false, text: seen.trim() };
  }

  window.OCR = { warm, check, matches };
})();
