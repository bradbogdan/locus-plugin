---
name: locus-briefing
description: "Generates the Locus daily briefing from the workspace dossiers. Reads every Locus/dossiers/*.md file, computes recent activity, dated items with relative dates and last-7-day completions, produces the briefing JSON per the HEADLINE RULE, renders a short chat version, and writes a Locus-branded HTML file to Locus/briefings/. Triggers when the user asks to 'brief me', for their 'daily briefing', the 'Locus briefing', a 'morning read', 'what needs me today', or 'what is on my plate'."
---

# Locus daily briefing

Read the state on file, decide what actually matters today, and hand back one composed briefing: a short chat read and a Locus-branded HTML document. The briefing is internal, eyes only. Write as if the reader is the principal and no one else will ever see it.

Hold the Locus voice for the whole run: direct, composed, senior. Numbers before adjectives. Sentence case. No emoji. No exclamation marks. No greetings. No congratulation. Name the decision, the owner, the date. If something is a risk, call it a risk.

Load `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/brand.md` (voice, 60/30/10 colour, magenta means a decision is needed), `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/data-convention.md` (dossier format), `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/prompts.md` (the daily-briefing template, section 3), and `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/taxonomy.md` (the ten category labels and their two-letter codes) before you build anything.

## Step 1: Read the workspace

Find the `Locus/` folder in the current working directory. Read `Locus/config.md` and take `principal_role`; that string is `{{PRINCIPAL_ROLE}}`. If config is missing or the role is blank, use `the principal` and note it once in chat.

Read every file matching `Locus/dossiers/*.md`. If the folder is absent or empty, tell the user Locus is not set up yet and stop.

## Step 2: Parse each dossier

Per `data-convention.md`:

- Frontmatter gives `name` (exact display name) and `scope`.
- Each `## <Category label>` section holds task bullets. Map the label to its code via `taxonomy.md`: Status update ST, Milestone MI, Deliverable DE, Timeline TL, Budget BU, Risk RI, Opportunity OP, Person PE, Reminder RE, Goal GO.
- Item grammar: `- [ ] <title> — <detail>  ` then a backtick block `[date: ... | amount: ... | owner: ... | filed: ... | done: ...]`. `- [ ]` is open, `- [x]` is done. `filed` is always present; `date`, `amount`, `owner`, `done` appear only when set. Detail is optional (no em dash when absent).

Build a row per item: `{ project, label, code, title, detail, date, filed, done_date, is_done }`.

## Step 3: Compute the derived inputs

Resolve `TODAY` as the current date in `YYYY-MM-DD`. For any date `d`, let `dDiff(d)` be whole days from today (`d` minus today). Relative label `rel(d)`: `0` is `today`, negative is `<n>d overdue`, positive is `in <n>d`.

Split rows into open (`is_done` false) and done. Then assemble four blocks, exactly as the app does:

- **RECENT ACTIVITY**: the 10 most recently filed open rows, sorted by `filed` descending. One line each: `filed <filed> · [<label>] <project> — <title>: <detail>`. Fallback when none: `(nothing filed yet)`.
- **DATED ITEMS**: open rows that carry a `date`, sorted by date ascending. One line each: `<date> (<rel>) · [<label>] <project> — <title>`. Fallback: `(nothing dated)`.
- **RECENTLY COMPLETED**: done rows whose `done_date` is within the last 7 days (`dDiff(done_date) >= -7`), sorted by `done_date` descending. One line each: `done <done_date> · <project> — <title>`. Fallback: `(none)`.
- **PORTFOLIO SNAPSHOT**: per project with any open items, a `## <name>` header, a `Scope: <scope>` line when scope is set, then up to 6 open rows per category as: `<label>: <title> · dated <date> · filed <filed> [<amount>] — <owner> :: <detail>` (drop the parts that are null). Fallback: `(empty)`.

Let `builtFrom` be the count of open rows.

## Step 4: Produce the briefing JSON

Apply the daily-briefing template from `prompts.md` section 3, filling `{{PRINCIPAL_ROLE}}`, `{{TODAY}}`, `{{RECENT_ACTIVITY}}`, `{{DATED_ITEMS}}`, `{{RECENTLY_COMPLETED}}`, `{{PORTFOLIO_SNAPSHOT}}`. Reason as the chief of staff and return only this JSON shape:

```json
{"headline":"...","today":[{"project":"...","item":"...","when":"today | in Nd | filed YYYY-MM-DD"}],"priorities":[{"project":"...","action":"...","why":"..."}],"deadlines":[{"project":"...","item":"...","date":"YYYY-MM-DD"}],"risks":[{"project":"...","risk":"..."}],"reminders":["..."],"nudge":"..."}
```

Obey the rules exactly:

- **HEADLINE RULE**: lead with the single most recent or most consequential development from RECENT ACTIVITY. Name the project and state what happened or what it now forces. Not a generic portfolio summary.
- `today`: max 4, only genuinely current items (dated today, due within 2 days, or filed in the last 2 days). Empty array if none.
- `priorities`: max 5. `action` imperative, max 15 words. `why` max 12 words.
- `deadlines`: dates that bite (overdue or within 7 days), max 5.
- `risks`: max 4, `risk` max 15 words.
- `reminders`: max 5 short imperatives.
- `nudge`: one honest sentence of chief-of-staff counsel. No celebration.

