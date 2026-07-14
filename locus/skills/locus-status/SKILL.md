---
name: locus-status
description: Compiles a LOCUS-branded internal weekly status report from the desk-mode dossiers over a chosen window. Use when the principal asks for a "weekly status", "status report", "weekly review", "LOCUS status", "compile a status report", or "what got done and what is open" across recent days. Asks for the window (last 7, 14, or 30 days, or since a given date) and an optional dossier subset, selects items filed or completed inside the window, writes ONE terse status paragraph per project, and produces a self-contained HTML report at Locus/reports/LOCUS-weekly-status-(today).html.
---

# Locus weekly status report

Compile an internal weekly status report from the dossiers in the `Locus/`
workspace. The report is white-led, navy-masthead, and eyes-only. It states what
completed in the window, what is still logged or open, and reads as if the
principal is the only person who will ever see it. Hold the Locus voice: no
emoji, no exclamation marks, no congratulation, numbers before adjectives.

This report replicates the app's `buildStatusHTML`. Reproduce the structure,
class names, CSS, and the orb mark exactly as written below. The confidentiality
stamp is verbatim `Internal — eyes only` with an em dash; keep it exactly, source
fidelity outranks any house rule against em dashes.

Shared references (read if you need the detail):
`${CLAUDE_PLUGIN_ROOT}/skills/locus/references/prompts.md` (status prompt),
`${CLAUDE_PLUGIN_ROOT}/skills/locus/references/brand.md` (voice, colour, codes),
`${CLAUDE_PLUGIN_ROOT}/skills/locus/references/data-convention.md` (dossier grammar).

## Step 1: Locate the workspace

Find `Locus/` in the current working directory. If it is missing, stop and tell
the principal to run setup first. Read `Locus/config.md` and note
`principal_role`; it feeds the summary prompt as the role you write for. If the
key is absent, fall back to "the principal".

## Step 2: Ask the window and the dossier subset

Resolve `today` as `YYYY-MM-DD`. Ask two things in one turn:

1. The window. Offer: last 7 days, last 14 days, last 30 days, or since a date I
   choose. Default is last 7 days.
2. The dossiers to include. Default is all of them. Accept an explicit subset.

Compute:
- For "last N days": `startDate` = the date N days before today; `windowLabel` =
  `Last N days`.
- For a chosen date D: `startDate` = D; `windowLabel` = `Since D`.

`end` = today.

## Step 3: Read the dossiers and select in-window items

Read every `Locus/dossiers/<slug>.md` in scope. Parse per the data-convention:
each item line carries a title, an optional detail after ` — `, and a backtick
metadata block with `date`, `amount`, `owner`, `filed`, and (for done items)
`done`. The category is the `## <label>` section the item sits under. Map labels
to codes: Status update ST, Milestone MI, Deliverable DE, Timeline TL, Budget BU,
Risk RI, Opportunity OP, Person PE, Reminder RE, Goal GO.

For each in-scope dossier, split its items:

- **Completed this period**: a done item (`- [x]`) whose `done` date is on or
  after `startDate`. Keep its own category. Collect these in category order
  (Status update through Goal), file order within a category.
- **Logged / in progress**: an open item (`- [ ]`) whose `filed` date is on or
  after `startDate`. Group these by category.

Date comparison is a plain string compare of `YYYY-MM-DD`; on-or-after means
`value >= startDate`. Ignore done items outside the window and open items filed
before the window. An item with a null/absent relevant date does not qualify.

A dossier is **active** if it has at least one completed or one open in-window
item. Skip dossiers with zero. `itemCount` = the total completed plus open
in-window items across all active dossiers.

If no dossier is active, stop and report, verbatim: `No activity in that window —
nothing was filed or completed in the selected period.` Do not write a file.

## Step 4: Write one status paragraph per active dossier

For each active dossier, write ONE terse internal status paragraph of 2 to 3
sentences: what completed this period, what is open or at risk, and the immediate
next focus. Internal voice, no greetings, no headers inside the paragraph. This
is the status prompt from prompts.md; you are the chief of staff to
`principal_role` and the period is `startDate` to `today`.

Build the per-project input as the app does, one block per active dossier:

```
### <project name>
DONE [<Category label>] <title>: <detail>
OPEN [<Category label>] <title>: <detail>
```

One `DONE` line per completed in-window item (category order), one `OPEN` line
per open in-window item (category order). Omit `: <detail>` when detail is empty.
Write the paragraphs from these blocks, keyed by exact project name.

**Deterministic fallback.** The report must still build if this summary step is
skipped or fails. If the principal declines summaries, or you cannot produce
them, omit the summary paragraph for the affected projects and keep the full item
listing. A project with no summary simply drops its `<p class="r-summary">`
element. The report is never blocked on the summary.

