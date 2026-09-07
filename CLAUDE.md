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
- `pages/index.tsx` — Homepage with Netflix-style UI: hero carousel + category sliders
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
hashtags: "tag1, tag2"     # Comma-separated; drives homepage category sliders
hidden: false              # Set true to exclude from listings but keep accessible
cardImage: "cover.jpg"     # Card thumbnail (co-located in post directory)
featureImage: "cover.jpg"  # Hero image on post page
featureImagePhone: "cover.jpg"
onHover: "💸💸💸"          # Emoji shown on card hover
---
```

### Homepage Sliders (`lib/hashtags.ts`)
`groupPostsForHomepage()` filters posts into named sliders by hashtag keywords:
- `caterina sforza` → "Caterina Sforza Chronicles"
- `food`, `coffee`, `diet`, `9barista`, `pizza`, `meat` → "Food & Coffee Adventures"
- `mindfulness` → "Mindfulness & Reflection"
- `books`, `bucket list` → "Books & Reading"

### Firebase (`lib/firebase.ts`)
Used for real-time features (view counters, reactions, polls). Configured via `NEXT_PUBLIC_FIREBASE_*` environment variables.

### Theming (`contexts/ThemeContext.tsx`)
Theme (`light`/`dark`) stored in `localStorage` under key `blog-theme`. Applied as `data-theme` attribute on `<html>`. Homepage forces dark theme; post pages respect user preference.

### Custom MDX Components
Registered in `pages/[...slug].tsx`. Components live in `components/` and `components/mdx/`. To add a new component usable in `.mdx` files: create it in `components/`, import it in `[...slug].tsx`, and add it to the `components` object.

### Styling
CSS Modules (`.module.css`) for component-scoped styles. Global styles in `styles/globals.css`, `styles/utils.css`, `styles/blog.css`.
