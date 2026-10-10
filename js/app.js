/*
 * Operation 11·10 — Muskan's birthday route.
 * Progress lives in localStorage, so a reload (or a lift with no signal) resumes on the same screen.
 */
(function () {
  const M = window.MISSION;
  const T = M.text;
  const STEPS = ["selected", "date", "laptop", "swing", "photo", "selfie", "mfloor", "lift", "finale"];
  const KEY = "op1110:state";

  const fresh = () => ({
    v: 1, step: 0, startedAt: null, finishedAt: null,
    codes: { date: "", laptop: "", swing: "" },
    photo: { done: false, matched: false, misses: 0 },
    selfie: { done: false },
    mfloorAt: null, liftAt: null
  });

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) return Object.assign(fresh(), s);
    } catch (e) {}
    return fresh();
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  const $ = id => document.getElementById(id);
  const view = $("view");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const clock = ts => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  /* ---------- answers ---------- */

  function dateOk(raw) {
    let s = (raw || "").toLowerCase().trim();
    s = s.replace(/(\d+)\s*(st|nd|rd|th)\b/g, "$1").replace(/\bof\b/g, "");
    s = s.replace(/[^a-z0-9]/g, "");
    if (s.length > 4) s = s.replace(/(2026|26)$/, "");
    return ["1110", "1011", "11oct", "11october", "oct11", "october11"].includes(s);
  }
  const codeOk = (raw, list) => list.map(norm).includes(norm(raw));

  /* ---------- screens ---------- */

  const sheet = (stamp, meta, inner) => `
    <article class="sheet">
      <div class="stamp" aria-hidden="true">${esc(stamp)}</div>
      <div class="meta"><span>${esc(meta[0])}</span><span>${esc(meta[1])}</span></div>
      ${inner}
    </article>`;
  const loc = text => `<span class="loc">Location <b>${esc(text)}</b></span>`;
  const answerForm = (id, label, inputmode) => `
    <form class="answer" data-for="${id}" autocomplete="off" novalidate>
      <label class="sr" for="in-${id}">${esc(label)}</label>
      <input type="text" id="in-${id}" placeholder="${esc(label)}" autocapitalize="characters" spellcheck="false" ${inputmode ? `inputmode="${inputmode}"` : ""}>
      <button type="submit">Unlock</button>
    </form>
    <p class="msg" id="msg-${id}" role="status"></p>`;
  const hints = (id, list) => list && list.length ? `
    <div class="hints" data-hints="${id}">
      <button class="ghost" type="button" data-hint="${id}">Need a hint?</button>
    </div>` : "";

  const SCREENS = {
    selected: () => sheet("Top secret", ["File 00", "00:00 hrs"], `
      <p class="eyebrow">${esc(T.selectedTitle)}</p>
      <h1>Agent ${esc(M.name)}</h1>
      <p class="lead">${esc(T.selectedBody)}</p>
      <p class="note">${esc(T.selectedNote)}</p>
      <div class="row"><button type="button" id="accept">${esc(T.acceptButton)}</button></div>`),

    date: () => sheet("Locked", ["File 01", "Identity lock"], `
      <h2>${esc(T.dateTitle)}</h2>
      <p class="lead">${esc(T.dateBody)}</p>
      ${answerForm("date", "Today's date")}
      ${hints("date", ["Today is the 11th of October.", "Try 11/10 or 11 Oct."])}`),

    laptop: () => sheet("File 02", ["Stop 1 of 4", "A block"], `
      <h2>${esc(T.laptopTitle)}</h2>
      ${loc(T.laptopLocation)}
      <p class="lead">${esc(T.laptopBody)}</p>
      ${answerForm("laptop", "Wallpaper code")}
      ${hints("laptop", T.laptopHints)}`),

    swing: () => sheet("File 03", ["Stop 2 of 4", "3A floor"], `
      <h2>${esc(T.swingTitle)}</h2>
      ${loc(T.swingLocation)}
      <p class="lead">${esc(T.swingBody)}</p>
      ${answerForm("swing", "Swing code")}
      ${hints("swing", T.swingHints)}`),

    photo: () => sheet("Verify", ["Stop 2 of 4", "Authentication"], `
      <h2>${esc(T.photoTitle)}</h2>
      <p class="lead">${esc(T.photoBody)}</p>
      <figure class="shot" id="shot" hidden><img id="shot-img" alt="Your photo of the card"><div class="scanline"></div></figure>
      <div class="row">
        <label class="btn" for="photo-in">Take photo of the card</label>
        <input type="file" id="photo-in" accept="image/*" capture="environment" class="sr">
      </div>
      <p class="msg" id="msg-photo" role="status"></p>
      <div class="row" id="photo-bypass" hidden><button class="ghost" type="button" id="bypass">Send it for a manual check</button></div>`),

    selfie: () => sheet("Verify", ["Stop 2 of 4", "Face check"], `
      <h2>${esc(T.selfieTitle)}</h2>
      <p class="lead">${esc(T.selfieBody)}</p>
      <figure class="shot face" id="shot" hidden><img id="shot-img" alt="Your selfie"><div class="scanline"></div></figure>
      <div class="row">
        <label class="btn" for="selfie-in">Take a selfie</label>
        <input type="file" id="selfie-in" accept="image/*" capture="user" class="sr">
      </div>
      <p class="msg" id="msg-selfie" role="status"></p>`),

    mfloor: () => sheet("File 04", ["Stop 3 of 4", "B block"], `
      <h2>${esc(T.mfloorTitle)}</h2>
      ${loc(T.mfloorLocation)}
      <p class="lead">${esc(T.mfloorBody)}</p>
      <div class="row"><button type="button" id="here">${esc(T.mfloorButton)}</button></div>
      <p class="msg" id="msg-mfloor" role="status"></p>`),

    lift: () => sheet("File 05", ["Stop 4 of 4", "Ascending"], `
      <h2>${esc(T.liftTitle)}</h2>
      ${loc(T.liftLocation)}
      <div class="lift" aria-hidden="true">${["10", "11", "12", "M", "6", "7", "8", "9", "G", "3", "4", "5"].map(n => `<span class="${n === "8" ? "lit" : ""}">${n}</span>`).join("")}</div>
      <p class="lead">${esc(T.liftBody)}</p>
      <div class="row"><button type="button" id="arrived">${esc(T.liftButton)}</button></div>
      <p class="msg" id="msg-lift" role="status"></p>`),

    finale: () => sheet("Complete", ["Mission closed", state.startedAt && state.finishedAt ? "Time " + duration(state.finishedAt - state.startedAt) : "8th floor"], `
      <div class="big">${esc(T.finaleTitle)}</div>
      <h2 class="plain">${esc(T.finaleBody)}</h2>
      <p class="note">From ${esc(M.from)}</p>
      <div class="row"><button type="button" id="song">Play the song</button><button class="ghost" type="button" id="again">More confetti</button></div>`)
  };

  function duration(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + "m " + String(s % 60).padStart(2, "0") + "s";
  }

  /* ---------- rendering ---------- */

  function render() {
    if (location.hash === "#handler") return renderHandler();
    const name = STEPS[state.step] || "finale";
    view.innerHTML = SCREENS[name]();
    renderRoute();
    renderNotebook();
    wire(name);
    if (name === "laptop" || name === "swing" || name === "photo") window.OCR.warm().catch(() => {});
    if (name === "finale") burst();
  }

  function renderRoute() {
    const r = $("route");
    r.hidden = false;
    r.innerHTML = STEPS.slice(1).map((_, i) => {
      const n = i + 1;
      const cls = n < state.step || state.step === STEPS.length - 1 ? "done" : n === state.step ? "now" : "";
      return `<li class="${cls}"><span class="bar"></span></li>`;
    }).join("");
  }

  async function renderNotebook() {
    const nb = $("notebook");
    nb.hidden = false;
    const rows = [];
    if (state.codes.date) rows.push(["Date lock", "11 Oct", "ok"]);
    if (state.codes.laptop) rows.push(["A-21-02 laptop", state.codes.laptop, "ok"]);
    if (state.codes.swing) rows.push(["3A swing", state.codes.swing, "ok"]);
    if (state.photo.done) rows.push(["Card photo", (state.photo.matched ? M.photoWord + " verified" : "manual check") + await sendLabel("photo"), "ok"]);
    if (state.selfie.done) rows.push(["Selfie", "confirmed" + await sendLabel("selfie"), "ok"]);
    if (state.mfloorAt) rows.push(["M floor check-in", clock(state.mfloorAt) + await sendLabel("mfloor"), "ok"]);
    if (state.liftAt) rows.push(["8th floor", clock(state.liftAt) + await sendLabel("lift"), "ok"]);
    $("nb-list").innerHTML = rows.length
      ? rows.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join("")
      : `<li class="empty"><span>Codes you unlock will be saved here.</span></li>`;
    $("nb-count").textContent = rows.length ? rows.length + " saved" : "";
  }

  async function sendLabel(kind) {
    const s = await window.Outbox.status(kind);
    return s === "waiting" ? " · waiting for signal" : "";
  }

  function advance() {
    state.step = Math.min(state.step + 1, STEPS.length - 1);
    save();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    view.focus({ preventScroll: true });
  }

  /* ---------- wiring ---------- */

  const WRONG = ["Access denied. Check again.", "Not quite. Read the clue once more.", "Still locked. Try a hint."];
  const wrongs = {};

  function wire(name) {
    const form = view.querySelector("form.answer");
    if (form) form.addEventListener("submit", onAnswer);
    view.querySelectorAll("[data-hint]").forEach(b => b.addEventListener("click", onHint));
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
    on("accept", () => { if (!state.startedAt) state.startedAt = Date.now(); advance(); });
    if (name === "photo") $("photo-in").addEventListener("change", onPhoto);
    on("bypass", onBypass);
    if (name === "selfie") $("selfie-in").addEventListener("change", onSelfie);
    on("here", onHere);
    on("arrived", onArrived);
    on("song", () => { playSong(); burst(); });
    on("again", burst);
  }

  function onAnswer(e) {
    e.preventDefault();
    const id = e.target.dataset.for;
    const input = e.target.querySelector("input");
    const msg = $("msg-" + id);
    const raw = input.value;
    const ok = id === "date" ? dateOk(raw) : codeOk(raw, M.codes[id]);
    if (ok) {
      state.codes[id] = id === "date" ? raw.trim() : norm(raw);
      save();
      msg.className = "msg good";
      msg.textContent = "Access granted. Saved to your notebook.";
      input.disabled = true;
      setTimeout(advance, 700);
    } else {
      wrongs[id] = (wrongs[id] || 0) + 1;
      msg.className = "msg bad";
      msg.textContent = WRONG[Math.min(wrongs[id] - 1, WRONG.length - 1)];
      input.classList.remove("shake"); void input.offsetWidth; input.classList.add("shake");
    }
  }

  function onHint(e) {
    const id = e.target.dataset.hint;
    const list = id === "date" ? ["Today is the 11th of October.", "Try 11/10 or 11 Oct."] : T[id + "Hints"];
    const box = view.querySelector(`[data-hints="${id}"]`);
    const shown = box.querySelectorAll(".hint").length;
    if (shown < list.length) {
      const d = document.createElement("p");
      d.className = "hint";
      d.textContent = "Hint " + (shown + 1) + ": " + list[shown];
      box.insertBefore(d, e.target);
    }
    if (shown + 1 >= list.length) { e.target.textContent = "No more hints"; e.target.disabled = true; }
  }

  let lastPhoto = null;

  function showShot(file) {
    $("shot").hidden = false;
    $("shot").classList.add("scanning");
    $("shot-img").src = URL.createObjectURL(file);
  }

  async function onPhoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    lastPhoto = file;
    showShot(file);
    const msg = $("msg-photo");
    msg.className = "msg";
    msg.textContent = "Loading the scanner…";
    let result = null;
    try {
      result = await window.OCR.check(file, M.photoWord, rot => {
        msg.textContent = rot === 0 ? "Reading the card…" : "Turning it to read it another way…";
      });
    } catch (err) {
      result = { ok: false, error: true };
    }
    $("shot").classList.remove("scanning");
    if (result.ok) {
      msg.className = "msg good";
      msg.textContent = "Verified. " + M.photoWord + " confirmed.";
      await finishPhoto(true);
      return;
    }
    state.photo.misses += 1;
    save();
    msg.className = "msg bad";
    msg.textContent = result.error
      ? "The scanner couldn't start on this phone. Send the photo for a manual check."
      : "Couldn't read the big word. Hold the phone closer so the card fills the screen, then take it again.";
    if (result.error || state.photo.misses >= M.photoMissesBeforeBypass) $("photo-bypass").hidden = false;
  }

  async function onBypass() {
    if (!lastPhoto) return;
    $("msg-photo").className = "msg good";
    $("msg-photo").textContent = "Sent for a manual check. You can keep going.";
    await finishPhoto(false);
  }

  async function finishPhoto(matched) {
    const blob = await window.Outbox.compress(lastPhoto).catch(() => lastPhoto);
    await window.Outbox.add({
      kind: "photo",
      title: matched ? M.name + " found the card: " + M.photoWord + " verified" : M.name + "'s card photo: check it yourself",
      message: matched ? "Swing code " + state.codes.swing + ". Word read on her phone." : "The word wasn't read automatically after " + state.photo.misses + " tries.",
      blob, filename: "card-photo.jpg", tags: matched ? "white_check_mark,camera" : "warning,camera", priority: 4
    });
    state.photo.done = true;
    state.photo.matched = matched;
    save();
    setTimeout(advance, 1200);
  }

  async function onSelfie(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    showShot(file);
    const msg = $("msg-selfie");
    msg.className = "msg";
    msg.textContent = "Scanning face…";
    const blob = await window.Outbox.compress(file, 1200).catch(() => file);
    await new Promise(r => setTimeout(r, 1800));
    $("shot").classList.remove("scanning");
    msg.className = "msg good";
    msg.textContent = "Identity confirmed: " + M.name + ".";
    await window.Outbox.add({
      kind: "selfie", title: M.name + "'s selfie", message: "Face check done. Next stop: B block M floor.",
      blob, filename: "selfie.jpg", tags: "selfie", priority: 4
    });
    state.selfie.done = true;
    save();
    setTimeout(advance, 1400);
  }

  async function onHere(e) {
    e.target.disabled = true;
    state.mfloorAt = Date.now();
    save();
    await window.Outbox.add({
      kind: "mfloor", title: M.name + " is at B block M floor",
      message: "She tapped I'm here at " + clock(state.mfloorAt) + ", before the lift.", tags: "round_pushpin", priority: 5
    });
    $("msg-mfloor").className = "msg good";
    $("msg-mfloor").textContent = "Got it. Stay there a moment, the gate is opening.";
    setTimeout(advance, 1500);
  }

  async function onArrived(e) {
    const b = e.target;
    if (!b.dataset.armed) {
      b.dataset.armed = "1";
      b.textContent = "Doors open on 8? Tap again";
      return;
    }
    b.disabled = true;
    state.liftAt = Date.now();
    state.finishedAt = state.liftAt;
    save();
    await window.Outbox.add({
      kind: "lift", title: M.name + " reached the 8th floor",
      message: "Arrived at " + clock(state.liftAt) + ". Mission time " + (state.startedAt ? duration(state.liftAt - state.startedAt) : "n/a") + ".",
      tags: "tada", priority: 5
    });
    advance();
  }

  /* ---------- signal pill ---------- */

  async function renderSignal(pendingCount) {
    const n = typeof pendingCount === "number" ? pendingCount : await window.Outbox.pending();
    const online = navigator.onLine !== false;
    const el = $("signal");
    el.className = "signal " + (online ? (n ? "busy" : "on") : "off");
    $("signal-text").textContent = !online
      ? (n ? "No signal · " + n + " saved to send" : "No signal · progress saved")
      : (n ? "Sending " + n + "…" : "Online");
    if (location.hash !== "#handler") renderNotebook();
  }
  window.addEventListener("online", () => renderSignal());
  window.addEventListener("offline", () => renderSignal());
  window.Outbox.onChange(renderSignal);

  /* ---------- handler page (Audil only) ---------- */

  let feedTimer = null;

  function renderHandler() {
    $("route").hidden = true;
    $("notebook").hidden = true;
    const unlocked = (() => { try { return sessionStorage.getItem("op1110:handler") === "1"; } catch (e) { return false; } })();
    if (!unlocked) {
      view.innerHTML = sheet("Handler", ["Organizer only", "PIN required"], `
        <h2>Handler desk</h2>
        <form class="answer" id="pin-form" autocomplete="off">
          <label class="sr" for="pin">PIN</label>
          <input type="password" id="pin" placeholder="PIN" inputmode="numeric">
          <button type="submit">Open</button>
        </form>
        <p class="msg" id="msg-pin" role="status"></p>`);
      $("pin-form").addEventListener("submit", e => {
        e.preventDefault();
        if ($("pin").value.trim() === String(M.handlerPin)) {
          try { sessionStorage.setItem("op1110:handler", "1"); } catch (err) {}
          renderHandler();
        } else { $("msg-pin").className = "msg bad"; $("msg-pin").textContent = "Wrong PIN."; }
      });
      return;
    }
    const topicUrl = M.ntfy.server.replace(/\/$/, "") + "/" + M.ntfy.topic;
    view.innerHTML = sheet("Handler", ["Organizer only", "Don't show her this page"], `
      <h2>Handler desk</h2>
      <p class="lead">Alerts and photos from ${esc(M.name)}'s phone land here and in the ntfy app.</p>
      <div class="kv"><span>ntfy topic</span><b class="mono">${esc(M.ntfy.topic)}</b></div>
      <p class="note">In the ntfy app tap +, then subscribe to that topic. Photos stay on ntfy.sh for a few hours, so save the ones you want.</p>
      <div class="row">
        <button type="button" id="refresh">Refresh feed</button>
        <button class="ghost" type="button" id="test">Send a test alert</button>
      </div>
      <p class="msg" id="msg-feed" role="status"></p>
      <div class="feed" id="feed"></div>
      <h3>This phone</h3>
      <p class="note">Test the route on your own phone, then reset it here so it starts fresh.</p>
      <div class="row"><button class="ghost" type="button" id="reset">Reset progress on this phone</button><a class="link" href="#">Back to the mission</a></div>
      <p class="msg" id="msg-reset" role="status"></p>
      <p class="note mono">${esc(topicUrl)}</p>`);
    $("refresh").addEventListener("click", loadFeed);
    $("test").addEventListener("click", async () => {
      await window.Outbox.add({ kind: "test", title: "Test alert from the handler desk", message: "If you can read this in the ntfy app, alerts work.", tags: "test_tube", priority: 3 });
      $("msg-feed").className = "msg good";
      $("msg-feed").textContent = "Test alert queued. It should appear below and in the app.";
      setTimeout(loadFeed, 2500);
    });
    $("reset").addEventListener("click", async e => {
      const b = e.target;
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to reset"; return; }
      state = fresh(); save();
      await window.Outbox.clear();
      b.textContent = "Reset progress on this phone"; delete b.dataset.armed;
      $("msg-reset").className = "msg good"; $("msg-reset").textContent = "Progress reset on this phone.";
    });
    loadFeed();
    clearInterval(feedTimer);
    feedTimer = setInterval(() => { if (location.hash === "#handler") loadFeed(); else clearInterval(feedTimer); }, 20000);
  }

  async function loadFeed() {
    const feed = $("feed");
    if (!feed) return;
    const url = M.ntfy.server.replace(/\/$/, "") + "/" + encodeURIComponent(M.ntfy.topic) + "/json?poll=1&since=all";
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      const events = text.split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } })
        .filter(e => e && e.event === "message").sort((a, b) => b.time - a.time);
      $("msg-feed").className = "msg";
      $("msg-feed").textContent = events.length ? events.length + " alerts · updated " + clock(Date.now()) : "No alerts yet · updated " + clock(Date.now());
      feed.innerHTML = events.map(ev => `
        <div class="item">
          <div class="item-head"><b>${esc(ev.title || "Alert")}</b><span>${esc(clock(ev.time * 1000))}</span></div>
          ${ev.message && ev.message !== "You received a file: " + (ev.attachment && ev.attachment.name) ? `<p>${esc(ev.message)}</p>` : ""}
          ${ev.attachment && /^image\//.test(ev.attachment.type || "image/") ? `<a href="${esc(ev.attachment.url)}" target="_blank" rel="noopener"><img src="${esc(ev.attachment.url)}" alt="${esc(ev.title || "photo")}" loading="lazy"></a>` : ""}
        </div>`).join("");
    } catch (e) {
      $("msg-feed").className = "msg bad";
      $("msg-feed").textContent = "Couldn't reach ntfy. Check your signal and refresh.";
    }
  }

  /* ---------- confetti and song ---------- */

  const cv = $("confetti"), cx = cv.getContext("2d");
  let parts = [], raf = null;
  function burst() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dpr = window.devicePixelRatio || 1;
    cv.hidden = false; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const cols = ["#e2b55a", "#b3262d", "#efe4c8", "#f6d98f", "#7f9cff", "#f08fb0"];
    for (let i = 0; i < 170; i++) parts.push({
      x: cv.width * Math.random(), y: -30 * dpr * Math.random() - 10, vx: (Math.random() - .5) * 3 * dpr, vy: (2 + Math.random() * 3) * dpr,
      r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, s: (5 + Math.random() * 6) * dpr, c: cols[i % cols.length], g: .03 * dpr
    });
    if (!raf) tick();
  }
  function tick() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += p.vr; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); cx.restore(); });
    parts = parts.filter(p => p.y < cv.height + 40);
    if (parts.length) raf = requestAnimationFrame(tick); else { raf = null; cv.hidden = true; }
  }
  function playSong() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const N = { G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784 };
      const tune = [["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2], ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
        ["G4", .75], ["G4", .25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2], ["F5", .75], ["F5", .25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2.5]];
      let t = ac.currentTime + .05; const beat = .42;
      tune.forEach(([n, d]) => {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.value = N[n];
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + d * beat * .95);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d * beat); t += d * beat;
      });
    } catch (e) {}
  }

  /* ---------- boot ---------- */

  $("brand").textContent = T.brand;
  $("offline-notice").textContent = T.offlineNotice;
  window.addEventListener("hashchange", render);
  render();
  renderSignal();
  window.Outbox.flush();

  // exposed for tests
  window.__mission = { dateOk, get state() { return state; } };
})();
