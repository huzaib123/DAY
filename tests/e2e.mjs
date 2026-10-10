// Full-route smoke test on a phone-sized Chromium.
// Run: python3 -m http.server 8123 (in the repo root), then node tests/e2e.mjs
// ntfy is mocked, so this never sends real alerts.
import { chromium, devices } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:8123/";
const here = path.dirname(fileURLToPath(import.meta.url));
const fx = f => path.join(here, "fixtures", f);
const shots = process.env.SHOTS || path.join(here, "..", ".shots");
fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const ctx = await browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "allow" });
const sent = [];
let ntfyUp = true;
await ctx.route(/^https:\/\/ntfy\.sh\//, async route => {
  const req = route.request();
  if (req.method() === "GET") {
    const ev = sent.map((s, i) => JSON.stringify({ event: "message", id: "m" + i, time: Math.floor(Date.now() / 1000), title: s.title, message: "test" })).join("\n");
    return route.fulfill({ status: 200, body: ev, headers: { "access-control-allow-origin": "*" } });
  }
  if (!ntfyUp) return route.abort("internetdisconnected");
  const u = new URL(req.url());
  sent.push({ title: u.searchParams.get("title"), filename: u.searchParams.get("filename"), size: (req.postDataBuffer() || Buffer.alloc(0)).length });
  return route.fulfill({ status: 200, body: "{}", headers: { "access-control-allow-origin": "*" } });
});
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());

const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
let failures = 0;
const check = (cond, label) => { console.log((cond ? "PASS " : "FAIL ") + label); if (!cond) failures++; };
const snap = name => page.screenshot({ path: path.join(shots, name + ".png"), fullPage: true });
const lead = () => page.locator(".sheet h1, .sheet h2").first().innerText();

await page.goto(BASE);
check((await page.locator(".lead").innerText()).includes("Muskan, you have been selected"), "selection screen greets Muskan");
check(await page.locator("#offline-notice").isVisible(), "offline notice visible");
await snap("01-selected");
await page.click("#accept");

const formats = await page.evaluate(() => {
  const yes = ["11/10", "10/11", "1110", "1011", "11 oct", "11 OCT", "11 October", "11 october", "October 11", "oct 11", "11-10", "11.10", "11th October", "11th of october", "11/10/2026", "11 Oct 2026", "  11 OCTOBER  "];
  const no = ["12/10", "2003", "", "october", "1111"];
  return { yes: yes.filter(s => !window.__mission.dateOk(s)), no: no.filter(s => window.__mission.dateOk(s)) };
});
check(formats.yes.length === 0, "date accepts all formats (rejected: " + formats.yes.join(", ") + ")");
check(formats.no.length === 0, "date rejects wrong dates (accepted: " + formats.no.join(", ") + ")");

await page.fill("#in-date", "11 October");
await page.click("form.answer button");
await page.waitForSelector("#in-laptop");
await snap("02-laptop");
await page.fill("#in-laptop", "1234");
await page.click("form.answer button");
check((await page.locator("#msg-laptop").innerText()).includes("denied"), "wrong laptop code rejected");
await page.click("[data-hint=laptop]");
check(await page.locator(".hint").count() === 1, "hint shows");
await page.fill("#in-laptop", "2003");
await page.click("form.answer button");
await page.waitForSelector("#in-swing");

await page.reload();
await page.waitForSelector("#in-swing");
check(true, "reload resumes on the swing screen");

await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 });
await ctx.setOffline(true);
await page.reload();
await page.waitForSelector("#in-swing", { timeout: 15000 });
const nbOffline = await page.locator("#nb-list").innerText();
check(nbOffline.includes("2003"), "offline reload still shows the page and saved codes");
check((await page.locator("#signal-text").innerText()).includes("No signal"), "signal pill says no signal");
await snap("03-offline-swing");
await ctx.setOffline(false);

await page.fill("#in-swing", "1103");
await page.click("form.answer button");
await page.waitForSelector("#photo-in", { state: "attached" });

await page.setInputFiles("#photo-in", fx("noword.jpg"));
await page.waitForFunction(() => document.querySelector("#msg-photo").classList.contains("bad"), null, { timeout: 120000 });
check(true, "card without the word is rejected");
await page.setInputFiles("#photo-in", fx("pigeon-side.jpg"));
await page.waitForFunction(() => /Verified|Couldn't/.test(document.querySelector("#msg-photo")?.innerText || "") || !document.querySelector("#msg-photo"), null, { timeout: 120000 });
const sideResult = await page.locator("#msg-photo").count() ? await page.locator("#msg-photo").innerText() : "advanced";
check(/Verified|advanced/.test(sideResult), "sideways card photo verified (" + sideResult + ")");
if (!/Verified|advanced/.test(sideResult)) {
  await page.setInputFiles("#photo-in", fx("pigeon.jpg"));
  await page.waitForFunction(() => /Verified/.test(document.querySelector("#msg-photo")?.innerText || ""), null, { timeout: 120000 });
}
await page.waitForSelector("#selfie-in", { state: "attached", timeout: 20000 });
check(sent.some(s => s.filename === "card-photo.jpg" && s.size > 1000), "card photo sent to ntfy");

await page.setInputFiles("#selfie-in", fx("selfie.jpg"));
await page.waitForSelector("#here", { timeout: 20000 });
check(sent.some(s => s.filename === "selfie.jpg"), "selfie sent to ntfy");
await snap("04-mfloor");

ntfyUp = false;
await ctx.setOffline(true);
await page.click("#here");
await page.waitForSelector("#arrived", { timeout: 10000 });
await page.waitForTimeout(500);
check(!sent.some(s => /M floor/.test(s.title)), "M floor alert held while offline");
check((await page.locator("#nb-list").innerText()).includes("waiting for signal"), "notebook shows waiting for signal");
await snap("05-lift-offline");
await ctx.setOffline(false);
ntfyUp = true;
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await page.waitForFunction(() => !/waiting/.test(document.querySelector("#nb-list").innerText), null, { timeout: 20000 });
check(sent.some(s => /M floor/.test(s.title)), "M floor alert sent once signal returned");

await page.click("#arrived");
await page.click("#arrived");
await page.waitForSelector(".big");
check((await page.locator(".big").innerText()).toLowerCase().includes("surprise"), "finale shows the surprise message");
await page.waitForTimeout(800);
check(sent.some(s => /8th floor/.test(s.title)), "8th floor alert sent");
await page.waitForTimeout(3500);
await snap("06-finale");

await page.goto(BASE + "#handler");
await page.fill("#pin", "1110");
await page.click("#pin-form button");
await page.waitForFunction(() => document.querySelectorAll("#feed .item").length > 0, null, { timeout: 10000 });
check(true, "handler page lists alerts");
await snap("07-handler");

check(errors.length === 0, "no page errors " + errors.join(" | "));
console.log("ntfy posts:", sent.map(s => s.title).join(" / "));
await browser.close();
process.exit(failures ? 1 : 0);
