# Design system

Visual language inspired by Marginalia: warm paper, navy ink, coral primary, gold accent, olive secondary. Calm reading room — not a comic outline.

## Color tokens

Defined in `client/src/styles/tokens.css`:

| Token | Hex | Use |
|---|---|---|
| `--cream` | `#F3EFE4` | Page background |
| `--paper` | `#F8F5EE` | Cards, reader surface |
| `--ink` | `#1E1F3D` | Text, navy sidebar |
| `--beet` | `#CB3A32` | Primary CTA, eyebrows, errors |
| `--sunflower` | `#F4C53A` | Highlights, timers, brand dot |
| `--leaf` | `#5E6E38` | Success, continue-reading banner |
| `--deep` | `#2F5A85` | Secondary actions |
| `--line` | `#D4C6A8` | Soft card borders |
| `--plum` | `#7B3B4A` | Flagged / confusion |

Confetti uses beet / sunflower / leaf / deep.

## Type

- Headings: **Fraunces** (optical size, tight tracking).
- Body / UI: **DM Sans**.
- Eyebrows: 11px bold, uppercase, `letter-spacing: 0.2em`, beet.
- Reader body: DM Sans at 18–20px, line-height 1.6.

## Surfaces

- Page: cream + gold/olive radial glows + paper grain (multiply overlay).
- Cards: `--paper`, 20px radius, 1px tan border, stacked paper shadow (`.paper-card`).
- Primary buttons: coral fill, 14px radius, 3px navy offset shadow.
- Desktop shell: navy sidebar; mobile: slim top bar.

## Reader exception

The Reader stays calm:

- Paper background, almost no illustration.
- Thin top bar (tabs, zoom, End session).
- Side panel **pushes** the page, never overlays the PDF.
- Floating selection toolbar is the only extra chrome.

## Motion

- Cards lift 2px on hover.
- Status chips pulse while `generating`.
- Streak ≥ 3 fires confetti (`client/src/lib/celebrate.ts`).
