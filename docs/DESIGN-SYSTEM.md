# Design system

Reference vibe: Ukrainian folk-art food illustration (Petrykivka / Behance "Ukrainian food and cuisine illustration"). Warm paper, harvest colors, thick outlines, ornamental plants. Friendly, not corporate.

## Color tokens

Defined in `client/src/styles/tokens.css`:

| Token | Hex | Use |
|---|---|---|
| `--cream` | `#F4E8D0` | Page background |
| `--paper` | `#FBF3E3` | Cards, reader surface |
| `--ink` | `#2B2118` | Text, outlines |
| `--beet` | `#C44536` | Primary CTA, streaks, errors |
| `--sunflower` | `#E8B923` | Highlights, timers, badges |
| `--leaf` | `#3D6B3A` | Success, ready chips |
| `--deep` | `#1E3A5F` | Links, secondary buttons |
| `--plum` | `#7B3B4A` | Flagged / confusion |

Confetti uses beet / sunflower / leaf / deep.

## Type

- Headings: **Fraunces** (friendly serif, optical size).
- Body / UI: **Source Sans 3** (highly readable).
- Reader body: Source Sans 3 at 18–20px, line-height 1.6, generous measure.

## Surfaces

- Page: cream + CSS paper grain (SVG noise overlay).
- Cards: `--paper`, 24px radius, 3px ink outline, soft drop shadow.
- Decorative motifs: PNG illustrations in `client/public/art/` plus SVG ornaments in `client/src/components/illustrations/`.
- Embroidery border utility: `.embroidered`.

## Reader exception

The Reader is calm on purpose:

- Paper background, almost no illustration.
- Thin top bar (tabs, zoom, End session).
- Side panel **pushes** the page, never overlays the PDF.
- Floating selection toolbar is the only extra chrome.

## Motion

- Cards lift 2px on hover.
- Status chips pulse while `generating`.
- Streak ≥ 3 fires confetti (`client/src/lib/celebrate.ts`).

## Illustrations

| File | Used on |
|---|---|
| `art/login-hero.png` | Login / signup |
| `art/upload-harvest.png` | Home drop zone |
| `art/card-read.png` etc. | Hub feature cards |
| `art/empty-fox.png` | Empty lists |
| `art/celebrate.png` | Quiz / game victory |
| `art/app-icon.png` | Favicon / nav mark |
| `art/ornament-vine.png` | Login side panel |
| `art/game-match.png` | Minigames lobby |

When adding art, keep cream backgrounds so they blend with the page.
