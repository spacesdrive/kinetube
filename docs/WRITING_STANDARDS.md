# Writing and design standards

These rules apply to all code, documentation, UI copy, commit messages, comments and any other text in this project. Follow them without exception.

---

## Typography

- Never use emoji, Unicode emoji symbols or emoticons.
- No em dash (`—`) and no en dash (`–`).
- No hyphen used as a dash: neither a spaced hyphen (` - `) nor a double hyphen (` -- `) between two parts of a sentence.
- Rewrite with a full stop, a comma, a colon or parentheses instead. For a range, write "5 to 6", not "5–6".
- Normal hyphens inside words are fine: `cross-platform`, `two-factor`, `kebab-case`.
- Code, paths, commands, flags and exact quotations stay as they are, even when they contain dashes.

These rules cover log lines too. The backend logs one JSON object per line (`backend/src/lib/logger.ts`), and no log line uses emoji. Keep it that way.

---

## Icons

- Never use emoji as icons in the UI.
- Use SVG icons only.
- Use Lucide React (`lucide-react`) for every icon. The YouTube and Instagram brand marks are the one exception: Lucide has none, so they are inline SVGs in `frontend/src/components/icons/BrandIcons.tsx`.
- If Lucide has no fitting icon, use another open-source SVG icon set, never an emoji or a raster image.
- Icons in the same part of the UI share one size, stroke width, spacing and visual weight.

---

## Writing style

Write clear, plain, professional English.

Avoid:

- buzzwords and marketing words ("powerful", "blazing fast", "seamless", "revolutionary")
- filler sentences and padding ("It is important to note", "In conclusion", "Moreover")
- repeating the same wording in sentences next to each other

Prefer:

- short, direct sentences
- headings that name the content, not the type of content
- readable formatting with enough white space
- one name for each concept, used everywhere: "download folder", not "output directory" in one place and "save location" in another

---

## Markdown

Use clean Markdown in all documentation.

Prefer:

- headings for structure
- bullet lists for items in no particular order
- numbered lists for steps
- tables for structured facts
- code blocks for commands and code

Avoid:

- too much bold (bold is for the single most important item in a block, not decoration)
- bullet lists nested deeper than two levels
- HTML tags inside Markdown, unless there is no other way

---

## Code comments

Add a comment only when the reason behind the code is not clear from the code. That means a hidden constraint, a rule that is easy to break, or behavior that would surprise the next reader. It also covers a workaround for an outside tool. For example, whisper.cpp renamed its `main` binary to `whisper-cli` in v1.7, so both names are checked.

Do not add comments that:

- describe what the code does (good names already do that)
- mention the current task, ticket or pull request ("added for issue #123")
- explain who calls the code or what happens downstream ("used by X")
- repeat what the code already shows

One short line per comment, at most one per block of logic. Start it in lowercase unless it starts with a name. No multi-line comment blocks and no JSDoc. See `docs/guidelines/TYPESCRIPT.md` for examples.

---

## UI copy

Write from the person's point of view, not from the code's.

- Name things the way the person knows them: "Download folder", not "outputDir".
- Action labels say exactly what happens: "Download", "Transcribe", "Cancel", not "Submit" or "Process".
- Success messages confirm what happened: "Download complete", not "Success".
- Error messages say what went wrong and what to do next: "FFmpeg isn't installed, so the MP3 conversion will fail. Install it from the setup screen." Not "Setup error".
- No apologies in error messages.
- No vague messages such as "Something went wrong".

The backend writes most error messages, and the frontend shows them as they arrive. So these rules apply to the messages in `backend/src/` as much as to the labels in `frontend/src/`.

---

## Commit messages

Follow Conventional Commits (see `docs/workflows/GIT.md` for the details).

- Subject line: `type(scope): short imperative sentence`
- No full stop at the end of the subject line
- Subject line under 72 characters
- No emoji or decorative characters
- Present tense: "add", not "added"; "fix", not "fixed"
- A body is optional. Add one when the reason for the change is not obvious.

---

## UI consistency

Every page must feel like part of the same app.

Keep these the same across pages:

- page padding and spacing, matching the existing components in `frontend/src/features/` and `frontend/src/components/`
- shadcn `Card` for grouped content
- loading states, with the shadcn `Skeleton` or the `Spinner` primitive (`frontend/src/components/ui/spinner.tsx`)
- toasts through Sonner (`frontend/src/components/ui/sonner.tsx`), never a custom alert or banner for short-lived feedback
- icons (Lucide, with the same stroke width in one part of the UI)
- button variants: primary for the main action, outline or ghost for the others
- progress for long work: reuse the pattern of `frontend/src/features/downloads/ProgressModal.tsx` instead of building a new one per feature

The whole project should feel like one finished desktop app, not separate screens built on their own.
