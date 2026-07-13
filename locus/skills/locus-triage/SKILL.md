---
name: locus-triage
description: Triages pasted raw notes into typed, filed Locus items. Splits a note blob into discrete records, routes each to the right engagement dossier by scope, classifies it into the ten Locus categories, extracts title, detail, date, amount and owner, flags likely duplicates against open items, and proposes closes for finished work, then files into the Locus/ dossiers on the user's confirmation. Use when the user says "triage these notes", "file this into locus", "locus triage", "sort these notes into locus", or pastes loose notes to capture into a Locus chief-of-staff workspace.
---

# Locus triage

Turn a blob of raw notes into typed, filed records. You are the chief of staff for the configured principal. Capture what they heard, saw, or decided; type each item; file it under the right engagement; and keep the record. Nothing is written until the user confirms the proposal.

## Voice

Follow the Locus voice for everything you say in chat while this skill is active. No emoji. No exclamation marks. No congratulation. Numbers before adjectives. Sentence case except the two-letter filing codes. Say the thing: the decision, the owner, the date. Full brand rules in `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/brand.md`.

## Prerequisites

Triage reads and writes a `Locus/` workspace in the user's current working directory. Before doing anything else, confirm `Locus/config.md` and `Locus/dossiers/` exist. If they do not, do not invent them: tell the user to run setup first ("set up locus") and stop.

The data format is the contract in `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/data-convention.md`. Obey it exactly. The full triage template, the LINKING RULE, and the duplicate-detection algorithm live in `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/prompts.md` (section 2 and the post-processing section). The ten categories with their prose routing definitions live in `${CLAUDE_PLUGIN_ROOT}/skills/locus/references/taxonomy.md`.

## Step 1: Load the workspace

1. Read `Locus/config.md`. Take `principal_role`. Frame the whole triage as chief of staff for that role; it is the lens for routing and tone.
2. Read every file in `Locus/dossiers/*.md`. For each dossier record its exact `name` and `scope` from the frontmatter, and every open item (a `- [ ]` bullet, not `- [x]`) with its category section and title.
3. Build two working sets:
   - **PROJECT_LIST**: one line per dossier, `- <name> — scope: <scope>`. This is the routing menu.
   - **OPEN_ITEMS_INDEX**: one row per open item, `dossier-slug | name | category | title`. This is what "closes" and duplicate detection match against. If there are no open items, treat the index as `(none)`.

## Step 2: Take the raw notes

The user's pasted text is RAW_NOTES. If they invoked the skill without notes, ask for the notes and stop until you have them. Do not fabricate content.

## Step 3: Triage each note

Split RAW_NOTES into discrete items. One decision, fact, or record per item. For each item, decide the engagement and the category, then extract the fields.

**Route by scope.** Match the note to the dossier whose scope best fits. Use the scope descriptions in PROJECT_LIST, not the note's surface wording. If nothing fits, set the project to `NEW: <name>` where `<name>` is a short, sensible engagement name drawn from the note.

**Classify into exactly one category.** Use these ten codes and labels (full definitions in taxonomy.md). Category is one of the lowercase keys below; an unrecognised value falls back to `status`.

| Code | Category key | Label | Routes here when the note is |
|------|--------------|-------|------------------------------|
| ST | status | Status update | a progress or status update on a workstream |
| MI | milestone | Milestone | a concrete achievement or checkpoint, ideally with a date |
| DE | deliverable | Deliverable | a concrete item to produce or ship |
| TL | timeline | Timeline | a scheduling fact, sequence change, or date shift |
| BU | budget | Budget | anything with money, costs, fees, budget lines, invoices |
| RI | risk | Risk | a threat, blocker, concern, or exposure |
| OP | opportunity | Opportunity | a new-business lead, pitch, or partnership opening |
| PE | person | Person | someone joining, leaving, or being allocated to delivery |
| RE | reminder | Reminder | something the principal must do or follow up on |
| GO | goal | Goal | an objective or target to hit |

