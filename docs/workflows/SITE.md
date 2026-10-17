# The website

The kinetube website lives in `site/` and is served at https://kinetube.ujjwal.fyi. It is a marketing page and the user docs, built from the ProfileBox prompt "Activepieces.com Landing Page, Sign-in Page and Docs Style (v2)" in the kinetube brand (ADR-040). kinetube has no accounts, so the prompt's sign-in part is left out.

## Run it

```bash
cd site
npm install
npm run dev        # http://localhost:5174, beside the app's own 5173
```

From the repository root, `npm run site:dev` does the same, and `npm run site:check` runs the type check, lint, tests and the production build.

## How it is built

| Path | What it is |
|---|---|
| `site/src/pages/Home.tsx` | The hero, in the first bundle. Its window animates with CSS only. |
| `site/src/pages/HomeBelow.tsx` | Everything below the hero, loaded after it with the `motion` library |
| `site/src/components/sections/story/` | The scroll story: problem windows flying in, then kinetube with its tools wired around it. `ringLayout.ts` holds the wire routing maths, with tests. |
| `site/src/components/mockups/` | The animated product pictures. A cursor clicks real app labels (`DownloadCard`, `TranscribeCard`), and `SetupCard` plays the first-start screen. |
| `site/src/components/mockups/sample.ts` | The sample data every picture shares: NASA's public videos, the same the README recordings use |
| `site/public/media/` | The README recordings as H.264 and AV1 clips with posters, and the NASA thumbnails under `thumbs/` |
| `site/content/docs/` | The docs pages in MDX. `site/src/docs/nav.ts` is the one list of tabs, groups and pages. |
| `site/build/docsPlugin.ts` | Builds the docs search index and writes `sitemap.xml` and `llms.txt` |

The site uses the app's own colour tokens (`frontend/src/styles/tokens.css`), the self-hosted Unbounded and DM Sans fonts with their OFL licences in `site/public/fonts/`, and Lucide icons. `docs/design-reference.md` has a "Website" section with the few tokens only the site adds.

## Change the docs

1. Add or edit an `.mdx` file in `site/content/docs/`. Each starts with `export const meta = { title: '...', description: '...' }`.
2. Add a new page to `DOC_TABS` in `site/src/docs/nav.ts`.
3. Run `npm test` in `site/`. The tests check that every sidebar entry has a page, every page is in the sidebar, every page has a title and a description, links between docs pages resolve, and no file holds an em or en dash or an emoji.

The docs are ported from `docs/USER_GUIDE.md`, the README, `CONTRIBUTING.md` and `docs/philosophy/CROSS_PLATFORM.md`. When one of those changes, change the matching docs page in the same commit.

## Deploy

`.github/workflows/deploy-site.yml` runs on every push and pull request that changes `site/` or the workflow itself:

1. `npm ci`, the type check, lint, tests and the build, in `site/`.
2. On `main` only: `wrangler pages deploy dist --project-name=kinetube-site --branch=main`.

So a commit to `main` that touches `site/` is live a minute or two later. A pull request only runs the checks. Run the workflow by hand from the Actions tab to deploy without a change.

The release workflow also starts this one when every installer is uploaded, because the hero shows the app version. `vite.config.ts` reads it from the root `package.json` into `__APP_VERSION__` (`APP_VERSION` in `src/lib/links.ts`).

## Download links

The Download buttons fetch the Windows installer itself, not the release page: `DOWNLOAD_URL` in `src/lib/links.ts` is `releases/latest/download/KineTube-Setup.exe`, and the hero links the macOS and Linux installers the same way. GitHub answers those addresses with the newest release's file, so a release needs no site change (ADR-042). `opensInNewTab()` keeps these links in the same tab, since the browser saves the file without leaving the page; every other outside link opens a new tab. The install docs page lists the same four links.

| Setting | Where |
|---|---|
| Cloudflare Pages project | `kinetube-site` (classic Pages, production branch `main`) |
| Custom domain | `kinetube.ujjwal.fyi`, a proxied CNAME to `kinetube-site.pages.dev` in the `ujjwal.fyi` zone |
| Repository secrets | `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` |
| Headers | `site/public/_headers`: a year of caching for hashed assets and fonts, a week for media, and basic security headers |

Cloudflare Pages serves `index.html` for any path that has no file, so the router handles `/docs/...` and the 404 page.

## Before you ship a change

- Check the page at 1440 by 900 and 390 by 844, in both themes, and with reduced motion on.
- Every number outside a product picture must come from the README or the docs.
- The copy follows `docs/WRITING_STANDARDS.md`: no dashes as punctuation, no emoji, short and plain.
