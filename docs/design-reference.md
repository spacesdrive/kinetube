# Design reference

This is the source of every visual decision in the frontend. The layout, spacing, sizes and interaction patterns come from the ElevenLabs web app, measured in Chrome DevTools on 2026-10-17. The colours, fonts, logo and voice come from the kinetube brand kit in `frontend/public/kinetube-brand-kit/`. Each token in `frontend/src/styles/tokens.css` traces back to a row here.

The ElevenLabs screenshots used while measuring stay out of the repository, because they show another company's product. Only the numbers are recorded here.

## Reference measurements

Measured on the Home, Voice library, Create voice and Text to speech pages, signed in, dark theme, 1536 px wide at 125% scaling. Values are CSS pixels read from computed styles.

### Shell

| Part | Measured value |
|---|---|
| Page ground | `#0F0F10` |
| Sidebar width | 256 px (255 plus a 0.8 px right hairline) |
| Sidebar ground | `#171717`, slightly lighter than the page |
| Hairlines | 0.8 px, white at 7.5% |
| Top bar | 50 px tall, transparent, with a 0.8 px bottom hairline |
| Content width | 1152 px, centred in the main area |
| Settings column (Text to speech) | 500 px, separated by a 0.8 px left hairline |

### Navigation

| Part | Measured value |
|---|---|
| Row height | 32 px, with 4 px between rows |
| Row radius | 8 px |
| Label | 14 px, weight 500, line height 20 px |
| Active row | white at 4.3% fill, white label |
| Group heading ("Pinned") | 14 px, weight 500, white at 64% |
| Icons | 16 px line icons, 1 px stroke at this size |

### Type

| Role | Measured value |
|---|---|
| Page title | 24 px / 30 px, weight 400, letter spacing -0.15 px, a display face |
| Card title | 16 px / 24 px, weight 500 |
| Body and descriptions | 14 px / 20 px, white at 64% for secondary text |
| Small labels (slider ends) | 12 px / 16 px, white at 64% |
| Count badges | 10 px, weight 600, pill, white at 3% fill |

### Controls

| Control | Measured value |
|---|---|
| Primary button | white fill, near-black text, 36 px tall, 10 px radius, 14 px weight 500, 12 px side padding |
| Secondary button | page-colour fill, 0.8 px border at white 10%, 40 px tall, 12 px radius |
| Top bar buttons | 32 px tall, 9.6 px radius, 13 px weight 500 |
| Search field | 40 px tall, 12 px radius, 0.8 px border, 14 px text |
| Filter chips | 40 px tall, 12 px radius, 0.8 px border at white 10%, 14 px weight 500 |
| Select trigger (voice picker) | 32 px tall, 10 px radius, 0.8 px border |
| Transitions on buttons | 75 ms, `cubic-bezier(0.4, 0, 0.2, 1)` |

### Tabs, cards and flows

| Part | Measured value |
|---|---|
| Tabs | underline style; 14 px weight 500; idle text white at 64%; 4 px top and 10 px bottom padding; the active tab gets a white underline |
| Choice cards (Create voice) | white at 4.3% fill, no border, 24 px radius, 20 px padding, 16 px weight 500 title, 14 px description at 64% |
| Choice card buttons | 40 px tall, 10 px radius |
| List rows (voice library) | 64 px tall, a square tile on the left, a 14 px weight 600 title, 14 px metadata at 64% |

### Dialogs and overlays

| Part | Measured value |
|---|---|
| Overlay | neutral grey at 30% over the page |
| Dialog | about 24 px radius, a lifted dark surface, a full-width 40 px primary button with a 12 px radius |

### What could not be inspected

- The light theme of the reference, since the account was set to dark. The light tokens come from the brand kit instead.
- Toasts, the command palette (the search field opens one), and behaviour at narrow widths. These follow common practice and the brand kit's motion rules.

### Differences from the October 2026 baseline

The baseline in the redesign prompt matched what was measured, with two refinements: the page ground is exactly `#0F0F10`, and controls run from 32 px (top bar) to 40 px (search and filters), with radii from 9.6 to 12 px rather than one fixed value.

## Brand kit findings

| Item | What the kit provides |
|---|---|
| Logos | `kinetube-mark-ink.png` for light grounds, `kinetube-mark-white.png` for dark grounds, `kinetube-app-icon.png` (the mark on a white disc). All 512 x 512 PNG, transparent. No SVG and no lockup file. |
| Wordmark | Always `kinetube`, lowercase, in Unbounded weight 600. Lockup: mark left, wordmark right, gap 30% of the mark's height. |
| Colours | `paper`, `surface`, `line`, `ink`, `ink-muted`, `spin`, `on-spin`, `spin-text`, `spin-soft`, `focus`, each with a light and a dark value (`tokens/tokens.json`). |
| Type | Unbounded (500, 600) for display, h1, h2 and the wordmark; DM Sans (400, 600) for everything else. Both on Google Fonts, both under the SIL Open Font License. |
| Shape | Buttons and chips are pills; cards and dialogs 16 px; inputs and tags 6 px. Flat surfaces, separated by tone, not shadows. |
| Motion | Ease out `cubic-bezier(0.2, 0.8, 0.2, 1)`, 150 to 250 ms for UI. The mark turns clockwise and eases to a stop; it never spins as decoration. Reduced motion fades instead. |
| Voice | Short, warm, direct; sentence case; no exclamation marks, emoji or em dashes in product UI. |
| Icons | No icon set ships; a rounded 2 px line set such as Lucide is recommended. |