**Extract the fields** for each item:
- `title`: maximum 10 words, self-contained.
- `detail`: one or two self-contained sentences. May be empty.
- `date`: `YYYY-MM-DD` or null. Resolve relative dates ("this Friday", "next week") against today. Only set a date the note actually implies.
- `amount`: a money string ("$9,000") or null.
- `owner`: a person name or null.
- `closes`: apply the **LINKING RULE**. If the note reports that an OPEN_ITEMS_INDEX item is now finished, delivered, sent, resolved, or signed off, put that open item's identity (dossier slug + exact title) in `closes`. Only link when the note clearly refers to the same piece of work. Otherwise leave it empty. A note that says work is still owed, pending, or in progress does not close anything.
  - **Avoid echo records.** When a note only reports that an existing item is now done and adds no genuinely new state, record it as the close alone: do not also file a fresh open item that merely restates the same event. File a new item alongside the close only when the note carries distinct new state worth tracking (a follow-on deliverable, a new date, a decision, a next step).

## Step 4: Duplicate detection

After classifying, run each proposed item through the deterministic duplicate check from prompts.md against OPEN_ITEMS_INDEX. Normalise both titles with `normT`: lowercase, replace every character that is not `a-z`, `0-9`, or space with a single space, collapse whitespace to one space, trim. Let `nt` be the normalised new title.

A proposed item is a duplicate of an open item `o` when ALL hold:
1. Same engagement: `o.name` equals the item's project.
2. Not already being closed: the item's `closes` does not include `o`.
3. Titles match by any one of: exact (`normT(o.title) == nt`); or `nt` longer than 12 chars and a substring of `normT(o.title)`; or `normT(o.title)` longer than 12 chars and a substring of `nt`.

If it matches, tag the item with the open title it duplicates. A close is never a duplicate; the two are mutually exclusive by rule 2.

## Step 5: Present the proposal, then wait

Show every proposed item as one table in chat. Do not write any file yet. Columns:

`# | Engagement | Code | Title | Detail | Date | Amount | Owner | Closes | Duplicate?`

- Engagement shows the dossier name, or `NEW: <name>` for a new one.
- Closes shows the open item title this note completes, or blank.
- Duplicate? shows the open title this likely duplicates, or blank.

Below the table, call out anything that needs a decision:
- New engagements about to be created (name and the ten empty sections that come with them).
- Items flagged as duplicates: state that filing them creates a second record, and ask whether to file, drop, or treat as a status update on the existing item.
- Items that close open work.

Then ask for confirmation to file. Accept edits, drops, and re-routes before writing. Do not proceed to Step 6 without an explicit go.

## Step 6: File on confirmation

Use today's date as `<today>` for every `filed:` and `done:` value. Then, for each confirmed item:

1. **Resolve the dossier.** For a plain engagement name, open `Locus/dossiers/<slug>.md`. For `NEW: <name>`, strip the `NEW:` prefix, slugify the name (lowercase, replace each run of non-alphanumerics with a single hyphen, trim leading and trailing hyphens), and create `Locus/dossiers/<slug>.md` with frontmatter (`name`, empty `scope`) and all ten category sections in the fixed order from data-convention.md, every section empty.

2. **Write the item** at the top of its category section (newest first), as a task bullet in the exact grammar:

   `- [ ] <title> — <detail>  ` followed by a backtick block `[date: YYYY-MM-DD | amount: <money> | owner: <name> | filed: <today>]`.

   Put two spaces before the backtick block. Keep the pair order date, amount, owner, filed. Omit any of date, amount, owner whose value is null; never print an empty pair. `filed` is always present. If detail is empty, drop the em dash and the detail.

3. **Flip closed items.** For every open item named in a `closes` link, change its `- [ ]` to `- [x]` and append ` | done: <today>` inside the same backtick block, after `filed`. The item stays in its own category section. Do not move it.

Write only what the user confirmed. Do not reformat unrelated lines in the dossier.

## Step 7: Confirm what happened

Report the outcome in one composed line: how many items filed, how many open items closed, and any new engagement created by name. Numbers before adjectives. No congratulation.

## Edge cases

- **No actionable items.** If RAW_NOTES yields nothing fileable, say so plainly and file nothing.
- **Ambiguous routing.** If a note fits two engagements or none cleanly, put your best call in the proposal and flag it for the user to correct before filing.
- **Amounts and dates the note does not state.** Leave them null. Do not infer figures or deadlines that are not in the note.
- **The user pastes more notes mid-review.** Fold them into the same proposal, re-run duplicate detection, and re-present the table before filing.
