/*
 * Outbox: alerts and photos for Audil wait in IndexedDB on Muskan's phone
 * and go out to ntfy whenever there is signal. Nothing is dropped in a lift.
 */
(function () {
  const DB_NAME = "op1110";
  const STORE = "outbox";
  let dbPromise = null;
  let flushing = false;
  const listeners = new Set();

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let out;
      Promise.resolve(fn(store)).then(v => { out = v; });
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
    }));
  }

  function all() {
    return tx("readonly", store => new Promise(res => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
    }));
  }

  function put(item) { return tx("readwrite", store => { store.put(item); }); }

  async function pending() {
    try { return (await all()).filter(i => !i.sentAt).length; } catch (e) { return 0; }
  }

  async function notify() {
    const n = await pending();
    listeners.forEach(fn => { try { fn(n); } catch (e) {} });
  }

  /** Queue an alert. `blob` is optional (a photo). Returns the item id. */
  async function add({ kind, title, message, blob, filename, tags, priority }) {
    const item = {
      id: kind + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      kind, title, message: message || "", blob: blob || null, filename: filename || null,
      tags: tags || "", priority: priority || 3, createdAt: Date.now(), sentAt: null, tries: 0
    };
    try { await put(item); } catch (e) { /* storage refused: still try to send right away */ return sendNow(item); }
    notify();
    flush();
    return item.id;
  }

  function buildUrl(item) {
    const cfg = window.MISSION.ntfy;
    const p = new URLSearchParams();
    p.set("title", item.title);
    if (item.tags) p.set("tags", item.tags);
    p.set("priority", String(item.priority));
    if (item.blob) {
      p.set("filename", item.filename || "photo.jpg");
      if (item.message) p.set("message", item.message);
    }
    return cfg.server.replace(/\/$/, "") + "/" + encodeURIComponent(cfg.topic) + "?" + p.toString();
  }

  async function post(item) {
    // Untyped body + query params keep this a simple CORS request where possible.
    const body = item.blob ? new Blob([await item.blob.arrayBuffer()]) : item.message;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), item.blob ? 45000 : 15000);
    try {
      const res = await fetch(buildUrl(item), { method: "POST", body, signal: ctrl.signal });
      return res.ok;
    } finally { clearTimeout(timer); }
  }

  async function sendNow(item) {
    try { return await post(item); } catch (e) { return false; }
  }

  async function flush() {
    if (flushing) return;
    if (navigator.onLine === false) return;
    flushing = true;
    try {
      const items = (await all()).filter(i => !i.sentAt).sort((a, b) => a.createdAt - b.createdAt);
      for (const item of items) {
        let ok = false;
        try { ok = await post(item); } catch (e) { ok = false; }
        item.tries += 1;
        if (ok) item.sentAt = Date.now();
        await put(item);
        if (!ok) break; // still no signal: try again later, in order
      }
    } catch (e) { /* IndexedDB unavailable */ }
    flushing = false;
    notify();
  }

  async function status(kind) {
    try {
      const items = (await all()).filter(i => i.kind === kind);
      if (!items.length) return null;
      return items.some(i => !i.sentAt) ? "waiting" : "sent";
    } catch (e) { return null; }
  }

  async function clear() {
    try { await tx("readwrite", store => { store.clear(); }); } catch (e) {}
    notify();
  }

  /** Shrink a photo to a JPEG that sends fast on weak signal. */
  async function compress(file, maxSide = 1600, quality = 0.82) {
    const bmp = await loadBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(b => res(b || file), "image/jpeg", quality));
  }

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadImg(file));
    }
    return loadImg(file);
  }

  function loadImg(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = URL.createObjectURL(file);
    });
  }

  window.addEventListener("online", flush);
  setInterval(flush, 15000);

  window.Outbox = { add, flush, pending, status, clear, compress, loadBitmap, onChange: fn => listeners.add(fn) };
})();
