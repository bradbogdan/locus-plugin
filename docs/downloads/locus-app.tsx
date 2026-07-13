import { useState, useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/* LOCUS — triage, dossiers, briefing, pill, attachments, weekly status */
/* Notes/metadata in window.storage; files in IndexedDB (device-local). */
/* ------------------------------------------------------------------ */

const STORE_KEY = "cos-state-v2";
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const dayOfYear = () => {
  const now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
};
const fmtSize = (n) => (n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(0) + " KB" : (n / 1048576).toFixed(1) + " MB");
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CATEGORIES = {
  status: { label: "Status update", code: "ST", color: "#000E21" },
  milestone: { label: "Milestone", code: "MI", color: "#000E21" },
  deliverable: { label: "Deliverable", code: "DE", color: "#000E21" },
  timeline: { label: "Timeline", code: "TL", color: "#000E21" },
  budget: { label: "Budget", code: "BU", color: "#000E21" },
  risk: { label: "Risk", code: "RI", color: "#BA3189" },
  opportunity: { label: "Opportunity", code: "OP", color: "#000E21" },
  person: { label: "Person", code: "PE", color: "#000E21" },
  reminder: { label: "Reminder", code: "RE", color: "#000E21" },
  goal: { label: "Goal", code: "GO", color: "#000E21" },
};
const CAT_KEYS = Object.keys(CATEGORIES);
const emptyItems = () => CAT_KEYS.reduce((o, k) => ((o[k] = []), o), {});

const SEED_PROJECTS = [
  { id: "p1", name: "Engagement 01", desc: "", items: emptyItems() },
  { id: "p2", name: "Engagement 02", desc: "", items: emptyItems() },
  { id: "p3", name: "Engagement 03", desc: "", items: emptyItems() },
  { id: "p4", name: "Engagement 04", desc: "", items: emptyItems() },
  { id: "p5", name: "Engagement 05", desc: "", items: emptyItems() },
];

function normalizeState(s) {
  const st = s && typeof s === "object" ? { ...s } : {};
  st.projects = (st.projects && st.projects.length ? st.projects : SEED_PROJECTS).map((p) => ({ ...p, desc: p.desc || "", items: { ...emptyItems(), ...p.items } }));
  if (st.pillEnabled === undefined) st.pillEnabled = false;
  if (st.lastBackupAt === undefined) st.lastBackupAt = null;
  if (!("briefing" in st)) st.briefing = null;
  if (!("pill" in st)) st.pill = null;
  st.version = 3;
  return st;
}

const PILL_SOURCES = [
  { book: "High Output Management", author: "Andrew Grove", idea: "managerial leverage, a manager's output is the output of the teams under her influence" },
  { book: "The Effective Executive", author: "Peter Drucker", idea: "effectiveness means doing the right things; concentrate on a small number of priorities" },
  { book: "Good Strategy / Bad Strategy", author: "Richard Rumelt", idea: "the kernel of strategy: diagnosis, guiding policy, coherent action, versus fluff and goals dressed as strategy" },
  { book: "Managing the Professional Service Firm", author: "David Maister", idea: "the leverage structure of a firm (finders, minders, grinders) determines profitability and careers" },
  { book: "The Trusted Advisor", author: "David Maister", idea: "trust = (credibility + reliability + intimacy) / self-orientation" },
  { book: "Thinking in Bets", author: "Annie Duke", idea: "decisions are bets; separate decision quality from outcome quality (resulting)" },
  { book: "Never Split the Difference", author: "Chris Voss", idea: "tactical empathy and calibrated questions move negotiations more than arguments" },
  { book: "Measure What Matters", author: "John Doerr", idea: "OKRs: commit to a few measurable outcomes, make them transparent, grade them honestly" },
  { book: "The Hard Thing About Hard Things", author: "Ben Horowitz", idea: "wartime vs peacetime leadership, different modes demand different management" },
  { book: "Only the Paranoid Survive", author: "Andrew Grove", idea: "strategic inflection points, detect 10x forces early and act before the numbers prove it" },
  { book: "Influence", author: "Robert Cialdini", idea: "commitment and consistency: people align with what they have publicly committed to" },
  { book: "The Checklist Manifesto", author: "Atul Gawande", idea: "in complex work, simple checklists prevent expert failure at the routine steps" },
  { book: "Essentialism", author: "Greg McKeown", idea: "the disciplined pursuit of less: if it isn't a clear yes, it's a no" },
  { book: "The Goal", author: "Eliyahu Goldratt", idea: "every system has one constraint; improving anywhere else is an illusion of progress" },
  { book: "Team of Teams", author: "Stanley McChrystal", idea: "shared consciousness plus empowered execution beats command-and-control in fast environments" },
  { book: "Playing to Win", author: "Lafley & Martin", idea: "strategy is choice: where to play and how to win, and what you explicitly will not do" },
  { book: "Positioning", author: "Ries & Trout", idea: "positioning happens in the prospect's mind; own one word, don't be everything" },
  { book: "The Pyramid Principle", author: "Barbara Minto", idea: "lead with the answer, then group supporting arguments, structure thought before prose" },
  { book: "The First 90 Days", author: "Michael Watkins", idea: "match strategy to situation, startup, turnaround, realignment and sustaining success need different playbooks" },
  { book: "Radical Candor", author: "Kim Scott", idea: "care personally and challenge directly; ruinous empathy quietly destroys teams" },
  { book: "Getting to Yes", author: "Fisher & Ury", idea: "negotiate on interests, not positions; know your BATNA before you sit down" },
  { book: "Superforecasting", author: "Philip Tetlock", idea: "break big questions into tractable sub-questions; update in small increments, keep score" },
  { book: "Antifragile", author: "Nassim Taleb", idea: "build systems that gain from disorder, optionality and redundancy over fragile efficiency" },
  { book: "The Five Dysfunctions of a Team", author: "Patrick Lencioni", idea: "absence of trust is the root dysfunction; without conflict there is no real commitment" },
  { book: "Principles", author: "Ray Dalio", idea: "pain + reflection = progress; write down decision rules so they compound" },
  { book: "Made to Stick", author: "Heath & Heath", idea: "sticky messages are simple, unexpected, concrete, credible, emotional stories" },
  { book: "Flawless Consulting", author: "Peter Block", idea: "consulting fails at contracting, get authentic agreement on roles and wants before the work" },
  { book: "Deep Work", author: "Cal Newport", idea: "cognitive output = time times intensity of focus; fragmented attention is a tax on quality" },
  { book: "Crossing the Chasm", author: "Geoffrey Moore", idea: "dominate a niche beachhead completely before expanding to the mainstream" },
  { book: "Blue Ocean Strategy", author: "Kim & Mauborgne", idea: "create uncontested market space by reconstructing buyer value, not fighting over existing demand" },
  { book: "The Lean Startup", author: "Eric Ries", idea: "build, measure, learn: test the riskiest assumption with the smallest possible experiment" },
];

/* ---------------- encryption at rest (WebCrypto, AES-GCM) --------------- */
const te = new TextEncoder();
const td = new TextDecoder();
const bufToB64 = (buf) => { const a = new Uint8Array(buf); let s = ""; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
const b64ToBuf = (b64) => { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a.buffer; };
async function deriveKey(pass, saltBuf) {
  const base = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: saltBuf, iterations: 210000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptJSON(key, obj, saltB64) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(JSON.stringify(obj)));
  return JSON.stringify({ __locusEnc: 1, salt: saltB64, iv: bufToB64(iv.buffer), data: bufToB64(ct) });
}
async function decryptJSON(pass, record) {
  const saltBuf = b64ToBuf(record.salt);
  const key = await deriveKey(pass, saltBuf);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBuf(record.iv) }, key, b64ToBuf(record.data));
  return { key, saltB64: record.salt, state: JSON.parse(td.decode(pt)) };
}
/* storage backend: artifact window.storage when present, else localStorage */
const store = {
  async get(k) {
    if (window.storage && typeof window.storage.get === "function") return window.storage.get(k);
    const v = localStorage.getItem(k); return v == null ? null : { key: k, value: v };
  },
  async set(k, v) {
    if (window.storage && typeof window.storage.set === "function") return window.storage.set(k, v);
    localStorage.setItem(k, v); return true;
  },
};

/* ---------------------- file store (IndexedDB) ---------------------- */
const DB_NAME = "locus-files";
const DB_STORE = "blobs";
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(DB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });
}
async function idbPut(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const r = tx.objectStore(DB_STORE).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
async function idbDel(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) { return false; }
}
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: type || "application/octet-stream" });
}
function downloadBlob(blob, filename) {
  try {
    if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === "function") {
      window.navigator.msSaveOrOpenBlob(blob, filename);
      return true;
    }
  } catch (e) {}
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    // Revoke late. Revoking synchronously right after click cancels the download in most browsers.
    setTimeout(() => { try { document.body.removeChild(a); } catch (e) {} try { URL.revokeObjectURL(url); } catch (e) {} }, 10000);
    return true;
  } catch (e) {
    return false;
  }
}
function openBlobInNewTab(blob) {
  try {
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
    return !!w;
  } catch (e) { return false; }
}
async function downloadAttachment(att) {
  try {
    const blob = await idbGet(att.id);
    if (!blob) return false;
    downloadBlob(blob, att.name);
    return true;
  } catch (e) { return false; }
}

