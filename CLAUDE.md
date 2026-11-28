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
npm run convex       # Convex dev backend: pushes convex/ on save (run next to `npm run dev`)
npm run deploy       # Deploy Convex functions, then build against that deployment (needs CONVEX_DEPLOY_KEY)
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

### Convex (`convex/`, `lib/convex.ts`)
The backend for everything live: view counters, reactions, polls, unicorn-button clicks. It replaced Firebase.
- `convex/schema.ts` defines one `counters` table (`kind`, `subject`, `key`, `count`); one module per feature exposes the public functions (`views.ts`, `reactions.ts`, `polls.ts`, `unicorns.ts`), sharing the helpers in `convex/counters.ts`. `convex/_generated/` is written by the Convex CLI and is committed.
- The browser talks to it through `convex/react` hooks (`useQuery` is live: other readers' votes and reactions arrive without a reload). `pages/_app.tsx` provides the client.
- `lib/convex.ts` exports `convex`, which is `null` when `NEXT_PUBLIC_CONVEX_URL` is unset. Every component that uses a Convex hook is split into a live part (hooks) and a wrapper that checks `convex` first, so the site renders without a backend. Keep that pattern.
- Local development: `npm run convex` in one terminal (pushes functions on save, writes `.env.local`), `npm run dev` in another.
- Deploys: `netlify.toml` runs `npm run deploy` when `CONVEX_DEPLOY_KEY` is set, which deploys the functions and builds the site against that deployment.
- `lib/voter.ts` remembers in `localStorage` what this browser already did (voted, reacted, counted a view). The server only counts; it does not know who anyone is.
- `scripts/firebase-to-convex.mjs` is the one-off converter for the old Firebase data.

### Theming (`contexts/ThemeContext.tsx`)
Theme (`light`/`dark`) stored in `localStorage` under key `blog-theme`. Applied as `data-theme` attribute on `<html>`. Browse pages (home, archive, tags, search, projects) force dark ("ink"); post pages respect user preference, defaulting to light ("paper"). Every post opens on an ink hero (marked `data-ink-zone`) so browse and read feel like one site; the header wears its dark look while over it.

### Page transitions (`lib/viewTransitions.ts`)
Navigation runs inside the browser's View Transitions API: a clicked card image grows into the post hero, the title rises and the paper sheet slides up; leaving a post plays it backwards. The module patches the router's `push` and takes over back/forward through `beforePopState` (only one `beforePopState` handler can exist, so add to that one). The post page names its parts with inline `viewTransitionName` styles (`post-hero`, `post-title`, `post-sheet`); anything that can be the other end of the hero morph carries `data-vt-image` (card thumbnails, the homepage hero image). The choreography is CSS at the bottom of `styles/globals.css`. Browsers without the API get plain entrance animations; reduced motion gets none.

### Custom MDX Components
Registered in `pages/[...slug].tsx`. Components live in `components/` and `components/mdx/`. To add a new component usable in `.mdx` files: create it in `components/`, import it in `[...slug].tsx`, and add it to the `components` object.

House style for anything that sits inside a post: flat surfaces (`--color-background-hover` for an aside, `--color-background-card` plus a 1px `--color-border` for a card, `--ink` for something loud), corners from `--radius-sm/md/lg`, vertical room from `--block-gap`, labels with `font: var(--kicker)`, titles in `--font-display`, interface text in `--font-ui`. No gradients, glows, decorative blobs or looping animations; motion is a response to the reader (hover, click, reveal). `<Spoiler>` and `<Nsfw>` share `components/Reveal.tsx`; `<FilmCard>` and `<TvCard>` share `components/mdx/SpecCard.module.css`; `<YouTube>` and `<ResponsiveEmbed>` share `components/Embed.module.css`.

### Styling
CSS Modules (`.module.css`) for component-scoped styles. Global styles in `styles/globals.css`, `styles/utils.css`, `styles/blog.css`.

Design tokens live at the top of `styles/globals.css`: the warm ink/paper palette, the orange accent, and three type roles loaded with `next/font` in `pages/_app.tsx`: `--font-display` (Fraunces, titles), `--font-text` (Literata, post body), `--font-ui` (Inter, interface). Use the tokens rather than hard-coded colours or fonts.
