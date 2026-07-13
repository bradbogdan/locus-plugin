# Desk-mode data convention

This is the contract every skill obeys. Follow it exactly.

Workspace root: a folder named "Locus/" in the user's current working directory.

Locus/config.md — key: value lines inside a fenced block or frontmatter. Keys: principal_role (string, the configured role that replaces the app persona), pill_enabled (true|false, default false), majoritas_endorsement (true|false, default false), pill_cache (optional: date + serialized card of the last generated pill).

Locus/dossiers/<slug>.md — one file per project/engagement. slug rule: lowercase the name, replace any run of non-alphanumerics with a single hyphen, trim leading/trailing hyphens (e.g. "Engagement 01" -> "engagement-01"). YAML frontmatter with keys: name (exact display name), scope (one-line scope description that feeds triage routing; may be empty string). Body: one "## <Category label>" section per category, in this fixed order using these EXACT labels: Status update, Milestone, Deliverable, Timeline, Budget, Risk, Opportunity, Person, Reminder, Goal. Items are markdown task bullets inside their category section.

Item line grammar (single line): "- [ ] <title> — <detail>  `[date: YYYY-MM-DD | amount: <money> | owner: <name> | filed: YYYY-MM-DD]`". Rules: open item uses "- [ ]", done item uses "- [x]" and appends " | done: YYYY-MM-DD" inside the backtick metadata. Omit any of date/amount/owner whose value is null (do not print empty ones); filed is always present. The em dash " — " separates title from detail; if detail is empty, omit the em dash and detail. Done items stay in their own category section (not moved to a separate section), exactly as the app keeps them.

Closing/linking: an item is referenced for "closes" by (dossier slug + exact title). When triage closes an item, flip its "- [ ]" to "- [x]" and add "| done: <today>".

Generated outputs: Locus/briefings/LOCUS-daily-briefing-YYYY-MM-DD.html, Locus/reports/LOCUS-weekly-status-YYYY-MM-DD.html, and Locus/pills/LOCUS-daily-pill-YYYY-MM-DD.html.

Seed: on setup create the five empty dossier files engagement-01..engagement-05 (names "Engagement 01".."Engagement 05", empty scope, all ten category sections present but empty), mirroring the app SEED_PROJECTS.

## Worked example

The dossier below is fictional and illustrative. It is a format reference only. It is NOT shipped as live data; the seed dossiers ship empty. It shows one dossier, `Locus/dossiers/engagement-01.md`, with two open items and one done item, spread across three category sections. All ten category sections are always present even when empty; the empty ones are elided here for brevity and marked with a comment.

```markdown
---
name: Engagement 01
scope: Board reporting and vendor governance for the flagship account
---

## Status update

<!-- (empty section, still present in a real file) -->

## Milestone

- [x] Master services agreement signed — countersigned by both parties  `[date: 2026-07-02 | owner: Legal | filed: 2026-06-28 | done: 2026-07-02]`

## Deliverable

- [ ] Q3 board deck — first full draft circulated for review  `[date: 2026-08-14 | owner: Ana | filed: 2026-07-13]`

## Timeline

<!-- (empty) -->

## Budget

- [ ] Vendor renewal ceiling — approved not-to-exceed for the annual license  `[amount: $48,000 | owner: Finance | filed: 2026-07-10]`

## Risk

<!-- (empty) -->

## Opportunity

<!-- (empty) -->

## Person

<!-- (empty) -->

## Reminder

<!-- (empty) -->

## Goal

<!-- (empty) -->
```

Notes on the example, tied to the grammar:

- The Milestone line is a done item: `- [x]`, and its metadata carries `| done: 2026-07-02` appended after `filed`. It stays inside the Milestone section, not moved elsewhere.
- The Deliverable line omits `amount` (null) and prints `date`, `owner`, `filed`.
- The Budget line omits `date` (null) and prints `amount`, `owner`, `filed`.
- A title with no detail drops the em dash entirely, e.g. `- [ ] Renew D&O cover  `` `[date: 2026-09-01 | owner: Legal | filed: 2026-07-13]` `` (shown here for the empty-detail rule; not part of the example dossier above).

## Format checklist (LOC-6, LOC-7, LOC-8 invent nothing)

1. **Item line grammar.** `- [ ] <title> — <detail>  ` then a backtick block `[date: YYYY-MM-DD | amount: <money> | owner: <name> | filed: YYYY-MM-DD]`. Two spaces before the backtick block. Pipe-separated `key: value` pairs inside the backticks. Omit any of `date` / `amount` / `owner` whose value is null; never print an empty pair. `filed` is always present. If detail is empty, omit both the em dash and the detail.
2. **Done marker.** Open item `- [ ]`; done item `- [x]` with `| done: YYYY-MM-DD` appended inside the same backtick block, after `filed`. Done items remain in their own category section. To close, flip `- [ ]` to `- [x]` and add `| done: <today>`.
3. **Frontmatter keys.** YAML frontmatter with exactly `name` (exact display name) and `scope` (one-line routing description, may be empty string).
4. **Slug rule.** Lowercase the name, replace any run of non-alphanumerics with a single hyphen, trim leading and trailing hyphens. "Engagement 01" becomes `engagement-01`.
5. **Category sections.** One `## <Category label>` per category, in this fixed order and with these exact labels: Status update, Milestone, Deliverable, Timeline, Budget, Risk, Opportunity, Person, Reminder, Goal. All ten present in every dossier, even when empty.
6. **Seed files.** On setup, create `engagement-01.md` through `engagement-05.md` (names "Engagement 01" to "Engagement 05"), empty `scope`, all ten category sections present and empty, mirroring the app SEED_PROJECTS.
7. **Output file naming.** Daily briefing: `Locus/briefings/LOCUS-daily-briefing-YYYY-MM-DD.html`. Weekly status: `Locus/reports/LOCUS-weekly-status-YYYY-MM-DD.html`. Daily pill: `Locus/pills/LOCUS-daily-pill-YYYY-MM-DD.html`.
8. **Config file.** `Locus/config.md` carries `principal_role`, `pill_enabled` (default false), `majoritas_endorsement` (default false), and optional `pill_cache` (date plus the last serialized pill card).