async function askClaude(prompt) {
  let text = null;
  if (window.claude && typeof window.claude.complete === "function") {
    try { text = await window.claude.complete(prompt); } catch (e) { text = null; }
  }
  if (text == null || !String(text).trim()) {
    try {
      const r = await fetch("/api/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      if (r.ok) { const j = await r.json(); text = j.completion || j.text || (j.content && j.content[0] && j.content[0].text) || null; }
    } catch (e) {}
  }
  if (typeof text !== "string" || !text.trim()) throw new Error("no AI route reachable");
  return text.replace(/```json|```/g, "").trim();
}

function safeJson(raw) {
  const cleaned = raw.trim();
  try { return JSON.parse(cleaned); } catch (e) {}
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a !== -1 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
  throw new Error("Response was not valid JSON");
}

/* ------------------------- weekly status HTML ----------------------- */
const REPORT_CSS = `
* { box-sizing:border-box; }
body { margin:0; background:#F7F8FA; color:#000E21; font-family:'Neue Haas Grotesk Display','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14.5px; line-height:1.55; font-weight:400; }
.r-head { background:#000E21; color:#fff; padding:40px 48px 34px; }
.r-brand { font-weight:300; letter-spacing:.42em; font-size:20px; margin-top:10px; }
.r-kicker { font-size:11px; letter-spacing:.28em; text-transform:uppercase; color:#8A95A5; margin-top:18px; }
.r-stamp { display:inline-block; margin-top:12px; font-size:10px; letter-spacing:.22em; text-transform:uppercase; border:1px solid rgba(255,255,255,.35); border-radius:3px; padding:4px 12px; color:#fff; }
.r-range { font-size:12px; letter-spacing:.02em; color:#C5CDD9; margin-top:14px; }
.r-gen { font-size:11px; color:#8A95A5; margin-top:4px; }
.r-main { padding:8px 48px 30px; max-width:880px; }
.r-proj { margin-top:34px; padding-top:26px; border-top:1px solid #C5CDD9; }
.r-proj:first-child { border-top:none; }
.r-proj h2 { font-weight:700; font-size:22px; margin:0 0 6px; letter-spacing:-.01em; }
.r-scope { color:#8A95A5; font-weight:400; font-size:13px; margin-bottom:12px; max-width:72ch; }
.r-summary { background:#fff; border:1px solid #C5CDD9; border-radius:3px; padding:13px 16px; margin:0 0 18px; font-size:14.5px; color:#000E21; }
.r-sec { margin-top:18px; }
.r-sec-h { font-size:10.5px; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:#8A95A5; margin-bottom:10px; }
.r-sec-h.done { color:#000E21; }
.r-sec-h.risk { color:#BA3189; }
.r-item { background:#fff; border:1px solid #C5CDD9; border-radius:3px; padding:12px 14px; margin-bottom:9px; }
.r-item-top { display:flex; align-items:center; gap:9px; }
.r-chip { font-size:9.5px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; border:1px solid; border-radius:2px; padding:2px 7px; white-space:nowrap; }
.r-title { font-weight:500; }
.r-detail { color:#4A5566; font-weight:400; margin-top:6px; }
.r-meta { font-size:11px; letter-spacing:.02em; color:#8A95A5; margin-top:7px; }
.r-att { font-size:12px; color:#4A5566; margin-top:6px; }
.r-foot { padding:18px 48px 40px; font-size:11px; color:#8A95A5; border-top:1px solid #C5CDD9; }
@media print {
  body { background:#fff; }
  .r-head, .r-stamp, .r-chip { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .r-proj, .r-item { break-inside:avoid; }
}
`;
const REPORT_ORB = '<svg width="44" height="44" viewBox="0 0 100 100"><defs><radialGradient id="lrg" cx="50%" cy="50%" r="62%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="42%" stop-color="#E6EAF0"/><stop offset="76%" stop-color="#9AA6BC" stop-opacity="0.5"/><stop offset="100%" stop-color="#000E21" stop-opacity="0"/></radialGradient></defs><path d="M50 50 L83.05 18 A46 46 0 1 1 50 4 Z" fill="url(#lrg)"/><circle cx="50" cy="50" r="8" fill="#BA3189"/></svg>';

function statusItemHTML(it, k, done) {
  const meta = [];
  if (it.date) meta.push(esc(it.date));
  if (it.amount) meta.push(esc(it.amount));
  if (it.owner) meta.push(esc(it.owner));
  meta.push("filed " + esc(it.createdAt));
  if (done && it.completedAt) meta.push("done " + esc(it.completedAt));
  const atts = (it.attachments && it.attachments.length)
    ? '<div class="r-att">' + it.attachments.map((a) => "&#128206; " + esc(a.name)).join(" &middot; ") + '</div>' : "";
  return '<div class="r-item"><div class="r-item-top"><span class="r-chip" style="color:' + CATEGORIES[k].color + ';border-color:' + CATEGORIES[k].color + '">' + esc(CATEGORIES[k].code) + '</span><span class="r-title">' + esc(it.title) + '</span></div>' +
    (it.detail ? '<div class="r-detail">' + esc(it.detail) + '</div>' : "") +
    (meta.length ? '<div class="r-meta">' + meta.join(" &middot; ") + '</div>' : "") + atts + '</div>';
}

function buildStatusHTML(active, startDate, windowLabel, summaries, itemCount) {
  const end = today();
  const projHTML = active.map((a) => {
    const summary = summaries[a.p.name];
    let completedBlock = "";
    if (a.completed.length) {
      completedBlock = '<div class="r-sec"><div class="r-sec-h done">Completed this period (' + a.completed.length + ')</div>' +
        a.completed.map((it) => statusItemHTML(it, it.cat, true)).join("") + '</div>';
    }
    const openParts = [];
    for (const k of CAT_KEYS) {
      const arr = a.openByCat[k] || [];
      if (arr.length) openParts.push(arr.map((it) => statusItemHTML(it, k, false)).join(""));
    }
    const openBlock = openParts.length ? '<div class="r-sec"><div class="r-sec-h">Logged / in progress</div>' + openParts.join("") + '</div>' : "";
    return '<section class="r-proj"><h2>' + esc(a.p.name) + '</h2>' +
      (a.p.desc ? '<div class="r-scope">' + esc(a.p.desc) + '</div>' : "") +
      (summary ? '<p class="r-summary">' + esc(summary) + '</p>' : "") +
      completedBlock + openBlock + '</section>';
  }).join("");
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LOCUS Weekly Status — ' + esc(end) + '</title><style>' + REPORT_CSS + '</style></head><body>' +
    '<header class="r-head">' + REPORT_ORB + '<div class="r-brand">L O C U S</div><div class="r-kicker">Weekly Status Report</div><div class="r-stamp">Internal — eyes only</div>' +
    '<div class="r-range">' + esc(windowLabel) + ' &middot; ' + esc(startDate) + ' &rarr; ' + esc(end) + '</div><div class="r-gen">Generated ' + esc(end) + (itemCount ? ' &middot; built from ' + itemCount + ' items' : '') + '</div></header>' +
    '<main class="r-main">' + projHTML + '</main>' +
    '<footer class="r-foot">LOCUS &middot; private chief-of-staff workspace &middot; ' + esc(end) + '</footer></body></html>';
}

function buildBriefingHTML(b) {
  const gen = b.generatedAt || today();
  const chipItem = (chipText, chipColor, title, meta) =>
    '<div class="r-item"><div class="r-item-top">' +
    (chipText ? '<span class="r-chip" style="color:' + chipColor + ';border-color:' + chipColor + '">' + esc(chipText) + '</span>' : "") +
    '<span class="r-title">' + esc(title) + '</span></div>' +
    (meta ? '<div class="r-meta">' + meta + '</div>' : "") + '</div>';
  const section = (label, inner, doneClass) => inner ? '<div class="r-sec"><div class="r-sec-h' + (doneClass ? " " + doneClass : "") + '">' + esc(label) + '</div>' + inner + '</div>' : "";

  const priorities = (b.priorities || []).map((p, i) =>
    chipItem(String(i + 1).padStart(2, "0"), "#000E21", p.action, [p.project ? esc(p.project) : "", p.why ? esc(p.why) : ""].filter(Boolean).join(" &middot; "))).join("");
  const deadlines = (b.deadlines || []).map((d) =>
    chipItem(d.date || "—", "#000E21", d.item, d.project ? esc(d.project) : "")).join("");
  const risks = (b.risks || []).map((r) =>
    chipItem("RI", "#BA3189", r.risk, r.project ? esc(r.project) : "")).join("");
  const reminders = (b.reminders || []).map((r) =>
    '<div class="r-item"><div class="r-item-top"><span class="r-title">&rarr; ' + esc(r) + '</span></div></div>').join("");

  const todayItems = (b.today || []).map((t) =>
    chipItem(t.when || "today", "#000E21", t.item, t.project ? esc(t.project) : "")).join("");
  const calendarItems = (b.calendar || []).map((c) =>
    chipItem(c.date || "", "#000E21", c.item, [c.project ? esc(c.project) : "", c.when ? esc(c.when) : ""].filter(Boolean).join(" &middot; "))).join("");
  const dueItems = (b.remindersDue || []).map((r) =>
    chipItem(r.when || "due", "#BA3189", r.item, r.project ? esc(r.project) : "")).join("");

  const body =
    (b.headline ? '<div class="r-summary" style="font-size:17px;font-weight:500">' + esc(b.headline) + '</div>' : "") +
    (b.builtFrom != null ? '<div class="r-gen" style="margin:0 0 14px">Built from ' + b.builtFrom + ' open items' + (b.ai === false ? ' &middot; assembled without AI' : '') + '</div>' : "") +
    section("Today", todayItems) +
    section("Calendar", calendarItems) +
    section("Top priorities", priorities) +
    section("Dates that bite", deadlines) +
    section("Open risks", risks, "risk") +
    section("Reminders due", dueItems, "risk") +
    section("Reminders", reminders) +
    (b.nudge ? '<div class="r-sec"><div class="r-sec-h">Chief-of-staff nudge</div><p class="r-detail" style="font-style:italic;font-size:14.5px">&ldquo;' + esc(b.nudge) + '&rdquo;</p></div>' : "");

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LOCUS Daily Briefing — ' + esc(gen) + '</title><style>' + REPORT_CSS + '</style></head><body>' +
    '<header class="r-head">' + REPORT_ORB + '<div class="r-brand">L O C U S</div><div class="r-kicker">Daily Briefing</div><div class="r-stamp">Internal — eyes only</div>' +
    '<div class="r-gen">Generated ' + esc(gen) + '</div></header>' +
    '<main class="r-main"><section class="r-proj" style="border-top:none;padding-top:0">' + body + '</section></main>' +
    '<footer class="r-foot">LOCUS &middot; private chief-of-staff workspace &middot; ' + esc(gen) + '</footer></body></html>';
}

function LocusMark({ size = 34, variant = "flat", tone = "navy" }) {
  const gid = useRef("lm" + Math.random().toString(36).slice(2, 7)).current;
  const graded = variant === "graded" && size >= 48; // graded field never appears below 48px
  const path = "M50 50 L83.05 18 A46 46 0 1 1 50 4 Z"; // the cut: lower edge at 44.09°, opening north-east
  const fieldFill = graded ? "url(#" + gid + ")" : (tone === "white" ? "#FFFFFF" : "#000E21");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {graded && (
        <defs>
          <radialGradient id={gid} cx="50%" cy="50%" r="62%">
            {tone === "white" ? [
              <stop key="0" offset="0%" stopColor="#FFFFFF" />,
              <stop key="1" offset="42%" stopColor="#E6EAF0" />,
              <stop key="2" offset="76%" stopColor="#9AA6BC" stopOpacity="0.5" />,
              <stop key="3" offset="100%" stopColor="#000E21" stopOpacity="0" />,
            ] : [
              <stop key="0" offset="0%" stopColor="#010A18" />,
              <stop key="1" offset="38%" stopColor="#04101F" />,
              <stop key="2" offset="72%" stopColor="#45506A" stopOpacity="0.55" />,
              <stop key="3" offset="100%" stopColor="#C5CDD9" stopOpacity="0" />,
            ]}
          </radialGradient>
        </defs>
      )}
      <path d={path} fill={fieldFill} />
      <circle cx="50" cy="50" r="8" fill="#BA3189" />
    </svg>
  );
}

