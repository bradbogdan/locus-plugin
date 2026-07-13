# Locus

A private chief-of-staff workspace. Everything filed. Nothing forgotten.

Locus turns loose notes into a governed portfolio. You paste what you heard, saw, or decided; Locus types each item, files it under the right engagement, and keeps the record. Then it works the loop a chief of staff works: capture, file, brief, review. Triage catches the day's raw material. The daily briefing tells you what lands today and what is about to bite. The weekly status closes the period. A daily knowledge pill keeps one durable idea in front of the principal. The workspace holds the memory so the person does not have to.

## Two modes, one brand

Locus runs the same mechanics two ways. Both share the taxonomy, the prompts, the voice, and the brand kit. Choose by where you work.

**App mode.** The bundled React artifact, rendered on claude.ai as a Locus workspace. Pixel-identical to the original: lock screen, portfolio board, in-app briefing and reports. Storage is per-user and lives in your browser, not in any file. Best where the claude.ai artifact runtime exists (`window.storage` and `window.claude.complete`). In an environment that cannot host that runtime, use Desk mode instead of a degraded app.

**Desk mode.** File-based Locus for any Cowork chat. Dossiers live as markdown under a `Locus/` folder in your working directory, one file per engagement. The skills read and write those files and emit Locus-branded HTML briefings and reports. Desk mode makes the mechanics usable on your own notes, on your own disk, without the artifact runtime. The file format is specified in `skills/locus/references/data-convention.md`.

## Setup

1. Install the plugin in Claude Cowork.
2. Say "set up locus". The `locus` skill asks for the principal role (the senior seat Locus serves, which replaces the app's built-in persona), then whether the daily pill should be on.
3. Locus writes `Locus/config.md` and seeds five empty dossiers, Engagement 01 to Engagement 05. From here both modes start from the same empty state.
4. Say "open locus" for App mode, or paste notes and let triage file them for Desk mode.

## Skills

| Skill | What it does | Say |
|-------|--------------|-----|
| `locus` | Setup and workspace. Captures the principal role, offers the pill, builds the `Locus/` tree, opens App mode. | "set up locus", "open locus", "my locus workspace" |
| `locus-triage` | Paste raw notes; Locus splits them into typed items, routes each to a dossier, flags duplicates, proposes closes, and files on your confirmation. | "triage these notes", "file this into locus" |
| `locus-briefing` | The daily briefing: headline, what lands today, priorities, deadlines, risks, reminders, one honest nudge. Written to `Locus/briefings/`. | "locus briefing", "my daily briefing" |
| `locus-status` | The weekly status pack: one terse paragraph per engagement over a chosen window. Written to `Locus/reports/`. | "locus weekly status", "status pack for the last 7 days" |
| `locus-pill` | The daily knowledge pill: one principle from the canon, why it matters, and a question aimed at a live dossier. Runs only when the pill is enabled. | "locus pill", "today's pill" |

## Endorsement toggle

Locus can carry an "A Majoritas product" endorsement on its branded outputs. It is **off by default**. To turn it on, set one line in `Locus/config.md`:

```
majoritas_endorsement: true
```

Do not enable the endorsement for anything shared outside your own use until the branding-scope decision (LOC-12) is signed off. Until then, keep it off.

## Privacy

Read this before filing anything sensitive.

- **The model sees filed content.** Triage, the daily briefing, and the weekly status send the relevant dossier content to the model to do their work. Treat filing as sharing with the model.
- **App-mode backups are plaintext.** The app stores state encrypted at rest, but its export backups are plaintext JSON. A backup file is readable by anyone who holds it.
- **Desk-mode dossiers are plaintext.** Dossiers, briefings, and reports are plaintext markdown and HTML on your own disk, under `Locus/`. They are as private as that folder is.
