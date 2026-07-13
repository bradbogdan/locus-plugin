---
name: locus-pill
description: Renders the Locus daily knowledge pill for the principal, one principle drawn from the 31-book canon, why it matters in exactly two sentences, and one sharp question aimed at a live dossier, capped at 150 words and cached for the day so a second call returns the identical card. Runs only when the pill is enabled in the workspace. Use when the principal says locus pill, todays pill, daily knowledge pill, give me the pill, draft the pill, or asks for the day's knowledge card.
---

# Locus daily knowledge pill

Distil one durable idea and put it in front of the principal. One book, one principle stated as a decision rule, two sentences on why it bites, one question aimed at a named live engagement. The source rotates deterministically by the date, so the same book lands on the same day for everyone and the corpus advances one step each day. Write the card as the model the app calls, then file it so today's call is free.

Shared references (read the ones you need first):

- Canon: `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/canon.md` (the 31 sources, numbered 1 to 31)
- Prompt template: `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/prompts.md` (section 1, `generatePill`)
- Data convention: `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/data-convention.md` (config keys, `pill_cache`, file layout)
- Brand and voice: `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/brand.md` (voice, colour discipline)

## Preconditions (gate)

1. Resolve the workspace root: a `Locus/` folder in the current working directory. If it does not exist, tell the principal to run setup first (say "set up locus") and stop.
2. Read `Locus/config.md`. Read `pill_enabled`. If it is absent or not `true`, do not generate anything. Mirror the app's off state: state that the daily knowledge pill is off, that turning it on is one line (`pill_enabled: true` in `Locus/config.md`), and stop. The pill only acts when `pill_enabled` is true.
3. Also read `principal_role` from `Locus/config.md`. This is the configured seat the pill serves and replaces the app persona. If it is missing, proceed with a neutral "the principal" but note the gap.

## Step 1: same-day cache check

Compute today as `YYYY-MM-DD` in local time (the app uses `new Date().toISOString().slice(0,10)`; use the same wall-clock date).

Read `pill_cache` from `Locus/config.md` if present. It is a single line holding the last card as one-line JSON:

```
pill_cache: {"date":"2026-07-13","book":"...","author":"...","principle":"...","why":"...","question":"..."}
```

If `pill_cache.date` equals today, do not regenerate and do not advance the source. Re-render the exact cached card (Step 6) and stop. A second call the same day must return the identical card, word for word.

If there is no cache, or its date is not today, continue to Step 2. The book advances on its own the next day because the source is a pure function of the date (Step 2), and the cache never pins a book across days.

## Step 2: select the source deterministically (day-of-year mod 31)

The app picks the source with `PILL_SOURCES[dayOfYear() % PILL_SOURCES.length]`, where `PILL_SOURCES` has 31 entries and

```js
const dayOfYear = () => {
  const now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
};
```

This is the ordinal day of the year with January 1 = 1. Reproduce it exactly. `date +%j` returns the same ordinal (January 1 = `001`), so:

```bash
DOY=$(( 10#$(date +%j) ))   # ordinal day of year, Jan 1 = 1; matches the app's dayOfYear()
IDX=$(( DOY % 31 ))          # 0..30; matches dayOfYear() % PILL_SOURCES.length
CANON_NO=$(( IDX + 1 ))      # canon.md is numbered 1..31; array index 0 maps to entry 1
```

`CANON_NO` is the line number to read from `canon.md`. The array is zero-based and the canon list is one-based, so canon entry `N` is `PILL_SOURCES[N-1]`; therefore `CANON_NO = IDX + 1`.

Read entry `CANON_NO` from `canon.md`. Each line has the shape:

```
<n>. <Book title> — <Author>: <core idea>
```

Parse it:

- Split the line on the first ` — ` (space, em dash, space). The left side, with the leading `<n>. ` stripped, is the book title. Titles may contain `/` (for example "Good Strategy / Bad Strategy"); keep it intact.
- On the right side, split on the first `: `. The part before is the author. The part after, verbatim, is the core idea. The idea itself may contain further colons and semicolons; only the first `: ` after the author is the split point.