function LockScreen({ mode, onUnlock, onSetup }) {
  const [v, setV] = useState("");
  const [v2, setV2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy || !v.trim()) return;
    setBusy(true); setErr("");
    const e = mode === "setup" ? await onSetup(v.trim(), v2.trim()) : await onUnlock(v.trim());
    if (e) { setErr(e); if (mode !== "setup") setV(""); }
    setBusy(false);
  };
  return (
    <div className="lock">
      <style>{CSS}</style>
      <LocusMark size={76} variant="graded" tone="navy" />
      <div className="wordmark lock-mark">L O C U S</div>
      <div className="lock-tag">Everything filed<span className="mag">.</span> Nothing forgotten<span className="mag">.</span></div>
      {mode === "loading" ? (
        <div className="lock-sub">Opening Locus…</div>
      ) : (
        <>
          <div className="lock-sub">{mode === "setup" ? "Set a passphrase" : "Enter your passphrase"}</div>
          <input className="lock-input" type="password" autoFocus value={v}
            onChange={(e) => { setV(e.target.value); setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && mode !== "setup") go(); }}
            placeholder="Passphrase" aria-label="Passphrase" />
          {mode === "setup" && (
            <input className="lock-input" type="password" value={v2}
              onChange={(e) => { setV2(e.target.value); setErr(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") go(); }}
              placeholder="Repeat passphrase" aria-label="Repeat passphrase" />
          )}
          <button className="btn primary" onClick={go} disabled={busy || !v.trim()}>{busy ? "Working…" : mode === "setup" ? "Encrypt and open" : "Unlock"}</button>
          {mode === "setup" && <div className="lock-note">This passphrase encrypts everything on this device. It can't be recovered. 8 characters minimum.</div>}
          {err && <div className="lock-err">{err}</div>}
        </>
      )}
    </div>
  );
}

function KnowledgePill({ pill, loading, onRetry, enabled, onToggle }) {
  const head = (right) => (
    <div className="pill-head">
      <span className="pill-eyebrow">Daily knowledge pill</span>
      <span style={{ display: "inline-flex", gap: 12, alignItems: "baseline" }}>{right}<button className="pill-toggle" onClick={onToggle}>{enabled ? "Turn off" : "Turn on"}</button></span>
    </div>
  );
  if (!enabled) return (<div className="pill">{head(null)}<p className="pill-why dim">Off. When on, 1 model call drafts a card each day.</p></div>);
  if (loading) return (<div className="pill">{head(null)}<p className="pill-why dim">Distilling today's idea…</p></div>);
  if (!pill) return (<div className="pill">{head(null)}<p className="pill-why dim">Not drafted yet. <button className="pill-retry" onClick={onRetry}>Draft it</button></p></div>);
  return (
    <div className="pill">
      {head(<span className="pill-source">{pill.book} · {pill.author}</span>)}
      <p className="pill-principle">{pill.principle}</p>
      <p className="pill-why">{pill.why}</p>
      <p className="pill-question"><span className="pill-arrow">→</span>{pill.question}</p>
    </div>
  );
}

function StatusModal({ busy, projects, onGenerate, onClose }) {
  const [mode, setMode] = useState("7");
  const [customDate, setCustomDate] = useState(daysAgo(7));
  const [sel, setSel] = useState(() => new Set(projects.map((p) => p.id)));
  const presets = [["7", "Last 7 days"], ["14", "Last 14 days"], ["30", "Last 30 days"], ["custom", "Since a date I choose"]];
  const toggle = (id) => setSel((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const go = () => {
    if (busy || sel.size === 0) return;
    const ids = Array.from(sel);
    if (mode === "custom") onGenerate(customDate, "Since " + customDate, ids);
    else { const n = parseInt(mode, 10); onGenerate(daysAgo(n), "Last " + n + " days", ids); }
  };
  return (
    <div className="modal-bg" onClick={() => { if (!busy) onClose(); }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Weekly status report</div>
        <h2 className="modal-h">Choose the window</h2>
        <div className="modal-opts">
          {presets.map(([val, label]) => (
            <button key={val} className={"modal-opt " + (mode === val ? "on" : "")} onClick={() => setMode(val)}>{label}</button>
          ))}
        </div>
        {mode === "custom" && (
          <input className="modal-date" type="date" value={customDate} max={today()} onChange={(e) => setCustomDate(e.target.value)} />
        )}
        <div className="eyebrow" style={{ marginTop: 18 }}>Dossiers to include</div>
        <div className="modal-checks">
          {projects.map((p) => (
            <label key={p.id} className="modal-check">
              <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
        <div className="modal-row">
          <button className="btn primary" onClick={go} disabled={busy || sel.size === 0}>{busy ? "Compiling…" : "Download report"}</button>
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
        <div className="modal-note">Internal report. {sel.size} of {projects.length} dossiers selected. Shows what was completed in the window and everything logged in it. Only selected dossiers with activity appear.</div>
      </div>
    </div>
  );
}

export default function Locus() {
  const [unlocked, setUnlocked] = useState(false);
  const [gate, setGate] = useState({ mode: "loading", legacy: null, record: null });
  const keyRef = useRef(null);
  const saltRef = useRef(null);
  const [state, setState] = useState(null);
  const [view, setView] = useState("inbox");
  const [notes, setNotes] = useState("");
  const [proposals, setProposals] = useState([]);
  const [openIdx, setOpenIdx] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [assign, setAssign] = useState({});
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const undoTimer = useRef(null);
  const [busy, setBusy] = useState(false);
  const [pillBusy, setPillBusy] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState("");
  const [filedFlash, setFiledFlash] = useState("");
  const pillRequested = useRef(false);

  useEffect(() => {
    (async () => {
      let raw = null;
      try { const r = await store.get(STORE_KEY); if (r && r.value) raw = r.value; } catch (e) {}
      if (!raw) { setGate({ mode: "setup", legacy: null, record: null }); return; }
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.__locusEnc) setGate({ mode: "unlock", legacy: null, record: parsed });
        else setGate({ mode: "setup", legacy: parsed, record: null });
      } catch (e) { setGate({ mode: "setup", legacy: null, record: null }); }
    })();
  }, []);

  useEffect(() => {
    if (!unlocked || !state || pillRequested.current) return;
    if (!state.pillEnabled) return;
    if (state.pill && state.pill.date === today()) return;
    pillRequested.current = true;
    generatePill(state);
  }, [unlocked, state]);

  async function handleUnlock(pass) {
    try {
      const r = await decryptJSON(pass, gate.record);
      keyRef.current = r.key; saltRef.current = r.saltB64;
      setState(normalizeState(r.state)); setUnlocked(true); return null;
    } catch (e) { return "That passphrase didn't match."; }
  }

  async function handleSetup(pass, confirm) {
    if (!pass || pass.length < 8) return "Use at least 8 characters.";
    if (pass !== confirm) return "The two entries don't match.";
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltB64 = bufToB64(salt.buffer);
      const key = await deriveKey(pass, salt.buffer);
      keyRef.current = key; saltRef.current = saltB64;
      const st = normalizeState(gate.legacy || { projects: SEED_PROJECTS, briefing: null, pill: null, lastBackupAt: null, pillEnabled: false });
      await store.set(STORE_KEY, await encryptJSON(key, st, saltB64));
      setState(st); setUnlocked(true); return null;
    } catch (e) { return "Couldn't set up encryption in this browser."; }
  }

  async function persist(next) {
    setState(next);
    try { await store.set(STORE_KEY, await encryptJSON(keyRef.current, next, saltRef.current)); }
    catch (e) { setError("Saving failed. Your last change may not persist."); }
  }

  async function openAttachment(att) {
    const ok = await downloadAttachment(att);
    if (!ok) setError("That file isn't on this device. Attachments are stored locally — re-attach it here, or import a backup that contains it.");
  }

  async function generatePill(currentState) {
    const s = currentState || state;
    if (!s || !s.pillEnabled) { setPillBusy(false); return; }
    setPillBusy(true);
    const src = PILL_SOURCES[dayOfYear() % PILL_SOURCES.length];
    const portfolio = s.projects.map((p) => "- " + p.name + (p.desc ? " — " + p.desc : "")).join("\n");
    const prompt = "You write a single daily knowledge card for {{PRINCIPAL_ROLE}}. Their remit spans strategic delivery, operations, business development and client-facing commercial work across their engagements.\n\n" +
      "Today's source: \"" + src.book + "\" by " + src.author + ". Core idea to distil: " + src.idea + ".\n\n" +
      "Their active portfolio (use it for the application question, pick the single most relevant project or process and name it):\n" + portfolio + "\n\n" +
      "Write ONE card, maximum 150 words in total, with exactly this structure:\n" +
      "1. principle: one sentence stating the idea as a decision rule, faithful to the author's logic\n" +
      "2. why: exactly two sentences on why it matters for someone in their role\n" +
      "3. question: one sharp question applying the principle to a live decision in their portfolio\n\n" +
      "Tone: direct, senior, no fluff, no greetings. Respond ONLY with JSON, no prose:\n" +
      '{"principle":"...","why":"...","question":"..."}';
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await askClaude(prompt);
        const p = safeJson(raw);
        await persist({ ...s, pill: { date: today(), book: src.book, author: src.author, principle: p.principle || "", why: p.why || "", question: p.question || "" } });
        setPillBusy(false);
        return;
      } catch (e) { lastErr = e; }
    }
    setError("Knowledge pill failed: " + (lastErr && lastErr.message ? lastErr.message : "unknown error") + ". Use Retry on the card.");
    setPillBusy(false);
  }
  function retryPill() { pillRequested.current = true; generatePill(state); }
  async function togglePill() {
    const next = { ...state, pillEnabled: !state.pillEnabled };
    await persist(next);
    if (next.pillEnabled && !(next.pill && next.pill.date === today())) { pillRequested.current = true; generatePill(next); }
  }

  function onPickFiles(e) {
    const files = Array.from(e.target.files || []);
    const additions = files.map((f) => ({ id: uid(), name: f.name, size: f.size, type: f.type, file: f }));
    setPendingFiles((prev) => [...prev, ...additions]);
    e.target.value = "";
  }
  function removePending(id) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
    setAssign((a) => { const n = { ...a }; delete n[id]; return n; });
  }

  async function triage() {
    if (!notes.trim()) return;
    setBusy(true); setError(""); setProposals([]);
    const projectList = state.projects.map((p) => "- " + p.name + (p.desc ? " — scope: " + p.desc : "")).join("\n");
    const idx = [];
    for (const p of state.projects) for (const k of CAT_KEYS) for (const it of p.items[k]) if (!it.done) idx.push({ id: it.id, project: p.name, cat: k, title: it.title });
    setOpenIdx(idx);
    const openList = idx.map((o) => o.id + " | " + o.project + " | " + CATEGORIES[o.cat].label + " | " + o.title).join("\n");
    const prompt = "You are the chief of staff for {{PRINCIPAL_ROLE}}. Today is " + today() + ".\n\n" +
      "Their active projects:\n" + projectList + "\n\n" +
      "OPEN ITEMS ALREADY ON FILE (id | project | type | title):\n" + (openList || "(none)") + "\n\n" +
      "Triage the raw notes below. Split them into discrete items. For each item decide which project it belongs to (use the scope descriptions to route correctly) and what kind of record it is:\n" +
      "- status: a progress/status update on workstreams\n" +
      "- milestone: a concrete achievement or checkpoint with (ideally) a date\n" +
      "- deliverable: a concrete item to produce or ship (document, deck, module, pitch material)\n" +
      "- timeline: a scheduling fact, sequence change, or date shift\n" +
      "- budget: anything with money, costs, fees, budget lines, invoices\n" +
      "- risk: a threat, blocker, concern, or exposure\n" +
      "- opportunity: a new-business lead, pitch opportunity, or partnership opening\n" +
      "- person: someone joining, leaving, or being allocated to delivery\n" +
      "- reminder: something they must do or follow up on (include due date if implied)\n" +
      "- goal: an objective or target to hit\n\n" +
      "LINKING RULE: if a note reports that one of the OPEN ITEMS above is now finished, delivered, sent, resolved or signed off, put that open item's id in the new item's \"closes\" array. Only link when the note clearly refers to the same piece of work; otherwise leave the array empty.\n\n" +
      "Respond ONLY with JSON, no prose, in this exact shape:\n" +
      '{"items":[{"project":"exact project name from the list, or NEW: name if none fits","category":"one of: status|milestone|deliverable|timeline|budget|risk|opportunity|person|reminder|goal","title":"max 10 words","detail":"one or two sentences, self-contained","date":"YYYY-MM-DD or null","amount":"money string or null","owner":"person name or null","closes":["ids of open items this note completes, or empty"]}]}\n\n' +
      "NOTES:\n" + notes;
    const normT = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    let lastErr = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await askClaude(prompt);
        const parsed = safeJson(raw);
        const items = (parsed.items || []).map((it) => {
          const project = it.project || state.projects[0].name;
          const title = it.title || "Untitled";
          const nt = normT(title);
          const closes = Array.isArray(it.closes) ? it.closes.filter((cid) => idx.some((o) => o.id === cid)) : [];
          const dupHit = idx.find((o) => o.project === project && closes.indexOf(o.id) === -1 &&
            (normT(o.title) === nt || (nt.length > 12 && normT(o.title).indexOf(nt) !== -1) || (normT(o.title).length > 12 && nt.indexOf(normT(o.title)) !== -1)));
          return {
            id: uid(), project,
            category: CAT_KEYS.includes(it.category) ? it.category : "status",
            title, detail: it.detail || "",
            date: it.date || null, amount: it.amount || null, owner: it.owner || null,
            closes, dupOf: dupHit ? dupHit.title : null,
          };
        });
        if (!items.length) setError("0 actionable items found in these notes.");
        setProposals(items);
        if (pendingFiles.length) {
          const preferred = items.find((it) => it.category === "milestone" || it.category === "deliverable") || items[0];
          const defId = preferred ? preferred.id : "none";
          setAssign((prev) => { const n = { ...prev }; for (const f of pendingFiles) if (!n[f.id]) n[f.id] = defId; return n; });
        }
        setBusy(false); return;
      } catch (e) { lastErr = e; }
    }
    setError("Triage failed: " + (lastErr && lastErr.message ? lastErr.message : "unknown error"));
    setBusy(false);
  }

  function updateProposal(id, field, value) { setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p))); }
  function dropProposal(id) {
    setProposals((ps) => ps.filter((p) => p.id !== id));
    setAssign((a) => { const n = { ...a }; for (const k of Object.keys(n)) if (n[k] === id) n[k] = "none"; return n; });
  }

  async function fileAll() {
    const projects = state.projects.map((p) => ({ ...p, items: { ...p.items } }));
    for (const pr of proposals) {
      const atts = [];
      for (const f of pendingFiles) {
        if (assign[f.id] === pr.id) {
          try { await idbPut(f.id, f.file); } catch (e) {}
          atts.push({ id: f.id, name: f.name, size: f.size, type: f.type });
        }
      }
      let name = pr.project;
      if (name.startsWith("NEW:")) name = name.replace(/^NEW:\s*/, "").trim();
      let proj = projects.find((p) => p.name === name);
      if (!proj) { proj = { id: uid(), name, desc: "", items: emptyItems() }; projects.push(proj); }
      proj.items = { ...proj.items };
      proj.items[pr.category] = [
        { id: uid(), title: pr.title, detail: pr.detail, date: pr.date, amount: pr.amount, owner: pr.owner, attachments: atts, done: false, createdAt: today() },
        ...proj.items[pr.category],
      ];
    }
    const closeIds = new Set();
    for (const pr of proposals) for (const cid of (pr.closes || [])) closeIds.add(cid);
    let closed = 0;
    if (closeIds.size) {
      for (const proj of projects) {
        proj.items = { ...proj.items };
        for (const k of CAT_KEYS) proj.items[k] = proj.items[k].map((it) => {
          if (closeIds.has(it.id) && !it.done) { closed++; return { ...it, done: true, completedAt: today() }; }
          return it;
        });
      }
    }
    await persist({ ...state, projects });
    const nF = pendingFiles.filter((f) => proposals.some((pr) => assign[f.id] === pr.id)).length;
    setFiledFlash(proposals.length + " item" + (proposals.length > 1 ? "s" : "") + " filed" + (closed ? ", " + closed + " open item" + (closed > 1 ? "s" : "") + " closed" : "") + (nF ? ", " + nF + " file" + (nF > 1 ? "s" : "") + " attached." : "."));
    setProposals([]); setNotes(""); setPendingFiles([]); setAssign({});
    setTimeout(() => setFiledFlash(""), 4000);
  }

  function portfolioSnapshot() {
    return state.projects.map((p) => {
      const lines = [];
      for (const k of CAT_KEYS) for (const it of p.items[k].slice(0, 6)) {
        if (it.done) continue;
        const att = (it.attachments && it.attachments.length) ? " {files: " + it.attachments.map((a) => a.name).join(", ") + "}" : "";
        lines.push(CATEGORIES[k].label + ": " + it.title + (it.date ? " · dated " + it.date : "") + (it.createdAt ? " · filed " + it.createdAt : "") + (it.amount ? " [" + it.amount + "]" : "") + (it.owner ? " — " + it.owner : "") + att + " :: " + it.detail);
      }
      return lines.length ? "## " + p.name + (p.desc ? "\nScope: " + p.desc : "") + "\n" + lines.join("\n") : null;
    }).filter(Boolean).join("\n\n");
  }

  async function generateBriefing() {
    setBusy(true); setError("");
    const t = today();
    const dDiff = (d) => { try { return Math.round((new Date(d + "T00:00:00") - new Date(t + "T00:00:00")) / 86400000); } catch (e) { return null; } };
    const rel = (d) => { const n = dDiff(d); if (n === null) return d; if (n === 0) return "today"; if (n < 0) return Math.abs(n) + "d overdue"; return "in " + n + "d"; };

    const open = [], done = [];
    for (const p of state.projects) for (const k of CAT_KEYS) for (const it of p.items[k]) {
      const row = { project: p.name, label: CATEGORIES[k].label, title: it.title, detail: it.detail || "", date: it.date || null, createdAt: it.createdAt || null, completedAt: it.completedAt || null };
      if (it.done) done.push(row); else open.push(row);
    }
    const calendar = open.filter((r) => r.date && dDiff(r.date) !== null && dDiff(r.date) <= 14)
      .sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(0, 12)
      .map((r) => ({ date: r.date, when: rel(r.date), item: r.title, project: r.project }));
    const remindersDue = open.filter((r) => r.label === "Reminder" && r.date && dDiff(r.date) !== null && dDiff(r.date) <= 2)
      .map((r) => ({ item: r.title, when: rel(r.date), project: r.project }));
    const builtFrom = open.length;

    const recent = [...open].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 10)
      .map((r) => "filed " + (r.createdAt || "?") + " · [" + r.label + "] " + r.project + " — " + r.title + (r.detail ? ": " + r.detail : "")).join("\n");
    const dated = open.filter((r) => r.date).sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map((r) => r.date + " (" + rel(r.date) + ") · [" + r.label + "] " + r.project + " — " + r.title).join("\n");
    const justDone = done.filter((r) => r.completedAt && dDiff(r.completedAt) !== null && dDiff(r.completedAt) >= -7)
      .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
      .map((r) => "done " + r.completedAt + " · " + r.project + " — " + r.title).join("\n");

    const fallbackBriefing = () => {
      const newest = [...open].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
      return {
        headline: newest ? newest.project + ": " + newest.title + "." : "Nothing on file. Drop notes in the inbox.",
        today: open.filter((r) => (r.date && dDiff(r.date) === 0) || (r.createdAt && dDiff(r.createdAt) === 0)).slice(0, 4)
          .map((r) => ({ project: r.project, item: r.title, when: r.date && dDiff(r.date) === 0 ? "today" : "filed today" })),
        priorities: [],
        deadlines: open.filter((r) => r.date && dDiff(r.date) !== null && dDiff(r.date) <= 7).sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(0, 5)
          .map((r) => ({ project: r.project, item: r.title, date: r.date })),
        risks: open.filter((r) => r.label === "Risk").slice(0, 4).map((r) => ({ project: r.project, risk: r.title })),
        reminders: [],
        nudge: "Assembled without AI. The model was unreachable, so this is the raw read of what is on file.",
        ai: false,
      };
    };

    const snapshot = portfolioSnapshot();
    const prompt = "You are chief of staff to {{PRINCIPAL_ROLE}}. Today is " + t + ". Write their daily briefing for today.\n\n" +
      "Voice: direct, composed, senior. Numbers before adjectives. No greetings, no exclamation marks, no congratulation.\n\n" +
      "HEADLINE RULE: lead with the single most recent or most consequential development, drawn from RECENT ACTIVITY below. Name the project and state what actually happened or what it now forces. Do not write a generic portfolio summary.\n\n" +
      "RECENT ACTIVITY (most recently filed first):\n" + (recent || "(nothing filed yet)") + "\n\n" +
      "CALENDAR — DATED ITEMS (soonest first, relative to today):\n" + (dated || "(nothing dated)") + "\n\n" +
      "RECENTLY COMPLETED (last 7 days — treat as momentum, do not celebrate):\n" + (justDone || "(none)") + "\n\n" +
      "FULL PORTFOLIO (for context):\n" + (snapshot || "(empty)") + "\n\n" +
      "Respond ONLY with JSON, no prose:\n" +
      '{"headline":"one sharp sentence leading with the most recent/consequential development, naming the project","today":[{"project":"...","item":"what lands today, is due within 2 days, or was just filed","when":"today | in Nd | filed YYYY-MM-DD"}],"priorities":[{"project":"...","action":"imperative, max 15 words","why":"max 12 words"}],"deadlines":[{"project":"...","item":"...","date":"YYYY-MM-DD"}],"risks":[{"project":"...","risk":"max 15 words"}],"reminders":["short imperative"],"nudge":"one honest sentence of chief-of-staff counsel"}\n\n' +
      "today: max 4, only genuinely current items (dated today, due within 2 days, or filed in the last 2 days); empty array if none. deadlines = dates that bite (overdue or within 7 days), max 5. priorities max 5, risks max 4, reminders max 5. Empty array where nothing qualifies.";
    let b = null;
    for (let attempt = 0; attempt < 2 && !b; attempt++) {
      try { b = { ...safeJson(await askClaude(prompt)), ai: true }; } catch (e) {}
    }
    if (!b) {
      b = fallbackBriefing();
      setFiledFlash("Model unreachable. Briefing assembled from filed data only.");
      setTimeout(() => setFiledFlash(""), 5000);
    }
    await persist({ ...state, briefing: { ...b, calendar, remindersDue, builtFrom, generatedAt: t } });
    setView("briefing"); setBusy(false);
  }

  function downloadBriefing() {
    if (!state || !state.briefing) { setError("No briefing on file to download yet."); return; }
    try {
      const html = buildBriefingHTML(state.briefing);
      const blob = new Blob([html], { type: "text/html" });
      const ok = downloadBlob(blob, "LOCUS-daily-briefing-" + (state.briefing.generatedAt || today()) + ".html");
      if (!ok) openBlobInNewTab(blob);
      setFiledFlash("Daily briefing downloaded.");
      setTimeout(() => setFiledFlash(""), 4000);
    } catch (e) {
      setError("Couldn't build the briefing file.");
    }
  }

  async function downloadStatus(startDate, windowLabel, selectedIds) {
    setStatusBusy(true); setError("");
    const inWin = (d) => !!d && d >= startDate;
    const active = [];
    for (const p of state.projects) {
      if (selectedIds && selectedIds.length && selectedIds.indexOf(p.id) === -1) continue;
      const completed = [];
      const openByCat = {};
      let openCount = 0;
      for (const k of CAT_KEYS) {
        for (const it of p.items[k]) {
          if (it.done && inWin(it.completedAt)) completed.push({ ...it, cat: k });
          else if (!it.done && inWin(it.createdAt)) { (openByCat[k] = openByCat[k] || []).push(it); openCount++; }
        }
      }
      if (completed.length + openCount > 0) active.push({ p, completed, openByCat, openCount });
    }
    if (!active.length) {
      setStatusBusy(false); setStatusOpen(false);
      setError("No activity in that window — nothing was filed or completed in the selected period.");
      setTimeout(() => setError(""), 5000);
      return;
    }
    let summaries = {};
    try {
      const blocks = active.map((a) => {
        const lines = [];
        a.completed.forEach((it) => lines.push("DONE [" + CATEGORIES[it.cat].label + "] " + it.title + (it.detail ? ": " + it.detail : "")));
        for (const k of CAT_KEYS) for (const it of (a.openByCat[k] || [])) lines.push("OPEN [" + CATEGORIES[k].label + "] " + it.title + (it.detail ? ": " + it.detail : ""));
        return "### " + a.p.name + "\n" + lines.join("\n");
      }).join("\n\n");
      const prompt = "You are chief of staff to {{PRINCIPAL_ROLE}}. This is an internal weekly status review for the period " + startDate + " to " + today() + ". For each project below, write ONE terse internal status paragraph of 2 to 3 sentences: what got completed this period, what is open or at risk, and the immediate next focus. Internal voice, no greetings, no headers inside the paragraph.\n\n" +
        "Respond ONLY with JSON, no prose:\n{\"summaries\":[{\"project\":\"exact project name\",\"summary\":\"2-3 sentences\"}]}\n\n" +
        "PROJECTS:\n" + blocks;
      const raw = await askClaude(prompt);
      const parsed = safeJson(raw);
      for (const s of (parsed.summaries || [])) if (s && s.project) summaries[s.project] = s.summary;
    } catch (e) { /* proceed without AI summaries */ }

    try {
      const itemCount = active.reduce((n, a) => n + a.completed.length + a.openCount, 0);
      const html = buildStatusHTML(active, startDate, windowLabel, summaries, itemCount);
      const blob = new Blob([html], { type: "text/html" });
      const ok = downloadBlob(blob, "LOCUS-weekly-status-" + today() + ".html");
      if (!ok) openBlobInNewTab(blob);
      setStatusBusy(false); setStatusOpen(false);
      setFiledFlash("Weekly status downloaded (" + active.length + " project" + (active.length > 1 ? "s" : "") + ").");
      setTimeout(() => setFiledFlash(""), 4000);
    } catch (e) {
      setStatusBusy(false);
      setError("Couldn't build the report file.");
    }
  }

  async function copyDigest() {
    const digest = "LOCUS portfolio digest, " + today() + "\n\n" + (portfolioSnapshot() || "(empty)") + "\n\n--\nContext for Claude: these are filed notes from my chief-of-staff tracker. Use them as background for this conversation.";
    try { await navigator.clipboard.writeText(digest); setFiledFlash("Digest copied."); setTimeout(() => setFiledFlash(""), 4000); }
    catch (e) { setError("Couldn't copy — your browser may be blocking clipboard access."); }
  }

  async function exportData() {
    try {
      const files = {};
      for (const p of state.projects) for (const k of CAT_KEYS) for (const it of p.items[k]) {
        for (const a of (it.attachments || [])) {
          try { const blob = await idbGet(a.id); if (blob) files[a.id] = { type: a.type, data: await blobToBase64(blob) }; } catch (e) {}
        }
      }
      const next = { ...state, lastBackupAt: today() };
      const payload = { __locus: true, version: 2, state: next, files };
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      downloadBlob(blob, "locus-backup-" + today() + ".json");
      await persist(next);
      const nF = Object.keys(files).length;
      setFiledFlash("Backup downloaded" + (nF ? " with " + nF + " file" + (nF > 1 ? "s" : "") + "." : "."));
      setTimeout(() => setFiledFlash(""), 4000);
    } catch (e) { setError("Export failed — couldn't generate the backup file."); }
  }
  function importData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        let nextState = null, files = {};
        if (parsed && parsed.__locus && parsed.state) { nextState = parsed.state; files = parsed.files || {}; }
        else if (parsed && Array.isArray(parsed.projects)) { nextState = parsed; }
        else throw new Error("shape");
        for (const id of Object.keys(files)) {
          try { await idbPut(id, base64ToBlob(files[id].data, files[id].type)); } catch (e) {}
        }
        nextState.projects = (nextState.projects || []).map((p) => ({ ...p, desc: p.desc || "", items: { ...emptyItems(), ...p.items } }));
        await persist(normalizeState(nextState));
        const nF = Object.keys(files).length;
        setFiledFlash("Backup restored" + (nF ? " with " + nF + " file" + (nF > 1 ? "s" : "") + "." : "."));
        setTimeout(() => setFiledFlash(""), 4000);
      } catch (err) { setError("Import failed — that file isn't a valid LOCUS backup."); }
    };
    reader.readAsText(file); e.target.value = "";
  }

  async function toggleDone(projectId, cat, itemId) {
    const projects = state.projects.map((p) => p.id !== projectId ? p :
      { ...p, items: { ...p.items, [cat]: p.items[cat].map((it) => (it.id === itemId ? { ...it, done: !it.done, completedAt: !it.done ? today() : null } : it)) } });
    await persist({ ...state, projects });
  }
  async function editFiledDate(projectId, cat, itemId, newDate) {
    if (!newDate) return;
    const projects = state.projects.map((p) => p.id !== projectId ? p :
      { ...p, items: { ...p.items, [cat]: p.items[cat].map((it) => (it.id === itemId ? { ...it, createdAt: newDate } : it)) } });
    await persist({ ...state, projects });
  }
  async function finalizePendingDelete(pd) {
    if (!pd || !pd.item) return;
    for (const a of (pd.item.attachments || [])) { await idbDel(a.id); }
  }
  async function deleteItem(projectId, cat, itemId) {
    const proj = state.projects.find((p) => p.id === projectId);
    const item = proj && proj.items[cat].find((it) => it.id === itemId);
    if (!item) return;
    if (pendingDelete) { clearTimeout(undoTimer.current); finalizePendingDelete(pendingDelete); }
    const projects = state.projects.map((p) => p.id !== projectId ? p :
      { ...p, items: { ...p.items, [cat]: p.items[cat].filter((it) => it.id !== itemId) } });
    await persist({ ...state, projects });
    const pd = { projectId, cat, item };
    setPendingDelete(pd);
    undoTimer.current = setTimeout(() => { setPendingDelete(null); finalizePendingDelete(pd); }, 6000);
  }
  async function undoDelete() {
    if (!pendingDelete) return;
    clearTimeout(undoTimer.current);
    const { projectId, cat, item } = pendingDelete;
    setPendingDelete(null);
    const projects = state.projects.map((p) => p.id !== projectId ? p :
      { ...p, items: { ...p.items, [cat]: [item, ...p.items[cat]] } });
    await persist({ ...state, projects });
  }
  async function updateItem(projectId, cat, itemId, patch, newCat) {
    const target = newCat && CAT_KEYS.includes(newCat) && newCat !== cat ? newCat : cat;
    const projects = state.projects.map((p) => {
      if (p.id !== projectId) return p;
      const items = { ...p.items };
      const it = items[cat].find((x) => x.id === itemId);
      if (!it) return p;
      const upd = { ...it, ...patch };
      if (target === cat) items[cat] = items[cat].map((x) => (x.id === itemId ? upd : x));
      else { items[cat] = items[cat].filter((x) => x.id !== itemId); items[target] = [upd, ...items[target]]; }
      return { ...p, items };
    });
    await persist({ ...state, projects });
  }
  async function addAttachment(projectId, cat, itemId, file) {
    const att = { id: uid(), name: file.name, size: file.size, type: file.type };
    try { await idbPut(att.id, file); } catch (e) {}
    const projects = state.projects.map((p) => p.id !== projectId ? p :
      { ...p, items: { ...p.items, [cat]: p.items[cat].map((it) => it.id !== itemId ? it : { ...it, attachments: [...(it.attachments || []), att] }) } });
    await persist({ ...state, projects });
  }
  async function removeAttachment(projectId, cat, itemId, attId) {
    await idbDel(attId);
    const projects = state.projects.map((p) => p.id !== projectId ? p :
      { ...p, items: { ...p.items, [cat]: p.items[cat].map((it) => it.id !== itemId ? it : { ...it, attachments: (it.attachments || []).filter((a) => a.id !== attId) }) } });
    await persist({ ...state, projects });
  }
  async function addProject(name) {
    if (!name.trim()) return;
    const projects = [...state.projects, { id: uid(), name: name.trim(), desc: "", items: emptyItems() }];
    await persist({ ...state, projects });
  }
  async function renameProject(projectId, name, desc) {
    const projects = state.projects.map((p) => p.id !== projectId ? p : { ...p, name: name.trim() || p.name, desc: desc.trim() });
    await persist({ ...state, projects });
  }

  if (!unlocked) return <LockScreen mode={gate.mode} onUnlock={handleUnlock} onSetup={handleSetup} />;
  if (!state) return <div style={{ fontFamily: "'Neue Haas Grotesk Display', 'Helvetica Neue', Helvetica, Arial, sans-serif", padding: 60, color: "#000E21", background: "#FFFFFF", minHeight: "100vh", letterSpacing: ".22em", textTransform: "uppercase", fontSize: 12, fontWeight: 500 }}>Opening Locus…</div>;

  const activeProject = state.projects.find((p) => p.id === view);
  const dateLong = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const pillToday = state.pill && state.pill.date === today() ? state.pill : null;
  const q = query.trim().toLowerCase();
  const searchResults = [];
  if (q) for (const p of state.projects) for (const k of CAT_KEYS) for (const it of p.items[k]) {
    if (((it.title || "") + " " + (it.detail || "") + " " + (it.owner || "")).toLowerCase().includes(q)) searchResults.push({ p, k, it });
  }
  const backupAgeDays = state.lastBackupAt ? Math.round((new Date(today() + "T00:00:00") - new Date(state.lastBackupAt + "T00:00:00")) / 86400000) : null;

  return (
    <div className="lx">
      <style>{CSS}</style>
      <aside className="rail">
        <div className="rail-brand"><LocusMark size={38} variant="flat" tone="navy" /><span className="wordmark">L O C U S</span></div>
        <button className={"rail-link " + (view === "inbox" ? "on" : "")} onClick={() => setView("inbox")}>Inbox <span className="rail-hint">drop notes</span></button>
        <button className={"rail-link " + (view === "briefing" ? "on" : "")} onClick={() => setView("briefing")}>Daily briefing</button>
        <div className="rail-section">Search</div>
        <input className="rail-search" value={query} placeholder="Search filed items"
          onChange={(e) => { setQuery(e.target.value); if (e.target.value.trim()) setView("search"); }} />
        <div className="rail-section">Dossiers</div>
        {state.projects.map((p) => {
          const open = CAT_KEYS.reduce((n, k) => n + p.items[k].filter((i) => !i.done).length, 0);
          return (<button key={p.id} className={"rail-link proj " + (view === p.id ? "on" : "")} onClick={() => setView(p.id)}>
            <span className="proj-name">{p.name}</span>{open > 0 && <span className="proj-count">{open}</span>}</button>);
        })}
        <AddProject onAdd={addProject} />
        <div className="rail-section">Export</div>
        <button className="rail-link add report-link" onClick={() => setStatusOpen(true)} title="Download a LOCUS-branded weekly status report">▤ Weekly status report</button>
        <button className="rail-link add" onClick={copyDigest} title="Copy a text digest of everything on file">⧉ Copy portfolio digest</button>
        <button className="rail-link add" onClick={exportData} title="Download a full JSON backup (includes attached files)">↥ Export backup</button>
        <label className="rail-link add" style={{ cursor: "pointer" }} title="Restore from a backup file">↧ Import backup
          <input type="file" accept="application/json,.json" onChange={importData} style={{ display: "none" }} /></label>
      </aside>

      <main className="main">
        {error && <div className="banner err">{error}</div>}
        {filedFlash && <div className="banner ok">{filedFlash}</div>}
        {pendingDelete && <div className="banner undo"><span>Item removed.</span><button className="undo-btn" onClick={undoDelete}>Undo</button></div>}
        {!pendingDelete && !filedFlash && (backupAgeDays === null || backupAgeDays > 7) && (
          <div className="banner info">{backupAgeDays === null ? "0 backups on record." : "Last backup " + state.lastBackupAt + "."} Export one from the rail — this device is the only copy.</div>
        )}

        {view === "inbox" && (
          <section>
            <div className="eyebrow">Inbox · {dateLong}</div>
            <h1>Hand me your notes.</h1>
            <p className="lede">Meeting scraps, voice-note transcripts, half-thoughts — paste them raw, attach any documents, and I'll split them into items, then let you pin each file to the right one.</p>
            <KnowledgePill pill={pillToday} loading={pillBusy} onRetry={retryPill} enabled={!!state.pillEnabled} onToggle={togglePill} />
            <textarea className="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={"e.g.\nDelivered the strategic analysis for Engagement 02 today, attach the doc to the milestone.\nRetainer confirmed at $120k for phase 2, invoice by 20 June.\nAna joins delivery as KOL lead from Monday."} />

            {pendingFiles.length > 0 && (
              <div className="attach-row">
                {pendingFiles.map((f) => (
                  <span className="att" key={f.id}>
                    <span className="att-name">📎 {f.name}</span>
                    <span className="dim att-size">{fmtSize(f.size)}</span>
                    <button className="att-x" onClick={() => removePending(f.id)} title="Remove">✕</button>
                  </span>
                ))}
              </div>
            )}

            <div className="row">
              <button className="btn primary" onClick={triage} disabled={busy || !notes.trim()}>{busy ? "Triaging…" : "Triage notes"}</button>
              <label className="btn file-btn">Attach documents
                <input type="file" multiple onChange={onPickFiles} style={{ display: "none" }} /></label>
              {proposals.length > 0 && <button className="btn" onClick={fileAll} disabled={busy}>File all {proposals.length} item{proposals.length > 1 ? "s" : ""}</button>}
            </div>

            {proposals.length > 0 && (
              <div className="proposals">
                <div className="eyebrow">Proposed filing — adjust anything before you confirm</div>

                {pendingFiles.length > 0 && (
                  <div className="assign">
                    <div className="assign-title">Pin uploaded files to an item</div>
                    {pendingFiles.map((f) => (
                      <div className="assign-row" key={f.id}>
                        <span className="att-name">📎 {f.name} <span className="dim att-size">{fmtSize(f.size)}</span></span>
                        <select value={assign[f.id] || "none"} onChange={(e) => setAssign((a) => ({ ...a, [f.id]: e.target.value }))}>
                          <option value="none">Don't attach</option>
                          {proposals.map((pr) => <option key={pr.id} value={pr.id}>{CATEGORIES[pr.category].label}: {pr.title}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {proposals.map((pr) => {
                  const pinned = pendingFiles.filter((f) => assign[f.id] === pr.id);
                  return (
                    <div key={pr.id} className="card">
                      <div className="card-top">
                        <span className="chip" style={{ color: CATEGORIES[pr.category].color, borderColor: CATEGORIES[pr.category].color }}>{CATEGORIES[pr.category].code}</span>
                        <span className="chip-label">{CATEGORIES[pr.category].label}</span>
                        <span className="card-title">{pr.title}</span>
                        <button className="x" onClick={() => dropProposal(pr.id)} title="Discard">✕</button>
                      </div>
                      <p className="card-detail">{pr.detail}</p>
                      {pr.dupOf && <div className="dup-warn">Possible duplicate of an open item: {pr.dupOf}</div>}
                      {pr.closes && pr.closes.length > 0 && (
                        <div className="closes"><span className="dim">Closes:</span>
                          {pr.closes.map((cid) => { const o = openIdx.find((x) => x.id === cid); return (
                            <span key={cid} className="close-chip">{o ? o.title : cid}
                              <button className="att-x" title="Unlink" onClick={() => updateProposal(pr.id, "closes", pr.closes.filter((c) => c !== cid))}>✕</button>
                            </span>); })}
                        </div>
                      )}
                      <div className="card-meta">
                        <select value={pr.project} onChange={(e) => updateProposal(pr.id, "project", e.target.value)}>
                          {state.projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                          {pr.project.startsWith("NEW:") && <option value={pr.project}>{pr.project}</option>}
                        </select>
                        <select value={pr.category} onChange={(e) => updateProposal(pr.id, "category", e.target.value)}>
                          {CAT_KEYS.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
                        </select>
                        {pr.date && <span className="mono">{pr.date}</span>}
                        {pr.amount && <span className="mono">{pr.amount}</span>}
                        {pr.owner && <span className="mono">{pr.owner}</span>}
                      </div>
                      {pinned.length > 0 && (
                        <div className="attach-row">
                          {pinned.map((f) => <span className="att mini" key={f.id}>📎 {f.name}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {view === "search" && (
          <section>
            <div className="eyebrow">Search</div>
            <h1>Find anything filed.</h1>
            {!q ? <p className="lede">Type in the search box on the left. Title, detail and owner are matched across every dossier.</p>
              : <p className="lede">{searchResults.length} item{searchResults.length === 1 ? "" : "s"} match.</p>}
            {searchResults.slice(0, 50).map(({ p, k, it }) => (
              <div key={it.id} className={"card slim " + (it.done ? "done" : "")}>
                <div className="card-top">
                  <span className="chip" style={{ color: CATEGORIES[k].color, borderColor: CATEGORIES[k].color }}>{CATEGORIES[k].code}</span>
                  <span className="card-title">{it.title}</span>
                  <button className="btn tiny" onClick={() => setView(p.id)}>Open dossier</button>
                </div>
                {it.detail && <p className="card-detail">{it.detail}</p>}
                <div className="card-meta"><span className="mono dim">{p.name}</span><span className="mono dim">filed {it.createdAt}</span>{it.done && <span className="mono dim">done</span>}</div>
              </div>
            ))}
          </section>
        )}
        {view === "briefing" && (
          <section>
            <div className="memo-band"><span>Daily briefing — eyes only</span><span className="mono band-date">{today()}</span></div>
            <KnowledgePill pill={pillToday} loading={pillBusy} onRetry={retryPill} enabled={!!state.pillEnabled} onToggle={togglePill} />
            {!state.briefing ? (
              <div className="empty">
                <h1>No briefing on file.</h1>
                <p className="lede">Generate one from everything currently in your dossiers.</p>
                <button className="btn primary" onClick={generateBriefing} disabled={busy}>{busy ? "Drafting…" : "Generate today's briefing"}</button>
              </div>
            ) : (
              <div className="memo">
                <h1 className="memo-headline">{state.briefing.headline}</h1>
                {state.briefing.builtFrom != null && (
                  <div className="dim built">Built from {state.briefing.builtFrom} open items · generated {state.briefing.generatedAt}{state.briefing.ai === false ? " · assembled without AI" : ""}</div>
                )}
                {state.briefing.today && state.briefing.today.length > 0 && (
                  <div className="memo-sec"><div className="eyebrow">Today</div>
                    {state.briefing.today.map((t, i) => (
                      <div key={i} className="memo-line"><span className="mono dim">{t.when || "today"}</span>
                        <div><strong>{t.item}</strong><div className="dim">{t.project}</div></div></div>
                    ))}</div>
                )}
                {state.briefing.calendar && state.briefing.calendar.length > 0 && (
                  <div className="memo-sec">
                    <div className="eyebrow">Calendar</div>
                    {state.briefing.calendar.map((c, i) => (
                      <div key={i} className="memo-line"><span className="mono">{c.date}</span>
                        <div><strong>{c.item}</strong><div className="dim">{c.project}{c.when ? " — " + c.when : ""}</div></div></div>
                    ))}
                  </div>
                )}
                {state.briefing.priorities && state.briefing.priorities.length > 0 && (
                  <div className="memo-sec"><div className="eyebrow">Priorities</div>
                    {state.briefing.priorities.map((p, i) => (
                      <div key={i} className="memo-line"><span className="mono dim">{String(i + 1).padStart(2, "0")}</span>
                        <div><strong>{p.action}</strong><div className="dim">{p.project}{p.why ? " — " + p.why : ""}</div></div></div>
                    ))}</div>
                )}
                {state.briefing.deadlines && state.briefing.deadlines.length > 0 && (
                  <div className="memo-sec"><div className="eyebrow">Dates that bite</div>
                    {state.briefing.deadlines.map((d, i) => (
                      <div key={i} className="memo-line"><span className="mono">{d.date}</span>
                        <div><strong>{d.item}</strong><div className="dim">{d.project}</div></div></div>
                    ))}</div>
                )}
                {state.briefing.risks && state.briefing.risks.length > 0 && (
                  <div className="memo-sec"><div className="eyebrow" style={{ color: "#BA3189" }}>Open risks</div>
                    {state.briefing.risks.map((r, i) => (
                      <div key={i} className="memo-line"><span className="risk-dot" />
                        <div><strong>{r.risk}</strong><div className="dim">{r.project}</div></div></div>
                    ))}</div>
                )}
                {state.briefing.remindersDue && state.briefing.remindersDue.length > 0 && (
                  <div className="memo-sec">
                    <div className="eyebrow" style={{ color: "#BA3189" }}>Reminders due</div>
                    {state.briefing.remindersDue.map((r, i) => (
                      <div key={i} className="memo-line"><span className="mono">{r.when}</span>
                        <div><strong>{r.item}</strong><div className="dim">{r.project}</div></div></div>
                    ))}
                  </div>
                )}
                {state.briefing.reminders && state.briefing.reminders.length > 0 && (
                  <div className="memo-sec"><div className="eyebrow">Reminders</div>
                    {state.briefing.reminders.map((r, i) => (<div key={i} className="memo-line"><span className="mono dim">→</span><div>{r}</div></div>))}</div>
                )}
                {state.briefing.nudge && <p className="nudge">“{state.briefing.nudge}”</p>}
                <div className="row">
                  <button className="btn primary" onClick={downloadBriefing}>↓ Download briefing</button>
                  <button className="btn" onClick={generateBriefing} disabled={busy}>{busy ? "Drafting…" : "Refresh briefing"}</button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeProject && <DossierView key={activeProject.id} project={activeProject} onUpdate={updateItem}
          onToggle={toggleDone} onDelete={deleteItem} onRename={renameProject}
          onAddAttachment={addAttachment} onRemoveAttachment={removeAttachment} onOpen={openAttachment} onEditFiledDate={editFiledDate} />}
      </main>

      {statusOpen && <StatusModal busy={statusBusy} projects={state.projects} onGenerate={downloadStatus} onClose={() => setStatusOpen(false)} />}
    </div>
  );
}

function DossierView({ project, onToggle, onDelete, onRename, onUpdate, onAddAttachment, onRemoveAttachment, onOpen, onEditFiledDate }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.desc || "");
  const [editDateId, setEditDateId] = useState(null);
  const [editItemId, setEditItemId] = useState(null);
  const [draft, setDraft] = useState(null);
  const save = () => { onRename(project.id, name, desc); setEditing(false); };
  const startEdit = (k, it) => { setEditItemId(it.id); setDraft({ title: it.title, detail: it.detail || "", date: it.date || "", amount: it.amount || "", owner: it.owner || "", category: k }); };
  const cancelEdit = () => { setEditItemId(null); setDraft(null); };
  const saveEdit = (k, it) => {
    onUpdate(project.id, k, it.id, { title: draft.title.trim() || it.title, detail: draft.detail.trim(), date: draft.date || null, amount: draft.amount.trim() || null, owner: draft.owner.trim() || null }, draft.category);
    cancelEdit();
  };
  return (
    <section>
      <div className="eyebrow">Dossier</div>
      {!editing ? (
        <div className="dossier-head"><h1>{project.name}</h1>
          <button className="btn tiny" onClick={() => { setName(project.name); setDesc(project.desc || ""); setEditing(true); }}>Rename / scope</button></div>
      ) : (
        <div className="dossier-edit">
          <input className="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dossier name" autoFocus />
          <textarea className="notes edit-desc" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Scope description. Helps the triage route notes to the right dossier." />
          <div className="row"><button className="btn primary" onClick={save}>Save</button><button className="btn" onClick={() => setEditing(false)}>Cancel</button></div>
        </div>
      )}
      {!editing && project.desc && <p className="lede scope-line">{project.desc}</p>}
      {CAT_KEYS.every((k) => project.items[k].length === 0) ? (
        <p className="lede">Nothing on file yet. Drop notes in the inbox and they'll land here.</p>
      ) : (
        CAT_KEYS.map((k) => project.items[k].length === 0 ? null : (
          <div key={k} className="bucket">
            <div className="eyebrow" style={{ color: CATEGORIES[k].color }}>{CATEGORIES[k].label}</div>
            {project.items[k].map((it) => (
              <div key={it.id} className={"card slim " + (it.done ? "done" : "")}>
                <div className="card-top">
                  <button className={"tick " + (it.done ? "ticked" : "")} onClick={() => onToggle(project.id, k, it.id)} title={it.done ? "Reopen" : "Mark done"}>{it.done ? "✓" : ""}</button>
                  <span className="card-title">{it.title}</span>
                  {editItemId !== it.id && <button className="x" onClick={() => startEdit(k, it)} title="Edit item">✎</button>}
                  <button className="x" onClick={() => onDelete(project.id, k, it.id)} title="Delete">✕</button>
                </div>
                {editItemId === it.id && draft ? (
                  <div className="edit-form">
                    <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
                    <textarea rows={3} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} placeholder="Detail" />
                    <div className="edit-row">
                      <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                        {CAT_KEYS.map((ck) => <option key={ck} value={ck}>{CATEGORIES[ck].label}</option>)}
                      </select>
                      <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                      <input value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="Amount" />
                      <input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="Owner" />
                    </div>
                    <div className="row" style={{ marginTop: 2 }}>
                      <button className="btn tiny primary" onClick={() => saveEdit(k, it)}>Save</button>
                      <button className="btn tiny" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {it.detail && <p className="card-detail">{it.detail}</p>}
                    <div className="card-meta">
                      {it.date && <span className="mono">{it.date}</span>}
                      {it.amount && <span className="mono">{it.amount}</span>}
                      {it.owner && <span className="mono">{it.owner}</span>}
                      {editDateId === it.id ? (
                        <input className="filed-edit" type="date" defaultValue={it.createdAt} max={today()} autoFocus
                          onChange={(e) => { if (e.target.value) onEditFiledDate(project.id, k, it.id, e.target.value); }}
                          onBlur={() => setEditDateId(null)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditDateId(null); }} />
                      ) : (
                        <button className="filed-btn" onClick={() => setEditDateId(it.id)} title="Edit filed date">filed {it.createdAt} <span className="filed-pencil">✎</span></button>
                      )}
                      {it.done && it.completedAt && <span className="mono dim">done {it.completedAt}</span>}
                    </div>
                    <div className="attach-row">
                      {(it.attachments || []).map((a) => (
                        <span className="att" key={a.id}>
                          <button className="att-dl" onClick={() => onOpen(a)} title="Download">📎 {a.name}</button>
                          <span className="dim att-size">{fmtSize(a.size)}</span>
                          <button className="att-x" onClick={() => onRemoveAttachment(project.id, k, it.id, a.id)} title="Remove">✕</button>
                        </span>
                      ))}
                      <label className="att-add" title="Attach a file to this item">+ file
                        <input type="file" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onAddAttachment(project.id, k, it.id, f); e.target.value = ""; }} style={{ display: "none" }} />
                      </label>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}

function AddProject({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) return <button className="rail-link add" onClick={() => setOpen(true)}>+ New dossier</button>;
  return (
    <div className="rail-add">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { onAdd(name); setName(""); setOpen(false); } if (e.key === "Escape") setOpen(false); }}
        placeholder="Project name" />
      <button className="btn tiny" onClick={() => { onAdd(name); setName(""); setOpen(false); }}>Add</button>
    </div>
  );
}

const CSS = `
:root { --navy:#000E21; --navy-deep:#050D1A; --magenta:#BA3189; --magenta-deep:#80225F; --cool:#8A95A5; --mid:#C5CDD9; --paper:#F7F8FA; --white:#FFFFFF; --ink:#000E21; --body:#4A5566; }
.lx { display:flex; min-height:100vh; background:var(--white); color:var(--ink); font-family:'Neue Haas Grotesk Display','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.55; font-weight:400; }
.lx * { box-sizing:border-box; }
.lx button { font-family:inherit; cursor:pointer; }
.rail { width:256px; flex-shrink:0; background:var(--paper); border-right:1px solid var(--mid); padding:28px 16px 32px; display:flex; flex-direction:column; gap:2px; }
.rail-brand { display:flex; flex-direction:column; align-items:flex-start; gap:12px; margin:0 0 30px; padding:0 10px; }
.wordmark { font-weight:300; font-size:17px; letter-spacing:.45em; color:var(--ink); text-indent:.1em; }
.rail-link { display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%; text-align:left; background:none; border:none; border-radius:3px; color:var(--body); padding:9px 10px; font-size:14px; font-weight:400; letter-spacing:0; transition:background .16s ease, color .16s ease; }
.rail-link:hover { background:#EEF1F5; color:var(--ink); }
.rail-link.on { background:var(--navy); color:#fff; font-weight:500; }
.rail-hint { font-size:11px; opacity:.5; letter-spacing:.02em; }
.rail-section { font-size:10.5px; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:var(--cool); margin:26px 10px 8px; }
.proj-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.proj-count { font-size:11px; color:var(--body); border:1px solid var(--mid); border-radius:3px; padding:0 7px; flex-shrink:0; background:var(--white); }
.rail-link.on .proj-count { background:rgba(255,255,255,.16); border-color:transparent; color:#fff; }
.rail-link.add { color:var(--cool); margin-top:2px; }
.report-link { color:var(--ink); font-weight:500; }
.report-link:hover { background:#EEF1F5; }
.rail-add { display:flex; gap:6px; padding:6px 8px; }
.rail-add input { flex:1; min-width:0; background:var(--white); border:1px solid var(--mid); color:var(--ink); border-radius:3px; padding:6px 9px; font-size:13px; font-family:inherit; }
.main { flex:1; padding:44px 56px 90px; max-width:900px; }
h1 { font-weight:700; font-size:30px; letter-spacing:-.01em; margin:8px 0 12px; color:var(--ink); }
.eyebrow { font-size:10.5px; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:var(--cool); }
.lede { color:var(--body); max-width:62ch; margin:0 0 20px; font-weight:400; font-size:15.5px; }
.row { display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; }
.btn { font-weight:500; font-size:13.5px; letter-spacing:0; text-transform:none; border:1px solid var(--mid); background:var(--white); color:var(--ink); padding:11px 20px; border-radius:3px; transition:border-color .16s ease, background .16s ease; display:inline-flex; align-items:center; }
.btn:hover { border-color:var(--navy); }
.btn.primary { background:var(--navy); border-color:var(--navy); color:#fff; }
.btn.primary:hover { background:#0B1B33; border-color:#0B1B33; }
.btn:disabled { opacity:.4; cursor:default; }
.btn.tiny { padding:6px 12px; font-size:12px; }
.file-btn { cursor:pointer; }
.notes { width:100%; min-height:175px; resize:vertical; border:1px solid var(--mid); border-radius:3px; background:var(--white); padding:16px 18px; font:inherit; font-weight:400; color:inherit; }
.notes::placeholder { color:#AAB2BE; }
.notes:focus { outline:1.5px solid var(--navy); outline-offset:-1px; }
.banner { padding:11px 16px; border-radius:3px; margin-bottom:20px; font-size:13.5px; border:1px solid; }
.banner.err { background:#FBEFF6; color:var(--magenta-deep); border-color:#E7C4DB; }
.banner.ok { background:#EEF1F5; color:var(--ink); border-color:var(--mid); }
.pill { position:relative; background:var(--white); border:1px solid var(--mid); border-radius:3px; padding:18px 22px; margin:0 0 24px; max-width:640px; }
.pill-head { display:flex; justify-content:space-between; align-items:baseline; gap:14px; flex-wrap:wrap; margin-bottom:10px; }
.pill-eyebrow { font-size:10px; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:var(--cool); }
.pill-source { font-size:11px; letter-spacing:.02em; color:var(--body); }
.pill-principle { margin:0; font-size:16.5px; font-weight:500; line-height:1.45; color:var(--ink); }
.pill-why { margin:8px 0 0; font-weight:400; font-size:14px; color:var(--body); }
.pill-question { margin:12px 0 0; font-size:14px; font-style:italic; color:var(--ink); display:flex; gap:8px; }
.pill-arrow { font-style:normal; color:var(--cool); flex-shrink:0; }
.pill-retry { background:none; border:none; padding:0; color:var(--ink); text-decoration:underline; font:inherit; font-size:inherit; cursor:pointer; }
.proposals { margin-top:30px; display:flex; flex-direction:column; gap:12px; }
.assign { background:var(--paper); border:1px solid var(--mid); border-radius:3px; padding:14px 16px; margin-top:8px; }
.assign-title { font-size:13px; font-weight:500; color:var(--ink); margin-bottom:10px; }
.assign-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:6px 0; border-top:1px solid var(--mid); }
.assign-row:first-of-type { border-top:none; }
.assign-row select { font-family:inherit; font-size:12.5px; border:1px solid var(--mid); border-radius:3px; padding:5px 8px; background:var(--white); color:var(--ink); max-width:300px; }
.card { background:var(--white); border:1px solid var(--mid); border-radius:3px; padding:16px 18px; margin-top:10px; box-shadow:0 1px 2px rgba(0,14,33,.04); }
.card.slim { margin-top:8px; }
.card.done { opacity:.45; }
.card-top { display:flex; align-items:center; gap:10px; }
.card-title { font-weight:500; flex:1; letter-spacing:0; }
.card-detail { margin:7px 0 0; color:var(--body); font-weight:400; }
.card-meta { display:flex; flex-wrap:wrap; gap:12px; margin-top:10px; align-items:center; }
.card-meta select { font-family:inherit; font-size:12.5px; border:1px solid var(--mid); border-radius:3px; padding:4px 7px; background:var(--paper); color:var(--ink); max-width:250px; }
.chip { font-size:10px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; background:transparent; border:1px solid; padding:2px 6px; border-radius:2px; flex-shrink:0; }
.chip-label { font-size:11px; font-weight:500; letter-spacing:.14em; text-transform:uppercase; color:var(--cool); flex-shrink:0; }
.mono { font-size:12px; letter-spacing:.01em; color:var(--body); }
.dim { color:var(--cool); }
.filed-btn { font-size:12px; color:var(--cool); background:none; border:none; padding:0; cursor:pointer; border-bottom:1px dotted var(--mid); line-height:1.3; }
.filed-btn:hover { color:var(--navy); border-bottom-color:var(--navy); }
.filed-pencil { opacity:.5; font-size:10px; }
.filed-btn:hover .filed-pencil { opacity:1; }
.filed-edit { font-size:12px; border:1px solid var(--navy); border-radius:3px; padding:2px 6px; background:var(--white); color:var(--ink); font-family:inherit; }
.x { background:none; border:none; color:#AAB2BE; font-size:13px; padding:2px 4px; cursor:pointer; }
.x:hover { color:var(--navy); }
.tick { width:21px; height:21px; flex-shrink:0; border:1.5px solid var(--mid); border-radius:50%; background:var(--white); font-size:11px; line-height:1; color:var(--navy); cursor:pointer; }
.tick.ticked { background:#EEF1F5; border-color:var(--navy); }
.bucket { margin-top:30px; border-top:1px solid var(--mid); padding-top:18px; }
.attach-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:11px; align-items:center; }
.att { display:inline-flex; align-items:center; gap:7px; background:var(--paper); border:1px solid var(--mid); border-radius:3px; padding:4px 8px 4px 11px; font-size:12.5px; color:var(--ink); max-width:100%; }
.att.mini { background:#EEF1F5; padding:3px 10px; }
.att-name { font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:240px; }
.att-size { font-size:11px; }
.att-dl { background:none; border:none; padding:0; font:inherit; font-size:12.5px; color:var(--navy); cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:240px; }
.att-dl:hover { text-decoration:underline; }
.att-x { background:none; border:none; color:#AAB2BE; font-size:12px; padding:0 2px; cursor:pointer; line-height:1; }
.att-x:hover { color:var(--navy); }
.att-add { display:inline-flex; align-items:center; gap:4px; cursor:pointer; font-size:12px; color:var(--body); border:1px dashed var(--mid); border-radius:3px; padding:4px 11px; }
.att-add:hover { border-color:var(--navy); color:var(--navy); }
.dossier-head { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.dossier-head h1 { margin-bottom:8px; }
.scope-line { margin-top:0; }
.dossier-edit { margin-top:14px; max-width:560px; }
.edit-name { width:100%; border:1px solid var(--mid); border-radius:3px; background:var(--white); padding:12px 16px; font:inherit; font-size:18px; font-weight:700; color:var(--ink); margin-bottom:10px; }
.edit-desc { min-height:90px; }
.memo-band { display:flex; justify-content:space-between; align-items:center; background:var(--navy); color:#fff; font-weight:400; font-size:12px; letter-spacing:.22em; text-transform:uppercase; padding:13px 20px; border-radius:3px; margin-bottom:30px; }
.band-date { color:rgba(255,255,255,.7); letter-spacing:.04em; }
.memo-headline { font-size:28px; font-weight:700; max-width:32ch; line-height:1.32; letter-spacing:-.01em; }
.memo-sec { margin-top:30px; border-top:1px solid var(--mid); padding-top:18px; }
.memo-line { display:flex; gap:14px; margin-top:13px; align-items:baseline; }
.memo-line strong { font-weight:500; }
.risk-dot { width:8px; height:8px; border-radius:50%; background:var(--magenta); flex-shrink:0; position:relative; top:5px; }
.nudge { margin-top:34px; font-style:italic; font-weight:400; color:var(--body); border-top:1px solid var(--mid); padding-top:16px; max-width:56ch; }
.empty { margin-top:32px; }
.memo .btn { margin-top:38px; }
.modal-bg { position:fixed; inset:0; background:rgba(0,14,33,.5); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50; }
.modal { background:var(--white); border:1px solid var(--mid); border-radius:4px; padding:26px 26px 22px; width:min(420px, 94vw); box-shadow:0 18px 50px rgba(0,14,33,.28); }
.modal-h { font-weight:700; font-size:21px; margin:6px 0 18px; letter-spacing:-.01em; }
.modal-opts { display:flex; flex-direction:column; gap:8px; }
.modal-opt { text-align:left; background:var(--white); border:1px solid var(--mid); border-radius:3px; padding:11px 14px; font:inherit; font-size:14px; color:var(--ink); cursor:pointer; }
.modal-opt:hover { border-color:var(--navy); }
.modal-opt.on { background:var(--navy); color:#fff; border-color:var(--navy); }
.modal-date { margin-top:10px; width:100%; border:1px solid var(--mid); border-radius:3px; background:var(--white); padding:10px 12px; font:inherit; font-size:14px; color:var(--ink); }
.modal-row { display:flex; gap:10px; margin-top:18px; }
.modal-note { margin-top:14px; font-size:12px; font-weight:400; color:var(--cool); line-height:1.5; }
.lock { min-height:100vh; background:var(--white); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:40px 20px; font-family:'Neue Haas Grotesk Display','Helvetica Neue',Helvetica,Arial,sans-serif; color:var(--ink); }
.lock-mark { font-size:21px; margin-top:8px; }
.lock-tag { font-size:14px; font-weight:400; color:var(--body); margin-top:2px; text-align:center; }
.mag { color:var(--magenta); }
.lock-sub { font-size:11px; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:var(--cool); margin:12px 0 6px; text-align:center; }
.lock-input { width:min(300px, 80vw); text-align:center; border:1px solid var(--mid); border-radius:3px; background:var(--white); padding:12px 18px; font:inherit; font-size:15px; letter-spacing:.2em; color:var(--ink); }
.lock-input:focus { outline:1.5px solid var(--navy); outline-offset:-1px; }
.lock-err { font-size:13px; color:var(--magenta-deep); letter-spacing:.02em; text-align:center; max-width:300px; }
.banner.info { background:#F7F8FA; color:#4A5566; border-color:#C5CDD9; }
.banner.undo { display:flex; justify-content:space-between; align-items:center; background:#F7F8FA; color:#000E21; border-color:#C5CDD9; }
.undo-btn { background:none; border:1px solid #C5CDD9; border-radius:3px; padding:4px 14px; font:inherit; font-size:12.5px; cursor:pointer; color:#000E21; }
.undo-btn:hover { border-color:#000E21; }
.rail-search { display:block; margin:2px 10px 6px; padding:7px 10px; border:1px solid var(--mid); border-radius:3px; font:inherit; font-size:13px; background:var(--white); color:var(--ink); width:calc(100% - 20px); }
.rail-search:focus { outline:none; border-color:var(--ink); }
.dup-warn { margin-top:8px; font-size:12px; color:#8F2569; }
.closes { margin-top:8px; display:flex; flex-wrap:wrap; gap:6px; font-size:12px; color:var(--body); align-items:center; }
.close-chip { display:inline-flex; gap:6px; align-items:center; border:1px solid var(--mid); border-radius:3px; padding:2px 8px; background:var(--paper); }
.edit-form { margin-top:10px; display:flex; flex-direction:column; gap:8px; }
.edit-form input, .edit-form textarea, .edit-form select { font:inherit; font-size:13.5px; border:1px solid var(--mid); border-radius:3px; padding:7px 10px; background:var(--white); color:var(--ink); }
.edit-form input:focus, .edit-form textarea:focus, .edit-form select:focus { outline:none; border-color:var(--ink); }
.edit-row { display:flex; gap:8px; flex-wrap:wrap; }
.edit-row > * { flex:1 1 120px; min-width:110px; }
.built { font-size:12px; margin:-14px 0 18px; }
.pill-toggle { background:none; border:none; padding:0; color:var(--cool); text-decoration:underline; font:inherit; font-size:11px; cursor:pointer; }
.pill-toggle:hover { color:var(--ink); }
.modal-checks { display:flex; flex-direction:column; gap:7px; margin-top:12px; max-height:170px; overflow:auto; }
.modal-check { display:flex; gap:9px; align-items:center; font-size:13.5px; color:var(--ink); cursor:pointer; }
.modal-check input { accent-color:#000E21; }
.lock-note { font-size:12px; color:var(--cool); max-width:340px; text-align:center; line-height:1.55; }
@media (max-width:760px){
  .lx { flex-direction:column; }
  .rail { width:100%; flex-direction:row; flex-wrap:wrap; align-items:center; padding:14px; border-right:none; border-bottom:1px solid var(--mid); }
  .rail-brand { flex-direction:row; align-items:center; margin:0 12px 0 0; gap:10px; }
  .wordmark { font-size:14px; }
  .rail-section { display:none; }
  .main { padding:26px 20px 70px; }
}
`;