### Gaps filled, and how

- **State colours.** The kit has no success, warning, error or info colours. They were chosen to sit with the warm neutrals and checked for AA contrast against every ground they appear on (see the contrast table).
- **Lifted surfaces.** The kit has `paper` and `surface` only. The sidebar ground, the elevated surface for popovers and dialogs, and the hover and selected tints are derived from `ink` at low opacity over `paper`, the way the reference builds its own.
- **Fonts offline.** The kit links Google Fonts, which an offline desktop app cannot rely on. The same families are self-hosted through `@fontsource-variable/unbounded` and `@fontsource-variable/dm-sans`, so there is no font request and no flash of a fallback face.
- **Image sizes.** The 512 px logos are 55 to 260 KB. The app imports 96 px copies of the marks (5 to 8 KB) from `frontend/src/assets/brand/` through the bundler. The originals in the kit are unchanged, and `frontend/public/favicon.png` is a 256 px copy of the app icon.
- **A dark mark for the loading page.** `electron/loading.html` embeds the 96 px white mark as a data URI, because the page loads from disk before the backend is up.

## Structure versus skin

| Decision | From | Why |
|---|---|---|
| 256 px sidebar, 32 px rows with 8 px radius, grouped labels | Reference | Measured |
| 52 px top bar with a hairline, breadcrumbs and a search trigger | Reference | Measured; 2 px taller to fit the 32 px search trigger with even padding |
| Hairlines instead of shadows; shadows only on things that float | Reference and kit | Both agree |
| Underline tabs, choice cards, filter chips, a settings column beside the work | Reference | Its page patterns |
| Buttons and chips as pills | Kit | The kit names round controls as part of the identity; heights stay at the reference's 32, 36 and 40 px |
| Inputs, selects and rows at 10 px radius; cards 16 px; choice cards and dialogs 20 px | Both | Between the reference (10 to 24 px) and the kit (6 and 16 px), so inputs read as fields and cards as cards |
| Unbounded for page titles and the wordmark, DM Sans for the rest | Kit | Type is skin |
| `spin` on the one primary action per view, active navigation icons, selection, progress and the focus ring | Kit | The kit limits the accent to about 10% of a screen |
| An inverse fill (`ink` on light, `ink` on dark) for secondary emphasis such as Close and Done | Reference | Its white primary button, re-skinned |

## Tokens

Defined in `frontend/src/styles/tokens.css`, mapped into Tailwind in `frontend/src/index.css` (`bg-surface`, `text-ink-muted`, `rounded-control`, `shadow-popover` and so on), and mapped onto the shadcn variable names so every primitive follows them.

### Colour

| Token | Light | Dark | Source |
|---|---|---|---|
| `app` | `#ffffff` | `#161416` | kit `paper` |
| `sidebar-ground` | `#faf8f7` | `#1c191c` | derived; the reference lifts its sidebar slightly |
| `surface` | `#f6f3f1` | `#211e21` | kit `surface` |
| `surface-elevated` | `#ffffff` | `#282428` | derived, for popovers and dialogs |
| `surface-hover` | ink at 5% | ink at 5% | derived from the reference's 4.3% |
| `surface-selected` | ink at 8% | ink at 8% | derived |
| `overlay` | `#161416` at 40% | `#0a090a` at 60% | derived from the reference's 30% grey |
| `line` | ink at 10% | ink at 8% | reference hairline, tinted with the kit's ink |
| `line-strong` | ink at 18% | ink at 15% | reference control border |
| `divider` | ink at 7% | ink at 6% | reference |
| `ink` | `#2d292d` | `#f2eeea` | kit |
| `ink-muted` | `#6b6469` | `#a8a1a6` | kit |
| `ink-faint` | `#716b74` | `#8f888d` | derived; placeholders and secondary captions |
| `spin` | `#e4572e` | `#f07045` | kit |
| `spin-hover` | `#d64c24` | `#f5855f` | derived |
| `spin-soft` | `#fbe3d9` | `#3a2219` | kit |
| `spin-text` | `#b5401a` | `#ff8a62` | kit |
| `on-spin` | `#1a1719` | `#1a1719` | kit |
| `focus` | `spin-text` | `spin-text` | kit |
| `success` / `success-soft` | `#16683e` / `#e8f0ec` | `#5cc98f` / `#293630` | derived |
| `warning` / `warning-soft` | `#7a4f00` / `#f2ede6` | `#f0b95a` / `#3e3429` | derived |
| `error` / `error-soft` | `#ad2a23` / `#f7eae9` | `#ff7a70` / `#402b2c` | derived |
| `info` / `info-soft` | `#2457b0` / `#e9eef7` | `#7fb2ff` / `#2e3340` | derived |

