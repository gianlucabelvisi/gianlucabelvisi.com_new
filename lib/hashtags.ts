import { PostData, PostSummary } from './posts'

// Type that works with both PostData and PostSummary (since hashtags only use frontmatter)
type PostWithHashtags = PostData | PostSummary

/** Split a frontmatter hashtags string into trimmed, lower-cased tags. */
export function parseHashtags(hashtags?: string | null): string[] {
  if (!hashtags) return []
  return hashtags
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean)
}

/** URL-safe slug for a tag: "Caterina Sforza" -> "caterina-sforza" */
export function tagToSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Check if a post contains any of the specified hashtags
 * Matches the functionality from the old Gatsby blog (substring match)
 */
export function containsHashtags(post: PostWithHashtags, ...tags: string[]): boolean {
  const postHashtags = parseHashtags(post.frontmatter.hashtags)
  if (postHashtags.length === 0) return false

  return tags.some(tag =>
    postHashtags.some(postTag => postTag.includes(tag.toLowerCase()))
  )
}

/**
 * Filter posts by hashtags (substring match, any-of)
 */
export function filterPostsByHashtags<T extends PostWithHashtags>(posts: T[], ...tags: string[]): T[] {
  return posts.filter(post => containsHashtags(post, ...tags))
}

/** Exact-match filter by tag slug — used by /tags/[tag] pages */
export function filterPostsByTagSlug<T extends PostWithHashtags>(posts: T[], tagSlug: string): T[] {
  return posts.filter(post =>
    parseHashtags(post.frontmatter.hashtags).some(tag => tagToSlug(tag) === tagSlug)
  )
}

export interface TagInfo {
  tag: string
  slug: string
  count: number
}

/**
 * Get all unique hashtags from posts with counts, sorted by count desc then name.
 * Tags that differ only by case/whitespace are merged.
 */
export function getAllHashtags(posts: PostWithHashtags[]): TagInfo[] {
  const counts = new Map<string, TagInfo>()

  posts.forEach(post => {
    parseHashtags(post.frontmatter.hashtags).forEach(tag => {
      const slug = tagToSlug(tag)
      const existing = counts.get(slug)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(slug, { tag, slug, count: 1 })
      }
    })
  })

  return Array.from(counts.values()).sort((a, b) =>
    b.count - a.count || a.tag.localeCompare(b.tag)
  )
}

/**
 * Related posts: score by number of shared hashtags, tie-break by date proximity.
 * Excludes the post itself. Falls back to nearest-in-time posts if nothing shares a tag.
 */
export function getRelatedPosts<T extends PostWithHashtags>(
  current: PostWithHashtags,
  posts: T[],
  limit = 4
): T[] {
  const currentTags = new Set(parseHashtags(current.frontmatter.hashtags))
  const currentTime = new Date(current.frontmatter.date).getTime()

  const scored = posts
    .filter(p => p.slug !== current.slug)
    .map(p => {
      const shared = parseHashtags(p.frontmatter.hashtags).filter(t => currentTags.has(t)).length
      const distance = Math.abs(new Date(p.frontmatter.date).getTime() - currentTime)
      return { post: p, shared, distance }
    })
    .sort((a, b) => b.shared - a.shared || a.distance - b.distance)

  return scored.slice(0, limit).map(s => s.post)
}

/** All posts in a series, oldest first (reading order). */
export function getSeriesPosts<T extends PostWithHashtags>(series: string, posts: T[]): T[] {
  const key = series.trim().toLowerCase()
  return posts
    .filter(p => typeof p.frontmatter.series === 'string' && p.frontmatter.series.trim().toLowerCase() === key)
    .sort((a, b) => (a.frontmatter.date < b.frontmatter.date ? -1 : 1))
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Cap for the homepage's "From the archive" row; the full list lives on /archive. */
export const CHRONOLOGICAL_ROW_LIMIT = 12

/**
 * The homepage's topic rows: a title, the tags that feed it (substring match, any of), and where "See all" goes.
 * Series and projects have their own rows (lib/series.ts, lib/projects.ts); these are the looser groupings.
 * Add a row by adding a line. Rows with fewer than three posts are skipped.
 */
export const HOME_TOPICS: { title: string; hint?: string; tags: string[]; moreHref: string }[] = [
  { title: 'Food & coffee', hint: 'eaten, brewed, regretted', tags: ['food', 'coffee', 'diet'], moreHref: '/tags/food' },
  { title: 'Mind & body', hint: 'the owner\'s manual', tags: ['mindfulness', 'health', 'self-improvement'], moreHref: '/tags/mindfulness' },
  { title: 'Screens & pages', hint: 'watched and read', tags: ['tv', 'films', 'books'], moreHref: '/tags/books' },
  { title: 'Work & tech', tags: ['tech', 'work'], moreHref: '/tags/tech' },
]

const TOPIC_ROW_LIMIT = 15

/**
 * Everything the homepage rows need, grouped: the latest posts, the topic rows, a lucky dip and the oldest posts.
 */
export function groupPostsForHomepage<T extends PostWithHashtags>(posts: T[]) {
  // The hero shows the newest few; "Latest" carries on from the very first so nothing is hero-only
  const latest = posts.slice(0, 14)

  const topics = HOME_TOPICS
    .map(topic => ({ ...topic, posts: filterPostsByHashtags(posts, ...topic.tags).slice(0, TOPIC_ROW_LIMIT) }))
    .filter(topic => topic.posts.length >= 3)

  const randomized = shuffle(posts).slice(0, 15)

  // "From the archive": the oldest posts, capped
  const chronological = [...posts].reverse().slice(0, CHRONOLOGICAL_ROW_LIMIT)

  return { latest, topics, randomized, chronological }
}
