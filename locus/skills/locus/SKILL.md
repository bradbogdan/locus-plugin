---
name: locus
description: Entry point to the Locus chief-of-staff workspace. Sets up the Locus/ workspace (captures the principal role, offers the daily knowledge pill, seeds five engagement dossiers) and opens App mode by publishing the bundled Locus React app as an artifact. Use when the user says "set up locus", "open locus", "my locus workspace", or otherwise asks to start, configure, or open Locus.
---

# Locus

Locus is a private chief-of-staff workspace. A Majoritas product. It turns loose
notes into a governed portfolio: every item typed, filed under an engagement, and
kept. This skill is the front door. It sets the workspace up once, then opens it.

Hold the Locus voice in everything you emit: intelligent, composed, direct,
long-range, accountable, discreet. Numbers before adjectives. Sentence case. No
emoji, no exclamation marks, no congratulation. Say the decision, the owner, the
date. Full brand rules: `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/brand.md`.

## Two modes

- **App mode.** The bundled React app, published as an artifact and rendered on
  claude.ai as the Locus workspace. State lives per-user in the browser.
- **Desk mode.** File-based Locus. Dossiers live as markdown under a `Locus/`
  folder on disk; the sibling skills (`locus-triage`, `locus-briefing`,
  `locus-status`, `locus-pill`) read and write those files. Format:
  `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/data-convention.md`.

Both modes share one workspace, one taxonomy, one voice. Setup serves both.

## Decide what to do

1. Check whether `Locus/config.md` exists in the current working directory.
2. If it does not exist, run **Setup** first. Setup is required before either
   mode can run.
3. If it exists and the user said "set up locus", confirm the workspace is
   already configured, show the current `principal_role` and pill state, and ask
   whether to reconfigure or leave it. Do not silently overwrite config.
4. If it exists and the user said "open locus", "my locus workspace", or asked to
   open the app, go to **App mode**.

## Setup (first run)

Run this the first time, or when the user asks to reconfigure.

**Step 1: capture the principal role.** Ask the user one question: which senior
seat does Locus serve. This is the role that replaces the app's built-in persona
at every prompt site (for example "the COO of a regional infrastructure group",
"the founder of a design studio"). Take their answer verbatim as
`principal_role`. Do not invent or narrow it.

**Step 2: offer the daily pill.** Ask, using a question with explicit options,
whether the daily knowledge pill should be on or off. The pill surfaces one
durable idea from the canon each day. Default is off. Record the answer as
`pill_enabled` (`true` or `false`).

**Step 3: write `Locus/config.md`.** Create the file with exactly this shape,
substituting the captured values:

````markdown
# Locus config

```yaml
principal_role: <the role, verbatim>
pill_enabled: <true|false>
majoritas_endorsement: false
```
````

`majoritas_endorsement` stays `false` unless the user later asks to turn the
provenance line on. Do not add `pill_cache` at setup; the pill skill manages it.

**Step 4: build the tree.** Create the full `Locus/` workspace per the data
convention. Directories: `Locus/dossiers/`, `Locus/briefings/`, `Locus/reports/`,
`Locus/pills/`.
Then seed five empty dossiers, `engagement-01.md` through `engagement-05.md`,
named "Engagement 01" through "Engagement 05". Each seed dossier is empty scope
with all ten category sections present and empty, in the fixed order. Write each
file exactly like this (only the name and the `01` suffix change per file):

```markdown
---
name: Engagement 01
scope:
---

## Status update

## Milestone

## Deliverable

## Timeline

## Budget

## Risk

## Opportunity

## Person

## Reminder

## Goal
```

The ten sections and their order are fixed: Status update, Milestone,
Deliverable, Timeline, Budget, Risk, Opportunity, Person, Reminder, Goal. Do not
add, drop, rename, or reorder them. This mirrors the app's SEED_PROJECTS so both
modes start from the same empty state.

**Step 5: confirm.** Report back in Locus voice: the role captured, the pill
state, and that five empty dossiers are seeded and ready. Tell the user they can
say "open locus" for App mode, or paste notes to let triage file them for Desk
mode. Do not fabricate portfolio content; the dossiers ship empty.

## App mode

Run this when the user asks to open Locus or open the app, and setup is done.

1. Read `principal_role` from `Locus/config.md`.
2. Read the bundled app:
   `${CLAUDE_PLUGIN_ROOT}/skills/locus/assets/locus-app.tsx`.
3. Replace every occurrence of the literal token `{{PRINCIPAL_ROLE}}` with the
   configured `principal_role`. The token appears exactly four times, at the four
   LLM prompt sites (pill, triage, briefing, status). Substitute plain text; do
   not re-quote or escape it. Leave the rest of the file untouched.
4. Publish the substituted source as a **React artifact** (the claude.ai artifact
   type that runs JSX/TSX). The app renders the Locus lock screen, portfolio
   board, in-app briefing and reports, pixel-identical to the original.

**Runtime caveat.** App mode needs the claude.ai artifact runtime. The app calls
`window.storage` for per-user persistence and `window.claude.complete` for the
four LLM prompts. Where the artifact pane is CSP-restricted to self-contained
HTML only (no JSX runtime, no `window.claude.complete`), the app cannot run.
Do not ship a degraded HTML shell. Say plainly that App mode is unavailable in
this environment and offer **Desk mode** instead: the sibling Locus skills work
the same mechanics on the `Locus/` files, on disk, without the artifact runtime.

## Guardrails

- Setup is a precondition. Never open App mode or route notes before
  `Locus/config.md` exists.
- Take the principal role verbatim. It is the one input that personalises every
  prompt; do not paraphrase it.
- Invent nothing. Seed dossiers ship empty. Do not pre-fill items, dates,
  amounts, or owners.
- Locus documents are internal, eyes only. When replicating any Locus HTML
  template, the confidentiality stamp must be the exact string
  `Internal — eyes only` (with the em dash). Source fidelity wins over the
  general no-em-dash rule; do not substitute the dash.
- Spend magenta only on an open decision (Risk / RI). Never on ornament or on
  "done". Full colour discipline is in `brand.md`.

## References

All shared references live in
`${CLAUDE_PLUGIN_ROOT}/skills/locus/references/`:

- `brand.md`: voice, colour discipline, the mark, filing codes, UI principles.
- `data-convention.md`: the Desk-mode file contract (config, dossiers, item
  grammar, seed rule, output naming). The authority for the tree Setup builds.
- `taxonomy.md`: the ten record categories, codes, and routing definitions.
- `prompts.md`: the four parameterized LLM prompt templates and the duplicate
  detection logic.
- `canon.md`: the 31-source pill corpus.
