# Locus item taxonomy

Ten record categories. Each is defined once in the `CATEGORIES` map (source: `locus-chief-of-staff-5.tsx` lines 19 to 30) with a `label`, a 2-letter `code`, and a display `color`, and once in prose inside the triage prompt (lines 630 to 639) as the routing definition the model uses to classify each note.

Color note: **only `RI` (Risk) carries magenta** (`#BA3189`). Every other category renders in the default ink `#000E21`.

The prose definitions below are quoted from the triage prompt as parameterized (persona-neutralized); the only affected line is `reminder`, where the original "something she must do" becomes "something they must do".

| Category key | Label | Code | Prose definition (triage prompt) |
|---|---|---|---|
| status | Status update | ST | a progress/status update on workstreams |
| milestone | Milestone | MI | a concrete achievement or checkpoint with (ideally) a date |
| deliverable | Deliverable | DE | a concrete item to produce or ship (document, deck, module, pitch material) |
| timeline | Timeline | TL | a scheduling fact, sequence change, or date shift |
| budget | Budget | BU | anything with money, costs, fees, budget lines, invoices |
| risk | Risk | RI | a threat, blocker, concern, or exposure |
| opportunity | Opportunity | OP | a new-business lead, pitch opportunity, or partnership opening |
| person | Person | PE | someone joining, leaving, or being allocated to delivery |
| reminder | Reminder | RE | something they must do or follow up on (include due date if implied) |
| goal | Goal | GO | an objective or target to hit |

The triage output `category` field must be exactly one of: `status | milestone | deliverable | timeline | budget | risk | opportunity | person | reminder | goal`. On parse, an unrecognized category falls back to `status`.
