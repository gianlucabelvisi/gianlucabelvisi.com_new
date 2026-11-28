import type { PostData, PostSummary } from './posts'

type PostLike = PostData | PostSummary

/**
 * Series: posts that belong together. Membership comes from the `series:` frontmatter field
 * (the value must match `name` here, case-insensitively); this registry only says how each one is presented.
 * A series that is used in frontmatter but missing here still works, with the defaults in `seriesInfo()`.
 *
 *  - serial:     read in order (Caterina Sforza part 1, 2, 3…). Posts get a "Part N of M" box and a "next part" card.
 *  - collection: same idea, any order (the "On …" essays). Posts get a "more from" list at the end.
 */
export interface SeriesInfo {
  /** The frontmatter value */
  name: string
  slug: string
  /** Shown on the poster and the sheet */
  title: string
  kind: 'serial' | 'collection'
  /** One line under the title. Falls back to the first post's subtitle. */
  tagline?: string
  /** What one entry is called: "part", "essay", "year"… */
  unit: string
  /** Poster: the first post's cover, or a typographic poster with a short mark */
  poster: { type: 'image' } | { type: 'type'; mark: string }
  /** Poster accent, any CSS colour */
  accent: string
}

export const SERIES: SeriesInfo[] = [
  {
    name: 'Caterina Sforza',
    slug: 'caterina-sforza',
    title: 'Caterina Sforza',
    kind: 'serial',
    tagline: 'Renaissance Italy: murder, sex, and significantly fewer dragons.',
    unit: 'part',
    poster: { type: 'image' },
    accent: '#ee6f37',
  },
  {
    name: 'On',
    slug: 'on',
    title: 'On…',
    kind: 'collection',
    tagline: 'Pizza, meat, walking, snoring. One subject at a time, thoroughly.',
    unit: 'essay',
    poster: { type: 'type', mark: 'On' },
    accent: '#ee6f37',
  },
  {
    name: 'My Espresso Odyssey',
    slug: 'espresso-odyssey',
    title: 'My Espresso Odyssey',
    kind: 'serial',
    unit: 'part',
    poster: { type: 'image' },
    accent: '#d9a441',
  },
  {
    name: '52 books a year',
    slug: '52-books',
    title: '52 books a year',
    kind: 'collection',
    tagline: 'One book a week, every year, and what stuck.',
    unit: 'year',
    poster: { type: 'type', mark: '52' },
    accent: '#ff9ad0',
  },
  {
    name: 'My year in investing',
    slug: 'investing',
    title: 'My year in investing',
    kind: 'collection',
    unit: 'year',
    poster: { type: 'type', mark: '+%' },
    accent: '#7bd88f',
  },
  {
    name: 'Leaving',
    slug: 'leaving',
    title: 'Leaving',
    kind: 'collection',
    tagline: 'Countries and jobs, on the way out.',
    unit: 'exit',
    poster: { type: 'type', mark: 'Bye' },
    accent: '#58c4d2',
  },
  {
    name: 'This blog',
    slug: 'this-blog',
    title: 'This blog',
    kind: 'collection',
    tagline: 'The blog, explaining itself.',
    unit: 'post',
    poster: { type: 'type', mark: '</>' },
    accent: '#b9a6ff',
  },
]

const key = (name: string) => name.trim().toLowerCase()

/** Presentation for a series name, with sensible defaults for one that isn't in the registry yet */
export function seriesInfo(name: string): SeriesInfo {
  const found = SERIES.find(s => key(s.name) === key(name))
  if (found) return found
  return {
    name,
    slug: key(name).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''),
    title: name,
    kind: 'serial',
    unit: 'part',
    poster: { type: 'image' },
    accent: '#ee6f37',
  }
}

/** "5 parts", "1 essay" */
export function countLabel(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

/** One entry of a series as the cards, the sheet and the post page need it */
export interface SeriesPart {
  slug: string
  title: string
  subTitle: string
  readingTime: number
}

/** A series ready for the homepage: presentation + its posts in reading order */
export interface SeriesShelfItem {
  slug: string
  title: string
  kind: SeriesInfo['kind']
  tagline: string
  unit: string
  accent: string
  /** Typographic poster mark, or null when the poster is an image */
  mark: string | null
  /** Cover of the first post (also the sheet's header image) */
  image: string | null
  minutes: number
  parts: SeriesPart[]
}

function coverOf(post: PostLike): string | null {
  const img = post.frontmatter.cardImage || post.frontmatter.featureImage
  if (!img) return null
  return img.startsWith('/') ? img : `/images/posts/${post.imagePath}/${img}`
}

/**
 * Every series with at least two listed posts, in registry order (unregistered ones last).
 * Posts inside a series are oldest first, which is the reading order.
 */
export function getSeriesShelf(posts: PostLike[]): SeriesShelfItem[] {
  const groups = new Map<string, { name: string; posts: PostLike[] }>()
  for (const post of posts) {
    const name = typeof post.frontmatter.series === 'string' ? post.frontmatter.series.trim() : ''
    if (!name) continue
    const group = groups.get(key(name))
    if (group) group.posts.push(post)
    else groups.set(key(name), { name, posts: [post] })
  }

  const order = (name: string) => {
    const i = SERIES.findIndex(s => key(s.name) === key(name))
    return i === -1 ? SERIES.length : i
  }

  return Array.from(groups.values())
    .filter(g => g.posts.length >= 2)
    .sort((a, b) => order(a.name) - order(b.name))
    .map(({ name, posts: members }) => {
      const info = seriesInfo(name)
      const ordered = [...members].sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? -1 : 1))
      return {
        slug: info.slug,
        title: info.title,
        kind: info.kind,
        tagline: info.tagline ?? ordered[0].frontmatter.subTitle ?? '',
        unit: info.unit,
        accent: info.accent,
        mark: info.poster.type === 'type' ? info.poster.mark : null,
        image: coverOf(ordered[0]),
        minutes: ordered.reduce((sum, p) => sum + p.readingTime, 0),
        parts: ordered.map(p => ({
          slug: p.slug,
          title: p.frontmatter.title,
          subTitle: p.frontmatter.subTitle ?? '',
          readingTime: p.readingTime,
        })),
      }
    })
}
