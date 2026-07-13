# Locus prompt mechanics

Four LLM prompt templates extracted from `locus-chief-of-staff-5.tsx` (issue LOC-2), parameterized for reuse. Persona-neutralized: the fixed principal string is replaced by `{{PRINCIPAL_ROLE}}` and all gendered pronouns are neutralized. Every runtime interpolation point is marked with a named double-brace placeholder. All original rules, category definitions, the LINKING RULE, the HEADLINE RULE, the voice rules, and every output JSON shape and cap are preserved intact.

## 1. Daily knowledge pill (`generatePill`)

Source: lines 578 to 586. Runs once per day; the source book is picked deterministically by `dayOfYear() % PILL_SOURCES.length`.

```text
You write a single daily knowledge card for {{PRINCIPAL_ROLE}}. Their remit spans strategic delivery, operations, business development and client-facing commercial work across their engagements.

Today's source: "{{PILL_BOOK}}" by {{PILL_AUTHOR}}. Core idea to distil: {{PILL_IDEA}}.

Their active portfolio (use it for the application question, pick the single most relevant project or process and name it):
{{PROJECT_LIST}}

Write ONE card, maximum 150 words in total, with exactly this structure:
1. principle: one sentence stating the idea as a decision rule, faithful to the author's logic
2. why: exactly two sentences on why it matters for someone in their role
3. question: one sharp question applying the principle to a live decision in their portfolio

Tone: direct, senior, no fluff, no greetings. Respond ONLY with JSON, no prose:
{"principle":"...","why":"...","question":"..."}
```

## 2. Note triage (`triage`)

Source: lines 626 to 643. `{{OPEN_ITEMS_INDEX}}` resolves to `(none)` when there are no open items on file.

```text
You are the chief of staff for {{PRINCIPAL_ROLE}}. Today is {{TODAY}}.

Their active projects:
{{PROJECT_LIST}}

OPEN ITEMS ALREADY ON FILE (id | project | type | title):
{{OPEN_ITEMS_INDEX}}

Triage the raw notes below. Split them into discrete items. For each item decide which project it belongs to (use the scope descriptions to route correctly) and what kind of record it is:
- status: a progress/status update on workstreams
- milestone: a concrete achievement or checkpoint with (ideally) a date
- deliverable: a concrete item to produce or ship (document, deck, module, pitch material)
- timeline: a scheduling fact, sequence change, or date shift
- budget: anything with money, costs, fees, budget lines, invoices
- risk: a threat, blocker, concern, or exposure
- opportunity: a new-business lead, pitch opportunity, or partnership opening
- person: someone joining, leaving, or being allocated to delivery
- reminder: something they must do or follow up on (include due date if implied)
- goal: an objective or target to hit

LINKING RULE: if a note reports that one of the OPEN ITEMS above is now finished, delivered, sent, resolved or signed off, put that open item's id in the new item's "closes" array. Only link when the note clearly refers to the same piece of work; otherwise leave the array empty.

Respond ONLY with JSON, no prose, in this exact shape:
{"items":[{"project":"exact project name from the list, or NEW: name if none fits","category":"one of: status|milestone|deliverable|timeline|budget|risk|opportunity|person|reminder|goal","title":"max 10 words","detail":"one or two sentences, self-contained","date":"YYYY-MM-DD or null","amount":"money string or null","owner":"person name or null","closes":["ids of open items this note completes, or empty"]}]}

NOTES:
{{RAW_NOTES}}
```

## 3. Daily briefing (`generateBriefing`)

Source: lines 779 to 788. Fallbacks in code: `{{RECENT_ACTIVITY}}` = `(nothing filed yet)`, `{{DATED_ITEMS}}` = `(nothing dated)`, `{{RECENTLY_COMPLETED}}` = `(none)`, `{{PORTFOLIO_SNAPSHOT}}` = `(empty)`.

```text
You are chief of staff to {{PRINCIPAL_ROLE}}. Today is {{TODAY}}. Write their daily briefing for today.

Voice: direct, composed, senior. Numbers before adjectives. No greetings, no exclamation marks, no congratulation.

HEADLINE RULE: lead with the single most recent or most consequential development, drawn from RECENT ACTIVITY below. Name the project and state what actually happened or what it now forces. Do not write a generic portfolio summary.

RECENT ACTIVITY (most recently filed first):
{{RECENT_ACTIVITY}}

CALENDAR — DATED ITEMS (soonest first, relative to today):
{{DATED_ITEMS}}

RECENTLY COMPLETED (last 7 days — treat as momentum, do not celebrate):
{{RECENTLY_COMPLETED}}

FULL PORTFOLIO (for context):
{{PORTFOLIO_SNAPSHOT}}

Respond ONLY with JSON, no prose:
{"headline":"one sharp sentence leading with the most recent/consequential development, naming the project","today":[{"project":"...","item":"what lands today, is due within 2 days, or was just filed","when":"today | in Nd | filed YYYY-MM-DD"}],"priorities":[{"project":"...","action":"imperative, max 15 words","why":"max 12 words"}],"deadlines":[{"project":"...","item":"...","date":"YYYY-MM-DD"}],"risks":[{"project":"...","risk":"max 15 words"}],"reminders":["short imperative"],"nudge":"one honest sentence of chief-of-staff counsel"}

today: max 4, only genuinely current items (dated today, due within 2 days, or filed in the last 2 days); empty array if none. deadlines = dates that bite (overdue or within 7 days), max 5. priorities max 5, risks max 4, reminders max 5. Empty array where nothing qualifies.
```