## Step 5: Build the HTML

Assemble one self-contained HTML document. Escape every interpolated value:
replace `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;`. Emit these HTML
entities literally where shown: `&middot;` (middot separator), `&rarr;` (range
arrow).

### Item element

For each item, `COLOR` is `#BA3189` for a Risk (RI) and `#000E21` for every other
code. Magenta appears only on RI. Build the meta list in this order, dropping any
absent value: the item `date`, the `amount`, the `owner`, then `filed ` plus the
`filed` date, and for completed items `done ` plus the `done` date. Join meta with
` &middot; `.

```
<div class="r-item"><div class="r-item-top"><span class="r-chip" style="color:COLOR;border-color:COLOR">CODE</span><span class="r-title">TITLE</span></div>DETAIL_DIV META_DIV</div>
```

`DETAIL_DIV` is `<div class="r-detail">DETAIL</div>` when detail is present, else
empty. `META_DIV` is `<div class="r-meta">META</div>` when meta is non-empty, else
empty. Desk dossiers carry no attachments, so emit no `r-att`.

### Project section

For each active dossier, in the order you selected them:

```
<section class="r-proj"><h2>NAME</h2>SCOPE_DIV SUMMARY_P COMPLETED_BLOCK OPEN_BLOCK</section>
```

- `SCOPE_DIV` = `<div class="r-scope">SCOPE</div>` if the dossier `scope` is
  non-empty, else empty.
- `SUMMARY_P` = `<p class="r-summary">SUMMARY</p>` if a summary exists for this
  project, else empty.
- `COMPLETED_BLOCK`, only if there is at least one completed item (N = count):
  `<div class="r-sec"><div class="r-sec-h done">Completed this period (N)</div>ITEMS</div>`
  where ITEMS is the completed items in category order.
- `OPEN_BLOCK`, only if there is at least one open item:
  `<div class="r-sec"><div class="r-sec-h">Logged / in progress</div>ITEMS</div>`
  where ITEMS is the open items concatenated in category order (Status update
  through Goal).

### Document shell

Concatenate the sections into `PROJHTML`, then wrap:

```
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LOCUS Weekly Status — END</title><style>REPORT_CSS</style></head><body><header class="r-head">REPORT_ORB<div class="r-brand">L O C U S</div><div class="r-kicker">Weekly Status Report</div><div class="r-stamp">Internal — eyes only</div><div class="r-range">WINDOWLABEL &middot; STARTDATE &rarr; END</div><div class="r-gen">Generated END &middot; built from ITEMCOUNT items</div></header><main class="r-main">PROJHTML</main><footer class="r-foot">LOCUS &middot; private chief-of-staff workspace &middot; END</footer></body></html>
```

`END` is today, `WINDOWLABEL` and `STARTDATE` from Step 2, `ITEMCOUNT` from Step
3. The title uses an em dash. The stamp is exactly `Internal — eyes only`.

`REPORT_CSS` is this block, verbatim:

```css
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

`REPORT_ORB` is this markup, verbatim (a 44px graded field with the fixed
V-stroke path and the magenta centre period):

```html
<svg width="44" height="44" viewBox="0 0 100 100"><defs><radialGradient id="lrg" cx="50%" cy="50%" r="62%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="42%" stop-color="#E6EAF0"/><stop offset="76%" stop-color="#9AA6BC" stop-opacity="0.5"/><stop offset="100%" stop-color="#000E21" stop-opacity="0"/></radialGradient></defs><path d="M50 50 L83.05 18 A46 46 0 1 1 50 4 Z" fill="url(#lrg)"/><circle cx="50" cy="50" r="8" fill="#BA3189"/></svg>
```

Do not alter the orb path, the radial stops, the class names, or any hex value.
Do not add fonts; the family is referenced by name only.

## Step 6: Write the file

Create `Locus/reports/` if it does not exist. Write the document to
`Locus/reports/LOCUS-weekly-status-<today>.html`. Overwrite if a same-day report
already exists.

## Step 7: Return the manifest

Report back, terse, in Locus voice:

- Output path: `Locus/reports/LOCUS-weekly-status-<today>.html`.
- Window: `windowLabel`, `startDate` to `end`.
- Dossiers included: count and names of the active dossiers (and note any
  selected dossier that had no activity and was dropped).
- Items: `itemCount` total, split as completed and open.
- Summaries: whether AI status paragraphs were written or the deterministic
  fallback was used.

Do not send, publish, or share the file; it is internal and eyes-only. Offer the
path and stop.
