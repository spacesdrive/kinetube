# kinetube brand kit

kinetube is built around one idea: things in motion. The mark is three crescents spinning around an open centre, and everything else in the kit stays out of its way: one warm near-black ink, one hot accent, round shapes, and plenty of white space. Tagline: **Keep it moving.**

## Logo

- Use the files in **Logos**. Never redraw, trace by hand, rotate, skew, outline, add shadows or gradients, or put the mark inside a different shape.
- On light grounds (`paper`, `surface`, `spin-soft`, `spin`) use `kinetube-mark-ink.png`. On dark grounds and photos use `kinetube-mark-white.png`. The mark is only ever `ink` (#2d292d) or white.
- `kinetube-app-icon.png` is the mark on its white disc: use it for app icons, avatars and favicons, cropped to a circle with `radius-full`.
- Clear space: keep at least a quarter of the mark's diameter empty on every side (`space-8` at a 128px mark). Minimum size: 24px on screen, 10mm in print.
- **Wordmark:** the name is always written `kinetube`, all lowercase, one word, in prose too. Set it in `display` family (Unbounded) at weight 600.
- **Lockup:** mark on the left, wordmark on the right, vertically centred. The wordmark's cap height is about 45% of the mark's height, and the gap between them is 30% of the mark's height. See the LogoLockup card for the live version. Stack the mark above the wordmark only when the space is square.

## Colour

- `paper` and `ink` carry almost every screen. Build neutral first, then add `spin`.
- `spin` is the only accent. Use it for one primary action per view, the playback/progress bar, and active states. Keep it to roughly 10% of any layout.
- Text on a `spin` fill is always `on-spin`, never white. When the accent has to be text (links, emphasis), use `spin-text`.
- Use `spin-soft` for tinted callouts and selected states, with `ink` or `spin-text` on top.
- Secondary text is `ink-muted`. Dividers are `line`, which is decorative only: inputs and buttons get a fill or a `focus` ring, not just a hairline.
- Every interactive element shows a 2px solid `focus` ring, offset 2px.

## Typography

- Two families, both on Google Fonts: **Unbounded** (weights 500 and 600) for `display`, `h1`, `h2` and the wordmark; **DM Sans** (400 and 600) for everything else.
- Load: `https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap`.
- Unbounded is wide and loud: keep display lines short (under about 6 words), sentence case or all lowercase, never all caps.
- Body copy is `body` in `ink`; metadata is `small` in `ink-muted`; tags and overlines are `label`, uppercase, 1 or 2 words.

## Shape and space

- Round, like the mark. Buttons and chips are pills (`radius-full`); cards, tiles and dialogs use `radius-lg`; inputs and tags use `radius-sm`.
- Spacing runs on a 4px base: `space-1` to `space-8`. Pad cards with `space-4`, gutter grids with `space-4` (mobile) or `space-6` (desktop), separate sections with `space-8` or more.
- Prefer flat surfaces separated by `surface` vs `paper` over drop shadows.

## Motion

- Motion is the brand. Ease out (`cubic-bezier(0.2, 0.8, 0.2, 1)`), 150 to 250ms for UI, up to 600ms for hero moments.
- The signature move is a short clockwise turn: loaders and the logo intro rotate the mark clockwise, easing to a stop. Never spin it continuously as decoration, and respect `prefers-reduced-motion` by fading instead.

## Voice

- Short, warm, direct. Speak to the viewer as "you"; kinetube is "we".
- Verbs first: "Upload your first video", "Keep watching", "Share the clip".
- Sentence case for buttons and headings. No exclamation marks in product UI; at most one in marketing.
- No emoji in product UI.
- No em dashes, anywhere. Use a full stop, a comma, a colon or parentheses instead.
- Example: say "Your video is live. Share it while it's fresh." not "Congratulations!!! Your amazing content has been successfully published! 🎉"

## Iconography

- No icon set ships with the kit yet. Use a rounded line set at 2px stroke with round caps and joins (Lucide fits) in `ink`, or `on-spin` on a `spin` fill. Never use the mark as a generic icon.

## What's in this folder

- `logos/`: `kinetube-mark-ink.png` (light grounds), `kinetube-mark-white.png` (dark grounds), `kinetube-app-icon.png` (original artwork on its white disc). 512×512 PNG.
- `tokens/tokens.json`: every colour, type, spacing and radius value with usage notes. `tokens/tokens.css`: the same values as CSS custom properties, light and dark.
- `previews/lockup.html` and `previews/cover.html`: open in a browser to see the lockup and brand cover with the real fonts (needs internet for Google Fonts).