Treat RECENTLY COMPLETED as momentum only. Do not celebrate it.

If nothing is on file, set `headline` to `Nothing on file. Drop notes in the inbox.`, all arrays empty, and a plain one-line `nudge`.

## Step 5: Short chat version

Render the briefing tersely in chat, Locus voice. Lead with the headline. Then, only for the arrays that carry items: Today, Top priorities, Dates that bite, Open risks, Reminders, and the nudge. Keep it scannable, no tables required, no filler. Say `builtFrom` once as a quiet line (`Built from N open items`).

## Step 6: Write the branded HTML

Write `Locus/briefings/LOCUS-daily-briefing-<TODAY>.html`, self-contained. Replicate the app's `buildBriefingHTML` exactly: a light `#F7F8FA` body with a navy `#000E21` header band. Do not use a full-navy body. Magenta appears only on risk chips.

Let `GEN` = `TODAY`. HTML-escape every dynamic string before insertion: replace `&` with `&amp;`, then `<` with `&lt;`, then `>` with `&gt;`. Escaping applies to headline, titles, metas, reminders, and the nudge.

**Item builder** `chipItem(chipText, chipColor, title, meta)`:

```
<div class="r-item"><div class="r-item-top"><span class="r-chip" style="color:CHIPCOLOR;border-color:CHIPCOLOR">CHIPTEXT</span><span class="r-title">TITLE</span></div><div class="r-meta">META</div></div>
```

Omit the `r-chip` span when `chipText` is empty. Omit the `r-meta` div when `meta` is empty.

**Section builder** `section(label, inner, cls)`: when `inner` is empty, emit nothing. Otherwise:

```
<div class="r-sec"><div class="r-sec-h CLS">LABEL</div>INNER</div>
```

Append ` risk` to the `r-sec-h` class (the `CLS` slot) only for Open risks. Leave it off everywhere else.

**Rows into chips:**

- Today: for each `t`, `chipItem(t.when || "today", "#000E21", t.item, esc(t.project))`.
- Top priorities: for each `p` at index `i`, `chipItem(<i+1 as two digits: 01, 02, ...>, "#000E21", p.action, [esc(p.project), esc(p.why)] joined with " &middot; ")`.
- Dates that bite: for each `d`, `chipItem(d.date || "—", "#000E21", d.item, esc(d.project))`.
- Open risks: for each `r`, `chipItem("RI", "#BA3189", r.risk, esc(r.project))`.
- Reminders: for each `r`, `<div class="r-item"><div class="r-item-top"><span class="r-title">&rarr; REMINDER</span></div></div>`.

**Body**, in this exact order (Calendar and Reminders-due are the app's deterministic date sections; this skill leaves them empty, so their `section()` calls emit nothing and only the six sections below render):

1. If headline set: `<div class="r-summary" style="font-size:17px;font-weight:500">HEADLINE</div>`
2. If `builtFrom` set: `<div class="r-gen" style="margin:0 0 14px">Built from BUILTFROM open items</div>`
3. `section("Today", todayItems)`
4. `section("Calendar", "")`
5. `section("Top priorities", priorities)`
6. `section("Dates that bite", deadlines)`
7. `section("Open risks", risks, "risk")`
8. `section("Reminders due", "", "risk")`
9. `section("Reminders", reminders)`
10. If nudge set: `<div class="r-sec"><div class="r-sec-h">Chief-of-staff nudge</div><p class="r-detail" style="font-style:italic;font-size:14.5px">&ldquo;NUDGE&rdquo;</p></div>`

**Document shell** (emit verbatim, substituting `GEN`, `REPORT_CSS`, `REPORT_ORB`, and `BODY`):

```
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LOCUS Daily Briefing — GEN</title><style>REPORT_CSS</style></head><body><header class="r-head">REPORT_ORB<div class="r-brand">L O C U S</div><div class="r-kicker">Daily Briefing</div><div class="r-stamp">Internal — eyes only</div><div class="r-gen">Generated GEN</div></header><main class="r-main"><section class="r-proj" style="border-top:none;padding-top:0">BODY</section></main><footer class="r-foot">LOCUS &middot; private chief-of-staff workspace &middot; GEN</footer></body></html>
```

The confidentiality stamp is the source string `Internal — eyes only` with an em dash. Copy it verbatim. Source fidelity wins over the workspace no-em-dash rule; do not swap the em dash.

`REPORT_ORB` (paste exactly):

```
<svg width="44" height="44" viewBox="0 0 100 100"><defs><radialGradient id="lrg" cx="50%" cy="50%" r="62%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="42%" stop-color="#E6EAF0"/><stop offset="76%" stop-color="#9AA6BC" stop-opacity="0.5"/><stop offset="100%" stop-color="#000E21" stop-opacity="0"/></radialGradient></defs><path d="M50 50 L83.05 18 A46 46 0 1 1 50 4 Z" fill="url(#lrg)"/><circle cx="50" cy="50" r="8" fill="#BA3189"/></svg>
```

`REPORT_CSS` (paste exactly inside the `<style>` tag):

```
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
```

## Step 7: Report back

Tell the user the briefing is filed, name the HTML path, and state `builtFrom`. Keep it to a line or two. Do not restate the whole briefing; the chat version above already carried it.
