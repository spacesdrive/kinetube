# Writing and Design Standards

These rules apply to all generated code, documentation, UI copy, commit messages, comments, and any user-facing text in this project. Follow them without exception.

---

## Typography

- Never use emojis.
- Never use Unicode emoji icons.
- Never use emoticons.
- Never use em dashes (--). Use a standard hyphen (-) or restructure the sentence.
- Never use en dashes where a hyphen is appropriate.
- Always use standard ASCII hyphens (-).

Existing `console.log` lines in `backend/server.js` predate this policy and use emoji as status markers. Do not extend that pattern to new code; when you touch a line that uses one, replace it in the same edit.

---

## Icons

- Never use emoji as icons in UI.
- Use SVG icons only.
- Use Lucide React icons (`lucide-react`) - this is the only icon library in the frontend dependency tree.
- If Lucide does not have an appropriate icon, use another open-source SVG icon library rather than an emoji or a raster image.
- All icons in the same UI context must have consistent size, stroke width, spacing, and visual weight.

---

## Writing Style

Write in clear, professional English.

Avoid:

- Unnecessary buzzwords
- Filler text or padding sentences
- Exaggerated marketing language ("powerful", "blazing fast", "revolutionary")
- Repetitive wording across adjacent sentences

Prefer:

- Concise, direct sentences
- Descriptive headings that name the content, not the type of content
- Readable formatting with appropriate whitespace
- Consistent terminology throughout the project (pick one name for a concept and use it everywhere - "download folder", not "output directory" in one place and "save location" in another)

---

## Markdown

Use clean Markdown in all documentation.

Prefer:

- Headings for structure
- Bullet lists for non-sequential items
- Numbered lists for steps or ordered items
- Tables when comparing or listing structured data

Avoid:

- Excessive bold formatting (bold is for the single most critical item in a block, not decoration)
- Nested bullet lists deeper than two levels
- HTML tags inside Markdown except when necessary

---

## Code Comments

Add a comment only when the WHY is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific external bug (for example, whisper.cpp renaming `main.exe` to `whisper-cli.exe` starting at v1.7), or behavior that would surprise a future reader.

Do not add comments that:

- Describe what the code does (well-named identifiers already do that)
- Reference the current task, ticket, or PR ("added for issue #123")
- Explain callers or downstream effects ("used by X")
- Restate what is visible in the code

One short line per comment, maximum. No multi-paragraph comment blocks. No JSDoc unless documenting a public manager function whose parameters are genuinely non-obvious (see the existing `transcribeFile()` docblock in `whisperManager.js` as the outer bound of what is acceptable, not a template to copy by default).

---

## UI Copy

Write from the user's perspective, not the system's internals.

- Name things by what the user recognizes, not how the code is structured: "Download folder", not "outputDir"
- Action labels describe exactly what happens: "Download", "Transcribe", "Cancel" - not "Submit" or "Process"
- Success feedback confirms what happened: "Download complete" not "Success"
- Error messages explain what went wrong and what to do: "ffmpeg not found - open Settings to install it" not "Setup error"
- No apologies in error messages
- No vague messages like "Something went wrong"

---

## Commit Messages

Follow Conventional Commits format (see `docs/workflows/GIT.md` for full details).

- Subject line: `type(scope): short imperative sentence`
- No period at the end of the subject line
- Subject line under 72 characters
- No emojis or decorative characters
- Present tense: "add" not "added", "fix" not "fixed"
- Body is optional; include it when the why is non-obvious

---

## UI Consistency

Every page must feel like it belongs to the same application.

Maintain:

- Consistent page padding and spacing rhythm, matching the existing components in `frontend/src/components/`
- Consistent shadcn `Card` structure for grouped content
- Consistent loading states (shadcn `Skeleton` or the existing `Spinner` primitive)
- Consistent toast notifications via `sonner` (`frontend/src/components/ui/sonner.jsx`) - never a custom alert/banner for transient feedback
- Consistent icon usage (Lucide, same stroke width across a given context)
- Consistent button variants (primary for the main action, outline/ghost for secondary actions)
- Consistent progress UI for long-running operations - reuse `ProgressModal.jsx`'s pattern rather than inventing a new one per feature

The entire project should feel like one polished desktop application, not independently built screens.