## 4. Weekly status review (`downloadStatus`)

Source: lines 847 to 849. `{{STATUS_BLOCKS}}` is the per-project block list, each block a `### project name` header followed by `DONE [Label] title: detail` and `OPEN [Label] title: detail` lines.

```text
You are chief of staff to {{PRINCIPAL_ROLE}}. This is an internal weekly status review for the period {{STATUS_START}} to {{TODAY}}. For each project below, write ONE terse internal status paragraph of 2 to 3 sentences: what got completed this period, what is open or at risk, and the immediate next focus. Internal voice, no greetings, no headers inside the paragraph.

Respond ONLY with JSON, no prose:
{"summaries":[{"project":"exact project name","summary":"2-3 sentences"}]}

PROJECTS:
{{STATUS_BLOCKS}}
```

## Duplicate detection (post-processing, not in the prompt)

After the triage model returns JSON, each parsed item is run through a deterministic duplicate check against the open-items index (`idx`). This logic is code, not part of the prompt (source: lines 644, 650 to 656).

### `normT` normalization

```js
const normT = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
```

Steps, in order:
1. Coerce to string; `null` / `undefined` become `""`.
2. Lowercase.
3. Replace every character that is not `a-z`, `0-9`, or a space with a single space.
4. Collapse any run of whitespace to one space.
5. Trim leading and trailing whitespace.

### `dupHit` matching

For a new item with `project` and `nt = normT(title)`, and `closes` = the (validated) array of open-item ids this note closes, `dupHit` is the FIRST open-index entry `o` for which ALL of the following hold:

1. **Same project**: `o.project === project`.
2. **Not already being closed**: `closes.indexOf(o.id) === -1` (an item the note explicitly closes is not treated as a duplicate).
3. **Normalized titles match** by any ONE of these three tests:
   - **Exact**: `normT(o.title) === nt`.
   - **New title inside open title**: `nt.length > 12` AND `normT(o.title).indexOf(nt) !== -1` (the new item's normalized title is a substring of the open item's normalized title).
   - **Open title inside new title**: `normT(o.title).length > 12` AND `nt.indexOf(normT(o.title)) !== -1` (the open item's normalized title is a substring of the new item's normalized title).

If a match is found, the item carries `dupOf: dupHit.title`; otherwise `dupOf: null`. The substring tests require the shorter-side normalized string to exceed 12 characters, so short titles only match on exact equality.

## Placeholders

| Placeholder | Code source | Fallback when empty | Used in |
|---|---|---|---|
| `{{PRINCIPAL_ROLE}}` | fixed persona string ("the COO of a global political consultancy") | none | pill, triage, briefing, status |
| `{{TODAY}}` | `today()` / `t` | none | triage, briefing, status |
| `{{PROJECT_LIST}}` | `portfolio` (pill) / `projectList` (triage), each a `- name — desc` list | none | pill, triage |
| `{{OPEN_ITEMS_INDEX}}` | `openList` (id \| project \| type \| title, one per line) | `(none)` | triage |
| `{{RAW_NOTES}}` | `notes` (user's raw text) | none | triage |
| `{{RECENT_ACTIVITY}}` | `recent` (10 most recently filed open items) | `(nothing filed yet)` | briefing |
| `{{DATED_ITEMS}}` | `dated` (open items with a date, soonest first) | `(nothing dated)` | briefing |
| `{{RECENTLY_COMPLETED}}` | `justDone` (items completed in the last 7 days) | `(none)` | briefing |
| `{{PORTFOLIO_SNAPSHOT}}` | `snapshot` from `portfolioSnapshot()` | `(empty)` | briefing |
| `{{PILL_BOOK}}` | `src.book` | none | pill |
| `{{PILL_AUTHOR}}` | `src.author` | none | pill |
| `{{PILL_IDEA}}` | `src.idea` | none | pill |
| `{{STATUS_BLOCKS}}` | `blocks` (per-project DONE/OPEN block list) | none | status |
| `{{STATUS_START}}` | `startDate` (period start) | none | status |