These three values are `{{PILL_BOOK}}`, `{{PILL_AUTHOR}}`, and `{{PILL_IDEA}}`.

## Step 3: build the portfolio from the dossiers

Read every `Locus/dossiers/*.md`. From each file's YAML frontmatter take `name` (exact display name) and `scope` (the one-line routing description). Build the portfolio list, one line per dossier:

```
- <name> — <scope>
```

If a dossier's `scope` is an empty string, drop the em dash and the scope: just `- <name>`. This list is `{{PROJECT_LIST}}`. The seed workspace ships five empty dossiers (Engagement 01 to Engagement 05); use whatever dossiers are on disk. The question in Step 4 must name one of these dossiers.

## Step 4: write the card

Fill the pill template from `prompts.md` (section 1) with `{{PRINCIPAL_ROLE}}` = `principal_role`, `{{PILL_BOOK}}` / `{{PILL_AUTHOR}}` / `{{PILL_IDEA}}` from Step 2, and `{{PROJECT_LIST}}` from Step 3. You are the model that template addresses, so compose the card directly. Hold to the template exactly:

1. **principle**: one sentence stating the idea as a decision rule, faithful to the author's own logic. It is a rule the principal can act on, not a summary of the book.
2. **why**: exactly two sentences on why it matters for someone in the principal's role. Not one, not three.
3. **question**: one sharp question that applies the principle to a live decision in the portfolio. Pick the single most relevant dossier and name it explicitly.

Hard caps and voice:

- Maximum 150 words total across principle, why, and question combined. Count them; trim to fit.
- Direct, senior, no fluff, no greetings, no congratulation. Numbers before adjectives. No emoji. No exclamation marks. See `brand.md`.
- The pill body carries no magenta signal and no filing chip. Magenta is reserved for an open decision that needs deciding, and the pill is not one. The only magenta in the card is the brand-mark centre dot inside the header orb, which is part of the logo and always present; keep the rest of the card navy and white.
- Stay faithful to the named author. Do not blend books or invent a claim the author would not make.

Keep the three fields as a small object internally: `{date: <today>, book, author, principle, why, question}`.

## Step 5: cache the card in config.md

Write the card back to `Locus/config.md` as the `pill_cache` line, serialized as one-line JSON with today's date:

```
pill_cache: {"date":"<today>","book":"<book>","author":"<author>","principle":"<principle>","why":"<why>","question":"<question>"}
```

If a `pill_cache:` line already exists, replace it in place. Do not touch `principal_role`, `pill_enabled`, or `majoritas_endorsement`. This is the only write this skill makes to config. Filing the card is what makes a repeat call the same day free and identical.

## Step 6: render the card

Render the card two ways.

**In chat**, in Locus voice, mirroring the app's card layout:

```
DAILY KNOWLEDGE PILL
<book> · <author>

<principle>

<why>

→ <question>
```

**As a branded HTML card** at `Locus/pills/LOCUS-daily-pill-<today>.html`. This reuses the report header (the orb, the wordmark, the kicker, the stamp) and the app's pill styles. Substitute the placeholders and HTML-escape the four text fields (`&` to `&amp;`, `<` to `&lt;`, `>` to `&gt;`). The confidentiality stamp must be the exact source string `Internal — eyes only` (with the em dash), verbatim; source fidelity wins over any no-em-dash rule. Do not embed any font binary, `@font-face`, or base64 blob; reference fonts by name only.