### Contrast (WCAG AA, 4.5:1 for text)

| Pair | Light | Dark |
|---|---|---|
| `ink` on `app` | 14.32 | 15.88 |
| `ink` on `surface` | 12.96 | 14.30 |
| `ink-muted` on `app` | 5.75 | 7.26 |
| `ink-muted` on `surface` | 5.21 | 6.53 |
| `ink-faint` on `app` | 4.81 | 5.30 |
| `on-spin` on `spin` | 4.83 | 6.02 |
| `spin-text` on `app` | 5.66 | 7.91 |
| `spin-text` on `spin-soft` | 4.60 | 6.37 |
| `success` on `success-soft` | 5.87 | 6.13 |
| `warning` on `warning-soft` | 6.12 | 6.82 |
| `error` on `error-soft` | 5.71 | 5.17 |
| `info` on `info-soft` | 5.88 | 5.84 |
| `focus` ring on `app` (3:1 needed) | 5.66 | 7.91 |

`ink-faint` on `surface` in the light theme is 4.35:1, so faint text is only used on the page ground or for placeholders and captions that repeat information shown elsewhere.

### Type, shape, space and motion

| Token | Value | Source |
|---|---|---|
| `font-display` | Unbounded Variable | kit |
| `font-sans` | DM Sans Variable | kit |
| `text-hero` | 30 / 38 px, 600, -0.015em | kit display scale, reduced for a tool screen |
| `text-page-title` | 24 / 30 px, 500, -0.01em | reference page title, kit h2 |
| `text-section` | 16 / 24 px, 600 | reference card title |
| body | 14 / 20 px | reference |
| `text-label` | 12 / 16 px, 600, 0.08em, uppercase | kit label |
| `rounded-row` | 8 px | reference |
| `rounded-control` | 10 px | reference |
| `rounded-card` | 16 px | kit `radius-lg` |
| `rounded-choice`, `rounded-dialog` | 20 px | between the reference's 24 px and the kit's 16 px |
| `rounded-pill` | 9999 px | kit |
| Spacing | 4 px base (Tailwind's scale) | kit |
| `--content-max` / `--content-narrow` | 1152 / 760 px | reference content width; narrow for single-column pages |
| `--panel-width` | 360 px | the reference's 500 px column, scaled to a 960 px minimum window |
| `--motion-ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | kit |
| `--duration-fast` / `--duration-base` / `--duration-slow` | 120 / 200 / 480 ms | kit range; the reference uses 75 to 150 ms |
| `shadow-popover`, `shadow-dialog`, `shadow-bar` | soft drop shadow plus a hairline ring | derived; only floating layers get one |

## Page mapping

| Reference page | Pattern | kinetube screen |
|---|---|---|
| Home | Greeting, one big input, quick actions | YouTube and Instagram landings (`pages/DownloadPage.tsx`) |
| Voice library | Search, filter chips, tabs, dense rows, a bulk action bar | Channel tabs and playlists (`features/youtube/ChannelView.tsx`, `PlaylistView.tsx`), Instagram profiles |
| Create voice | Large choice cards, steps, review before commit | The landing's quick actions, Batch download (`features/batch/BatchPage.tsx`), first-run setup |
| Text to speech | Working surface with a settings column | Video and post download (`features/youtube/VideoView.tsx`, `features/instagram/InstagramPostView.tsx`), Transcribe |
| Settings | Grouped sections of label, hint and control rows | Settings (`features/settings/`) |

## Components

| Component | File |
|---|---|
| App shell, sidebar, top bar, brand mark and lockup, theme switcher, command palette | `frontend/src/components/shell/` |
| Page header, section header, surface box, metric box, list row, detail panel | `frontend/src/components/patterns/` |
| Search field, filter chips, choice card, status badge, notice, media thumbnail, keyboard hint | `frontend/src/components/patterns/` |
| Confirm dialog, hold-to-confirm button | `frontend/src/components/patterns/` |
| Empty, loading and error states | `frontend/src/components/patterns/` |
| Underline tabs, select, dropdown menu, dialog, sheet, tooltip, switch, checkbox, progress, toasts | `frontend/src/components/ui/`, restyled to the tokens |

Icons are Lucide, at 16 px in navigation and controls and 18 to 20 px in empty states, with YouTube and Instagram brand glyphs in `components/icons/BrandIcons.tsx`. Every icon is a named import, so a missing icon fails the type check instead of showing an empty box.

## Screenshots

Before the redesign: `docs/screenshots/before/`. After: `docs/screenshots/after/`, each screen in light and dark at 1440 px, and the main screens at 960 px, the smallest window Electron allows.
