# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static portfolio site (French UX/UI designer, tanguy.studio) built with plain HTML/CSS/JS — no framework, no bundler, no `package.json`, no test runner. Pages are hand-written `.html` files with hand-written CSS/JS included via `<link>`/`<script>` tags. There is nothing to "build" — editing a file and refreshing the browser is the entire dev loop. Deployed as a static site (Netlify/Cloudflare Pages style, via `_headers` and `_redirects`).

## Running locally

`.claude/launch.json` wires up the preview (see "Local preview" below). Outside that, serve the directory with any static file server, e.g.:

```
npx serve .
# or
python3 -m http.server 8000
```

No lint, build, or test commands exist in this repo.

## Stylesheets and scripts

Each page loads `main.css` + one page-specific stylesheet, and `script-core.js` + one
page-specific script. There is no minification step and no `.min.*` files — those were
deleted in `402a761`; the source files are what the pages load directly.

- `main.css` on every page, plus `about.css`, `contact.css`, `work.css`, or
  `project-fbf.css` (the three project pages) / `project.css` (`en-cours.html` only).
- `script-core.js` on every page, plus `script-home.js`, `script-about.js`,
  `script-contact.js`, or `script-work.js`.
- Fonts are declared in each page's `<head>`: Neue Haas Grotesk (cdnfonts) and DM Mono
  (Google Fonts). Do not move them back into a CSS `@import` — that serialises the
  download behind `main.css`.

Every CSS/JS `<link>`/`<script>` tag carries a `?v=YYYYMMDD` query string. `_headers`
already sets `Cache-Control: public, max-age=0, must-revalidate` on `.html`/`.css`/`.js`,
so browsers revalidate anyway and bumping `?v=` is belt-and-braces rather than required
(there's history of cache/loader mismatches in production — see `1518cee`).

## Local preview

macOS blocks the preview server process from reading files under `~/Desktop`, so it cannot
serve this directory directly. The working setup lives in `~/.claude/portfolio-preview/`:
`serve.py` serves a mirror of the site (`site/`), and `sync.sh` refreshes that mirror.
**Run `sync.sh` after editing files, or the preview shows the old version.**

## Architecture

**One shared script (`script-core.js`) drives all pages**, gated by `document.body.classList.contains('<page>-page')`. It's a single `DOMContentLoaded` handler containing distinct sections (search for the `// ====` banners): DOM selection, Rennes local-time clock, typewriter animation, burger menu, dark-mode/portrait image swap, and a custom throttled cursor. Page-specific extra behavior lives in a matching small script per page: `script-home.js`, `script-about.js`, `script-contact.js`, `script-work.js`.

**Body classes are the routing mechanism** — there's no JS router; each page sets one `<body class="...">` and both CSS and `script-core.js` branch on it:
- `home-page` (`index.html`), `work-page` (`work.html`), `about-page` (`about.html`), `contact-page` (`contact.html`), `wip-page` (`en-cours.html`, `robots.txt`-disallowed placeholder)
- `project-fbf-page` for the three case-study pages (`project-1.html`, `project-2.html`, `project-3.html`), which additionally load GSAP + ScrollTrigger + ScrollSmoother from jsDelivr for scroll animation. `project-3.html` adds a second class (`project-siko-page`) for page-specific overrides.

**`main.css` is the shared stylesheet** (loaded on every page) with numbered sections (variables/themes, reset, typography, custom cursor, main layout, header, baseline, typewriter, nav, burger menu, CTA button, footer). Each page then loads one additional page-specific stylesheet on top (`about.css`, `contact.css`, `work.css`, `project.css`/`project-fbf.css`).

**Theme (light/dark) and the first-visit loader are initialized inline** in a blocking `<script>` in each page's `<head>`, before the CSS/JS loads — this avoids a flash of wrong theme by reading `localStorage.getItem('theme')` and adding `dark-theme`/`first-visit-loading` classes to `<html>` synchronously. If you touch theming or the intro loader, that inline snippet (duplicated at the top of every page) and the corresponding logic in `script-core.js` need to stay consistent.

**Routing/URLs**: `_redirects` rewrites clean URLs (`/project-1`) to the actual files (`/project-1.html`) and 301-redirects the `.html` form to the clean one — canonical URLs and `sitemap.xml` use the clean form.

**Contact form** (`contact.html`) submits to Formspree (`https://formspree.io/f/mykprqvv`) via `fetch` in `script-contact.js`, not a Netlify Forms/server-side handler.

**Assets**: `images/` (photos, per-project subfolders; `.webp` only — the unused `.jpg` fallbacks were removed and no `<picture>` element exists) and `fichiers/` (PDFs, fonts, SVGs, videos) are both marked `immutable`/1-year cache in `_headers`, so renaming rather than overwriting is the safe way to update an asset that's already been published.