```html
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LOCUS Daily Knowledge Pill — {{DATE}}</title><style>
* { box-sizing:border-box; }
body { margin:0; background:#F7F8FA; color:#000E21; font-family:'Neue Haas Grotesk Display','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14.5px; line-height:1.55; font-weight:400; }
.r-head { background:#000E21; color:#fff; padding:40px 48px 34px; }
.r-brand { font-weight:300; letter-spacing:.42em; font-size:20px; margin-top:10px; }
.r-kicker { font-size:11px; letter-spacing:.28em; text-transform:uppercase; color:#8A95A5; margin-top:18px; }
.r-stamp { display:inline-block; margin-top:12px; font-size:10px; letter-spacing:.22em; text-transform:uppercase; border:1px solid rgba(255,255,255,.35); border-radius:3px; padding:4px 12px; color:#fff; }
.r-gen { font-size:11px; color:#8A95A5; margin-top:14px; }
.r-main { padding:30px 48px; max-width:680px; }
.pill { background:#fff; border:1px solid #C5CDD9; border-radius:3px; padding:22px 24px; }
.pill-eyebrow { font-size:10px; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:#8A95A5; }
.pill-source { display:block; font-size:11px; letter-spacing:.02em; color:#4A5566; margin-top:6px; }
.pill-principle { margin:14px 0 0; font-size:16.5px; font-weight:500; line-height:1.45; color:#000E21; }
.pill-why { margin:10px 0 0; font-size:14px; color:#4A5566; }
.pill-question { margin:14px 0 0; font-size:14px; font-style:italic; color:#000E21; display:flex; gap:8px; }
.pill-arrow { font-style:normal; color:#8A95A5; flex-shrink:0; }
.r-foot { padding:18px 48px 40px; font-size:11px; color:#8A95A5; border-top:1px solid #C5CDD9; }
</style></head><body>
<header class="r-head"><svg width="44" height="44" viewBox="0 0 100 100"><defs><radialGradient id="lrg" cx="50%" cy="50%" r="62%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="42%" stop-color="#E6EAF0"/><stop offset="76%" stop-color="#9AA6BC" stop-opacity="0.5"/><stop offset="100%" stop-color="#000E21" stop-opacity="0"/></radialGradient></defs><path d="M50 50 L83.05 18 A46 46 0 1 1 50 4 Z" fill="url(#lrg)"/><circle cx="50" cy="50" r="8" fill="#BA3189"/></svg><div class="r-brand">L O C U S</div><div class="r-kicker">Daily Knowledge Pill</div><div class="r-stamp">Internal — eyes only</div><div class="r-gen">Generated {{DATE}}</div></header>
<main class="r-main"><div class="pill"><div class="pill-eyebrow">Daily knowledge pill</div><span class="pill-source">{{BOOK}} &middot; {{AUTHOR}}</span><p class="pill-principle">{{PRINCIPLE}}</p><p class="pill-why">{{WHY}}</p><p class="pill-question"><span class="pill-arrow">&rarr;</span>{{QUESTION}}</p></div></main>
<footer class="r-foot">LOCUS &middot; private chief-of-staff workspace &middot; {{DATE}}</footer>
</body></html>
```

On a same-day cache hit, render from the cached fields and write the same HTML file; the output is identical.

## Step 7: closing manifest

End with a short run manifest so the run is auditable:

- date and day-of-year used
- selection index (`DOY mod 31`) and the canon entry number chosen
- book and author selected
- cache state: `fresh` (generated and filed) or `cached` (re-rendered from today's `pill_cache`)
- total word count of the card (must be 150 or fewer)
- path of the HTML card written

Keep the manifest terse, in Locus voice.

## Constraints recap

- Act only when `pill_enabled` is true. Off means render nothing but the off notice.
- Selection is `dayOfYear() % 31`, canon entry `IDX + 1`. Same date, same book, for everyone.
- Card is at most 150 words: one-sentence principle, exactly two why sentences, one dossier-named question.
- Same-day repeat returns the cached card verbatim; a new day advances the source automatically.
- The HTML stamp is exactly `Internal — eyes only`. No embedded fonts. No magenta signal in the pill body; the header brand-mark keeps its magenta centre dot, as every Locus mark does.
- Invent nothing: books, authors, and ideas come verbatim from `canon.md`; project names and scopes come from the dossiers on disk.
