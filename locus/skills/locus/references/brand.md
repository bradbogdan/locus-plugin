# Locus brand

Locus is a private chief-of-staff workspace. A Majoritas product. Everything it
produces should read as composed, exact, and discreet: a system that has already
thought the problem through and is telling you only what matters.

Tokens live in `../assets/locus-brand.css`. The marks live in
`../assets/locus-mark.svg` (graded, at or above 48px) and
`../assets/locus-mark-flat.svg` (below 48px). Fonts are referenced by name only.
Never embed a font binary, `@font-face`, or base64 blob in any Locus output.

## Voice

Six traits: intelligent, composed, direct, long-range, accountable, discreet.

- No emoji. No exclamation marks. No congratulation.
- Numbers before adjectives. "3 deals slipped past due" beats "several deals are
  concerningly late".
- Sentence case everywhere except the two-letter filing codes and short eyebrows.
- Say the thing. State the decision, the owner, the date. Cut hedging and cut
  filler. If something is a risk, name it as a risk.
- Long-range: frame today against the horizon it affects, not just the hour.
- Accountable: attribute. Who owns it, when it is due, what happens if it slips.
- Discreet: Locus documents are internal, eyes only. Write as if the reader is
  the principal and no one else will ever see it.

## Colour discipline: 60 / 30 / 10

- **60 white** (`--white` on `--paper`). The dominant surface. White leads.
- **30 navy** (`--navy #000E21`). Ink, rules, and reserved surfaces (the briefing
  header, the document masthead). Navy is structure, not decoration.
- **10 magenta** (`--magenta #BA3189`). The signal, and nothing else.

Magenta is never a content background. It appears only on the centre period of
the mark, on accents, on rules, and on identity surfaces.

**Magenta means a decision is needed.** That is the whole rule. If a chip, a
section header, or a marker is magenta, the reader must decide something. Never
spend magenta on ornament, on "done", or on things that are merely important.
Overuse burns the signal.

## Filing codes

Ten two-letter codes classify every logged item. Set them uppercase, in the chip
style (`.locus-chip`), navy border and navy text. Only **RI** may carry magenta,
because only a risk demands a decision.

| Code | Meaning     | Colour  |
|------|-------------|---------|
| ST   | Status      | navy    |
| MI   | Milestone   | navy    |
| DE   | Deliverable | navy    |
| TL   | Timeline    | navy    |
| BU   | Budget      | navy    |
| RI   | Risk        | magenta |
| OP   | Opportunity | navy    |
| PE   | Person      | navy    |
| RE   | Reminder    | navy    |
| GO   | Goal        | navy    |

Do not invent codes. Do not colour any code but RI. A risk that has been resolved
drops back to navy or leaves the document; magenta is only for the open decision.

## The mark

The Locus mark is a field with a single cut and a magenta period at its centre.
The cut is the V-stroke of the Majoritas M, set at 44.09 degrees, opening to the
north-east. The path is fixed: `M50 50 L83.05 18 A46 46 0 1 1 50 4 Z`. Never
redraw it, re-angle it, or round it.

- **Graded field** (`locus-mark.svg`): use at or above 48px. The radial grade
  reads as depth. Below 48px the grade muddies, so it is not allowed there.
- **Flat field** (`locus-mark-flat.svg`): solid navy, use below 48px and wherever
  the render target cannot show a gradient cleanly.

**Clear space:** keep free space of at least half the field's diameter on all
sides. Nothing sits inside that margin.

**Minimum size:** do not place the mark below 16px. Between 16px and 48px use the
flat mark only.

**Never:**

- Never recolour the field to anything but navy (or white, knockout on navy).
- Never recolour or remove the magenta period.
- Never stretch, skew, rotate, or add effects (shadow, glow, outline).
- Never set the mark on a busy background or on magenta.
- Never combine the Majoritas M-mark with the Locus mark.

The wordmark is `L O C U S`, light weight, tracked wide (`--track-wordmark`,
0.42em). It pairs with the mark but is not part of it.

## UI principles

- **White-led.** The interface is paper and ink. White surfaces carry the work;
  navy is reserved, used for the briefing field and the document masthead, not
  sprayed across the screen.
- **Sharp corners.** Radius stays at 2 to 4px (`--radius`, `--radius-sm`,
  `--radius-md`). Nothing is soft or bubbly. Locus is an instrument.
- **Hairlines, not boxes.** Structure comes from 1px rules (`--hairline`,
  `--mid-grey`) and generous space, not from heavy borders or fills.
- **Quiet shadow.** Elevation is navy-tinted and faint (`--shadow-sm` to
  `--shadow-lg`). If a shadow announces itself, it is too strong.
- **No entry animation.** Content does not fade, slide, or bounce in. It is
  already there when you look. Motion tokens (120 / 200 / 300ms) exist for state
  changes and feedback, never for decorative reveals; honour
  `prefers-reduced-motion`.
- **Typography does the work.** Display sizes track negative and set tight;
  eyebrows and captions track positive and set uppercase. Body sets at 1.55
  leading, ragged-right. Let the scale and the space carry hierarchy before
  reaching for colour.

## Endorsement

"A Majoritas product" is the endorsement line. It is **off by default**. Turn it
on only where provenance is genuinely useful (external-facing covers, credits),
and even then never set it larger than the Locus product name, and never lock the
Majoritas M-mark next to the Locus mark. Inside the workspace, Locus stands on its
own.
