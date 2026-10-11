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

- `main.css` on every page, plus `about.css`, `contact.css`, `work.css`, `legal.css`
  (`mentions-legales.html` and `confidentialite.html`), or `project.css` (`en-cours.html` only). The five case-study pages load `project-case.css`
  (shared case-study layout) plus one per-project sheet: `project-nintendo.css`,
  `project-siko.css`, `project-sportigo.css`, `project-shopcaisse.css` (`frame-by-frame.html`,
  Frame by Frame, has none).
- `script-core.js` on every page, plus `script-home.js`, `script-about.js`,
  `script-contact.js`, or `script-case.js` (case-study pages: scroll reveal, lightbox;
  `shopcaisse.html` also loads `script-shopcaisse.js` for its interactive mockups).
  `work.html` has no page script (its project list is plain links).
- `script-sound.js` on every page, loaded last: UI sound design and very discreet generative
  ambient music (sparse piano notes, C418-style), all synthesised with Web Audio (no audio files). Desktop/mouse only; it injects a sound on/off button before each
  `.toggle-control` (styled in `main.css` section 13) and stores the choice in
  `localStorage('sound')`.
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

**One shared script (`script-core.js`) drives all pages**, gated by `document.body.classList.contains('<page>-page')`. It's a single `DOMContentLoaded` handler containing distinct sections (search for the `// ====` banners): DOM selection, Rennes local-time clock, typewriter animation, burger menu, magnetic buttons, dark mode, and a custom throttled cursor. Page-specific extra behavior lives in a matching small script per page: `script-home.js`, `script-about.js`, `script-contact.js`, `script-case.js` (`work.html` needs none).

**Body classes are the routing mechanism** — there's no JS router; each page sets one `<body class="...">` and both CSS and `script-core.js` branch on it:
- `home-page` (`index.html`), `work-page` (`work.html`), `about-page` (`about.html`), `contact-page` (`contact.html`), `wip-page` (`en-cours.html`, `noindex` placeholder), `legal-page` (`mentions-legales.html`, `confidentialite.html`, linked only from the contact page; update their "Mis à jour le" date and the services list in `confidentialite.html` if hosting, form handling or fonts change)
- `case-page` for the five case-study pages (`sportigo.html`, `siko-mobility.html`, `shopcaisse.html`, `frame-by-frame.html`, `nintendo.html`, in the `work.html` order). No GSAP or external animation library; their inline `<head>` script also adds `case-js` to `<html>` to enable the scroll-reveal styles.

**`main.css` is the shared stylesheet** (loaded on every page) with numbered sections (variables/themes, reset, typography, custom cursor, main layout, header, baseline, typewriter, nav, burger menu, CTA button, footer). Each page then loads its page-specific stylesheet(s) on top (see "Stylesheets and scripts").

**Theme (light/dark) and the first-visit loader are initialized inline** in a blocking `<script>` in each page's `<head>`, before the CSS/JS loads — this avoids a flash of wrong theme by reading `localStorage.getItem('theme')` and adding `dark-theme`/`first-visit-loading` classes to `<html>` synchronously. If you touch theming or the intro loader, that inline snippet (duplicated at the top of every page) and the corresponding logic in `script-core.js` need to stay consistent.

**Headings and SEO markup** (keep these when adding or editing a page):
- The `tanguy.studio` logo is a `<p class="site-title">`, not the `h1`. Each page has its own `h1`: the typewriter tagline on the home page, a `.title-stack` (project name + subtitle) on case studies, `.about-intro-head` on About, and the header `.subtitle` on Work/Contact/legal pages (with a `.sr-only` complement on Work and Contact).
- The typewriter text is written in the HTML (`#typewriter.is-pending`) so crawlers that don't run JS can read it; `script-core.js` reads it once, then animates it.
- Section titles (`.section-title`) are plain sentence-case French ("Contexte et enjeux e-commerce"), with no dots between words. The intro scramble in `script-core.js` handles `.sr-only` children.
- Every indexable page has `og:image` + `twitter:card` and a JSON-LD block (`Person` with `@id https://tanguy.studio/#person`, `CreativeWork` + `BreadcrumbList` on case studies). `llms.txt` at the root summarises the site for AI assistants: update it when a case study is added or renamed.

**Routing/URLs**: every page except the home has a clean URL (`/work`, `/about`, `/sportigo`…). `_redirects` rewrites it to the `.html` file and 301-redirects the `.html` form to it; it also 301-redirects the old numbered case-study URLs (`/project-1`…`/project-5`, the production numbering before October 2026) to their slug. Internal links, canonical URLs, `og:url`, JSON-LD, `sitemap.xml` and `llms.txt` all use the clean form (`href="/work"`, `href="/"` for the home); assets stay relative. The preview's `serve.py` resolves clean URLs too.

**Contact form** (`contact.html`) submits to Formspree (`https://formspree.io/f/mykprqvv`) via `fetch` in `script-contact.js`, not a Netlify Forms/server-side handler.

**Assets**: `images/` (photos, per-project subfolders; `.webp` only — the unused `.jpg` fallbacks were removed and no `<picture>` element exists — except `images/og/*.jpg`, the 1200×630 share images referenced by `og:image`, kept in JPEG because LinkedIn doesn't reliably read WebP) and `fichiers/` (PDFs, fonts, SVGs, videos) are both marked `immutable`/1-year cache in `_headers`, so renaming rather than overwriting is the safe way to update an asset that's already been published.
