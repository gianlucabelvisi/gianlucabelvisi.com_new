# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This repo contains two blog implementations:
- **`new_blog/`** — Active blog: Next.js 16 + TypeScript + MDX (use this one)
- **`old_blog/`** — Legacy Gatsby 3 blog (deprecated, kept for reference)

All active work happens in `new_blog/`.

## Commands (run from `new_blog/`)

```bash
npm run dev          # Start dev server (also copies post images first)
npm run build        # Production build (also copies post images first)
npm run lint         # ESLint (flat config in eslint.config.mjs; `next lint` is gone in Next 16)
npm run typecheck    # tsc --noEmit
npm run clean        # Remove .next/ and public/images/posts/
npm run fresh-build  # clean + build
npm run copy-images  # Manually copy post images to public/
```

There are no tests beyond `test-posts.js` and `test-hashtags.tsx` (ad-hoc scripts, not a test suite).

## Architecture (new_blog)

### Pages (Next.js Pages Router)
- `pages/index.tsx` — Homepage: a hero of the latest posts (`components/HomeHero.tsx`) and horizontally scrolling rows (`components/Shelf.tsx`). Rows hold different card shapes (`components/cards/Cards.tsx`): landscape for posts, posters for series, wide for projects, paper slips for captions
- `pages/archive.tsx` — Every post by year; doubles as the "Browse" hub (search box + top tags). The Browse nav link and phone tab land here
- `pages/[...slug].tsx` — Catch-all dynamic route for all blog posts; handles MDX rendering and registers all available MDX components
- `pages/_app.tsx` — Wraps app in `ThemeProvider`; homepage is always dark, post pages default to light

### Post Pipeline
1. MDX files live in `posts/<year>/<post-name>/index.mdx` (or `<post-name>.mdx`)
2. `lib/posts.ts` recursively discovers all `.mdx` files, parses frontmatter with `gray-matter`, rewrites relative image paths to `/images/posts/<year>/<post>/`, and derives URL slugs (frontmatter `path` field takes priority over file-path-based slugs)
3. `scripts/copy-post-images.js` copies co-located post images into `public/images/posts/` — runs automatically on `dev` and `build`
4. `[...slug].tsx` uses `next-mdx-remote` + `remark-gfm` to serialize and render MDX server-side

### Post Frontmatter
```yaml
---
path: "/my-post-url"       # URL slug (required; overrides file-based slug)
date: 2024-01-15
title: "Post Title"
subTitle: "Subtitle shown as a quote"
author: "Gianluca Belvisi"
hashtags: "tag1, tag2"     # Comma-separated; drives the homepage topic rows
series: "Caterina Sforza"  # Optional; groups posts into a series (see lib/series.ts)
hidden: false              # Set true to exclude from listings but keep accessible
cardImage: "cover.jpg"     # Card thumbnail (co-located in post directory)
featureImage: "cover.jpg"  # Hero image on post page
featureImagePhone: "cover.jpg"
onHover: "💸💸💸"          # Emoji shown on card hover
---
```

### Homepage rows
In order: "Pick up where you left off" (only for returning readers), Latest, Series, Projects, Out of context, the topic rows, Lucky dip, From the archive.
- **Topic rows** (`lib/hashtags.ts`): `HOME_TOPICS` lists each row's title, the tags that feed it (substring match) and its "See all" link. Add a row by adding a line.
- **Series** (`lib/series.ts`): membership is the `series:` frontmatter value; the `SERIES` registry sets title, tagline, poster and whether it is a `serial` (read in order: "Part N of M" box, "next part" card) or a `collection` (any order: "more from" list at the end of the post). Tapping a series poster opens `components/TitleSheet.tsx`; the open sheet is in the URL (`/?series=<slug>`).
- **Projects** (`lib/projects.ts`): the `PROJECTS` array. A project can name a `story` post slug; it is linked once that post is listed. Sheet URL: `/?project=<slug>`.
- **Out of context** (`lib/captions.ts`): figure captions pulled from posts at build time. Every `<FigureLabel>` gets an anchor `#caption-N`, so each card links to its exact spot.
- **Reading progress** (`lib/progress.ts`, `lib/useProgress.ts`): kept in `localStorage` (`blog-progress`), written by `components/ReadingProgress.tsx`. Feeds the continue row and the progress bars on cards.

### Firebase (`lib/firebase.ts`)
Used for real-time features (view counters, reactions, polls). Configured via `NEXT_PUBLIC_FIREBASE_*` environment variables.

### Theming (`contexts/ThemeContext.tsx`)
Theme (`light`/`dark`) stored in `localStorage` under key `blog-theme`. Applied as `data-theme` attribute on `<html>`. Browse pages (home, archive, tags, search, projects) force dark ("ink"); post pages respect user preference, defaulting to light ("paper"). Every post opens on an ink hero (marked `data-ink-zone`) so browse and read feel like one site; the header wears its dark look while over it.

### Custom MDX Components
Registered in `pages/[...slug].tsx`. Components live in `components/` and `components/mdx/`. To add a new component usable in `.mdx` files: create it in `components/`, import it in `[...slug].tsx`, and add it to the `components` object.

### Styling
CSS Modules (`.module.css`) for component-scoped styles. Global styles in `styles/globals.css`, `styles/utils.css`, `styles/blog.css`.

Design tokens live at the top of `styles/globals.css`: the warm ink/paper palette, the orange accent, and three type roles loaded with `next/font` in `pages/_app.tsx`: `--font-display` (Fraunces, titles), `--font-text` (Literata, post body), `--font-ui` (Inter, interface). Use the tokens rather than hard-coded colours or fonts.
